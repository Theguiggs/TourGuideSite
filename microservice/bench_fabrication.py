#!/usr/bin/env python
"""
Banc de mesure du PLANCHER de fabrication.

Ce que ce banc mesure
---------------------
Le temps fournisseur incompressible d'une fabrication : la traduction d'une
Scène et la synthèse d'une Scène, chronométrées SÉPARÉMENT, sur le corpus réel
et sur le fournisseur sous contrat. Aucun pipeline futur (stories 9 à 14) ne
pourra descendre sous ce plancher — c'est ce qui en fait une donnée de
conception, et non une curiosité.

Ce que ce banc NE mesure PAS
----------------------------
Le délai « paiement confirmé → première Scène écoutable » du SPEC. Il vaut
structurellement zéro aujourd'hui : les deux premières Scènes sont écoutables
sans paiement (`FREE_PREVIEW_SCENE_COUNT = 2`), et le pipeline de fabrication
n'existe pas. Produire un chiffre ici serait produire un chiffre faux. Le
rapport le DIT, et consigne à la place les postes du budget qui ne sont pas
encore mesurables, avec leur coût constaté et l'anchor qui les porte.

Pourquoi séquentiel, et non un test de charge
---------------------------------------------
`loadtest.py` sature volontairement la file : il mesure la TENUE du service.
Ce banc mesure le COÛT D'UNE FABRICATION. Or `_INFERENCE_EXECUTOR` sérialise
toute inférence (`local_server.py:136-141`) et `GET /v1/jobs/{id}` n'expose ni
`created_at` ni `started_at` : le temps d'attente en file n'est pas
soustractible de l'extérieur. Toute mesure concurrente mélangerait inférence et
file sans moyen de les séparer. Le séquentiel est la seule mesure honnête
accessible sans toucher au code de production.

Lecture seule
-------------
Le banc ne parle qu'au microservice, sur quatre routes : `/health`,
`/v1/translate/batch`, `/v1/tts/generate`, `/v1/jobs/{id}`. Aucun SDK AWS n'est
importé, aucune écriture DynamoDB ni S3 n'est possible. Les octets audio rendus
sont mesurés puis jetés. Les routes inscrites au rapport sont OBSERVÉES par un
crochet HTTP, jamais déclarées à la main.

Emploi
------
    # description des cibles, aucun appel fournisseur
    python bench_fabrication.py --dry-run

    # rapport sans dépense : les postes constatés et estimés seuls
    python bench_fabrication.py --sans-serie

    # série complète — exige un microservice SOUS CONTRAT (tts_mode: azure)
    # démarré avec TRANSLATION_CACHE_MAX=0
    python bench_fabrication.py

Le banc refuse de mesurer en mode dégradé : chronométrer `edge-tts` ne répond à
aucune question.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import re
import statistics
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

import httpx

RACINE_MICROSERVICE = Path(__file__).resolve().parent
if str(RACINE_MICROSERVICE) not in sys.path:
    sys.path.insert(0, str(RACINE_MICROSERVICE))

# `submit` / `poll` / `pct` sont réutilisés TELS QUELS : le contrat
# 202 / `job_id` / sondage est identique pour la traduction et pour la synthèse,
# un seul harnais couvre les deux. Les réécrire aurait produit une deuxième
# vérité sur le même protocole. Ce qu'ils ne rendent pas — le statut HTTP qui a
# causé un échec — est récupéré par le `Journal` plutôt qu'en les modifiant.
from loadtest import Stats, pct, poll, submit  # noqa: E402
from services.tts_azure import MAX_BILLABLE_CHARS  # noqa: E402
from services.tts_provider import billed_characters  # noqa: E402

RACINE_WEB = RACINE_MICROSERVICE.parent
RACINE_DEPOT = RACINE_WEB.parent
CORPUS_SOURCE_DEFAUT = RACINE_WEB / "content" / "translations" / "source"
CORPUS_TRADUIT_DEFAUT = RACINE_WEB / "content" / "translations" / "out"
DOSSIER_MESURES_DEFAUT = RACINE_MICROSERVICE / "mesures"

# Les deux cibles nommées par la story. Elles ne sont pas interchangeables :
# Reims porte la Visite MÉDIANE, Grasse porte la Scène la plus longue du corpus
# et est la SEULE Visite hors seed. La médianité de Reims n'est pas prise pour
# argent comptant : `mesurer_medianite()` la RECALCULE et le rapport publie le
# rang obtenu.
ID_VISITE_MEDIANE = "seed-100-reims-art-deco-renaissance"
ID_VISITE_HORS_NORME = "78e3f3cc-7c1d-4a88-a274-8690e9411fc2"

# Miroir de `local_server.py:48-59`. Recopié plutôt qu'importé : importer
# `local_server` exige `MICROSERVICE_API_KEY` au chargement du module, ce qu'un
# banc n'a aucune raison d'exiger pour décrire ses cibles. La dérive entre les
# deux tables est éprouvée par `tests/test_bench_fabrication.py`.
MARIAN_PAIRES = {("fr", "en"), ("fr", "de"), ("fr", "es"), ("en", "it")}
PIVOT_VIA = {("fr", "it"): "en"}

# Bornes de l'API du microservice, recopiées et ÉPINGLÉES par les épreuves.
# `BatchTranslateRequest.texts` : au plus 200 phrases par requête.
PLAFOND_PHRASES_API = 200
# `TTSRequest.text` : au plus 10 000 caractères BRUTS. Limite distincte du
# plafond de facturation Azure, et atteinte avant lui sur un texte sans balisage.
PLAFOND_TEXTE_TTS = 10_000
# Langues acceptées par chaque motif pydantic. Elles DIFFÈRENT : `nl` est
# synthétisable mais pas traduisible par le microservice, `ja|ko|zh|ru` non plus.
LANGUES_TRADUCTION_API = {"fr", "en", "it", "de", "es"}
LANGUES_SYNTHESE_API = {"fr", "en", "it", "de", "es", "nl", "ja", "ko", "zh", "ru"}

LANGUES_DEFAUT = ("de", "en", "es", "it")
LANGUE_SOURCE = "fr"

# `loadtest.poll` sonde toutes les 400 ms. Toute durée mesurée ici est donc un
# MAJORANT, exact à +0 / +400 ms près. Le chiffre est consigné au rapport : une
# mesure sans sa résolution n'est pas une mesure.
RESOLUTION_SONDAGE_S = 0.4
TIMEOUT_SONDAGE_TRADUCTION_S = 300
TIMEOUT_SONDAGE_SYNTHESE_S = 300

# Azure Neural, palier standard. Tarif public relevé le 2026-08-22 et consigné
# à l'addendum du PRD §2 ; il n'est pas remesuré par ce banc.
PRIX_AZURE_USD_PAR_MILLION = 16.0
PRIX_AZURE_SOURCE = "addendum du PRD §2, tarif relevé le 2026-08-22"

# Cibles du SPEC pour le délai avant première écoute. Le banc ne mesure pas ce
# délai (voir plus haut) ; il compare son plancher à ces cibles pour dire si le
# budget restant est tenable.
CIBLE_SPEC_P50_S = 30.0
CIBLE_SPEC_P95_S = 60.0

# Clés que `/health` DOIT rendre pour qu'une garde ait un sens. Un service qui
# n'en expose aucune passerait une garde écrite avec des valeurs par défaut, et
# le rapport imprimerait « 0 (mesuré) » pour un champ jamais rendu.
CLES_SANTE_REQUISES = ("tts_mode", "inflight_jobs", "cache_size")

# --- Méthodes ---------------------------------------------------------------
# « Chaque chiffre porte sa méthode. Un chiffre sans méthode n'entre pas au
# rapport. » La règle est mécanique : aucun nombre ne peut entrer au rapport
# autrement qu'enveloppé par `chiffre()`.
MESURE = "mesuré"
CONSTAT = "constaté"
ESTIME = "estimé"
METHODES = (MESURE, CONSTAT, ESTIME)


class ErreurCorpus(RuntimeError):
    """Le corpus disque ne porte pas ce que le banc attend. On s'arrête : mesurer
    sur une cible de remplacement rendrait Reims et Grasse incomparables."""


class BancRefuse(RuntimeError):
    """Le banc refuse de mesurer, et dit pourquoi. Code de sortie non nul."""


class PaireNonSupportee(BancRefuse):
    """Paire absente de `MARIAN_MODELS` — arrêt explicite nommant la paire."""


def chiffre(valeur, methode: str, unite: str | None = None, note: str | None = None) -> dict:
    """Un nombre et sa méthode, indissociables."""
    if methode not in METHODES:
        raise ValueError(f"Méthode inconnue : {methode!r} (attendu {METHODES})")
    if isinstance(valeur, bool) or not isinstance(valeur, (int, float)):
        raise ValueError(f"Un chiffre doit être un nombre, pas {type(valeur).__name__}")
    noeud = {"valeur": valeur, "methode": methode}
    if unite:
        noeud["unite"] = unite
    if note:
        noeud["note"] = note
    return noeud


def _nombre_lisible(valeur) -> str:
    if isinstance(valeur, float):
        texte = f"{valeur:,.2f}"
        # Un taux de 100,00 % se lit 100 % ; une durée de 3,78 s garde ses
        # décimales. On ne rend jamais une précision qu'on n'a pas.
        entier, _, decimales = texte.partition(".")
        decimales = decimales.rstrip("0")
        texte = f"{entier}.{decimales}" if decimales else entier
        return texte.replace(",", " ").replace(".", ",")
    return f"{valeur:,}".replace(",", " ")


def rendu(noeud: dict | None) -> str:
    """Rendu lisible d'un chiffre — la méthode ne se perd jamais en chemin."""
    if noeud is None:
        return "—"
    texte = _nombre_lisible(noeud["valeur"])
    if noeud.get("unite"):
        texte = f"{texte} {noeud['unite']}"
    return f"{texte} *({noeud['methode']})*"


# ── Corpus ──────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class Scene:
    scene_id: str
    index: int
    titre: str
    texte: str
    chars: int


@dataclass(frozen=True)
class Visite:
    tour_id: str
    ville: str
    titre: str
    langue_base: str
    chars: int
    scenes: tuple[Scene, ...]
    fichier: str

    @property
    def hors_seed(self) -> bool:
        """Le corpus est un seed de 101 Visites, à une exception près. Cette
        exception est une cible du banc, et la nommer fait partie du rapport."""
        return not self.tour_id.startswith("seed-")

    @property
    def chars_reels(self) -> int:
        """Somme des longueurs RÉELLES des textes. Le corpus déclare aussi un
        `chars` par Scène ; on ne mélange jamais les deux dans une même colonne."""
        return sum(len(s.texte) for s in self.scenes)

    @property
    def scene_la_plus_longue(self) -> Scene:
        return max(self.scenes, key=lambda s: s.chars)


def _visite_depuis_json(donnees: dict, fichier: str) -> Visite:
    scenes = []
    for brut in donnees.get("scenes", []):
        texte = brut.get("text", "") or ""
        scenes.append(
            Scene(
                scene_id=brut.get("sceneId", ""),
                index=int(brut.get("index", len(scenes))),
                titre=brut.get("title", "") or "",
                texte=texte,
                chars=int(brut.get("chars", len(texte))),
            )
        )
    if not scenes:
        raise ErreurCorpus(f"{fichier} : aucune Scène")
    return Visite(
        tour_id=donnees.get("tourId", ""),
        ville=donnees.get("city", "") or "",
        titre=donnees.get("title", "") or "",
        langue_base=donnees.get("baseLanguage", LANGUE_SOURCE),
        chars=int(donnees.get("chars", sum(s.chars for s in scenes))),
        scenes=tuple(sorted(scenes, key=lambda s: s.index)),
        fichier=fichier,
    )


def charger_corpus(racine: Path) -> list[Visite]:
    """Charge le corpus DEPUIS LE DISQUE. Aucun accès AWS n'est nécessaire pour
    choisir ni charger les cibles — il est déjà exporté."""
    racine = Path(racine)
    if not racine.is_dir():
        raise ErreurCorpus(f"Corpus introuvable : {racine}")
    fichiers = sorted(racine.glob("*.json"))
    if not fichiers:
        raise ErreurCorpus(f"Corpus vide : {racine}")
    visites = []
    for chemin in fichiers:
        try:
            donnees = json.loads(chemin.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise ErreurCorpus(f"{chemin.name} illisible : {exc}") from exc
        visites.append(_visite_depuis_json(donnees, chemin.name))
    return visites


def statistiques_corpus(visites: list[Visite]) -> dict:
    """La distribution, et non la seule moyenne — PAR SCÈNE ET PAR VISITE.

    Les deux distributions ne disent pas la même chose. Celle par Scène situe la
    Scène de Grasse ; celle par Visite situe le COÛT DE FABRICATION d'une
    Visite, qui est ce que la story 11 budgète."""
    toutes = [s for v in visites for s in v.scenes]
    par_scene = sorted(s.chars for s in toutes)
    par_visite = sorted(v.chars_reels for v in visites)
    return {
        "nb_visites": len(visites),
        "nb_scenes": len(toutes),
        "chars_min": par_scene[0],
        "chars_median": float(statistics.median(par_scene)),
        "chars_max": par_scene[-1],
        "visite_chars_min": par_visite[0],
        "visite_chars_median": float(statistics.median(par_visite)),
        "visite_chars_max": par_visite[-1],
        "nb_visites_hors_seed": sum(1 for v in visites if v.hors_seed),
    }


def mesurer_medianite(visites: list[Visite], cible: Visite) -> dict:
    """La médianité de la cible est DÉRIVÉE, jamais affirmée.

    `ID_VISITE_MEDIANE` est en dur parce que la story nomme la cible et que
    changer de cible rendrait deux exécutions incomparables. Mais l'affirmation
    « c'est la Visite médiane » se vérifie, et le rapport publie le rang obtenu
    plutôt que de répéter la story."""
    totaux = sorted(v.chars_reels for v in visites)
    mediane = statistics.median(totaux)
    rang = sum(1 for t in totaux if t < cible.chars_reels)
    return {
        "chars_cible": cible.chars_reels,
        "chars_median_du_corpus": float(mediane),
        "rang": rang,
        "nb_visites": len(totaux),
        "percentile": round(100.0 * rang / max(len(totaux) - 1, 1), 1),
        "ecart_a_la_mediane": round(cible.chars_reels / mediane, 3) if mediane else 0.0,
        "est_la_mediane": abs(cible.chars_reels - mediane) < 1e-9,
    }


@dataclass(frozen=True)
class Cibles:
    mediane: Visite
    hors_norme: Visite
    scene_hors_norme: Scene
    singularite: dict
    medianite: dict


def selectionner_cibles(
    visites: list[Visite],
    id_mediane: str = ID_VISITE_MEDIANE,
    id_hors_norme: str = ID_VISITE_HORS_NORME,
) -> Cibles:
    """Résout les deux cibles nommées et DÉRIVE ce que la story affirme d'elles.

    Ni la médianité de Reims ni la singularité de Grasse ne sont recopiées : les
    deux sont recalculées sur le corpus à chaque exécution. Le jour où le corpus
    bouge, le rapport le dira au lieu de répéter une affirmation périmée."""
    par_id = {v.tour_id: v for v in visites}
    manquantes = [i for i in (id_mediane, id_hors_norme) if i not in par_id]
    if manquantes:
        raise ErreurCorpus(
            "Cible absente du corpus : " + ", ".join(repr(m) for m in manquantes)
            + " — le banc ne mesure pas sur une cible de remplacement."
        )
    mediane = par_id[id_mediane]
    hors_norme = par_id[id_hors_norme]
    scene_hors_norme = hors_norme.scene_la_plus_longue

    toutes = sorted(
        ((s, v) for v in visites for s in v.scenes),
        key=lambda couple: couple[0].chars,
        reverse=True,
    )
    n = len(hors_norme.scenes)
    tete = toutes[:n]
    totaux = sorted(v.chars_reels for v in visites)
    mediane_visite = statistics.median(totaux)
    singularite = {
        "possede_les_n_plus_longues": all(v.tour_id == hors_norme.tour_id for _, v in tete),
        "n": n,
        "scene_la_plus_longue_du_corpus": toutes[0][0].scene_id,
        "detenue_par_la_cible": toutes[0][1].tour_id == hors_norme.tour_id,
        "hors_seed": hors_norme.hors_seed,
        "nb_visites_hors_seed": sum(1 for v in visites if v.hors_seed),
        "chars_premiere_scene_hors_cible": next(
            (s.chars for s, v in toutes if v.tour_id != hors_norme.tour_id), 0
        ),
        # La singularité qui compte pour un budget de fabrication n'est pas la
        # Scène : c'est la VISITE. Une Scène six fois la médiane se mesure ;
        # une Visite cinq fois la médiane se paie sept fois.
        "visite_chars": hors_norme.chars_reels,
        "visite_ecart_a_la_mediane": (
            round(hors_norme.chars_reels / mediane_visite, 2) if mediane_visite else 0.0
        ),
        "nb_scenes_de_la_cible": n,
    }
    return Cibles(
        mediane, hors_norme, scene_hors_norme, singularite,
        mesurer_medianite(visites, mediane),
    )


def charger_textes_traduits(racine: Path, tour_id: str, langue: str) -> dict[str, str]:
    """Textes de narration dans la langue cible, depuis le corpus retraduit.

    C'est ce texte-là qu'une fabrication réelle synthétise, pas le français. Le
    mesurer sur la source aurait produit un plancher pour une langue que
    personne n'achète."""
    chemin = Path(racine) / f"{tour_id}.json"
    if not chemin.is_file():
        raise ErreurCorpus(f"Corpus traduit introuvable : {chemin}")
    try:
        donnees = json.loads(chemin.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ErreurCorpus(f"{chemin.name} illisible : {exc}") from exc
    bloc = donnees.get(langue)
    if not bloc:
        raise ErreurCorpus(f"{chemin.name} : langue {langue!r} absente du corpus traduit")
    return {s.get("sceneId", ""): (s.get("text", "") or "") for s in bloc.get("scenes", [])}


# ── Découpage en phrases — miroir du client web ─────────────────────────────
# `TourGuideWeb/src/lib/api/translation.ts:13-38`. Le banc envoie EXACTEMENT ce
# que le portail envoie : une Scène = une requête `/v1/translate/batch` portant
# toutes ses phrases. Mesurer autre chose mesurerait un autre pipeline.

_BREAK_RE = re.compile(r"<break\b[^>]*?/?>", re.IGNORECASE)
_PHRASE_RE = re.compile(r"[^.!?]*[.!?]+(?:\s|$)|[^.!?]+$")


def _phrases_du_bloc(bloc: str) -> list[str]:
    texte = bloc.strip()
    if not texte:
        return []
    if len(texte) < 150:
        return [texte]
    parties = [p for p in _PHRASE_RE.findall(texte) if p]
    if len(parties) <= 1:
        return [texte]
    return [p.strip() for p in parties if p.strip()]


def decouper_en_phrases(texte: str) -> list[str]:
    """Les balises `<break/>` sont du balisage, pas du contenu traduisible : le
    portail les retire avant l'envoi et les réinsère après. On fait pareil."""
    phrases: list[str] = []
    position = 0
    for m in _BREAK_RE.finditer(texte or ""):
        if m.start() > position:
            phrases.extend(_phrases_du_bloc(texte[position:m.start()]))
        position = m.end()
    if position < len(texte or ""):
        phrases.extend(_phrases_du_bloc(texte[position:]))
    return phrases


# ── Paires de traduction ────────────────────────────────────────────────────


def modeles_requis(source: str, cible: str) -> list[str]:
    """Modèles MarianMT qu'une paire fait charger. `fr→it` en fait charger DEUX :
    il pivote par l'anglais, et coûte donc deux inférences."""
    if (source, cible) in MARIAN_PAIRES:
        return [f"{source}-{cible}"]
    via = PIVOT_VIA.get((source, cible))
    if via:
        return modeles_requis(source, via) + modeles_requis(via, cible)
    raise PaireNonSupportee(
        f"Paire absente de MARIAN_MODELS : {source}→{cible}. "
        "Le banc s'arrête plutôt que de mesurer une paire que le service ne sait pas servir."
    )


def est_pivotee(source: str, cible: str) -> bool:
    return (source, cible) in PIVOT_VIA


def pivot_de(source: str, cible: str) -> str | None:
    return PIVOT_VIA.get((source, cible))


# ── Journal des appels — observé, jamais déclaré ────────────────────────────


class Journal:
    """Ce que le banc a RÉELLEMENT demandé au microservice.

    Deux usages. D'abord la preuve de lecture seule : le rapport affirme que le
    banc ne connaît aucune adresse hors du microservice, et cette affirmation
    doit reposer sur des appels observés, pas sur une liste écrite à la main.
    Ensuite le diagnostic : `loadtest.submit` et `loadtest.poll` avalent le
    statut HTTP qui a causé un échec. Plutôt que de les modifier — ils sont
    réutilisés tels quels — on lit ici le statut qu'ils ont vu passer."""

    def __init__(self) -> None:
        self.entrees: list[tuple[str, int]] = []

    @staticmethod
    def route(methode: str, chemin: str) -> str:
        if chemin.startswith("/v1/jobs/"):
            chemin = "/v1/jobs/{id}"
        return f"{methode} {chemin}"

    def brancher(self, client: httpx.AsyncClient) -> None:
        async def sur_reponse(reponse: httpx.Response) -> None:
            requete = reponse.request
            self.entrees.append(
                (self.route(requete.method, requete.url.path), reponse.status_code)
            )

        client.event_hooks["response"] = list(
            client.event_hooks.get("response", [])
        ) + [sur_reponse]

    @property
    def routes(self) -> set[str]:
        return {route for route, _ in self.entrees}

    def marque(self) -> int:
        return len(self.entrees)

    def statuts_depuis(self, marque: int) -> list[int]:
        return [statut for _, statut in self.entrees[marque:]]


def diagnostiquer(statuts: list[int], submits_epuises: int, timeout_s: int) -> str:
    """Nomme la cause d'un échec à partir des statuts HTTP réellement observés.

    Sans cela, un 401 instantané était consigné « sondage expiré au-delà de
    300 s » et une clé absente passait pour de la contre-pression."""
    if any(s == 401 for s in statuts):
        return "authentification refusée (HTTP 401) — MICROSERVICE_API_KEY absente ou fausse"
    if any(s == 422 for s in statuts):
        return "requête refusée (HTTP 422) — la charge ne satisfait pas le contrat de l'API"
    if any(s == 404 for s in statuts):
        return "route ou job inconnu (HTTP 404)"
    if any(s >= 500 for s in statuts):
        premier = next(s for s in statuts if s >= 500)
        return f"erreur serveur (HTTP {premier})"
    if submits_epuises:
        return "contre-pression épuisée (HTTP 429 après toutes les reprises)"
    if any(s == 429 for s in statuts):
        return "contre-pression (HTTP 429)"
    if statuts:
        return f"sondage expiré au-delà de {timeout_s} s (dernier statut HTTP {statuts[-1]})"
    return f"sondage expiré au-delà de {timeout_s} s, sans réponse observée"


# ── Garde d'entrée ──────────────────────────────────────────────────────────


def verifier_garde(sante: dict, cache_non_neutralise: bool = False) -> None:
    """Le banc refuse de mesurer si le service n'est pas dans l'état qui rend la
    mesure interprétable. Il s'arrête AVANT toute dépense, en nommant la cause."""
    manquantes = [c for c in CLES_SANTE_REQUISES if c not in sante]
    if manquantes:
        raise BancRefuse(
            "/health n'expose pas " + ", ".join(manquantes)
            + " : la garde porterait sur des valeurs par défaut, et le rapport "
              "publierait « 0 (mesuré) » pour un champ jamais rendu."
        )
    mode = sante["tts_mode"]
    if mode != "azure":
        raise BancRefuse(
            f"Mode dégradé ou fournisseur indisponible : /health répond tts_mode={mode!r}, "
            "attendu 'azure'. Chronométrer edge-tts ne répond à aucune question — "
            "poser AZURE_SPEECH_KEY et AZURE_SPEECH_REGION, puis relancer."
        )
    inflight = sante["inflight_jobs"]
    if inflight:
        raise BancRefuse(
            f"{inflight} job(s) en vol au démarrage : la mesure inclurait un temps "
            "d'attente en file que `GET /v1/jobs/{id}` ne permet pas de soustraire. "
            "Attendre que le service soit au repos."
        )
    cache = sante["cache_size"]
    if cache and not cache_non_neutralise:
        raise BancRefuse(
            f"Cache de traduction non vide ({cache} entrées) : une Scène déjà traduite "
            "reviendrait instantanément et fausserait le plancher. Redémarrer le service "
            "avec TRANSLATION_CACHE_MAX=0, ou relancer avec --cache-non-neutralise pour "
            "produire une série explicitement déclarée NON VALIDE."
        )


async def relever_sante(client: httpx.AsyncClient, base: str, entetes: dict) -> dict:
    try:
        reponse = await client.get(f"{base}/health", headers=entetes)
    except Exception as exc:  # noqa: BLE001
        raise BancRefuse(
            f"Microservice injoignable sur {base}/health : {exc}. "
            "Le banc s'arrête — un rapport vide se lit comme une mesure à zéro."
        ) from exc
    if reponse.status_code != 200:
        raise BancRefuse(f"/health répond {reponse.status_code} sur {base} — service non exploitable.")
    return reponse.json()


# ── Mesures ─────────────────────────────────────────────────────────────────

ABOUTIE = "aboutie"
ECHEC = "echec"
LIMITE = "limite"


@dataclass
class Mesure:
    cle: str
    chars: int
    duree_s: float | None = None
    chars_factures: int | None = None
    issue: str = ABOUTIE
    motif: str | None = None
    duree_audio_ms: int | None = None

    @property
    def base_normalisation(self) -> int:
        """Les caractères FACTURÉS quand ils existent, sinon les bruts. Les deux
        coïncident sur les langues latines et divergent dès qu'un idéogramme
        entre au corpus : Azure les compte double."""
        return self.chars_factures if self.chars_factures is not None else self.chars


def resume_poste(mesures: list[Mesure], libelle_chars: str) -> dict:
    """p50 / p95 / max / normalisation par caractère, sur les seules mesures
    abouties. Un dépassement de plafond n'est pas une panne : il ne compte ni au
    numérateur ni au dénominateur du taux d'aboutissement."""
    abouties = [m for m in mesures if m.issue == ABOUTIE and m.duree_s is not None]
    echecs = [m for m in mesures if m.issue == ECHEC]
    limites = [m for m in mesures if m.issue == LIMITE]
    durees = [m.duree_s for m in abouties]
    total_base = sum(m.base_normalisation for m in abouties)
    total_s = sum(durees)
    audio_ms = sum(m.duree_audio_ms or 0 for m in abouties)

    resume = {
        "n_abouties": chiffre(len(abouties), CONSTAT),
        "n_echecs": chiffre(len(echecs), CONSTAT),
        "n_limites": chiffre(len(limites), CONSTAT, note="plafond atteint — limite, pas panne"),
        "base_de_normalisation": libelle_chars,
    }
    tentees = len(abouties) + len(echecs)
    if tentees:
        resume["taux_aboutissement"] = chiffre(
            round(100.0 * len(abouties) / tentees, 1), MESURE, unite="%"
        )
    if echecs:
        resume["motifs_d_echec"] = sorted({m.motif for m in echecs if m.motif})
    if limites:
        resume["motifs_de_limite"] = sorted({m.motif for m in limites if m.motif})
    if not abouties:
        return resume

    resume.update(
        {
            "p50_s": chiffre(round(pct(durees, 0.50), 2), MESURE, unite="s"),
            "p95_s": chiffre(round(pct(durees, 0.95), 2), MESURE, unite="s"),
            "max_s": chiffre(round(max(durees), 2), MESURE, unite="s"),
            "total_s": chiffre(round(total_s, 2), MESURE, unite="s"),
            "chars_total": chiffre(total_base, CONSTAT, unite="car."),
        }
    )
    # Une division qui n'a pas eu lieu ne pose pas de chiffre : `0,0 ms/car.
    # (mesuré)` aurait l'allure d'une mesure.
    if total_base:
        resume["ms_par_caractere"] = chiffre(
            round(1000.0 * total_s / total_base, 3), MESURE, unite="ms/car.",
            note="somme des durées / somme des caractères de la base ci-dessus",
        )
    if audio_ms:
        resume["audio_total_ms"] = chiffre(audio_ms, MESURE, unite="ms")
        resume["facteur_temps_reel"] = chiffre(
            round(audio_ms / (total_s * 1000.0), 2) if total_s else 0.0,
            MESURE, unite="×",
            note="millisecondes d'audio produites par milliseconde de fabrication — "
                 "au-dessus de 1, la fabrication va plus vite que l'écoute",
        )
    # Un percentile sur n échantillons pris UNE FOIS CHACUN décrit la dispersion
    # des LONGUEURS de Scène, pas celle des latences du fournisseur. À n = 1, le
    # tableau imprime p50 = p95 = max, ce qui n'est pas une distribution.
    if len(abouties) == 1:
        resume["reserve_echantillon"] = (
            "n = 1 : p50, p95 et max sont la même et unique mesure. Ce n'est pas "
            "une distribution."
        )
    elif len(abouties) < 30:
        resume["reserve_echantillon"] = (
            f"n = {len(abouties)}, chaque Scène mesurée une seule fois. Les percentiles "
            "décrivent la variation de LONGUEUR des Scènes, pas la dispersion des "
            "latences du fournisseur — qui demanderait des répétitions."
        )
    return resume


def _detail(mesures: list[Mesure]) -> list[dict]:
    lignes = []
    for m in mesures:
        ligne = {"cle": m.cle, "issue": m.issue, "chars": chiffre(m.chars, CONSTAT, unite="car.")}
        if m.duree_s is not None:
            ligne["duree_s"] = chiffre(round(m.duree_s, 2), MESURE, unite="s")
        if m.chars_factures is not None:
            ligne["chars_factures"] = chiffre(m.chars_factures, MESURE, unite="car.")
        if m.duree_audio_ms is not None:
            ligne["duree_audio_ms"] = chiffre(m.duree_audio_ms, MESURE, unite="ms")
        if m.motif:
            ligne["motif"] = m.motif
        lignes.append(ligne)
    return lignes


async def _job(
    client: httpx.AsyncClient,
    base: str,
    entetes: dict,
    route: str,
    corps: dict,
    stats: Stats,
    timeout_s: int,
    journal: Journal,
) -> tuple[dict | None, float, str | None]:
    """Soumet, sonde, et chronomètre soumission COMPRISE.

    `loadtest.poll` démarre son chronomètre après la soumission ; pour un
    plancher de fabrication, l'aller-retour de soumission fait partie du coût."""
    marque = journal.marque()
    epuises_avant = stats.submit_exhausted
    debut = time.monotonic()
    job_id = await submit(client, base, entetes, route, corps, stats)
    if not job_id:
        duree = time.monotonic() - debut
        return None, duree, diagnostiquer(
            journal.statuts_depuis(marque), stats.submit_exhausted - epuises_avant, timeout_s
        )
    corps_reponse, _ = await poll(client, base, entetes, job_id, stats, timeout_s=timeout_s)
    duree = time.monotonic() - debut
    if corps_reponse is None:
        return None, duree, diagnostiquer(
            journal.statuts_depuis(marque), stats.submit_exhausted - epuises_avant, timeout_s
        )
    if corps_reponse.get("_failed"):
        return None, duree, f"job en échec : {corps_reponse.get('error')}"
    return corps_reponse, duree, None


def _empreinte(source: str, cible: str, texte: str) -> str:
    """Même clé que le cache du service (`local_server._cache_key`) : c'est ce
    qui rend le delta de `cache_size` comparable au nombre de phrases soumises."""
    return hashlib.sha256(f"{source}|{cible}|{texte}".encode("utf-8")).hexdigest()


async def mesurer_traduction(
    client, base, entetes, cle: str, texte: str, source: str, cible: str,
    stats: Stats, journal: Journal, empreintes: set[str] | None = None,
) -> Mesure:
    phrases = decouper_en_phrases(texte)
    if not phrases:
        return Mesure(cle=cle, chars=len(texte), issue=LIMITE, motif="aucune phrase traduisible")
    if len(phrases) > PLAFOND_PHRASES_API:
        # `BatchTranslateRequest.texts` est borné à 200 éléments : au-delà,
        # l'API répond 422. C'est une limite atteinte, pas une panne.
        return Mesure(
            cle=cle, chars=len(texte), issue=LIMITE,
            motif=f"{len(phrases)} phrases pour un plafond d'API de {PLAFOND_PHRASES_API}",
        )
    if empreintes is not None:
        empreintes.update(_empreinte(source, cible, p) for p in phrases)
    corps, duree, motif = await _job(
        client, base, entetes, "/v1/translate/batch",
        {"texts": phrases, "source_lang": source, "target_lang": cible},
        stats, TIMEOUT_SONDAGE_TRADUCTION_S, journal,
    )
    if corps is None:
        return Mesure(cle=cle, chars=len(texte), duree_s=duree, issue=ECHEC, motif=motif)
    return Mesure(cle=cle, chars=len(texte), duree_s=duree)


async def mesurer_synthese(
    client, base, entetes, cle: str, texte: str, langue: str, stats: Stats, journal: Journal,
) -> Mesure:
    if not texte or not texte.strip():
        # Un `sceneId` absent du corpus traduit produisait `{"text": ""}`, que
        # `TTSRequest(min_length=1)` refuse en 422 — consigné comme une panne du
        # fournisseur alors que c'est un trou dans le corpus.
        return Mesure(cle=cle, chars=0, issue=LIMITE, motif="texte traduit absent du corpus")
    if len(texte) > PLAFOND_TEXTE_TTS:
        return Mesure(
            cle=cle, chars=len(texte), issue=LIMITE,
            motif=f"{len(texte)} caractères bruts pour un plafond d'API de {PLAFOND_TEXTE_TTS}",
        )
    factures = billed_characters(texte)
    if factures > MAX_BILLABLE_CHARS:
        # Plafond du fournisseur sous contrat. Le dépassement est une LIMITE
        # ATTEINTE, annoncée par nous avec le chiffre qui dépasse — jamais une
        # panne, et jamais un HTTP 400 opaque.
        return Mesure(
            cle=cle, chars=len(texte), chars_factures=factures, issue=LIMITE,
            motif=f"{factures} caractères facturés pour un plafond de {MAX_BILLABLE_CHARS}",
        )
    corps, duree, motif = await _job(
        client, base, entetes, "/v1/tts/generate", {"text": texte, "language": langue},
        stats, TIMEOUT_SONDAGE_SYNTHESE_S, journal,
    )
    if corps is None:
        return Mesure(
            cle=cle, chars=len(texte), chars_factures=factures, duree_s=duree,
            issue=ECHEC, motif=motif,
        )
    # `billed_characters` vaut 0 — et non `None` — dès que le fournisseur n'est
    # pas `azure` (`local_server.py:357`). Un `or` y substituerait l'estimation
    # locale et publierait un coût Azure pour une série non facturée.
    rendu_facture = corps.get("billed_characters")
    # Les octets audio sont mesurés puis JETÉS : rien n'est écrit nulle part.
    return Mesure(
        cle=cle, chars=len(texte), duree_s=duree,
        chars_factures=int(rendu_facture) if rendu_facture is not None else factures,
        duree_audio_ms=int(corps.get("duration_ms") or 0),
    )


async def mesurer_demarrage_a_froid(
    client, base, entetes, source: str, cible: str, deja_chargees: set[str],
    stats: Stats, journal: Journal, empreintes: set[str] | None = None,
) -> dict:
    """Le premier appel d'une paire paie `from_pretrained`. Ce coût est une
    mesure À PART, exclue de tout percentile : le confondre avec le p50 ferait
    croire qu'une fabrication ordinaire coûte le chargement d'un modèle."""
    requis = modeles_requis(source, cible)
    a_charger = [m for m in requis if m not in deja_chargees]
    if empreintes is not None:
        empreintes.add(_empreinte(source, cible, TEXTE_AMORCAGE))
    corps, duree, motif = await _job(
        client, base, entetes, "/v1/translate/batch",
        {"texts": [TEXTE_AMORCAGE], "source_lang": source, "target_lang": cible},
        stats, TIMEOUT_SONDAGE_TRADUCTION_S, journal,
    )
    deja_chargees.update(requis)
    poste = {
        "paire": f"{source}→{cible}",
        "pivot": pivot_de(source, cible),
        "modeles_requis": requis,
        "modeles_charges_par_cet_appel": a_charger,
        "exclu_des_percentiles": True,
    }
    if corps is None:
        poste["issue"] = ECHEC
        poste["motif"] = motif
    else:
        poste["issue"] = ABOUTIE
        poste["duree_s"] = chiffre(round(duree, 2), MESURE, unite="s")
    return poste


TEXTE_AMORCAGE = "Bonjour."


# ── Séries ──────────────────────────────────────────────────────────────────


@dataclass
class SerieTraduction:
    mediane: list[Mesure] = field(default_factory=list)
    hors_norme: list[Mesure] = field(default_factory=list)


@dataclass
class Resultat:
    sante_avant: dict = field(default_factory=dict)
    sante_apres: dict = field(default_factory=dict)
    amorcage: dict | None = None
    froid: list[dict] = field(default_factory=list)
    traduction_directe: dict[str, SerieTraduction] = field(default_factory=dict)
    traduction_pivotee: dict[str, SerieTraduction] = field(default_factory=dict)
    synthese_mediane: list[Mesure] = field(default_factory=list)
    synthese_hors_norme: list[Mesure] = field(default_factory=list)
    langue_synthese: str = ""
    langues: list[str] = field(default_factory=list)
    routes_appelees: set[str] = field(default_factory=set)
    empreintes_soumises: set[str] = field(default_factory=set)
    c429: int = 0
    c5xx: int = 0
    submits_epuises: int = 0
    serie_valide: bool = True
    reserve: list[str] = field(default_factory=list)


def _provenance_du_cache(resultat: Resultat) -> dict:
    """Le cache a-t-il servi pendant la série ?

    La garde ne regarde `cache_size` qu'à t0 : un simple redémarrage la
    satisfait sans que le cache soit neutralisé, et la série suivante mesure des
    succès de cache déguisés en inférences. On compare donc le nombre de phrases
    DISTINCTES soumises au delta de `cache_size` :

      delta = 0            → cache neutralisé (TRANSLATION_CACHE_MAX=0) : sain.
      delta >= distinctes  → cache armé, aucun succès : mesures propres, mais un
                             second passage serait pollué.
      0 < delta < distinct → des phrases sont revenues du cache : mesures faussées.
    """
    avant = int(resultat.sante_avant.get("cache_size", 0))
    apres = int(resultat.sante_apres.get("cache_size", 0))
    delta = apres - avant
    distinctes = len(resultat.empreintes_soumises)
    if delta <= 0:
        etat, valide = "neutralisé", True
    elif delta >= distinctes:
        etat, valide = "armé, sans succès observé", True
    else:
        etat, valide = "succès de cache détectés", False
    return {
        "etat": etat,
        "serie_valide": valide,
        "phrases_distinctes_soumises": chiffre(distinctes, MESURE),
        "delta_cache": chiffre(delta, MESURE, unite="entrées"),
        "lecture": {
            "neutralisé": "Le cache n'a rien retenu : `TRANSLATION_CACHE_MAX=0` a bien "
                          "été posé. Chaque phrase a payé son inférence.",
            "armé, sans succès observé": "Le cache a retenu au moins autant d'entrées que "
                                         "de phrases distinctes soumises : aucune n'est "
                                         "revenue du cache. Les mesures tiennent, mais une "
                                         "seconde exécution sur ce service serait faussée.",
            "succès de cache détectés": "Le cache a moins grossi qu'il n'a reçu de phrases "
                                        "distinctes : certaines sont revenues sans inférence. "
                                        "Les durées de traduction SOUS-ESTIMENT le plancher.",
        }[etat],
    }


async def executer_series(
    args: argparse.Namespace,
    cibles: Cibles,
    client: httpx.AsyncClient | None = None,
) -> Resultat:
    """Traduction puis synthèse, STRICTEMENT séquentiel, une requête à la fois."""
    entetes = {"Content-Type": "application/json"}
    cle_api = os.getenv("MICROSERVICE_API_KEY", "")
    if cle_api:
        entetes["X-API-Key"] = cle_api
    base = args.base.rstrip("/")
    langues = [l.strip() for l in args.langues.split(",") if l.strip()]

    # Tout ce qui peut être vérifié SANS dépense l'est avant le premier appel.
    for langue in langues:
        modeles_requis(LANGUE_SOURCE, langue)
    if args.langue_synthese != LANGUE_SOURCE and args.langue_synthese not in langues:
        raise BancRefuse(
            f"--langue-synthese={args.langue_synthese!r} ne figure pas dans "
            f"--langues={langues} : la série synthétiserait une langue qu'elle n'a pas "
            "traduite, et le rapport chaînerait deux mesures étrangères l'une à l'autre."
        )

    ferme_a_la_fin = client is None
    if client is None:
        client = httpx.AsyncClient(timeout=60.0)
    journal = Journal()
    journal.brancher(client)
    resultat = Resultat(langue_synthese=args.langue_synthese, langues=langues)
    stats = Stats()
    try:
        resultat.sante_avant = await relever_sante(client, base, entetes)
        verifier_garde(resultat.sante_avant, cache_non_neutralise=args.cache_non_neutralise)
        if resultat.sante_avant["cache_size"]:
            resultat.serie_valide = False
            resultat.reserve.append(
                f"Cache de traduction non neutralisé à t0 ({resultat.sante_avant['cache_size']} "
                "entrées) — série DÉCLARÉE NON VALIDE, exécutée sur demande explicite."
            )

        # Le corpus traduit est résolu MAINTENANT, avant la première dépense :
        # une langue absente faisait perdre toute la série de traduction.
        if args.langue_synthese == LANGUE_SOURCE:
            textes_mediane = {s.scene_id: s.texte for s in cibles.mediane.scenes}
            textes_hors_norme = {cibles.scene_hors_norme.scene_id: cibles.scene_hors_norme.texte}
        else:
            textes_mediane = charger_textes_traduits(
                args.corpus_traduit, cibles.mediane.tour_id, args.langue_synthese
            )
            textes_hors_norme = charger_textes_traduits(
                args.corpus_traduit, cibles.hors_norme.tour_id, args.langue_synthese
            )

        # 0. Amorçage : un tour de chauffe JETÉ, qui paie l'éveil du processus —
        #    imports paresseux de torch, allocation du pool d'inférence. Sans
        #    lui, la première paire de la boucle porte ce coût et sort du lot
        #    d'un facteur trois ou quatre, qu'on lirait à tort comme le prix de
        #    son modèle.
        marque = journal.marque()
        _, duree_amorcage, motif_amorcage = await _job(
            client, base, entetes, "/v1/translate/batch",
            {"texts": [TEXTE_AMORCAGE], "source_lang": LANGUE_SOURCE, "target_lang": langues[0]},
            stats, TIMEOUT_SONDAGE_TRADUCTION_S, journal,
        )
        resultat.empreintes_soumises.add(_empreinte(LANGUE_SOURCE, langues[0], TEXTE_AMORCAGE))
        resultat.amorcage = {
            "paire": f"{LANGUE_SOURCE}→{langues[0]}",
            "duree_s": chiffre(round(duree_amorcage, 2), MESURE, unite="s"),
            "ecarte": True,
            "pourquoi": "Éveil du processus (imports paresseux, pool d'inférence). Jeté : "
                        "il n'appartient ni au démarrage à froid d'une paire ni à la série.",
            "issue": ECHEC if motif_amorcage else ABOUTIE,
        }
        if motif_amorcage:
            resultat.amorcage["motif"] = motif_amorcage
        # La paire amorcée est déjà chargée : elle ne doit plus compter son
        # modèle comme « chargé par cet appel ».
        deja_chargees: set[str] = set(modeles_requis(LANGUE_SOURCE, langues[0]))
        _ = marque

        # 1. Démarrage à froid par paire, hors chronomètre de la série.
        for langue in langues:
            resultat.froid.append(
                await mesurer_demarrage_a_froid(
                    client, base, entetes, LANGUE_SOURCE, langue, deja_chargees,
                    stats, journal, resultat.empreintes_soumises,
                )
            )

        # 2. Traduction — la Visite médiane et la Scène hors norme, séparées :
        #    les mélanger dans une même table ferait passer la Scène de 7 308
        #    caractères pour la queue de distribution d'une Visite ordinaire.
        for langue in langues:
            serie = SerieTraduction()
            for scene in cibles.mediane.scenes:
                serie.mediane.append(
                    await mesurer_traduction(
                        client, base, entetes,
                        f"{cibles.mediane.tour_id}#{scene.index}", scene.texte,
                        LANGUE_SOURCE, langue, stats, journal, resultat.empreintes_soumises,
                    )
                )
            serie.hors_norme.append(
                await mesurer_traduction(
                    client, base, entetes,
                    f"{cibles.hors_norme.tour_id}#{cibles.scene_hors_norme.index}",
                    cibles.scene_hors_norme.texte, LANGUE_SOURCE, langue,
                    stats, journal, resultat.empreintes_soumises,
                )
            )
            cible_dict = (
                resultat.traduction_pivotee
                if est_pivotee(LANGUE_SOURCE, langue)
                else resultat.traduction_directe
            )
            cible_dict[f"{LANGUE_SOURCE}→{langue}"] = serie

        # 3. Synthèse — sur le texte de la LANGUE CIBLE, celui qu'une
        #    fabrication réelle envoie au fournisseur.
        for scene in cibles.mediane.scenes:
            resultat.synthese_mediane.append(
                await mesurer_synthese(
                    client, base, entetes, f"{cibles.mediane.tour_id}#{scene.index}",
                    textes_mediane.get(scene.scene_id, ""), args.langue_synthese, stats, journal,
                )
            )
        resultat.synthese_hors_norme.append(
            await mesurer_synthese(
                client, base, entetes,
                f"{cibles.hors_norme.tour_id}#{cibles.scene_hors_norme.index}",
                textes_hors_norme.get(cibles.scene_hors_norme.scene_id, ""),
                args.langue_synthese, stats, journal,
            )
        )

        resultat.sante_apres = await relever_sante(client, base, entetes)
    finally:
        resultat.routes_appelees = journal.routes
        if ferme_a_la_fin:
            await client.aclose()

    resultat.c429 = stats.c429
    resultat.c5xx = stats.c5xx
    resultat.submits_epuises = stats.submit_exhausted
    if stats.c429:
        resultat.serie_valide = False
        resultat.reserve.append(
            f"{stats.c429} réponse(s) 429 pendant la série : une attente de "
            "contre-pression est entrée dans les durées. Série non valide."
        )
    if stats.c5xx:
        # Un 5xx est au moins aussi disqualifiant qu'un 429 : il signe un
        # service en peine, dont les durées ne décrivent plus un plancher.
        resultat.serie_valide = False
        resultat.reserve.append(
            f"{stats.c5xx} erreur(s) 5xx pendant la série : le service était en peine, "
            "ses durées ne décrivent pas un plancher. Série non valide."
        )
    provenance = _provenance_du_cache(resultat)
    if not provenance["serie_valide"]:
        resultat.serie_valide = False
        resultat.reserve.append(provenance["lecture"])
    return resultat


# ── Postes non mesurables ───────────────────────────────────────────────────
# Le sondage à 15 s et le miroir N×M sont des coûts RÉELS, lisibles dans le
# code, qui domineraient le vécu du visiteur bien avant le temps fournisseur.
# Les taire produirait un plancher rassurant et faux ; les mesurer est
# impossible aujourd'hui. Les NOMMER avec leur anchor est ce qui transforme ce
# banc en donnée de conception pour la story 11.

PLANCHER_SONDAGE_S = 15.0

POSTES_CONSTATES = (
    {
        "nom": "Sondage du portail — plancher dur de 15 s",
        "anchor": "TourGuideWeb/src/lib/stores/tts-store.ts:7",
        "jeton": "POLL_INTERVAL_MS",
        "cout": chiffre(
            PLANCHER_SONDAGE_S, CONSTAT, unite="s",
            note="`startPolling` arme un `setInterval` SANS appel immédiat "
                 "(tts-store.ts:62-85) : le premier sondage tombe à t+15 s quoi qu'il "
                 "arrive. Ce n'est pas une espérance de 7,5 s — c'est un plancher dur, "
                 "et tout ce qui suit est quantifié par multiples de 15 s.",
        ),
        "pourquoi_non_mesurable": "Purement paramétrique : la valeur ne dépend d'aucun "
            "fournisseur et se lit dans le code. La mesurer reviendrait à mesurer une constante.",
        "levier": "Un réglage, pas un chantier. Une fabrication qui aboutit en 9 s est "
                  "annoncée au visiteur à 15 s ; une qui aboutit en 16 s l'est à 30 s — soit "
                  "la cible p50 du SPEC consommée en entier par l'attente d'un timer.",
    },
    {
        "nom": "Miroir N Scènes × M langues, en série",
        "anchor": "TourGuideWeb/src/lib/api/language-purchase.ts:818",
        "jeton": "for (const sc of scenes)",
        "cout": chiffre(
            8 * 4, ESTIME, unite="allers-retours AppSync",
            note="Reims : 8 Scènes × 4 langues traduites, un `listSegmentsByScene` "
                 "attendu par Scène et par langue, en série",
        ),
        "pourquoi_non_mesurable": "Le pipeline de fabrication n'existe pas encore "
            "(stories 9 à 14) et cette boucle vit dans le portail du guide, pas dans le "
            "chemin visiteur. La chronométrer supposerait d'instrumenter du code de production.",
        "levier": "Chaque aller-retour AppSync coûte des dizaines à des centaines de "
                  "millisecondes ; en série, l'addition est linéaire en N×M.",
    },
    {
        "nom": "Deux Scènes gratuites avant tout paiement",
        "anchor": "TourGuideApp/amplify/functions/get-published-tour-content/handler.ts:28",
        "jeton": "FREE_PREVIEW_SCENE_COUNT",
        "cout": chiffre(
            2, CONSTAT, unite="Scènes",
            note="écoutables sans achat sur une Visite payante",
        ),
        "pourquoi_non_mesurable": "Ce n'est pas une durée. C'est la RAISON pour laquelle "
            "le délai « paiement → première Scène écoutable » vaut structurellement zéro "
            "aujourd'hui : le visiteur écoute avant d'avoir payé.",
        "levier": "Tant que cette constante vaut 2, la cible p50 ≤ 30 s ne porte sur rien "
                  "d'observable. Elle deviendra mesurable quand la fabrication à la demande "
                  "conditionnera l'écoute.",
    },
    {
        "nom": "Approbation humaine dans la chaîne actuelle",
        "anchor": "TourGuideWeb/src/lib/api/moderation.ts:670",
        "jeton": "approveTour",
        # PAS de chiffre : une durée humaine n'a pas de majorant, et écrire « 0 s »
        # ou « 24 h » ici inventerait une borne que rien ne soutient. Le poste
        # entre au rapport par son NOM, pas par une valeur.
        "cout": None,
        "cout_texte": "durée NON BORNÉE — aucun majorant n'existe",
        "pourquoi_non_mesurable": "Une durée humaine n'a pas de p95. La chronométrer "
            "produirait la disponibilité d'une personne, pas le coût d'une fabrication. "
            "La chaîne actuelle transite par le navigateur du guide, puis attend cette "
            "approbation avant qu'une narration soit publiée.",
        "levier": "Le pipeline des stories 9 à 14 retire ce poste par construction.",
    },
)


def verifier_anchor(anchor: str, jeton: str) -> bool:
    """Un anchor qui a glissé est un anchor qui ment. On le vérifie au moment où
    on l'écrit au rapport, plutôt que de le recopier de confiance."""
    try:
        chemin_str, _, ligne_str = anchor.rpartition(":")
        numero = int(ligne_str)
        chemin = RACINE_DEPOT / chemin_str
        lignes = chemin.read_text(encoding="utf-8").splitlines()
        # Un numéro de 0 indexait -1 en Python : la DERNIÈRE ligne du fichier
        # était déclarée « vérifiée » pour un anchor qui ne pointe nulle part.
        if not 1 <= numero <= len(lignes):
            return False
        return jeton in lignes[numero - 1]
    except Exception:  # noqa: BLE001
        return False


# ── Conclusion et agrégat ───────────────────────────────────────────────────


def _verdict(valeur: float, cible: float) -> str:
    if valeur > cible:
        return "ne tient pas"
    if valeur > 0.8 * cible:
        return "tient de justesse"
    return "tient"


def _duree_de(mesures: list[Mesure], cle_suffixe: str) -> float | None:
    for m in mesures:
        if m.cle.endswith(cle_suffixe) and m.issue == ABOUTIE and m.duree_s is not None:
            return m.duree_s
    return None


def construire_conclusion(resultat: Resultat) -> dict:
    """Rapproche le plancher mesuré des cibles du SPEC — et tranche.

    Un rapport qui s'arrête sur ses tables laisse au lecteur le calcul qui
    justifiait de le produire."""
    langue = resultat.langue_synthese
    paire = f"{LANGUE_SOURCE}→{langue}"
    serie = resultat.traduction_directe.get(paire) or resultat.traduction_pivotee.get(paire)
    if serie is None or not resultat.synthese_mediane:
        return {"etat": "indisponible", "raison": f"aucune série chaînable pour {paire}"}

    resume_trad = resume_poste(serie.mediane, "caractères source")
    resume_synth = resume_poste(resultat.synthese_mediane, "caractères facturés")
    if "p50_s" not in resume_trad or "p50_s" not in resume_synth:
        return {"etat": "indisponible", "raison": "aucune mesure aboutie à chaîner"}

    conclusion: dict = {
        "paire_chainee": paire,
        "cibles_du_spec": {
            "p50_s": chiffre(CIBLE_SPEC_P50_S, CONSTAT, unite="s"),
            "p95_s": chiffre(CIBLE_SPEC_P95_S, CONSTAT, unite="s"),
        },
    }

    # a) La chaîne RÉELLE de la première Scène : la Scène #0 traduite puis
    #    synthétisée. Deux mesures prises sur la même Scène, chaînées comme le
    #    ferait une fabrication — c'est du mesuré, pas une reconstruction.
    t0 = _duree_de(serie.mediane, "#0")
    s0 = _duree_de(resultat.synthese_mediane, "#0")
    if t0 is not None and s0 is not None:
        total = round(t0 + s0, 2)
        conclusion["premiere_scene_mesuree"] = {
            "traduction_s": chiffre(round(t0, 2), MESURE, unite="s"),
            "synthese_s": chiffre(round(s0, 2), MESURE, unite="s"),
            "total_s": chiffre(
                total, MESURE, unite="s",
                note="somme de deux mesures prises sur la MÊME Scène #0, chaînées comme "
                     "le ferait une fabrication séquentielle",
            ),
            "verdict_p50": _verdict(total, CIBLE_SPEC_P50_S),
            "avec_le_sondage_a_15_s": chiffre(
                round(total + PLANCHER_SONDAGE_S, 2), ESTIME, unite="s",
                note="le portail n'annonce rien avant t+15 s : le plancher fournisseur "
                     "est arrondi au multiple de 15 s supérieur dans le vécu du visiteur",
            ),
            "verdict_p50_avec_sondage": _verdict(total + PLANCHER_SONDAGE_S, CIBLE_SPEC_P50_S),
        }

    # b) L'enveloppe. Somme de percentiles — ce n'est PAS le percentile de la
    #    somme, et le dire est la moitié de l'honnêteté du chiffre.
    for niveau, cible in (("p50", CIBLE_SPEC_P50_S), ("p95", CIBLE_SPEC_P95_S)):
        cle = f"{niveau}_s"
        somme = round(resume_trad[cle]["valeur"] + resume_synth[cle]["valeur"], 2)
        conclusion[f"enveloppe_{niveau}"] = {
            "traduction_s": resume_trad[cle],
            "synthese_s": resume_synth[cle],
            "total_s": chiffre(
                somme, ESTIME, unite="s",
                note=f"somme des {niveau} de deux postes — ce n'est pas le {niveau} de la "
                     "somme, qui demanderait de chaîner les deux mesures Scène par Scène",
            ),
            "cible_s": chiffre(cible, CONSTAT, unite="s"),
            "verdict": _verdict(somme, cible),
            "avec_le_sondage_a_15_s": chiffre(
                round(somme + PLANCHER_SONDAGE_S, 2), ESTIME, unite="s"
            ),
            "verdict_avec_sondage": _verdict(somme + PLANCHER_SONDAGE_S, cible),
        }

    # c) La Scène hors norme, seule et nommée comme telle.
    resume_trad_hn = resume_poste(serie.hors_norme, "caractères source")
    resume_synth_hn = resume_poste(resultat.synthese_hors_norme, "caractères facturés")
    if "max_s" in resume_trad_hn and "max_s" in resume_synth_hn:
        total_hn = round(resume_trad_hn["max_s"]["valeur"] + resume_synth_hn["max_s"]["valeur"], 2)
        conclusion["scene_hors_norme"] = {
            "traduction_s": resume_trad_hn["max_s"],
            "synthese_s": resume_synth_hn["max_s"],
            "total_s": chiffre(
                total_hn, MESURE, unite="s",
                note="une seule Scène, mesurée une fois : une valeur, pas une distribution",
            ),
            "verdict_p50": _verdict(total_hn, CIBLE_SPEC_P50_S),
            "verdict_p95": _verdict(total_hn, CIBLE_SPEC_P95_S),
            "avec_le_sondage_a_15_s": chiffre(
                round(total_hn + PLANCHER_SONDAGE_S, 2), ESTIME, unite="s"
            ),
        }
    return conclusion


def construire_agregat(resultat: Resultat, profil: dict) -> dict:
    """Ce que coûte une Visite entière, dans toutes ses langues, en séquentiel.

    Les tables par paire et par poste ne se somment pas d'elles-mêmes ; c'est
    pourtant ce total qu'un concepteur cherche."""
    total_trad = 0.0
    detail_trad: dict = {}
    for paire, serie in {**resultat.traduction_directe, **resultat.traduction_pivotee}.items():
        somme = sum(m.duree_s or 0.0 for m in serie.mediane if m.issue == ABOUTIE)
        detail_trad[paire] = chiffre(round(somme, 2), MESURE, unite="s")
        total_trad += somme

    total_froid = sum(
        p["duree_s"]["valeur"] for p in resultat.froid if p.get("duree_s")
    )
    synth_mesuree = sum(
        m.duree_s or 0.0 for m in resultat.synthese_mediane if m.issue == ABOUTIE
    )
    base_chars = sum(
        m.base_normalisation for m in resultat.synthese_mediane if m.issue == ABOUTIE
    )

    # La synthèse n'a été mesurée que dans UNE langue. L'extrapoler aux autres
    # se fait au prorata de leur longueur réelle — mesurée sur le corpus, pas
    # supposée égale.
    synth_par_langue: dict = {}
    total_synth = 0.0
    for langue in resultat.langues:
        entree = profil.get("langues", {}).get(langue)
        if langue == resultat.langue_synthese:
            synth_par_langue[langue] = chiffre(round(synth_mesuree, 2), MESURE, unite="s")
            total_synth += synth_mesuree
            continue
        if not entree or not base_chars:
            continue
        chars_langue = entree["chars_visite_mediane"]["valeur"]
        estime = synth_mesuree * chars_langue / base_chars
        synth_par_langue[langue] = chiffre(
            round(estime, 2), ESTIME, unite="s",
            note=f"synthèse mesurée en {resultat.langue_synthese}, mise à l'échelle au "
                 "prorata des caractères réels de cette langue",
        )
        total_synth += estime

    total = total_trad + total_synth + total_froid
    return {
        "perimetre": f"Visite médiane × {len(resultat.langues)} langues, en séquentiel",
        "traduction_par_paire": detail_trad,
        "traduction_total_s": chiffre(round(total_trad, 2), MESURE, unite="s"),
        "synthese_par_langue": synth_par_langue,
        "synthese_total_s": chiffre(
            round(total_synth, 2), ESTIME, unite="s",
            note="une langue mesurée, les autres mises à l'échelle par leur longueur",
        ),
        "demarrages_a_froid_total_s": chiffre(
            round(total_froid, 2), MESURE, unite="s",
            note="coût unique par service démarré, pas par Visite",
        ),
        "total_s": chiffre(
            round(total, 2), ESTIME, unite="s",
            note="traduction mesurée + synthèse mise à l'échelle + démarrages à froid ; "
                 "hors sondage du portail et hors miroir AppSync, qui s'y ajoutent",
        ),
        "total_min": chiffre(round(total / 60.0, 2), ESTIME, unite="min"),
    }


# ── Rapport ─────────────────────────────────────────────────────────────────


def _cout_estime(chars_factures: int, note_supplementaire: str = "") -> dict:
    note = (
        f"Azure Neural standard, {PRIX_AZURE_USD_PAR_MILLION:.0f} $/M caractères "
        f"({PRIX_AZURE_SOURCE})"
    )
    if note_supplementaire:
        note = f"{note}. {note_supplementaire}"
    return chiffre(
        round(chars_factures * PRIX_AZURE_USD_PAR_MILLION / 1_000_000, 4),
        ESTIME, unite="USD", note=note,
    )


def _profil_langues(cibles: Cibles, racine_traduite: Path) -> dict:
    """Expansion du texte d'une langue à l'autre, sur la Visite médiane, et
    caractères facturés de la Scène hors norme dans chaque langue. Constaté sur
    le corpus disque : aucun appel fournisseur.

    Le français y figure comme les autres — même mesure (`len` du texte réel),
    même structure — plutôt que calculé au rendu, où il échappait au contrôle
    « aucun chiffre sans méthode »."""
    base = cibles.mediane.chars_reels
    profil: dict = {"base_fr": chiffre(base, CONSTAT, unite="car."), "langues": {}}
    langues = [LANGUE_SOURCE, "en", "es", "de", "it", "nl"]
    for langue in langues:
        entree: dict = {
            "traduisible_par_le_microservice": langue in LANGUES_TRADUCTION_API,
            "synthetisable_par_le_microservice": langue in LANGUES_SYNTHESE_API,
        }
        if langue == LANGUE_SOURCE:
            textes = {s.scene_id: s.texte for s in cibles.mediane.scenes}
            hn = {cibles.scene_hors_norme.scene_id: cibles.scene_hors_norme.texte}
        else:
            try:
                textes = charger_textes_traduits(racine_traduite, cibles.mediane.tour_id, langue)
                hn = charger_textes_traduits(
                    racine_traduite, cibles.hors_norme.tour_id, langue
                )
            except ErreurCorpus:
                continue
        total = sum(len(t) for t in textes.values())
        entree["chars_visite_mediane"] = chiffre(total, CONSTAT, unite="car.")
        entree["expansion"] = chiffre(
            round(total / base, 3) if base else 0.0, CONSTAT,
            note="rapport à la source française, sur les longueurs réelles",
        )
        entree["cout_visite_mediane"] = _cout_estime(
            total,
            "Coût de la synthèse SI cette langue était fabriquée — la série n'a mesuré "
            "qu'une seule langue.",
        )
        texte_hn = hn.get(cibles.scene_hors_norme.scene_id, "")
        if texte_hn:
            factures = billed_characters(texte_hn)
            entree["scene_hors_norme_facturables"] = chiffre(factures, CONSTAT, unite="car.")
            entree["scene_hors_norme_part_du_plafond"] = chiffre(
                round(100.0 * factures / MAX_BILLABLE_CHARS, 1), CONSTAT, unite="%",
                note=f"plafond MAX_BILLABLE_CHARS = {MAX_BILLABLE_CHARS}",
            )
        profil["langues"][langue] = entree
    profil["note_langues"] = (
        "Les deux API du microservice n'acceptent pas les mêmes langues. "
        f"Traduction : {sorted(LANGUES_TRADUCTION_API)}. "
        f"Synthèse : {sorted(LANGUES_SYNTHESE_API)}. "
        "`nl` est donc synthétisable mais PAS traduisible par ce service — son corpus "
        "vient d'ailleurs. `ja`, `ko` et `zh` sont synthétisables et absents du corpus ; "
        "le jour où ils y entreront, la règle des idéogrammes comptés double (voir "
        "`billed_characters`) doublera leur ligne de coût."
    )
    return profil


def construire_rapport(
    args: argparse.Namespace,
    cibles: Cibles,
    stats_corpus: dict,
    resultat: Resultat | None,
) -> dict:
    horodatage = datetime.now(timezone.utc).astimezone()
    scene_hn = cibles.scene_hors_norme
    factures_hn_fr = billed_characters(scene_hn.texte)
    profil = _profil_langues(cibles, Path(args.corpus_traduit))

    rapport: dict = {
        "titre": "Plancher de fabrication — traduction et synthèse",
        "story": "8 — Banc de mesure du plancher de fabrication",
        "date": horodatage.isoformat(timespec="seconds"),
        "serie_executee": resultat is not None,
        "legende_des_methodes": {
            MESURE: "chronométré par ce banc, sur le fournisseur sous contrat",
            CONSTAT: "lu dans le code ou dans le corpus, sans chronomètre",
            ESTIME: "calculé à partir d'un tarif ou d'une hypothèse nommée",
        },
        "ce_que_ce_banc_ne_mesure_pas": {
            "delai": "paiement confirmé → première Scène écoutable",
            "cible_du_spec": "p50 ≤ 30 s, p95 ≤ 60 s",
            "pourquoi": (
                "Ce délai vaut structurellement ZÉRO aujourd'hui : les deux premières "
                "Scènes d'une Visite payante sont écoutables sans paiement "
                "(FREE_PREVIEW_SCENE_COUNT = 2). S'y ajoute que le pipeline de "
                "fabrication n'existe pas encore (stories 9 à 14) et que la chaîne "
                "actuelle transite par le navigateur du guide puis par une approbation "
                "humaine de durée non bornée. Un chiffre produit ici serait un chiffre "
                "trompeur ; ce rapport nomme les postes à la place."
            ),
        },
        "protocole": {
            "sequentiel": "Une requête à la fois. `_INFERENCE_EXECUTOR(max_workers=1)` "
                          "sérialise toute inférence (local_server.py:136-141) et "
                          "`GET /v1/jobs/{id}` n'expose ni `created_at` ni `started_at` : "
                          "le temps d'attente en file n'est pas soustractible de "
                          "l'extérieur. Toute mesure concurrente mélangerait inférence et file.",
            "resolution_du_sondage_s": chiffre(
                RESOLUTION_SONDAGE_S, CONSTAT, unite="s",
                note="`loadtest.poll` sonde toutes les 400 ms — toute durée est un "
                     "majorant, exact à +0/+400 ms près",
            ),
            "lecture_seule": "Quatre routes du microservice seulement. Les routes inscrites "
                             "plus bas sont OBSERVÉES par un crochet HTTP, pas déclarées. "
                             "Aucun SDK AWS n'est importé. Les octets audio rendus sont "
                             "mesurés puis jetés.",
            "corpus": str(Path(args.corpus).resolve()),
            "corpus_traduit": str(Path(args.corpus_traduit).resolve()),
            "hypotheses": [
                f"Le plafond de facturation ({MAX_BILLABLE_CHARS} caractères) est lu dans "
                "l'environnement DU BANC, via `services.tts_azure.MAX_BILLABLE_CHARS`. Si le "
                "service mesuré tourne avec un autre `AZURE_MAX_CHARS`, c'est le sien qui "
                "s'applique, et ce rapport annonce alors un plafond qui n'est pas celui-là.",
                f"Une seconde limite, indépendante, s'applique en amont : `TTSRequest.text` "
                f"est borné à {PLAFOND_TEXTE_TTS} caractères BRUTS. Sur un texte sans "
                "balisage, c'est elle qui se déclenche la première.",
                f"Le tarif de synthèse ({PRIX_AZURE_USD_PAR_MILLION:.0f} $/M) n'est pas "
                f"mesuré : il vient de l'{PRIX_AZURE_SOURCE}.",
            ],
        },
        "corpus": {
            "nb_visites": chiffre(stats_corpus["nb_visites"], CONSTAT),
            "nb_scenes": chiffre(stats_corpus["nb_scenes"], CONSTAT),
            "scene_chars_min": chiffre(stats_corpus["chars_min"], CONSTAT, unite="car."),
            "scene_chars_median": chiffre(stats_corpus["chars_median"], CONSTAT, unite="car."),
            "scene_chars_max": chiffre(stats_corpus["chars_max"], CONSTAT, unite="car."),
            "visite_chars_min": chiffre(stats_corpus["visite_chars_min"], CONSTAT, unite="car."),
            "visite_chars_median": chiffre(
                stats_corpus["visite_chars_median"], CONSTAT, unite="car.",
                note="c'est cette distribution-là, et non celle par Scène, qui porte le "
                     "coût de fabrication d'une Visite",
            ),
            "visite_chars_max": chiffre(stats_corpus["visite_chars_max"], CONSTAT, unite="car."),
        },
        "cibles": {
            "mediane": {
                "tour_id": cibles.mediane.tour_id,
                "titre": cibles.mediane.titre,
                "ville": cibles.mediane.ville,
                "nb_scenes": chiffre(len(cibles.mediane.scenes), CONSTAT),
                "chars": chiffre(cibles.mediane.chars_reels, CONSTAT, unite="car."),
                "medianite": {
                    "verifiee": cibles.medianite["est_la_mediane"],
                    "rang": chiffre(cibles.medianite["rang"], CONSTAT),
                    "sur": chiffre(cibles.medianite["nb_visites"], CONSTAT),
                    "percentile": chiffre(cibles.medianite["percentile"], CONSTAT, unite="%"),
                    "chars_median_du_corpus": chiffre(
                        cibles.medianite["chars_median_du_corpus"], CONSTAT, unite="car."
                    ),
                    "ecart_a_la_mediane": chiffre(
                        cibles.medianite["ecart_a_la_mediane"], CONSTAT, unite="×"
                    ),
                    "lecture": "La médianité de cette cible est DÉRIVÉE du corpus à chaque "
                               "exécution, pas recopiée de la story.",
                },
            },
            "hors_norme": {
                "tour_id": cibles.hors_norme.tour_id,
                "titre": cibles.hors_norme.titre,
                "ville": cibles.hors_norme.ville,
                "nb_scenes": chiffre(len(cibles.hors_norme.scenes), CONSTAT),
                "chars": chiffre(cibles.hors_norme.chars_reels, CONSTAT, unite="car."),
                "visite_ecart_a_la_mediane": chiffre(
                    cibles.singularite["visite_ecart_a_la_mediane"], CONSTAT, unite="×",
                    note="la VISITE rapportée à la Visite médiane du corpus — c'est ce "
                         "rapport-là, et non celui de la Scène, qui détermine le coût de "
                         "fabrication de cette visite",
                ),
                "scene_mesuree": scene_hn.scene_id,
                "scene_chars": chiffre(scene_hn.chars, CONSTAT, unite="car."),
                "scene_chars_factures_fr": chiffre(
                    factures_hn_fr, CONSTAT, unite="car.",
                    note="égal au nombre de caractères bruts : la Scène ne porte aucun "
                         "balisage SSML facturable",
                ),
                "plafond_facturable": chiffre(
                    MAX_BILLABLE_CHARS, CONSTAT, unite="car.",
                    note="services/tts_azure.py — MAX_BILLABLE_CHARS, lu dans "
                         "l'environnement du banc (voir hypothèses)",
                ),
                "part_du_plafond_fr": chiffre(
                    round(100.0 * factures_hn_fr / MAX_BILLABLE_CHARS, 1), CONSTAT, unite="%",
                ),
                "rapport_a_la_mediane_du_corpus": chiffre(
                    round(scene_hn.chars / stats_corpus["chars_median"], 1), CONSTAT, unite="×",
                    note="la Scène hors norme rapportée à la médiane des "
                         f"{stats_corpus['nb_scenes']} Scènes du corpus",
                ),
                "singularite": {
                    "hors_seed": cibles.singularite["hors_seed"],
                    "nb_visites_hors_seed_dans_le_corpus": chiffre(
                        cibles.singularite["nb_visites_hors_seed"], CONSTAT,
                    ),
                    "possede_les_n_plus_longues_scenes": cibles.singularite[
                        "possede_les_n_plus_longues"
                    ],
                    "n": chiffre(cibles.singularite["n"], CONSTAT),
                    "chars_de_la_plus_longue_scene_hors_cible": chiffre(
                        cibles.singularite["chars_premiere_scene_hors_cible"], CONSTAT, unite="car.",
                    ),
                    "scenes_mesurees": chiffre(
                        1, CONSTAT,
                        note=f"une seule des {cibles.singularite['n']} Scènes de cette Visite "
                             "est mesurée : le coût de la Visite entière ne s'en déduit pas "
                             "par simple multiplication",
                    ),
                    "lecture": "Ce n'est PAS « une Visite ordinaire avec une Scène longue ». "
                               "Ses Scènes les plus longues lui appartiennent toutes, c'est la "
                               "seule Visite hors seed du corpus, et la VISITE elle-même pèse "
                               "plusieurs fois la Visite médiane (voir l'écart ci-dessus). Ce "
                               "qu'elle mesure ne se généralise pas au catalogue.",
                },
            },
        },
        "profil_par_langue": profil,
        "postes_constates": [],
    }

    for poste in POSTES_CONSTATES:
        rapport["postes_constates"].append(
            {
                "nom": poste["nom"],
                "anchor": poste["anchor"],
                "anchor_verifie": verifier_anchor(poste["anchor"], poste["jeton"]),
                "cout": poste["cout"],
                "cout_texte": poste.get("cout_texte"),
                "pourquoi_non_mesurable": poste["pourquoi_non_mesurable"],
                "levier": poste["levier"],
            }
        )

    if resultat is None:
        rapport["postes_mesures"] = {
            "etat": "NON MESURÉS",
            "raison": (
                "Le banc n'a pas été exécuté contre un fournisseur sous contrat : "
                "aucune clé Azure Speech n'est posée sur ce poste, et la dépense chez un "
                "vrai fournisseur relève d'un accord préalable. Le banc REFUSE de "
                "chronométrer le mode dégradé — un plancher mesuré sur edge-tts ne "
                "répondrait à aucune question."
            ),
            "comment_les_obtenir": (
                "Démarrer le microservice avec AZURE_SPEECH_KEY, AZURE_SPEECH_REGION, "
                "MICROSERVICE_API_KEY et TRANSLATION_CACHE_MAX=0 "
                "(python -m uvicorn local_server:app --port 8000), puis lancer "
                "python bench_fabrication.py. La série synthétise du vrai texte chez un "
                "vrai fournisseur : elle se facture, et relève d'un accord préalable."
            ),
        }
        return rapport

    postes: dict = {
        "serie_valide": resultat.serie_valide,
        "langue_de_synthese": resultat.langue_synthese,
        "langues_traduites": resultat.langues,
        "sante_avant": {
            "tts_mode": resultat.sante_avant.get("tts_mode"),
            "inflight_jobs": chiffre(int(resultat.sante_avant["inflight_jobs"]), MESURE),
            "cache_size": chiffre(int(resultat.sante_avant["cache_size"]), MESURE),
        },
        "sante_apres": {
            "tts_mode": resultat.sante_apres.get("tts_mode"),
            "inflight_jobs": chiffre(int(resultat.sante_apres["inflight_jobs"]), MESURE),
            "cache_size": chiffre(int(resultat.sante_apres["cache_size"]), MESURE),
        },
        "provenance_du_cache": _provenance_du_cache(resultat),
        "contre_pression_429": chiffre(resultat.c429, MESURE),
        "erreurs_5xx": chiffre(resultat.c5xx, MESURE),
        "submits_epuises": chiffre(resultat.submits_epuises, MESURE),
        "routes_appelees": sorted(resultat.routes_appelees),
        "amorcage": resultat.amorcage,
        "demarrage_a_froid": {
            "note": "Premier appel d'une paire, modèles non chargés. Poste DISTINCT, "
                    "EXCLU de tout percentile. Une paire pivotée fait charger deux modèles. "
                    "Un amorçage jeté précède la boucle : sans lui, la première paire payait "
                    "l'éveil du processus et sortait du lot d'un facteur trois ou quatre.",
            "paires": resultat.froid,
        },
        "traduction": {
            "provisoire": True,
            "moteur": "MarianMT (local_server.py — MARIAN_MODELS)",
            "raison_du_caractere_provisoire": "La story 4 remplace ce moteur par un modèle "
                "de langue. Cette mesure vaut pour le moteur du jour où elle a été prise.",
            "date_de_mesure": horodatage.date().isoformat(),
            "paires_directes": {
                paire: {
                    "visite_mediane": resume_poste(serie.mediane, "caractères source"),
                    "scene_hors_norme": resume_poste(serie.hors_norme, "caractères source"),
                }
                for paire, serie in resultat.traduction_directe.items()
            },
            "paires_pivotees": {
                paire: {
                    "visite_mediane": resume_poste(serie.mediane, "caractères source"),
                    "scene_hors_norme": resume_poste(serie.hors_norme, "caractères source"),
                    "pivot": PIVOT_VIA.get((LANGUE_SOURCE, paire.split("→")[-1])),
                    "note": "Chronométrée À PART des paires directes : deux inférences "
                            "au lieu d'une, la comparer aux directes serait comparer deux choses.",
                }
                for paire, serie in resultat.traduction_pivotee.items()
            },
            "detail": {
                paire: _detail(serie.mediane + serie.hors_norme)
                for paire, serie in {
                    **resultat.traduction_directe,
                    **resultat.traduction_pivotee,
                }.items()
            },
        },
        "synthese": {
            "fournisseur": resultat.sante_avant.get("tts_mode"),
            "visite_mediane": resume_poste(resultat.synthese_mediane, "caractères facturés"),
            "scene_hors_norme": resume_poste(resultat.synthese_hors_norme, "caractères facturés"),
            "detail_visite_mediane": _detail(resultat.synthese_mediane),
            "detail_scene_hors_norme": _detail(resultat.synthese_hors_norme),
        },
    }

    factures = sum(
        m.chars_factures or 0
        for m in resultat.synthese_mediane + resultat.synthese_hors_norme
        if m.issue == ABOUTIE
    )
    postes["synthese"]["cout_de_la_serie"] = _cout_estime(factures)
    if resultat.reserve:
        postes["reserves"] = resultat.reserve
    rapport["postes_mesures"] = postes
    rapport["conclusion"] = construire_conclusion(resultat)
    rapport["agregat_une_visite"] = construire_agregat(resultat, profil)
    return rapport


# ── Rendu markdown ──────────────────────────────────────────────────────────

_ORDRE_RESUME = (
    "p50_s", "p95_s", "max_s", "ms_par_caractere", "facteur_temps_reel",
    "audio_total_ms", "chars_total", "total_s", "taux_aboutissement",
    "n_abouties", "n_echecs", "n_limites",
)


def _table_poste(titre: str, resume: dict) -> list[str]:
    lignes = [f"**{titre}**", "", "| Grandeur | Valeur |", "|---|---|"]
    notes: list[tuple[str, str]] = []
    for cle in _ORDRE_RESUME:
        if cle in resume:
            lignes.append(f"| {cle.replace('_', ' ')} | {rendu(resume[cle])} |")
            if resume[cle].get("note"):
                notes.append((cle.replace("_", " "), resume[cle]["note"]))
    lignes.append(f"| base de normalisation | {resume.get('base_de_normalisation', '—')} |")
    lignes.append("")
    for cle, note in notes:
        lignes.append(f"- *{cle}* : {note}")
    for cle in ("motifs_d_echec", "motifs_de_limite"):
        if resume.get(cle):
            lignes.append(f"- *{cle.replace('_', ' ')}* : " + " ; ".join(resume[cle]))
    if resume.get("reserve_echantillon"):
        lignes.append(f"- **Réserve :** {resume['reserve_echantillon']}")
    lignes.append("")
    return lignes


def _table_detail(titre: str, detail: list[dict]) -> list[str]:
    if not detail:
        return []
    avec_audio = any("duree_audio_ms" in d for d in detail)
    entete = "| Scène | Caractères | Durée | Issue |"
    separateur = "|---|---|---|---|"
    if avec_audio:
        entete = "| Scène | Caractères | Durée | Audio | Issue |"
        separateur = "|---|---|---|---|---|"
    lignes = [f"*{titre}*", "", entete, separateur]
    for d in detail:
        cle = d["cle"].split("#")[-1]
        cellules = [
            f"#{cle}",
            rendu(d["chars_factures"]) if "chars_factures" in d else rendu(d["chars"]),
            rendu(d.get("duree_s")),
        ]
        if avec_audio:
            cellules.append(rendu(d.get("duree_audio_ms")))
        cellules.append(d["issue"] + (f" — {d['motif']}" if d.get("motif") else ""))
        lignes.append("| " + " | ".join(cellules) + " |")
    lignes.append("")
    return lignes


def _rendre_conclusion(conclusion: dict, L: list[str]) -> None:
    a = L.append
    a("## Conclusion — le plancher face aux cibles du SPEC")
    a("")
    if conclusion.get("etat") == "indisponible":
        a(f"Indisponible : {conclusion['raison']}.")
        a("")
        return
    a(f"Chaîne mesurée : `{conclusion['paire_chainee']}`, traduction puis synthèse, en séquentiel.")
    a("")
    premiere = conclusion.get("premiere_scene_mesuree")
    if premiere:
        a("### Première Scène d'une langue neuve — la chaîne réelle")
        a("")
        a(f"Scène #0 : traduction {rendu(premiere['traduction_s'])} + synthèse "
          f"{rendu(premiere['synthese_s'])} = **{rendu(premiere['total_s'])}**.")
        a("")
        a(f"- Contre la cible p50 ≤ 30 s : **{premiere['verdict_p50']}**.")
        a(f"- Avec le sondage du portail : {rendu(premiere['avec_le_sondage_a_15_s'])} → "
          f"**{premiere['verdict_p50_avec_sondage']}**.")
        a("")
        a(f"> {premiere['total_s']['note']}")
        a("")
    a("### Enveloppe par percentile")
    a("")
    a("| Niveau | Traduction | Synthèse | Total | Cible | Verdict | + sondage 15 s | Verdict |")
    a("|---|---|---|---|---|---|---|---|")
    for niveau in ("p50", "p95"):
        e = conclusion.get(f"enveloppe_{niveau}")
        if not e:
            continue
        a(f"| {niveau} | {rendu(e['traduction_s'])} | {rendu(e['synthese_s'])} | "
          f"{rendu(e['total_s'])} | {rendu(e['cible_s'])} | **{e['verdict']}** | "
          f"{rendu(e['avec_le_sondage_a_15_s'])} | **{e['verdict_avec_sondage']}** |")
    a("")
    e50 = conclusion.get("enveloppe_p50")
    if e50:
        a(f"> {e50['total_s']['note']}.")
        a("")
    hn = conclusion.get("scene_hors_norme")
    if hn:
        a("### Scène hors norme")
        a("")
        a(f"Traduction {rendu(hn['traduction_s'])} + synthèse {rendu(hn['synthese_s'])} = "
          f"**{rendu(hn['total_s'])}** — contre p50 : **{hn['verdict_p50']}** ; "
          f"contre p95 : **{hn['verdict_p95']}**. Avec le sondage : "
          f"{rendu(hn['avec_le_sondage_a_15_s'])}.")
        a("")
        a(f"> {hn['total_s']['note']}")
        a("")


def _rendre_agregat(agregat: dict, L: list[str]) -> None:
    a = L.append
    a("## Agrégat — ce que coûte une Visite entière")
    a("")
    a(f"Périmètre : {agregat['perimetre']}.")
    a("")
    a("| Poste | Durée |")
    a("|---|---|")
    for paire, valeur in agregat["traduction_par_paire"].items():
        a(f"| traduction {paire} | {rendu(valeur)} |")
    a(f"| **traduction, total** | {rendu(agregat['traduction_total_s'])} |")
    for langue, valeur in agregat["synthese_par_langue"].items():
        a(f"| synthèse {langue} | {rendu(valeur)} |")
    a(f"| **synthèse, total** | {rendu(agregat['synthese_total_s'])} |")
    a(f"| démarrages à froid | {rendu(agregat['demarrages_a_froid_total_s'])} |")
    a(f"| **TOTAL** | {rendu(agregat['total_s'])} — soit {rendu(agregat['total_min'])} |")
    a("")
    a(f"> {agregat['total_s']['note']}.")
    a(f"> Les démarrages à froid : {agregat['demarrages_a_froid_total_s']['note']}.")
    a("")


def rendre_markdown(rapport: dict) -> str:
    L: list[str] = []
    a = L.append
    a(f"# {rapport['titre']}")
    a("")
    a(f"*Story {rapport['story']} — rapport du {rapport['date']}.*")
    a("")
    a("> **Chaque chiffre porte sa méthode.** *(mesuré)* = chronométré par ce banc sur le")
    a("> fournisseur sous contrat. *(constaté)* = lu dans le code ou dans le corpus, sans")
    a("> chronomètre. *(estimé)* = calculé à partir d'un tarif ou d'une hypothèse nommée.")
    a("> Un chiffre sans méthode n'entre pas à ce rapport.")
    a("")

    a("## Ce que ce banc ne mesure pas")
    a("")
    ne_mesure_pas = rapport["ce_que_ce_banc_ne_mesure_pas"]
    a(f"**« {ne_mesure_pas['delai']} »** — la cible du SPEC ({ne_mesure_pas['cible_du_spec']}).")
    a("")
    a(ne_mesure_pas["pourquoi"])
    a("")

    if rapport.get("conclusion"):
        _rendre_conclusion(rapport["conclusion"], L)
    if rapport.get("agregat_une_visite"):
        _rendre_agregat(rapport["agregat_une_visite"], L)

    a("## Protocole")
    a("")
    proto = rapport["protocole"]
    a(f"- **Séquentiel.** {proto['sequentiel']}")
    a(f"- **Résolution de la mesure :** {rendu(proto['resolution_du_sondage_s'])}.")
    a(f"- **Lecture seule.** {proto['lecture_seule']}")
    a(f"- **Corpus source :** `{proto['corpus']}`")
    a(f"- **Corpus traduit :** `{proto['corpus_traduit']}`")
    a("")
    a("**Hypothèses que ce rapport porte sans les mesurer :**")
    a("")
    for hypothese in proto["hypotheses"]:
        a(f"- {hypothese}")
    a("")

    a("## Les deux cibles")
    a("")
    corpus = rapport["corpus"]
    a(f"Corpus : {rendu(corpus['nb_visites'])} Visites, {rendu(corpus['nb_scenes'])} Scènes.")
    a("")
    a("| Distribution | min | médiane | max |")
    a("|---|---|---|---|")
    a(f"| par Scène | {rendu(corpus['scene_chars_min'])} | {rendu(corpus['scene_chars_median'])} "
      f"| {rendu(corpus['scene_chars_max'])} |")
    a(f"| par Visite | {rendu(corpus['visite_chars_min'])} | {rendu(corpus['visite_chars_median'])} "
      f"| {rendu(corpus['visite_chars_max'])} |")
    a("")
    a(f"> {corpus['visite_chars_median']['note']}.")
    a("")
    med = rapport["cibles"]["mediane"]
    a(f"### Visite médiane — {med['titre']}")
    a("")
    a(f"`{med['tour_id']}` — {med['ville']}, {rendu(med['nb_scenes'])} Scènes, "
      f"{rendu(med['chars'])}.")
    a("")
    mdn = med["medianite"]
    a(f"**Médianité vérifiée :** `{mdn['verifiee']}` — rang {rendu(mdn['rang'])} sur "
      f"{rendu(mdn['sur'])} Visites ({rendu(mdn['percentile'])}), pour une médiane de corpus de "
      f"{rendu(mdn['chars_median_du_corpus'])}, soit {rendu(mdn['ecart_a_la_mediane'])}. "
      f"{mdn['lecture']}")
    a("")
    hn = rapport["cibles"]["hors_norme"]
    a(f"### Visite hors norme — {hn['titre']}")
    a("")
    a(f"`{hn['tour_id']}` — {hn['ville']}, {rendu(hn['nb_scenes'])} Scènes, {rendu(hn['chars'])} "
      f"— soit {rendu(hn['visite_ecart_a_la_mediane'])} la Visite médiane.")
    a("")
    a(f"Scène mesurée : `{hn['scene_mesuree']}`, {rendu(hn['scene_chars'])} — "
      f"{rendu(hn['rapport_a_la_mediane_du_corpus'])} la Scène médiane du corpus, soit "
      f"{rendu(hn['part_du_plafond_fr'])} du plafond de {rendu(hn['plafond_facturable'])}.")
    a("")
    sing = hn["singularite"]
    a(f"**Singularité.** {sing['lecture']} Hors seed : `{sing['hors_seed']}` — "
      f"{rendu(sing['nb_visites_hors_seed_dans_le_corpus'])} Visite(s) hors seed dans tout le "
      f"corpus. Possède les {rendu(sing['n'])} Scènes les plus longues du corpus : "
      f"`{sing['possede_les_n_plus_longues_scenes']}`. La plus longue Scène qui ne lui "
      f"appartient pas fait {rendu(sing['chars_de_la_plus_longue_scene_hors_cible'])}.")
    a("")
    a(f"> {sing['scenes_mesurees']['note']}.")
    a("")

    a("## Profil par langue — corpus, pas chronomètre")
    a("")
    a("| Langue | Visite médiane | Expansion | Coût synthèse | Scène hors norme | Part du plafond | Traduisible | Synthétisable |")
    a("|---|---|---|---|---|---|---|---|")
    profil = rapport["profil_par_langue"]
    for langue, entree in profil["langues"].items():
        etiquette = f"{langue} (source)" if langue == "fr" else langue
        a(
            f"| {etiquette} | {rendu(entree.get('chars_visite_mediane'))} | "
            f"{rendu(entree.get('expansion'))} | {rendu(entree.get('cout_visite_mediane'))} | "
            f"{rendu(entree.get('scene_hors_norme_facturables'))} | "
            f"{rendu(entree.get('scene_hors_norme_part_du_plafond'))} | "
            f"`{entree['traduisible_par_le_microservice']}` | "
            f"`{entree['synthetisable_par_le_microservice']}` |"
        )
    a("")
    a(f"> {profil['note_langues']}")
    a("")
    exemple = next(iter(profil["langues"].values()), {}).get("cout_visite_mediane")
    if exemple and exemple.get("note"):
        a(f"> **Coût :** {exemple['note']}")
        a("")

    mesures = rapport.get("postes_mesures", {})
    a("## Postes mesurés")
    a("")
    if not rapport["serie_executee"]:
        a(f"**{mesures.get('etat')}.** {mesures.get('raison')}")
        a("")
        a(f"Pour les obtenir : {mesures.get('comment_les_obtenir')}")
        a("")
    else:
        if not mesures.get("serie_valide", True):
            a("> **SÉRIE DÉCLARÉE NON VALIDE.**")
            for reserve in mesures.get("reserves", []):
                a(f"> - {reserve}")
            a("")
        avant, apres = mesures["sante_avant"], mesures["sante_apres"]
        a(f"Fournisseur : `{avant['tts_mode']}`. Avant la série — jobs en vol "
          f"{rendu(avant['inflight_jobs'])}, cache {rendu(avant['cache_size'])}. "
          f"Après — jobs en vol {rendu(apres['inflight_jobs'])}, cache {rendu(apres['cache_size'])}. "
          f"Contre-pression 429 : {rendu(mesures['contre_pression_429'])}. "
          f"Erreurs 5xx : {rendu(mesures['erreurs_5xx'])}. "
          f"Soumissions abandonnées : {rendu(mesures['submits_epuises'])}.")
        a("")
        cache = mesures["provenance_du_cache"]
        a(f"**Cache de traduction : {cache['etat']}.** "
          f"{rendu(cache['phrases_distinctes_soumises'])} phrases distinctes soumises pour un "
          f"delta de {rendu(cache['delta_cache'])}. {cache['lecture']}")
        a("")
        a("Routes appelées (observées) : " + ", ".join(f"`{r}`" for r in mesures["routes_appelees"])
          + ". Aucune écriture DynamoDB, aucune écriture S3 — le banc ne connaît aucune "
            "autre adresse.")
        a("")

        amorcage = mesures.get("amorcage")
        if amorcage:
            a(f"**Amorçage écarté :** {rendu(amorcage.get('duree_s'))} sur "
              f"`{amorcage['paire']}`. {amorcage['pourquoi']}")
            a("")

        a("### Démarrage à froid — exclu de tout percentile")
        a("")
        a(mesures["demarrage_a_froid"]["note"])
        a("")
        a("| Paire | Pivot | Modèles chargés par cet appel | Durée |")
        a("|---|---|---|---|")
        for poste in mesures["demarrage_a_froid"]["paires"]:
            a(
                f"| {poste['paire']} | {poste.get('pivot') or '—'} | "
                f"{', '.join(poste['modeles_charges_par_cet_appel']) or '—'} | "
                f"{rendu(poste.get('duree_s')) if poste.get('duree_s') else poste.get('motif', '—')} |"
            )
        a("")

        trad = mesures["traduction"]
        a("### Poste 1 — Traduction *(provisoire)*")
        a("")
        a(f"Moteur : {trad['moteur']}. {trad['raison_du_caractere_provisoire']} "
          f"Mesure prise le {trad['date_de_mesure']}.")
        a("")
        for paire, bloc in trad["paires_directes"].items():
            L.extend(_table_poste(f"Paire directe {paire} — Visite médiane", bloc["visite_mediane"]))
            L.extend(_table_poste(f"Paire directe {paire} — Scène hors norme", bloc["scene_hors_norme"]))
        for paire, bloc in trad["paires_pivotees"].items():
            L.extend(_table_poste(
                f"Paire pivotée {paire} (pivot : {bloc.get('pivot')}) — Visite médiane",
                bloc["visite_mediane"],
            ))
            L.extend(_table_poste(
                f"Paire pivotée {paire} — Scène hors norme", bloc["scene_hors_norme"]
            ))
            a(f"> {bloc.get('note')}")
            a("")
        a("**Détail par Scène**")
        a("")
        for paire, detail in trad["detail"].items():
            L.extend(_table_detail(paire, detail))

        synth = mesures["synthese"]
        a("### Poste 2 — Synthèse")
        a("")
        a(f"Fournisseur : `{synth['fournisseur']}`. Langue synthétisée : "
          f"`{mesures['langue_de_synthese']}` — le texte de la langue cible, celui qu'une "
          "fabrication réelle envoie au fournisseur.")
        a("")
        L.extend(_table_poste("Visite médiane", synth["visite_mediane"]))
        L.extend(_table_poste("Scène hors norme", synth["scene_hors_norme"]))
        a("**Détail par Scène**")
        a("")
        L.extend(_table_detail("Visite médiane", synth["detail_visite_mediane"]))
        L.extend(_table_detail("Scène hors norme", synth["detail_scene_hors_norme"]))
        a(f"Coût de la série : {rendu(synth['cout_de_la_serie'])}.")
        a("")

    a("## Postes constatés — réels, non mesurables aujourd'hui")
    a("")
    a("Ces coûts domineraient le vécu du visiteur bien avant le temps fournisseur. Les taire")
    a("produirait un plancher rassurant et faux ; les mesurer est impossible aujourd'hui. Les")
    a("nommer avec leur anchor est ce qui fait de ce rapport une donnée de conception.")
    a("")
    for poste in rapport["postes_constates"]:
        marque = "vérifié" if poste["anchor_verifie"] else "**ANCHOR À REVOIR**"
        cout = rendu(poste["cout"]) if poste["cout"] else (poste.get("cout_texte") or "—")
        a(f"### {poste['nom']} — {cout}")
        a("")
        a(f"`{poste['anchor']}` ({marque})")
        a("")
        if poste["cout"] and poste["cout"].get("note"):
            a(f"- **Lecture du chiffre :** {poste['cout']['note']}")
        a(f"- **Pourquoi non mesurable :** {poste['pourquoi_non_mesurable']}")
        a(f"- **Portée :** {poste['levier']}")
        a("")
    return "\n".join(L) + "\n"


def deposer_rapport(rapport: dict, dossier: Path) -> tuple[Path, Path]:
    """Le rapport est versionné et daté, hors des dossiers ignorés par git : la
    mesure doit survivre au poste qui l'a produite. Elle ne survit pas si une
    seconde exécution dans la même minute l'écrase en silence."""
    dossier = Path(dossier)
    dossier.mkdir(parents=True, exist_ok=True)
    horodatage = datetime.fromisoformat(rapport["date"]).strftime("%Y-%m-%d-%H%M")
    base = f"{horodatage}-plancher-fabrication"
    chemin_json = dossier / f"{base}.json"
    chemin_md = dossier / f"{base}.md"
    existants = [c for c in (chemin_json, chemin_md) if c.exists()]
    if existants:
        raise BancRefuse(
            "Un rapport porte déjà cet horodatage : "
            + ", ".join(c.name for c in existants)
            + ". Le banc n'écrase pas une mesure — attendre la minute suivante, ou "
              "déplacer l'ancienne."
        )
    chemin_json.write_text(
        json.dumps(rapport, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    chemin_md.write_text(rendre_markdown(rapport), encoding="utf-8")
    return chemin_json, chemin_md


# ── CLI ─────────────────────────────────────────────────────────────────────


def analyser_arguments(argv: list[str] | None = None) -> argparse.Namespace:
    ap = argparse.ArgumentParser(
        description="Banc de mesure du plancher de fabrication (traduction + synthèse).",
    )
    ap.add_argument("--base", default=os.getenv("MICROSERVICE_BASE_URL", "http://localhost:8000"))
    ap.add_argument("--corpus", default=str(CORPUS_SOURCE_DEFAUT),
                    help="corpus source exporté sur disque")
    ap.add_argument("--corpus-traduit", default=str(CORPUS_TRADUIT_DEFAUT),
                    help="corpus retraduit — fournit le texte réellement synthétisé")
    ap.add_argument("--langues", default=",".join(LANGUES_DEFAUT),
                    help="langues cibles de la série de traduction")
    ap.add_argument("--langue-synthese", default="de",
                    help="langue du texte synthétisé (`fr` = texte source). Doit figurer "
                         "dans --langues. Le défaut `de` est la langue de plus forte "
                         "expansion du corpus : un quasi-pire cas, donc un plancher prudent.")
    ap.add_argument("--sortie", default=str(DOSSIER_MESURES_DEFAUT))
    ap.add_argument("--dry-run", action="store_true",
                    help="résoudre et décrire les deux cibles, sans aucun appel fournisseur")
    ap.add_argument("--sans-serie", action="store_true",
                    help="déposer le rapport des seuls postes constatés et estimés, sans dépense")
    ap.add_argument("--cache-non-neutralise", action="store_true",
                    help="mesurer malgré un cache de traduction non vide — la série est alors "
                         "DÉCLARÉE NON VALIDE dans le rapport")
    return ap.parse_args(argv)


def _decrire(cibles: Cibles, stats_corpus: dict, args: argparse.Namespace) -> None:
    print("=== Banc du plancher de fabrication — description des cibles (aucun appel fournisseur) ===")
    print(f"Corpus : {Path(args.corpus).resolve()}")
    print(f"  {stats_corpus['nb_visites']} Visites, {stats_corpus['nb_scenes']} Scènes")
    print(f"  par Scène  — min {stats_corpus['chars_min']}, médiane "
          f"{stats_corpus['chars_median']:.0f}, max {stats_corpus['chars_max']}")
    print(f"  par Visite — min {stats_corpus['visite_chars_min']}, médiane "
          f"{stats_corpus['visite_chars_median']:.0f}, max {stats_corpus['visite_chars_max']}")
    print()
    for etiquette, visite in (("Visite médiane", cibles.mediane), ("Visite hors norme", cibles.hors_norme)):
        print(f"{etiquette} : {visite.titre}")
        print(f"  tourId  : {visite.tour_id}   ville : {visite.ville}   hors seed : {visite.hors_seed}")
        print(f"  Scènes  : {len(visite.scenes)}   total : {visite.chars_reels} caractères")
        for scene in visite.scenes:
            phrases = len(decouper_en_phrases(scene.texte))
            print(f"    #{scene.index} {scene.chars:>5} car. / {phrases:>3} phrases  {scene.titre}")
        print()
    m = cibles.medianite
    print(f"Médianité de la cible médiane : vérifiée={m['est_la_mediane']}  "
          f"rang {m['rang']}/{m['nb_visites']} ({m['percentile']} %)  "
          f"écart à la médiane {m['ecart_a_la_mediane']}×")
    print()
    scene = cibles.scene_hors_norme
    factures = billed_characters(scene.texte)
    print(f"Scène hors norme mesurée : {scene.scene_id}")
    print(f"  {scene.chars} caractères, {factures} facturables, plafond {MAX_BILLABLE_CHARS} "
          f"({100.0 * factures / MAX_BILLABLE_CHARS:.1f} %)")
    print(f"  soit {scene.chars / stats_corpus['chars_median']:.1f} x la Scène médiane, "
          f"et sa Visite {cibles.singularite['visite_ecart_a_la_mediane']} x la Visite médiane")
    print(f"  singularité : {cibles.singularite}")
    print()
    langues = [l.strip() for l in args.langues.split(",") if l.strip()]
    print("Paires de traduction prévues :")
    for langue in langues:
        try:
            modeles = modeles_requis(LANGUE_SOURCE, langue)
        except PaireNonSupportee as exc:
            print(f"  {LANGUE_SOURCE}→{langue} : ARRÊT — {exc}")
            continue
        pivot = pivot_de(LANGUE_SOURCE, langue)
        marque = f" (pivot via {pivot} — DEUX inférences, chronométrée à part)" if pivot else ""
        print(f"  {LANGUE_SOURCE}→{langue} : {', '.join(modeles)}{marque}")
    print()
    print(f"Langue de synthèse : {args.langue_synthese}")
    print("Aucun appel fournisseur n'a été émis.")


def main(argv: list[str] | None = None) -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
    except Exception:  # noqa: BLE001
        pass
    args = analyser_arguments(argv)
    try:
        visites = charger_corpus(Path(args.corpus))
        stats_corpus = statistiques_corpus(visites)
        cibles = selectionner_cibles(visites)
    except ErreurCorpus as exc:
        print(f"[ARRÊT] {exc}")
        return 2

    if args.dry_run:
        _decrire(cibles, stats_corpus, args)
        return 0

    resultat: Resultat | None = None
    if not args.sans_serie:
        try:
            resultat = asyncio.run(executer_series(args, cibles))
        except BancRefuse as exc:
            print(f"[ARRÊT] {exc}")
            return 2
        except ErreurCorpus as exc:
            print(f"[ARRÊT] {exc}")
            return 2

    rapport = construire_rapport(args, cibles, stats_corpus, resultat)
    try:
        chemin_json, chemin_md = deposer_rapport(rapport, Path(args.sortie))
    except BancRefuse as exc:
        print(f"[ARRÊT] {exc}")
        return 2
    etiquette = "Rapport" if resultat is not None else "Rapport SANS SÉRIE"
    print(f"{etiquette} déposé :\n  {chemin_json}\n  {chemin_md}")
    if resultat is not None and not resultat.serie_valide:
        print("[RÉSERVE] Série déclarée NON VALIDE — voir les réserves du rapport.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
