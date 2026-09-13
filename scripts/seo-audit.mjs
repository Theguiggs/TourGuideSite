/**
 * seo-audit.mjs — contrôle, en lecture seule, l'indexabilité du portail public.
 *
 * Le lot SEO-0 demande une mesure de référence AVANT toute modification, puis
 * la même mesure après chaque lot. Ce script la produit, sur un environnement
 * local (`http://localhost:3000`) comme sur le domaine déployé.
 *
 * Ce qu'il contrôle :
 *   1. `robots.txt` répond, déclare un sitemap et interdit les espaces privés ;
 *   2. chaque URL du sitemap répond 200 (aucune redirection, aucune erreur) ;
 *   3. chaque URL du sitemap est indexable (pas de `noindex`) ;
 *   4. la canonical de chaque page est absolue et auto-référente ;
 *   5. les groupes hreflang sont absolus, auto-référents et réciproques ;
 *   6. `x-default` est présent et désigne une URL du groupe ;
 *   7. `<html lang>` correspond à la langue annoncée par l'URL ;
 *   8. aucune page interdite par `robots.txt` n'est indexable ni listée ;
 *   9. toute page 200 indexable atteinte par les hreflang figure au sitemap.
 *
 * Il relève aussi, sans juger, le temps de réponse, le titre et la description
 * de chaque page : c'est la base de comparaison des lots suivants.
 *
 * Lecture seule : les seules écritures sont le rapport JSON et son résumé
 * Markdown. Aucune donnée personnelle n'est collectée — ni cookie, ni en-tête
 * d'authentification, ni corps de réponse conservé.
 *
 * Codes de sortie : 0 conforme · 1 non conforme · 2 panne.
 *
 *   node scripts/seo-audit.mjs
 *   node scripts/seo-audit.mjs --base https://murmure-visit.com
 *   node scripts/seo-audit.mjs --limite 40 --sortie output/seo-audit
 *   node scripts/seo-audit.mjs --etiquette avant-seo-1
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const LOCALES = ['fr', 'en', 'es', 'de', 'it', 'nl'];
const ROBOT_UA = 'Mozilla/5.0 (compatible; MurmureSeoAudit/1.0; +https://murmure-visit.com)';

function lisArguments(argv) {
  const options = {
    base: 'http://localhost:3000',
    sortie: 'output/seo-audit',
    limite: 0,
    etiquette: '',
    concurrence: 6,
    jsonSeul: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const valeur = () => argv[++i];
    if (arg === '--base') options.base = valeur().replace(/\/+$/, '');
    else if (arg === '--sortie') options.sortie = valeur();
    else if (arg === '--limite') options.limite = Number.parseInt(valeur(), 10) || 0;
    else if (arg === '--etiquette') options.etiquette = valeur();
    else if (arg === '--concurrence') options.concurrence = Math.max(1, Number.parseInt(valeur(), 10) || 6);
    else if (arg === '--json-seul') options.jsonSeul = true;
    else if (arg === '--aide' || arg === '-h') {
      process.stdout.write(
        'node scripts/seo-audit.mjs [--base URL] [--sortie DIR] [--limite N] [--etiquette NOM] [--concurrence N] [--json-seul]\n',
      );
      process.exit(0);
    } else throw new Error(`Option inconnue : ${arg}`);
  }
  return options;
}

// --- Lecture HTTP ---------------------------------------------------------

/**
 * `redirect: 'manual'` est délibéré : une URL canonical qui redirige est un
 * défaut, pas un détail de transport. La suivre le masquerait.
 */
async function recupere(url, { methode = 'GET' } = {}) {
  const debut = Date.now();
  try {
    const reponse = await fetch(url, {
      method: methode,
      redirect: 'manual',
      headers: { 'user-agent': ROBOT_UA, accept: 'text/html,application/xhtml+xml,application/xml' },
    });
    const corps = methode === 'GET' ? await reponse.text() : '';
    return {
      url,
      statut: reponse.status,
      emplacement: reponse.headers.get('location') ?? undefined,
      typeContenu: reponse.headers.get('content-type') ?? undefined,
      msec: Date.now() - debut,
      octets: corps.length,
      corps,
    };
  } catch (error) {
    return { url, statut: 0, erreur: String(error?.message ?? error), msec: Date.now() - debut, corps: '' };
  }
}

async function enParallele(elements, concurrence, travail) {
  const resultats = new Array(elements.length);
  let curseur = 0;
  const ouvriers = Array.from({ length: Math.min(concurrence, elements.length) }, async () => {
    for (;;) {
      const index = curseur++;
      if (index >= elements.length) return;
      resultats[index] = await travail(elements[index], index);
    }
  });
  await Promise.all(ouvriers);
  return resultats;
}

// --- Analyse du HTML ------------------------------------------------------

const attribut = (balise, nom) => {
  const trouve = balise.match(new RegExp(`${nom}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
  return trouve ? (trouve[2] ?? trouve[3] ?? '') : undefined;
};

function analysePage(html) {
  const balises = html.match(/<link\b[^>]*>/gi) ?? [];
  let canonical;
  const alternates = {};
  for (const balise of balises) {
    const rel = (attribut(balise, 'rel') ?? '').toLowerCase();
    const href = attribut(balise, 'href');
    if (!href) continue;
    if (rel === 'canonical') canonical = href;
    else if (rel === 'alternate') {
      const hreflang = attribut(balise, 'hreflang');
      if (hreflang) alternates[hreflang.toLowerCase()] = href;
    }
  }
  const metas = html.match(/<meta\b[^>]*>/gi) ?? [];
  let robots;
  let description;
  for (const balise of metas) {
    const nom = (attribut(balise, 'name') ?? '').toLowerCase();
    if (nom === 'robots') robots = (attribut(balise, 'content') ?? '').toLowerCase();
    else if (nom === 'description') description = attribut(balise, 'content');
  }
  const jsonLd = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => {
      try {
        return JSON.parse(m[1]);
      } catch {
        return { '@type': '__illisible__' };
      }
    });
  return {
    canonical,
    alternates,
    robots,
    description,
    titre: html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim(),
    lang: html.match(/<html\b[^>]*>/i)?.[0] && attribut(html.match(/<html\b[^>]*>/i)[0], 'lang'),
    h1: html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]*>/g, '').trim(),
    typesJsonLd: jsonLd.map((n) => n?.['@type']).filter(Boolean),
    jsonLd,
  };
}

const estIndexable = (robots) => !robots || !/\bnoindex\b/.test(robots);

// --- robots.txt et sitemaps ----------------------------------------------

function analyseRobots(texte) {
  const interdits = [];
  const sitemaps = [];
  let agentGeneral = false;
  for (const ligne of texte.split(/\r?\n/)) {
    const [cleBrute, ...reste] = ligne.split(':');
    const cle = cleBrute.trim().toLowerCase();
    const valeur = reste.join(':').trim();
    if (cle === 'user-agent') agentGeneral = valeur === '*';
    else if (cle === 'disallow' && agentGeneral && valeur) interdits.push(valeur);
    else if (cle === 'sitemap' && valeur) sitemaps.push(valeur);
  }
  return { interdits, sitemaps };
}

/** Un index de sitemaps est suivi d'un niveau : au-delà, la structure est suspecte. */
async function lisSitemaps(racine, profondeur = 0) {
  const reponse = await recupere(racine);
  if (reponse.statut !== 200) return { entrees: [], fichiers: [{ url: racine, statut: reponse.statut }] };
  const xml = reponse.corps;
  const fichiers = [{ url: racine, statut: 200, octets: reponse.octets, msec: reponse.msec }];
  const index = [...xml.matchAll(/<sitemap>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<\/sitemap>/gi)].map((m) => m[1].trim());
  if (index.length > 0 && profondeur < 2) {
    const enfants = await Promise.all(index.map((url) => lisSitemaps(url, profondeur + 1)));
    return {
      entrees: enfants.flatMap((e) => e.entrees),
      fichiers: [...fichiers, ...enfants.flatMap((e) => e.fichiers)],
    };
  }
  const entrees = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)].map((bloc) => {
    const corps = bloc[1];
    const alternates = {};
    for (const lien of corps.matchAll(/<xhtml:link\b[^>]*>/gi)) {
      const hreflang = attribut(lien[0], 'hreflang');
      const href = attribut(lien[0], 'href');
      if (hreflang && href) alternates[hreflang.toLowerCase()] = href;
    }
    return {
      loc: corps.match(/<loc>([^<]+)<\/loc>/i)?.[1]?.trim(),
      lastmod: corps.match(/<lastmod>([^<]+)<\/lastmod>/i)?.[1]?.trim(),
      alternates,
      source: racine,
    };
  });
  return { entrees: entrees.filter((e) => e.loc), fichiers };
}

// --- Reste-à-faire éditorial (support du lot SEO-8) -----------------------

/**
 * Les villes du catalogue qui n'ont pas encore d'introduction relue.
 *
 * Le registre est lu comme du texte, pas importé : ce script est en Node pur et
 * ne transpile pas le TypeScript. Une lecture ratée ne fait pas échouer l'audit
 * — c'est un suivi éditorial, pas un contrôle d'indexabilité.
 */
async function villesSansIntroduction(sitemap, base) {
  let slugsCouverts;
  try {
    const source = await readFile(new URL('../src/lib/cities/city-intro.ts', import.meta.url), 'utf8');
    const bloc = source.slice(source.indexOf('CITY_INTROS'));
    slugsCouverts = new Set([...bloc.matchAll(/^ {2}'?([a-z0-9-]+)'?: \{$/gm)].map((m) => m[1]));
  } catch {
    return null;
  }
  const villes = new Set();
  for (const { loc } of sitemap) {
    let chemin = loc.startsWith(base) ? loc.slice(base.length) : new URL(loc).pathname;
    const prefixe = chemin.split('/')[1];
    if (LOCALES.includes(prefixe) && prefixe !== 'fr') chemin = chemin.slice(prefixe.length + 1);
    const segments = chemin.split('/').filter(Boolean);
    if (segments[0] === 'catalogue' && segments.length === 2) villes.add(segments[1]);
  }
  return [...villes].filter((slug) => !slugsCouverts.has(slug)).sort();
}

// --- Contrôles ------------------------------------------------------------

const langueDuChemin = (url, base) => {
  const chemin = url.startsWith(base) ? url.slice(base.length) : new URL(url).pathname;
  const prefixe = chemin.split('/')[1];
  return LOCALES.includes(prefixe) && prefixe !== 'fr' ? prefixe : 'fr';
};

/**
 * Type de page, déduit du chemin une fois le préfixe de langue retiré.
 *
 * Le sitemap reste unique : quelques centaines d'URL, très loin des 50 000 que
 * la spécification autorise, et un fichier de moins à surveiller. Le diagnostic
 * que la scission aurait apporté vient d'ici — chaque type se lit séparément
 * dans le rapport.
 */
const typeDePage = (url, base) => {
  let chemin = url.startsWith(base) ? url.slice(base.length) || '/' : new URL(url).pathname;
  const prefixe = chemin.split('/')[1];
  if (LOCALES.includes(prefixe) && prefixe !== 'fr') chemin = chemin.slice(prefixe.length + 1) || '/';
  const segments = chemin.split('/').filter(Boolean);
  if (segments.length === 0) return 'accueil';
  if (segments[0] === 'catalogue') return ['catalogue', 'ville', 'visite'][segments.length - 1] ?? 'autre';
  if (segments[0] === 'guides') return segments.length === 1 ? 'guides' : 'guide';
  return 'éditorial';
};

const interdite = (url, base, interdits) => {
  const chemin = url.startsWith(base) ? url.slice(base.length) || '/' : new URL(url).pathname;
  return interdits.some((motif) => chemin === motif || chemin.startsWith(motif));
};

function controle(etat) {
  const { base, interdits, sitemap, pages } = etat;
  const anomalies = [];
  const signale = (gravite, code, url, message) => anomalies.push({ gravite, code, url, message });

  const dansSitemap = new Set(sitemap.map((e) => e.loc));

  for (const entree of sitemap) {
    const page = pages.get(entree.loc);
    if (!page) continue;
    if (page.statut !== 200) {
      signale('erreur', 'sitemap-non-200', entree.loc, `Le sitemap liste une URL qui répond ${page.statut}.`);
      continue;
    }
    if (!estIndexable(page.robots)) {
      signale('erreur', 'sitemap-noindex', entree.loc, `Le sitemap liste une URL en \`${page.robots}\`.`);
    }
    if (interdite(entree.loc, base, interdits)) {
      signale('erreur', 'sitemap-prive', entree.loc, 'Le sitemap liste une URL interdite par robots.txt.');
    }
    if (page.canonical && page.canonical !== entree.loc) {
      signale('erreur', 'sitemap-non-canonical', entree.loc, `Le sitemap liste une URL dont la canonical est ${page.canonical}.`);
    }
  }

  for (const [url, page] of pages) {
    if (page.statut === 0) {
      signale('erreur', 'injoignable', url, `Injoignable : ${page.erreur}`);
      continue;
    }
    if (page.statut >= 500) signale('erreur', 'erreur-serveur', url, `Réponse ${page.statut}.`);
    if (page.statut !== 200) continue;

    if (interdite(url, base, interdits)) {
      if (estIndexable(page.robots)) {
        signale('erreur', 'prive-indexable', url, 'Page interdite par robots.txt mais indexable (aucun `noindex`).');
      }
      continue;
    }

    if (!page.canonical) signale('erreur', 'canonical-absente', url, 'Aucune balise canonical.');
    else if (!/^https?:\/\//.test(page.canonical)) signale('erreur', 'canonical-relative', url, `Canonical relative : ${page.canonical}`);
    else if (page.canonical !== url) {
      signale('avertissement', 'canonical-non-auto', url, `Canonical non auto-référente : ${page.canonical}`);
    }

    const attendue = langueDuChemin(url, base);
    if (page.lang && page.lang.slice(0, 2) !== attendue) {
      signale('erreur', 'lang-incoherent', url, `\`<html lang="${page.lang}">\` sur une URL ${attendue}.`);
    }

    const groupe = page.alternates ?? {};
    const langues = Object.keys(groupe).filter((l) => l !== 'x-default');
    if (langues.length > 0) {
      if (!groupe['x-default']) signale('erreur', 'x-default-absent', url, 'Groupe hreflang sans `x-default`.');
      else if (!Object.values(groupe).includes(groupe['x-default'])) {
        signale('erreur', 'x-default-hors-groupe', url, `\`x-default\` hors du groupe : ${groupe['x-default']}`);
      }
      for (const [langue, href] of Object.entries(groupe)) {
        if (!/^https?:\/\//.test(href)) signale('erreur', 'hreflang-relatif', url, `hreflang \`${langue}\` relatif : ${href}`);
      }
      if (estIndexable(page.robots) && page.canonical && !Object.values(groupe).includes(page.canonical)) {
        signale('erreur', 'hreflang-non-auto', url, 'Le groupe hreflang ne se désigne pas lui-même.');
      }
      for (const [langue, href] of Object.entries(groupe)) {
        if (langue === 'x-default') continue;
        const cible = pages.get(href);
        if (!cible) continue;
        if (cible.statut !== 200) {
          signale('erreur', 'hreflang-non-200', url, `hreflang \`${langue}\` → ${href} répond ${cible.statut}.`);
          continue;
        }
        if (!estIndexable(cible.robots)) {
          signale('erreur', 'hreflang-noindex', url, `hreflang \`${langue}\` → ${href} est en \`noindex\`.`);
        }
        const retour = cible.alternates ?? {};
        if (!Object.values(retour).includes(page.canonical ?? url)) {
          signale('erreur', 'hreflang-non-reciproque', url, `hreflang \`${langue}\` → ${href} ne renvoie pas vers cette page.`);
        }
      }
    }

    if (estIndexable(page.robots) && page.canonical === url && !dansSitemap.has(url)) {
      signale('erreur', 'absente-du-sitemap', url, 'Page 200 indexable et auto-canonical, absente du sitemap.');
    }

    if (!page.titre) signale('avertissement', 'titre-absent', url, 'Page sans `<title>`.');
    if (!page.description) signale('avertissement', 'description-absente', url, 'Page sans meta description.');
    if (!page.h1) signale('avertissement', 'h1-absent', url, 'Page sans `<h1>`.');
  }

  return anomalies;
}

// --- Rapport --------------------------------------------------------------

function resumeMarkdown(rapport) {
  const { base, etiquette, horodatage, sitemapFichiers, pages, anomalies, statistiques } = rapport;
  const erreurs = anomalies.filter((a) => a.gravite === 'erreur');
  const avertissements = anomalies.filter((a) => a.gravite === 'avertissement');
  const lignes = [
    `# Audit SEO — ${etiquette || 'sans étiquette'}`,
    '',
    `- Base : \`${base}\``,
    `- Date : ${horodatage}`,
    `- Verdict : **${erreurs.length === 0 ? 'conforme' : 'non conforme'}** (${erreurs.length} erreurs, ${avertissements.length} avertissements)`,
    '',
    '## Couverture',
    '',
    `| Mesure | Valeur |`,
    `|---|---|`,
    `| Fichiers sitemap lus | ${sitemapFichiers.length} |`,
    `| URL listées au sitemap | ${statistiques.sitemap} |`,
    `| Pages interrogées | ${pages.length} |`,
    `| Pages 200 | ${statistiques.ok} |`,
    `| Pages indexables | ${statistiques.indexables} |`,
    `| Temps de réponse médian | ${statistiques.msecMedian} ms |`,
    `| Temps de réponse p90 | ${statistiques.msecP90} ms |`,
    '',
    '## Pages par langue',
    '',
    '| Langue | Pages 200 | Indexables | Au sitemap |',
    '|---|---|---|---|',
    ...LOCALES.map((l) => {
      const s = statistiques.parLangue[l] ?? { ok: 0, indexables: 0, sitemap: 0 };
      return `| ${l} | ${s.ok} | ${s.indexables} | ${s.sitemap} |`;
    }),
    '',
    '## Pages par type',
    '',
    '| Type | Pages 200 | Indexables | Au sitemap | Temps médian |',
    '|---|---|---|---|---|',
    ...Object.entries(statistiques.parType ?? {})
      .sort((a, b) => b[1].ok - a[1].ok)
      .map(([type, s]) => `| ${type} | ${s.ok} | ${s.indexables} | ${s.sitemap} | ${s.msecMedian} ms |`),
    '',
  ];

  if (Array.isArray(rapport.villesSansIntroduction)) {
    lignes.push(
      '## Reste-à-faire éditorial (SEO-8)',
      '',
      rapport.villesSansIntroduction.length === 0
        ? 'Toutes les villes indexées ont une introduction relue.'
        : `${rapport.villesSansIntroduction.length} villes indexées sans introduction relue : ` +
          rapport.villesSansIntroduction.map((slug) => `\`${slug}\``).join(', '),
      '',
    );
  }

  if (anomalies.length > 0) {
    const parCode = new Map();
    for (const a of anomalies) parCode.set(a.code, (parCode.get(a.code) ?? 0) + 1);
    lignes.push('## Anomalies par type', '', '| Code | Gravité | Occurrences |', '|---|---|---|');
    for (const [code, nombre] of [...parCode].sort((a, b) => b[1] - a[1])) {
      const gravite = anomalies.find((a) => a.code === code).gravite;
      lignes.push(`| \`${code}\` | ${gravite} | ${nombre} |`);
    }
    lignes.push('', '## Détail (30 premières)', '');
    for (const a of anomalies.slice(0, 30)) lignes.push(`- \`${a.code}\` — ${a.url}\n  ${a.message}`);
    if (anomalies.length > 30) lignes.push(`- … ${anomalies.length - 30} autres, voir le JSON.`);
    lignes.push('');
  } else {
    lignes.push('Aucune anomalie.', '');
  }
  return lignes.join('\n');
}

function statistiques(base, sitemap, pages) {
  const valeurs = [...pages.values()];
  const msec = valeurs.filter((p) => p.statut === 200).map((p) => p.msec).sort((a, b) => a - b);
  const quantile = (q) => (msec.length === 0 ? 0 : msec[Math.min(msec.length - 1, Math.floor(msec.length * q))]);
  const dansSitemap = new Set(sitemap.map((e) => e.loc));
  const parLangue = Object.fromEntries(LOCALES.map((l) => [l, { ok: 0, indexables: 0, sitemap: 0 }]));
  const parType = {};
  for (const [url, page] of pages) {
    const langue = langueDuChemin(url, base);
    if (page.statut !== 200) continue;
    parLangue[langue].ok += 1;
    if (estIndexable(page.robots)) parLangue[langue].indexables += 1;
    if (dansSitemap.has(url)) parLangue[langue].sitemap += 1;
    const type = typeDePage(url, base);
    parType[type] ??= { ok: 0, indexables: 0, sitemap: 0, msec: [] };
    parType[type].ok += 1;
    if (estIndexable(page.robots)) parType[type].indexables += 1;
    if (dansSitemap.has(url)) parType[type].sitemap += 1;
    parType[type].msec.push(page.msec);
  }
  for (const stats of Object.values(parType)) {
    const tries = stats.msec.sort((a, b) => a - b);
    stats.msecMedian = tries.length === 0 ? 0 : tries[Math.floor(tries.length / 2)];
    delete stats.msec;
  }
  return {
    sitemap: sitemap.length,
    ok: valeurs.filter((p) => p.statut === 200).length,
    indexables: valeurs.filter((p) => p.statut === 200 && estIndexable(p.robots)).length,
    msecMedian: quantile(0.5),
    msecP90: quantile(0.9),
    parLangue,
    parType,
  };
}

// --- Programme ------------------------------------------------------------

async function principal() {
  const options = lisArguments(process.argv.slice(2));
  const base = options.base;
  process.stderr.write(`Audit SEO de ${base}\n`);

  const robotsTxt = await recupere(`${base}/robots.txt`);
  if (robotsTxt.statut !== 200) {
    process.stderr.write(`robots.txt indisponible (${robotsTxt.statut || robotsTxt.erreur}).\n`);
    return 2;
  }
  const { interdits, sitemaps } = analyseRobots(robotsTxt.corps);
  const racines = sitemaps.length > 0 ? sitemaps : [`${base}/sitemap.xml`];
  // Un sitemap déclaré sur le domaine de production reste lisible localement.
  const racinesLocales = racines.map((url) => {
    try {
      return `${base}${new URL(url).pathname}`;
    } catch {
      return url;
    }
  });

  const lectures = await Promise.all(racinesLocales.map((url) => lisSitemaps(url)));
  const sitemap = lectures.flatMap((l) => l.entrees);
  const sitemapFichiers = lectures.flatMap((l) => l.fichiers);
  process.stderr.write(`${sitemap.length} URL au sitemap (${sitemapFichiers.length} fichiers).\n`);

  /**
   * Origine canonique du site, telle que le sitemap la déclare.
   *
   * Auditer `http://localhost:3000` ne veut pas dire que le site s'appelle
   * ainsi : le sitemap, les canonical et les hreflang portent le domaine
   * public. Sans cette correspondance, l'audit local ne suivait AUCUNE URL du
   * sitemap et signalait chaque canonical comme non auto-référente.
   *
   * On raisonne donc en URL canonique — c'est l'identité de la page — et on
   * interroge l'origine auditée.
   */
  const origineCanonique = (() => {
    try {
      return new URL(sitemap[0]?.loc ?? base).origin;
    } catch {
      return base;
    }
  })();
  const versCanonique = (url) => (url.startsWith(base) ? `${origineCanonique}${url.slice(base.length)}` : url);
  const versAuditee = (url) => (url.startsWith(origineCanonique) ? `${base}${url.slice(origineCanonique.length)}` : url);
  if (origineCanonique !== base) {
    console.error(`Origine canonique : ${origineCanonique} (interrogée sur ${base}).`);
  }

  // Les alternates annoncés font partie du périmètre : sans eux, la
  // réciprocité hreflang ne peut pas être établie.
  const aVisiter = new Set();
  for (const entree of sitemap) {
    aVisiter.add(entree.loc);
    for (const href of Object.values(entree.alternates)) aVisiter.add(href);
  }
  for (const chemin of ['/', '/catalogue']) aVisiter.add(versCanonique(`${base}${chemin === '/' ? '' : chemin}`));
  // Pages privées : leur non-indexabilité se contrôle, elle ne se suppose pas.
  for (const chemin of interdits.filter((p) => !p.endsWith('/'))) aVisiter.add(`${origineCanonique}${chemin}`);

  const liste = [...aVisiter].filter((url) => url.startsWith(origineCanonique) && !url.endsWith('/robots.txt'));
  const retenues = options.limite > 0 ? liste.slice(0, options.limite) : liste;
  console.error(`${retenues.length} pages à interroger`);

  const pages = new Map();
  await enParallele(retenues, options.concurrence, async (url) => {
    const reponse = await recupere(versAuditee(url));
    const analyse = reponse.statut === 200 && /text\/html/.test(reponse.typeContenu ?? '') ? analysePage(reponse.corps) : {};
    pages.set(url, {
      statut: reponse.statut,
      msec: reponse.msec,
      octets: reponse.octets,
      emplacement: reponse.emplacement,
      erreur: reponse.erreur,
      ...analyse,
      jsonLd: undefined, // le détail reste hors rapport : seuls les types comptent ici
    });
  });

  const anomalies = controle({ base: origineCanonique, interdits, sitemap, pages });
  const horodatage = new Date().toISOString();
  const rapport = {
    base,
    etiquette: options.etiquette,
    horodatage,
    robots: { interdits, sitemaps },
    sitemapFichiers,
    sitemap: sitemap.map(({ loc, lastmod, alternates, source }) => ({ loc, lastmod, alternates, source })),
    pages: [...pages].map(([url, page]) => ({ url, ...page })),
    anomalies,
    origineCanonique,
    statistiques: statistiques(origineCanonique, sitemap, pages),
    villesSansIntroduction: await villesSansIntroduction(sitemap, origineCanonique),
  };

  const dossier = path.resolve(process.cwd(), options.sortie);
  await mkdir(dossier, { recursive: true });
  const nom = `seo-audit${options.etiquette ? `-${options.etiquette}` : ''}-${horodatage.slice(0, 19).replace(/[:T]/g, '')}`;
  await writeFile(path.join(dossier, `${nom}.json`), `${JSON.stringify(rapport, null, 2)}\n`, 'utf8');
  if (!options.jsonSeul) {
    await writeFile(path.join(dossier, `${nom}.md`), resumeMarkdown(rapport), 'utf8');
  }

  const erreurs = anomalies.filter((a) => a.gravite === 'erreur');
  process.stdout.write(resumeMarkdown(rapport));
  process.stderr.write(`\nRapport : ${path.join(dossier, `${nom}.json`)}\n`);
  return erreurs.length === 0 ? 0 : 1;
}

principal()
  .then((code) => process.exit(code))
  .catch((error) => {
    process.stderr.write(`Panne : ${error?.stack ?? error}\n`);
    process.exit(2);
  });
