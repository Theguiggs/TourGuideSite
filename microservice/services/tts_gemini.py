"""Gemini 3.8 Flash TTS — fournisseur premium de narration.

L'API Interactions reçoit un transcript strictement récité. Les consignes de
jeu voyagent dans ``speech_metadata`` et ne risquent donc pas d'être lues. Les
octets rendus sont déjà un WAV RIFF 24 kHz mono ; aucun en-tête n'est ajouté.
"""

from __future__ import annotations

import asyncio
import base64
import html
import io
import logging
import os
import re
import xml.etree.ElementTree as ET

from services.tts_provider import (
    ProviderAuthError,
    ProviderError,
    ProviderQuotaError,
    env_float,
    env_int,
)

logger = logging.getLogger("tourguide-microservice.tts.gemini")

ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions"
DEFAULT_MODEL = "gemini-3.8-flash-tts"
DEFAULT_STYLE = (
    "Narration de visite culturelle haut de gamme, chaleureuse et immersive. "
    "Diction naturelle, rythme posé, articulation précise, sans emphase publicitaire."
)
RETRY_ATTEMPTS = env_int("GEMINI_TTS_RETRIES", 3)
RETRY_BASE_DELAY_S = env_float("GEMINI_TTS_RETRY_DELAY_S", 1.0)
TIMEOUT_S = env_float("GEMINI_TTS_TIMEOUT_S", 120.0)
MAX_AUDIO_B64_BYTES = env_int("GEMINI_TTS_MAX_AUDIO_B64_BYTES", 64 * 1024 * 1024)
_MODEL_RE = re.compile(r"^gemini-3\.8-flash-tts$")


def _texte_gemini(source: str) -> str:
    """Retire le SSML hérité et conserve les pauses comme événements vocaux."""
    brut = (source or "").strip()
    if "<" not in brut:
        return brut

    nettoye = re.sub(r'\s(?:xmlns(?::[a-z]+)?|version|xml:lang)="[^"]*"', "", brut)
    if not nettoye.lstrip().startswith("<speak"):
        nettoye = f"<speak>{nettoye}</speak>"

    morceaux: list[str] = []

    def visite(noeud: ET.Element) -> None:
        tag = noeud.tag.split("}")[-1].lower()
        if tag == "break":
            duree = noeud.attrib.get("time", "")
            correspondance = re.fullmatch(r"\s*(\d+(?:\.\d+)?)\s*(ms|s)\s*", duree)
            secondes = 0.0
            if correspondance:
                valeur = float(correspondance.group(1))
                secondes = valeur / 1000 if correspondance.group(2) == "ms" else valeur
            morceaux.append(" <long pause> " if secondes >= 2 else " <short pause> ")
            return
        if tag == "sub" and noeud.attrib.get("alias"):
            morceaux.append(noeud.attrib["alias"])
            return
        if noeud.text:
            morceaux.append(noeud.text)
        for enfant in noeud:
            visite(enfant)
            if enfant.tail:
                morceaux.append(enfant.tail)

    try:
        visite(ET.fromstring(nettoye))
        return re.sub(r"\s+", " ", html.unescape("".join(morceaux))).strip()
    except ET.ParseError:
        # Le corpus historique contient parfois un fragment plutôt qu'un vrai
        # document XML. On garde alors le texte, jamais les balises.
        return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", brut))).strip()


def _tokens_par_modalite(usage: object, champ: str, modalite: str) -> int | None:
    if not isinstance(usage, dict):
        return None
    lignes = usage.get(champ)
    if not isinstance(lignes, list):
        return None
    total = 0
    trouve = False
    for ligne in lignes:
        if not isinstance(ligne, dict) or ligne.get("modality") != modalite:
            continue
        valeur = ligne.get("tokens")
        if isinstance(valeur, int) and not isinstance(valeur, bool) and valeur >= 0:
            total += valeur
            trouve = True
    return total if trouve else None


def _audio_sortie(corps: object) -> dict | None:
    """Trouve le bloc audio du REST Interactions.

    Le SDK expose un raccourci ``output_audio`` ; la réponse REST canonique
    porte le même bloc dans ``steps[].content[]``. Accepter les deux évite de
    confondre la propriété de confort du SDK avec le contrat HTTP brut.
    """
    if not isinstance(corps, dict):
        return None
    raccourci = corps.get("output_audio")
    if isinstance(raccourci, dict) and isinstance(raccourci.get("data"), str):
        return raccourci
    etapes = corps.get("steps")
    if not isinstance(etapes, list):
        return None
    for etape in reversed(etapes):
        if not isinstance(etape, dict) or etape.get("type") != "model_output":
            continue
        contenus = etape.get("content")
        if not isinstance(contenus, list):
            continue
        for contenu in reversed(contenus):
            if isinstance(contenu, dict) and contenu.get("type") == "audio":
                return contenu
    return None


class GeminiTTSProvider:
    name = "gemini"

    def __init__(
        self,
        api_key: str,
        model: str | None = None,
        style: str | None = None,
        timeout_s: float | None = None,
    ):
        if not api_key:
            raise ProviderAuthError("Clé Gemini manquante")
        choisi = (model or os.getenv("GEMINI_TTS_MODEL") or DEFAULT_MODEL).strip()
        if not _MODEL_RE.fullmatch(choisi):
            raise ProviderError(
                f"Modèle Gemini TTS invalide ({choisi!r}) : attendu Gemini 3.8 Flash TTS"
            )
        self._api_key = api_key
        self.model = choisi
        self._style = (style or os.getenv("GEMINI_TTS_STYLE") or DEFAULT_STYLE).strip()
        self._timeout_s = timeout_s if timeout_s is not None else TIMEOUT_S
        self._session = None
        self._usage: dict[str, int | str | None] = {
            "model": self.model,
            "billed_characters": None,
            "input_text_tokens": None,
            "output_audio_tokens": None,
        }

    def _post(self, payload: dict):
        import requests

        if self._session is None:
            self._session = requests.Session()
        return self._session.post(
            ENDPOINT,
            json=payload,
            headers={
                "x-goog-api-key": self._api_key,
                "Content-Type": "application/json",
            },
            timeout=self._timeout_s,
        )

    async def synthesize(self, ssml: str, voice: str, tier: str) -> object:
        from pydub import AudioSegment

        transcript = _texte_gemini(ssml)
        if not transcript:
            raise ProviderError("Transcript Gemini vide après nettoyage du SSML")

        payload = {
            "model": self.model,
            "store": False,
            "input": [
                {
                    "type": "user_input",
                    "content": [
                        {
                            "type": "text",
                            "text": transcript,
                            "annotations": [
                                {"type": "speech_metadata", "style": self._style}
                            ],
                        }
                    ],
                }
            ],
            "response_format": {
                "type": "audio",
                "mime_type": "audio/wav",
                "sample_rate": 24000,
            },
            "generation_config": {"speech_config": [{"voice": voice}]},
        }

        derniere: ProviderError | None = None
        for tentative in range(1, RETRY_ATTEMPTS + 1):
            try:
                reponse = await asyncio.get_running_loop().run_in_executor(
                    None, self._post, payload
                )
            except Exception as exc:
                # Après un timeout, l'API peut avoir accepté et facturé l'appel.
                # Une reprise locale créerait alors un second audio sous une
                # seule provision. Le pipeline rejouera avec un nouveau débit.
                raise ProviderError(
                    f"Gemini TTS injoignable : {type(exc).__name__}"
                ) from exc
            else:
                if reponse.status_code in (401, 403):
                    raise ProviderAuthError(
                        f"Gemini TTS a refusé la clé (HTTP {reponse.status_code})"
                    )
                if reponse.status_code == 429:
                    derniere = ProviderQuotaError("Gemini TTS limité (HTTP 429)")
                elif reponse.status_code >= 500:
                    # Même règle que pour un timeout : l'état d'acceptation est
                    # ambigu, donc pas de deuxième émission sous le même débit.
                    raise ProviderError(
                        f"Gemini TTS indisponible (HTTP {reponse.status_code})"
                    )
                elif reponse.status_code < 200 or reponse.status_code >= 300:
                    raise ProviderError(f"Gemini TTS a refusé la synthèse (HTTP {reponse.status_code})")
                else:
                    try:
                        corps = reponse.json()
                    except Exception as exc:
                        raise ProviderError("Réponse Gemini TTS illisible") from exc
                    audio = _audio_sortie(corps)
                    donnees = audio.get("data") if isinstance(audio, dict) else None
                    if not isinstance(donnees, str) or not donnees:
                        raise ProviderError("Gemini TTS n'a rendu aucun audio")
                    if len(donnees) > MAX_AUDIO_B64_BYTES:
                        raise ProviderError("Audio Gemini TTS trop volumineux")
                    try:
                        wav = base64.b64decode(donnees, validate=True)
                        segment = AudioSegment.from_file(io.BytesIO(wav), format="wav")
                    except Exception as exc:
                        raise ProviderError("WAV Gemini TTS illisible") from exc
                    if len(segment) == 0:
                        raise ProviderError("Gemini TTS a rendu un audio vide")
                    usage = corps.get("usage")
                    self._usage = {
                        "model": self.model,
                        "billed_characters": None,
                        "input_text_tokens": _tokens_par_modalite(
                            usage, "input_tokens_by_modality", "text"
                        ),
                        "output_audio_tokens": _tokens_par_modalite(
                            usage, "output_tokens_by_modality", "audio"
                        ),
                    }
                    return segment.set_frame_rate(24000).set_channels(1).set_sample_width(2)

            if tentative < RETRY_ATTEMPTS:
                delai = RETRY_BASE_DELAY_S * tentative
                if reponse.status_code == 429:
                    try:
                        entetes = getattr(reponse, "headers", {})
                        delai = max(delai, float(entetes.get("Retry-After", 0)))
                    except (TypeError, ValueError):
                        pass
                await asyncio.sleep(delai)

        raise derniere or ProviderError("Gemini TTS a échoué sans motif")

    def billing_usage(self) -> dict[str, int | str | None]:
        return dict(self._usage)
