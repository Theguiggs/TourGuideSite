"""
Azure AI Speech — le Fournisseur sous contrat.

Ce que ce module fait de différent du mode dégradé, en une phrase : il envoie la
Scène ENTIÈRE, SSML compris, en UN appel, et laisse le moteur rendre les pauses.

Tout le reste en découle. Le découpage à 2 000 caractères, les silences recollés
par pydub, les trois reprises et le garde-fou de 25 secondes existaient parce que
l'endpoint gratuit n'honore pas le SSML et casse au-delà d'une taille empirique.
Sous contrat, ces contournements n'ont plus d'objet — ils disparaissent avec leur
cause, ce qui est la seule bonne façon de supprimer du code.

Voix inchangées : l'endpoint gratuit servait déjà des voix Azure Neural.
"""

from __future__ import annotations

import logging
import os
import re

from services.tts_provider import (
    ProviderAuthError,
    ProviderError,
    ProviderQuotaError,
    env_float,
    env_int,
)

logger = logging.getLogger("tourguide-microservice.tts.azure")

# Balises SSML que le corpus emploie réellement. Tout ce qui ressemble à une
# balise SANS en faire partie est du texte, et s'échappe.
_BALISES_SSML = (
    "speak", "voice", "break", "prosody", "emphasis", "say-as", "phoneme", "sub",
    "audio", "p", "s", "lang", "mstts:express-as", "bookmark",
)
_BALISE_RE = re.compile(
    r"</?(?:" + "|".join(re.escape(b) for b in _BALISES_SSML) + r")\b[^>]*/?>",
    re.IGNORECASE,
)


def _echappe_texte(document: str) -> str:
    """
    Échappe `&` et `<` du TEXTE, sans toucher aux balises SSML.

    Le découpage se fait sur les balises connues : ce qui n'en est pas une est
    du texte, quoi qu'il y ressemble. Un `&` déjà échappé (`&amp;`, `&#233;`)
    est laissé intact — le ré-échapper afficherait « &amp; » à l'oral.
    """
    morceaux = []
    position = 0
    for m in _BALISE_RE.finditer(document or ""):
        morceaux.append(_echappe_fragment(document[position:m.start()]))
        morceaux.append(m.group(0))
        position = m.end()
    morceaux.append(_echappe_fragment((document or "")[position:]))
    return "".join(morceaux)


# XML ne definit que CINQ entites nommees. `&eacute;` est du HTML : le
# preserver produirait un document invalide, donc une Scene perdue. On
# l'echappe donc — un mot bizarre a l'oral vaut mieux qu'un silence, et de
# toute facon la narration s'ecrit avec de vrais caracteres accentues.
_ENTITE_RE = re.compile(r"&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);")


def _echappe_fragment(texte: str) -> str:
    if not texte:
        return ""
    # `&` seuls -> `&amp;`, en preservant les entites deja formees.
    sorti = []
    position = 0
    for m in _ENTITE_RE.finditer(texte):
        sorti.append(texte[position:m.start()].replace("&", "&amp;"))
        sorti.append(m.group(0))
        position = m.end()
    sorti.append(texte[position:].replace("&", "&amp;"))
    return "".join(sorti).replace("<", "&lt;")

# Format de sortie. 24 kHz mono 16 bits : celui que le reste de la chaîne attend
# déjà (`tests/test_audio_post.py` décrit sa doublure de parole dans ce format),
# donc `audio_post` et le stockage S3 ne changent pas.
#
# La GRAPHIE fait partie du contrat. `Riff24Khz16BitMonoPcm` est le nom de l'enum
# du SDK ; l'API REST n'accepte que la forme en minuscules à traits d'union. La
# première version envoyait le nom d'enum : Azure répondait HTTP 400 sur CHAQUE
# synthèse, dans les cinq langues, avec une clé et une région pourtant valides.
# L'épreuve ne pouvait pas le voir — elle comparait l'en-tête à cette constante,
# ce qui reste vrai quelle que soit sa valeur.
OUTPUT_FORMAT = "riff-24khz-16bit-mono-pcm"

# Azure borne une requete de synthese a 10 minutes d'audio. La Scene la plus
# longue du corpus fait 7 308 caracteres, soit ~8 minutes de parole : elle passe,
# mais de peu. Le plafond est donc pose a 9 000 — au-dessus du corpus reel, sous
# la limite du fournisseur — pour que le depassement soit annonce PAR NOUS, avec
# le chiffre qui depasse, plutot que par un HTTP 400 opaque.
#
# La premiere version valait 50 000, soit ~55 minutes : au-dela de la limite
# qu'elle pretendait proteger, ET inatteignable puisque `TTSRequest.text` est
# borne a 10 000 en amont. Un garde-fou qui ne peut pas se declencher n'en est
# pas un.
MAX_BILLABLE_CHARS = env_int("AZURE_MAX_CHARS", 9000)

# Reprises sur erreur transitoire. L'ancien chemin en avait trois ; les avoir
# retirees faisait perdre une Scene entiere sur une limitation de debit que le
# code lui-meme qualifie de « reessayable ».
RETRY_ATTEMPTS = env_int("AZURE_TTS_RETRIES", 3)
RETRY_BASE_DELAY_S = env_float("AZURE_TTS_RETRY_DELAY_S", 1.0)

# Une region Azure est un identifiant alphanumerique — `westeurope`,
# `francecentral`. La valider AVANT de construire l'URL : une valeur contenant un
# point ou une barre enverrait la CLE D'ABONNEMENT a un hote non voulu.
_REGION_RE = re.compile(r"^[a-z0-9]+$")

# La voix entre dans un attribut XML. Une valeur fantaisiste casserait le
# document, ou y injecterait du balisage.
_VOIX_RE = re.compile(r"^[A-Za-z0-9-]+$")


class AzureTTSProvider:
    """Synthèse sous contrat. Une requête HTTP, une Scène."""

    name = "azure"

    def __init__(self, key: str, region: str, timeout_s: float | None = None):
        if not key or not region:
            # Ne jamais construire un fournisseur muet : sans clé, c'est la
            # fabrique qui doit choisir le mode dégradé, en le disant.
            raise ProviderAuthError("Clé ou région Azure Speech manquante")
        if not _REGION_RE.match(region):
            # La region entre dans l'URL : une valeur fantaisiste enverrait la
            # cle d'abonnement a un hote que personne n'a choisi.
            raise ProviderAuthError(
                f"Region Azure invalide ({region!r}) : attendu un identifiant "
                "alphanumerique comme « westeurope »."
            )
        self._key = key
        self._region = region
        self._timeout_s = (
            timeout_s if timeout_s is not None else env_float("AZURE_TTS_TIMEOUT_S", 120.0)
        )
        # Session reutilisee : sans elle, chaque Scene refait une poignee de main
        # TLS complete avec le fournisseur.
        self._session = None

    @property
    def endpoint(self) -> str:
        return f"https://{self._region}.tts.speech.microsoft.com/cognitiveservices/v1"

    def _wrap(self, ssml: str, voice: str) -> str:
        """
        Enveloppe le contenu dans `<speak>`/`<voice>` s'il ne l'est pas déjà, et
        garantit que le document est du XML bien formé.

        Le BALISAGE passe tel quel — c'est tout l'intérêt du contrat : on ne
        réanalyse pas le SSML, on ne le découpe pas. Mais le TEXTE, lui, doit
        être échappé : une esperluette dans « Rue Saint-Roch & Cie » produit
        sinon un document invalide, donc un HTTP 400, donc la Scène entièrement
        perdue. L'ancien chemin encaissait ce cas par un repli en texte brut ;
        ne rien faire ici aurait été une régression silencieuse.
        """
        corps = _echappe_texte((ssml or "").strip())
        # `lstrip` avant le test : une déclaration XML ou un BOM en tête ferait
        # sinon envelopper un document déjà enveloppé — double `<speak>`, HTTP 400.
        blancs = "\ufeff \t\r\n"
        if corps.lstrip(blancs).lower().startswith(("<speak", "<?xml")):
            if voice and voice not in corps:
                # La reponse annoncerait sinon une voix qui n'a jamais parle :
                # la metadonnee divergerait de l'audio, ce qui est pire que de
                # ne rien annoncer.
                logger.warning(
                    "Voix %s ignoree : le document est deja enveloppe et porte la sienne.",
                    voice,
                )
            return corps
        lang = "-".join(voice.split("-")[:2]) if voice.count("-") >= 2 else "fr-FR"
        return (
            f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" '
            f'xml:lang="{lang}"><voice name="{voice}">{corps}</voice></speak>'
        )

    def _post(self, document: str):
        import requests

        if self._session is None:
            self._session = requests.Session()
        return self._session.post(
            self.endpoint,
            data=document.encode("utf-8"),
            headers={
                "Ocp-Apim-Subscription-Key": self._key,
                "Content-Type": "application/ssml+xml",
                "X-Microsoft-OutputFormat": OUTPUT_FORMAT,
                "User-Agent": "murmure-tts",
            },
            timeout=self._timeout_s,
        )

    async def synthesize(self, ssml: str, voice: str, tier: str) -> object:
        import asyncio
        import io

        from pydub import AudioSegment

        from services.audio_post import trim_silence
        from services.tts_provider import billed_characters

        if not _VOIX_RE.match(voice or ""):
            # La voix entre dans un attribut XML : une valeur fantaisiste
            # casserait le document, ou y injecterait du balisage.
            raise ProviderError(f"Nom de voix invalide : {voice!r}")

        facturables = billed_characters(ssml)
        if facturables > MAX_BILLABLE_CHARS:
            # Explicite, et nommant le chiffre : « pas d'audio » n'aide personne
            # a comprendre qu'une Scene doit etre condensee.
            raise ProviderError(
                f"Scene trop longue pour un seul appel : {facturables} caracteres "
                f"factures pour un plafond de {MAX_BILLABLE_CHARS}"
            )

        document = self._wrap(ssml, voice)

        derniere: ProviderError | None = None
        for tentative in range(1, RETRY_ATTEMPTS + 1):
            try:
                reponse = await asyncio.get_running_loop().run_in_executor(
                    None, self._post, document
                )
            except Exception as e:
                derniere = ProviderError(f"Azure Speech injoignable : {e}")
            else:
                if reponse.status_code in (401, 403):
                    # Distinguee d'une panne, et NON reessayee : on ne rejoue pas
                    # une cle refusee, et le message nomme l'authentification
                    # plutot que de laisser croire a une panne passagere.
                    raise ProviderAuthError(
                        f"Azure Speech a refuse la cle (HTTP {reponse.status_code}). "
                        "Verifier AZURE_SPEECH_KEY et AZURE_SPEECH_REGION."
                    )
                if reponse.status_code == 429:
                    derniere = ProviderQuotaError("Azure Speech limite le debit (HTTP 429)")
                elif reponse.status_code >= 500:
                    derniere = ProviderError(
                        f"Azure Speech a repondu HTTP {reponse.status_code}"
                    )
                elif reponse.status_code >= 400:
                    # Un 4xx autre que l'authentification ne se rejoue pas : la
                    # requete est fautive, la reessayer la refera echouer.
                    # Le corps de la reponse va au JOURNAL, jamais au client :
                    # un fragment de diagnostic d'un tiers n'a rien a faire dans
                    # une erreur que l'application affiche.
                    logger.error(
                        "Azure Speech HTTP %d : %s",
                        reponse.status_code, (reponse.text or "")[:300],
                    )
                    raise ProviderError(
                        f"Azure Speech a refuse la requete (HTTP {reponse.status_code})"
                    )
                elif not reponse.content:
                    derniere = ProviderError("Azure Speech a repondu sans audio")
                else:
                    try:
                        segment = AudioSegment.from_file(
                            io.BytesIO(reponse.content), format="wav"
                        )
                    except Exception as e:
                        # Une charge tronquee ou non-WAV doit sortir par le
                        # contrat documente, pas par une exception de pydub.
                        raise ProviderError(f"Audio Azure illisible : {e}") from e
                    if len(segment) == 0:
                        # Le garde-fou universel de l'ancien chemin : un WAV
                        # reduit a son en-tete publierait une Scene de 0 ms
                        # comme un succes.
                        raise ProviderError("Azure Speech a rendu un audio vide")
                    # `SpeechJoiner` rognait le silence de bord sur l'ancien
                    # chemin ; sans lui, le silence de tete et de queue rendu
                    # par le fournisseur reste colle a la Scene. `trim_silence`
                    # conserve une respiration (`keep_ms`) : il degrossit sans
                    # couper la parole.
                    segment = trim_silence(segment)
                    logger.info(
                        "Synthese Azure : voix=%s palier=%s factures=%d, %d Ko rendus",
                        voice, tier, facturables, len(reponse.content) // 1024,
                    )
                    return segment

            if tentative < RETRY_ATTEMPTS:
                logger.warning(
                    "Azure Speech, tentative %d/%d en echec (%s) - nouvelle tentative",
                    tentative, RETRY_ATTEMPTS, derniere,
                )
                await asyncio.sleep(RETRY_BASE_DELAY_S * tentative)

        raise derniere if derniere else ProviderError("Azure Speech en echec")
