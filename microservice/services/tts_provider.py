"""
Fournisseur de synthèse — la frontière, et elle seule.

Pourquoi une frontière plutôt qu'un remplacement pur. Le SPEC interdit de
traiter le service gratuit comme un plan de continuité, mais n'interdit pas
qu'il existe : il doit rester disponible ET déclaré. Deux implémentations
derrière un même protocole rendent cette déclaration mécanique — le nom du
fournisseur employé sort avec l'audio. Un remplacement pur laisserait le choix
implicite dans une variable d'environnement que personne ne relit.

Ce module ne synthétise rien. Il choisit, compte ce qui est facturé, et nomme.
"""

from __future__ import annotations

import logging
import os
import re
from typing import Protocol

logger = logging.getLogger("tourguide-microservice.tts.provider")

# Les cinq voix du catalogue en vente. Ce sont DÉJÀ des voix Azure : l'endpoint
# gratuit et l'offre payante servent les mêmes timbres. La bascule change le
# rendu, jamais l'identité vocale — un visiteur qui a déjà écouté une visite ne
# doit rien entendre de neuf.
VOICES_STANDARD = {
    "fr": "fr-FR-HenriNeural",
    "en": "en-US-GuyNeural",
    "it": "it-IT-DiegoNeural",
    "de": "de-DE-ConradNeural",
    "es": "es-ES-AlvaroNeural",
    "nl": "nl-NL-MaartenNeural",
    "ja": "ja-JP-KeitaNeural",
    "ko": "ko-KR-InJoonNeural",
    "zh": "zh-CN-YunxiNeural",
    "ru": "ru-RU-DmitryNeural",
}

# Palier haute définition. Le SPEC le pose en HYPOTHÈSE à trancher « à l'écoute
# comparative sur une visite réelle, pas avant » : le réglage existe pour rendre
# cette écoute possible sans livraison, pas pour être activé par défaut.
VOICES_HD = {
    "fr": "fr-FR-VivienneMultilingualNeural",
    "en": "en-US-AndrewMultilingualNeural",
    "it": "it-IT-GiuseppeMultilingualNeural",
    "de": "de-DE-FlorianMultilingualNeural",
    "es": "es-ES-TristanMultilingualNeural",
    # Pas d'entree pour `nl` : Azure n'offre pas de voix HD neerlandaise. Y
    # laisser la voix STANDARD ferait croire a une haute definition qui n'existe
    # pas, et empecherait le repli journalise de se declencher.
}

DEFAULT_LANGUAGE = "fr"
TIERS = ("standard", "hd")

# Azure facture le balisage SSML, à l'exception de l'enveloppe `<speak>` et de
# `<voice>`. Les idéogrammes comptent double — sans effet aujourd'hui, décisif
# le jour de l'ouverture du japonais, du chinois ou du coréen.
_ENVELOPPE_RE = re.compile(r"</?(?:speak|voice)\b[^>]*>", re.IGNORECASE)
# U+1100–U+11FF (jamo) et U+AC00–U+D7AF (hangul) manquaient, alors que `ko` est
# deja accepte par l'API et que le commentaire ci-dessus nomme le coreen comme
# cas decisif. billed_characters("hangul") rendait la moitie du compte reel.
_IDEOGRAMME_RE = re.compile("[" + "".join([
    "\u1100-\u11ff",   # jamo hangul
    "\u3000-\u9fff",   # CJK, kana, ponctuation ideographique
    "\uac00-\ud7af",   # syllabes hangul
    "\uf900-\ufaff",   # ideogrammes de compatibilite
    "\uff00-\uffef",   # formes pleine chasse
]) + "]")


class ProviderError(RuntimeError):
    """Panne du fournisseur. Le job échoue avec son motif — jamais de repli muet."""


class ProviderAuthError(ProviderError):
    """Clé absente, refusée ou expirée. À distinguer d'une panne : la suite à
    donner n'est pas la même — on ne réessaie pas une clé refusée."""


class ProviderQuotaError(ProviderError):
    """Quota ou limitation de débit. Réessayable, contrairement à l'authentification."""


# Une dataclass `Synthese` figurait ici, decrivant un contrat que personne
# n'honorait : `synthesize` rend un segment nu et `_tts_work` assemble les champs
# a la main. Une structure documentee mais jamais construite ment sur la forme du
# code — retiree plutot que remplie de force.


class TTSProvider(Protocol):
    name: str

    async def synthesize(self, ssml: str, voice: str, tier: str) -> object:
        """Rend un AudioSegment. Lève ProviderError et ses sous-classes."""
        ...


def billed_characters(ssml: str) -> int:
    """
    Caractères facturés par Azure : tout le SSML SAUF l'enveloppe `<speak>` et
    `<voice>`, les idéogrammes comptant double.

    Le compte est fait ici, à la source, plutôt que reconstitué plus tard : une
    reconstitution suppose de connaître la forme exacte du SSML envoyé, ce que
    seul cet endroit sait.
    """
    utile = _ENVELOPPE_RE.sub("", ssml or "")
    return len(utile) + len(_IDEOGRAMME_RE.findall(utile))


def env_int(nom: str, defaut: int, minimum: int = 1) -> int:
    """Entier de configuration, avec repli DIT.

    Une valeur mal saisie ne doit pas abattre le service au demarrage :
    `services/audio_post.py` applique deja cette politique, et deux politiques
    opposees pour la meme famille de reglages est pire que l'une ou l'autre.
    """
    brut = os.getenv(nom)
    if brut is None or not brut.strip():
        return defaut
    try:
        valeur = int(brut)
    except ValueError:
        logger.warning("%s=%r illisible - repli sur %d", nom, brut, defaut)
        return defaut
    if valeur < minimum:
        logger.warning("%s=%d sous le minimum %d - repli sur %d", nom, valeur, minimum, defaut)
        return defaut
    return valeur


def env_float(nom: str, defaut: float, minimum: float = 0.0) -> float:
    brut = os.getenv(nom)
    if brut is None or not brut.strip():
        return defaut
    try:
        valeur = float(brut)
    except ValueError:
        logger.warning("%s=%r illisible - repli sur %s", nom, brut, defaut)
        return defaut
    if valeur <= minimum:
        logger.warning("%s=%s non exploitable - repli sur %s", nom, valeur, defaut)
        return defaut
    return valeur


def resolve_tier(demande: str | None = None) -> str:
    """Palier de voix, standard par défaut. Un palier inconnu retombe sur
    standard EN LE DISANT : un réglage mal orthographié ne doit pas facturer
    silencieusement au tarif supérieur, ni se taire."""
    tier = (demande or os.getenv("TTS_VOICE_TIER") or "standard").strip().lower()
    if tier not in TIERS:
        logger.warning("Palier de voix inconnu (%r) — repli sur « standard »", tier)
        return "standard"
    return tier


def resolve_voice(language: str, tier: str, voice_id: str | None = None) -> str:
    """Voix pour une langue et un palier. Une voix explicite l'emporte : c'est
    ce qui rend l'écoute comparative possible sans toucher au code."""
    if voice_id:
        return voice_id
    table = VOICES_HD if tier == "hd" else VOICES_STANDARD
    voix = table.get(language)
    if voix:
        return voix
    # Le palier HD ne couvre pas toutes les langues : on retombe sur la voix
    # standard de la langue avant de retomber sur le français.
    voix = VOICES_STANDARD.get(language)
    if voix:
        logger.info("Pas de voix « %s » pour %r — repli sur la voix standard", tier, language)
        return voix
    logger.warning("Langue inconnue (%r) — repli sur la voix française", language)
    return VOICES_STANDARD[DEFAULT_LANGUAGE]


def build_provider() -> TTSProvider:
    """
    Choisit le fournisseur d'après la configuration.

    Le service gratuit n'est JAMAIS choisi en silence : on le nomme, et on dit
    pourquoi. Le SPEC est explicite — « le service de synthèse gratuit n'est pas
    un plan de continuité, il reste un mode dégradé journalisé ».
    """
    demande = (os.getenv("TTS_PROVIDER") or "").strip().lower()
    cle = (os.getenv("AZURE_SPEECH_KEY") or "").strip()
    region = (os.getenv("AZURE_SPEECH_REGION") or "").strip()

    if demande and demande not in ("edge", "azure"):
        logger.warning(
            "TTS_PROVIDER inconnu (%r) - valeurs acceptees : « azure », « edge ». "
            "Le choix se fera sur la presence de la cle.",
            demande,
        )

    if demande == "edge":
        logger.warning(
            "MODE DÉGRADÉ demandé explicitement (TTS_PROVIDER=edge) : synthèse par "
            "l'endpoint gratuit, sans contrat ni licence d'usage commercial."
        )
        from services.tts_edge import EdgeTTSProvider

        return EdgeTTSProvider()

    if cle and region:
        from services.tts_azure import AzureTTSProvider

        return AzureTTSProvider(key=cle, region=region)

    manquant = "AZURE_SPEECH_KEY" if not cle else "AZURE_SPEECH_REGION"
    if demande == "azure":
        # Une demande EXPLICITE qu'on ne peut pas honorer se dit autrement qu'un
        # defaut de configuration : l'exploitant croyait etre sous contrat.
        logger.error(
            "TTS_PROVIDER=azure demande mais %s absent : le service RETOMBE en mode "
            "degrade, sans contrat ni licence d'usage commercial.",
            manquant,
        )
    else:
        logger.warning(
            "MODE DÉGRADÉ : %s absent, synthèse par l'endpoint gratuit. Aucun contrat, "
            "aucune licence d'usage commercial sur l'audio produit.",
            manquant,
        )
    from services.tts_edge import EdgeTTSProvider

    return EdgeTTSProvider()
