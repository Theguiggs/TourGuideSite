import type { InterfaceLocale } from '@/lib/i18n/locales';

/**
 * Libellés d'interface des pages de conseils, dans les six langues.
 *
 * Écrits ici en clair plutôt que dérivés par `translate()` : ces phrases sont
 * nouvelles, et le dictionnaire d'interface n'en connaît aucune.
 */
export interface EditorialUi {
  home: string;
  tips: string;
  indexTitle: string;
  indexDescription: string;
  indexLead: string;
  readArticle: string;
  otherTips: string;
  cityTours: (city: string) => string;
  planCity: (city: string) => string;
  beforeLeaving: string;
  fallback: string;
  publishedOn: string;
}

export const EDITORIAL_UI: Record<InterfaceLocale, EditorialUi> = {
  fr: {
    home: 'Accueil',
    tips: 'Conseils de visite',
    indexTitle: 'Conseils pour visiter les villes à pied',
    indexDescription: 'Parcours, étapes, durée et conseils pratiques pour préparer une visite à pied, ville par ville, avant d’écouter la visite audio Murmure.',
    indexLead: 'Chaque article décrit un parcours réel : par où commencer, ce que l’on voit à chaque étape, combien de temps prévoir et comment s’équiper.',
    readArticle: 'Lire l’article',
    otherTips: 'Autres conseils de visite',
    cityTours: (city) => `Voir les visites audio à ${city}`,
    planCity: (city) => `Préparer votre visite de ${city}`,
    beforeLeaving: 'Avant de partir :',
    fallback: 'Cet article n’est pas encore traduit dans votre langue : il est affiché dans sa version originale.',
    publishedOn: 'Publié le',
  },
  en: {
    home: 'Home',
    tips: 'Travel tips',
    indexTitle: 'Tips for exploring cities on foot',
    indexDescription: 'Routes, stops, timing and practical advice to plan a walk, city by city, before listening to the Murmure audio tour.',
    indexLead: 'Each article describes a real route: where to start, what you will see at each stop, how much time to allow and what to bring.',
    readArticle: 'Read the article',
    otherTips: 'More travel tips',
    cityTours: (city) => `See audio tours in ${city}`,
    planCity: (city) => `Plan your visit to ${city}`,
    beforeLeaving: 'Before you set off:',
    fallback: 'This article has not been translated into your language yet, so it is shown in its original version.',
    publishedOn: 'Published on',
  },
  es: {
    home: 'Inicio',
    tips: 'Consejos de visita',
    indexTitle: 'Consejos para visitar las ciudades a pie',
    indexDescription: 'Rutas, etapas, duración y consejos prácticos para preparar un paseo, ciudad por ciudad, antes de escuchar la visita de audio Murmure.',
    indexLead: 'Cada artículo describe una ruta real: por dónde empezar, qué se ve en cada etapa, cuánto tiempo prever y qué llevar.',
    readArticle: 'Leer el artículo',
    otherTips: 'Más consejos de visita',
    cityTours: (city) => `Ver las visitas de audio en ${city}`,
    planCity: (city) => `Preparar tu visita a ${city}`,
    beforeLeaving: 'Antes de salir:',
    fallback: 'Este artículo aún no está traducido a tu idioma: se muestra en su versión original.',
    publishedOn: 'Publicado el',
  },
  de: {
    home: 'Startseite',
    tips: 'Reisetipps',
    indexTitle: 'Tipps für Städte zu Fuß',
    indexDescription: 'Routen, Stationen, Zeitbedarf und praktische Hinweise, um einen Spaziergang Stadt für Stadt vorzubereiten, bevor Sie die Murmure-Audiotour hören.',
    indexLead: 'Jeder Artikel beschreibt eine reale Route: wo man beginnt, was man an jeder Station sieht, wie viel Zeit man einplant und was man mitnimmt.',
    readArticle: 'Artikel lesen',
    otherTips: 'Weitere Reisetipps',
    cityTours: (city) => `Audiotouren in ${city} ansehen`,
    planCity: (city) => `Ihren Besuch in ${city} vorbereiten`,
    beforeLeaving: 'Vor dem Start:',
    fallback: 'Dieser Artikel ist noch nicht in Ihre Sprache übersetzt und wird in der Originalfassung angezeigt.',
    publishedOn: 'Veröffentlicht am',
  },
  it: {
    home: 'Home',
    tips: 'Consigli di visita',
    indexTitle: 'Consigli per visitare le città a piedi',
    indexDescription: 'Percorsi, tappe, durata e consigli pratici per preparare una passeggiata, città per città, prima di ascoltare la visita audio Murmure.',
    indexLead: 'Ogni articolo descrive un percorso reale: da dove iniziare, cosa si vede a ogni tappa, quanto tempo prevedere e cosa portare.',
    readArticle: 'Leggi l’articolo',
    otherTips: 'Altri consigli di visita',
    cityTours: (city) => `Vedi le visite audio a ${city}`,
    planCity: (city) => `Preparare la visita a ${city}`,
    beforeLeaving: 'Prima di partire:',
    fallback: 'Questo articolo non è ancora tradotto nella tua lingua: viene mostrato nella versione originale.',
    publishedOn: 'Pubblicato il',
  },
  nl: {
    home: 'Home',
    tips: 'Reistips',
    indexTitle: 'Tips om steden te voet te ontdekken',
    indexDescription: 'Routes, stops, duur en praktische tips om een wandeling stad voor stad voor te bereiden, voordat je de Murmure-audiotour beluistert.',
    indexLead: 'Elk artikel beschrijft een echte route: waar je begint, wat je bij elke stop ziet, hoeveel tijd je nodig hebt en wat je meeneemt.',
    readArticle: 'Lees het artikel',
    otherTips: 'Meer reistips',
    cityTours: (city) => `Bekijk audiotours in ${city}`,
    planCity: (city) => `Je bezoek aan ${city} voorbereiden`,
    beforeLeaving: 'Voor je vertrekt:',
    fallback: 'Dit artikel is nog niet in jouw taal vertaald en wordt in de oorspronkelijke versie getoond.',
    publishedOn: 'Gepubliceerd op',
  },
};

/** Libellé du lien de pied de page vers l'index. */
export const TIPS_NAV_LABEL: Record<InterfaceLocale, string> = {
  fr: EDITORIAL_UI.fr.tips,
  en: EDITORIAL_UI.en.tips,
  es: EDITORIAL_UI.es.tips,
  de: EDITORIAL_UI.de.tips,
  it: EDITORIAL_UI.it.tips,
  nl: EDITORIAL_UI.nl.tips,
};
