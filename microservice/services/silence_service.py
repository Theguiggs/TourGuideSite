"""
Silence Detection Service — pydub/ffmpeg integration.
Analyzes audio files and returns segment timestamps based on silence detection.
"""

import logging
import os
import tempfile
from urllib.parse import urlparse

import requests

logger = logging.getLogger("tourguide-microservice.silence")

# Configurable via env vars
SILENCE_THRESH_DB = int(os.getenv("SILENCE_THRESH_DB", "-40"))
SILENCE_MIN_MS = int(os.getenv("SILENCE_MIN_MS", "800"))

# ─── Protection SSRF : l'hote est EPINGLE, pas devine ───────────────────────
#
# La liste acceptait n'importe quel `*.s3.*.amazonaws.com` : un bucket tiers,
# donc, et `response.content` chargeait l'objet entier en memoire avant de
# l'ecrire sur disque. Un seul appel vers un objet de plusieurs Go faisait
# tomber le service (OOM) ou remplissait /tmp.
#
# `ALLOWED_AUDIO_HOSTS` porte le ou les hotes exacts du bucket du projet
# (`<bucket>.s3.<region>.amazonaws.com`), separes par des virgules. Sans cette
# variable, AUCUN hote n'est accepte : un service qui ne sait pas d'ou vient
# son audio ne telecharge rien.
ALLOWED_AUDIO_HOSTS = {
    h.strip().lower()
    for h in os.getenv("ALLOWED_AUDIO_HOSTS", "").split(",")
    if h.strip()
}
MAX_AUDIO_DOWNLOAD_BYTES = int(os.getenv("MAX_AUDIO_DOWNLOAD_BYTES", str(50 * 1024 * 1024)))
_AUDIO_CONTENT_TYPES = ("audio/", "video/webm", "application/octet-stream", "binary/octet-stream")


class AudioTooLarge(RuntimeError):
    """L'objet depasse `MAX_AUDIO_DOWNLOAD_BYTES` : le telechargement est abandonne."""


def is_allowed_audio_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme != "https":
            return False
        host = (parsed.hostname or "").lower()
        return bool(host) and host in ALLOWED_AUDIO_HOSTS
    except Exception:
        return False


def download_audio_bounded(audio_url: str) -> str:
    """Telecharge l'audio EN FLUX vers un fichier temporaire, en abandonnant
    des que la taille depasse le plafond. Rend le chemin du fichier ; l'appelant
    le supprime. Leve si l'URL n'est pas autorisee, si le type n'est pas audio,
    ou si l'objet est trop gros."""
    if not is_allowed_audio_url(audio_url):
        raise ValueError("URL non autorisee")
    with requests.get(audio_url, timeout=30, allow_redirects=False, stream=True) as response:
        response.raise_for_status()
        content_type = (response.headers.get("Content-Type") or "").lower()
        if content_type and not content_type.startswith(_AUDIO_CONTENT_TYPES):
            raise ValueError(f"Type de contenu inattendu : {content_type[:40]}")
        declared = response.headers.get("Content-Length")
        if declared and declared.isdigit() and int(declared) > MAX_AUDIO_DOWNLOAD_BYTES:
            raise AudioTooLarge(f"{declared} octets > {MAX_AUDIO_DOWNLOAD_BYTES}")
        total = 0
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        try:
            for chunk in response.iter_content(chunk_size=1 << 20):
                if not chunk:
                    continue
                total += len(chunk)
                if total > MAX_AUDIO_DOWNLOAD_BYTES:
                    raise AudioTooLarge(f"> {MAX_AUDIO_DOWNLOAD_BYTES} octets")
                tmp.write(chunk)
        except BaseException:
            tmp.close()
            os.unlink(tmp.name)
            raise
        tmp.close()
        return tmp.name


# Compatibilite : l'ancien nom reste utilise par les epreuves existantes.
def _is_allowed_url(url: str) -> bool:
    return is_allowed_audio_url(url)


class SilenceService:
    def detect(self, audio_url: str) -> list[tuple[int, int]] | None:
        """
        Download audio from URL, detect silences, return non-silent segments.
        Returns list of (start_ms, end_ms) tuples for each segment.
        """
        if not _is_allowed_url(audio_url):
            logger.error("Blocked SSRF attempt: %s", audio_url[:100])
            return None

        try:
            from pydub import AudioSegment
            from pydub.silence import detect_nonsilent

            # Telechargement en flux, plafonne — jamais `response.content` entier.
            tmp_path = download_audio_bounded(audio_url)

            try:
                audio = AudioSegment.from_file(tmp_path)

                # Detect non-silent segments
                segments = detect_nonsilent(
                    audio,
                    min_silence_len=SILENCE_MIN_MS,
                    silence_thresh=SILENCE_THRESH_DB,
                )

                if not segments:
                    # If no silences detected, return entire audio as one segment
                    return [(0, len(audio))]

                logger.info(
                    "Detected %d segments in %dms audio",
                    len(segments),
                    len(audio),
                )
                return segments

            finally:
                os.unlink(tmp_path)

        except Exception as e:
            logger.error("Silence detection failed: %s", e)
            return None
