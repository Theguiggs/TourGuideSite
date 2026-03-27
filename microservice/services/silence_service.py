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

# Allowed URL domains for SSRF protection
ALLOWED_HOSTS = {
    "s3.amazonaws.com",
    "s3.us-east-1.amazonaws.com",
}
# Accept any *.s3.*.amazonaws.com pattern
def _is_allowed_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("https", "http"):
            return False
        host = parsed.hostname or ""
        if host in ALLOWED_HOSTS:
            return True
        # Allow pre-signed S3 URLs: *.s3.*.amazonaws.com
        if host.endswith(".amazonaws.com") and ".s3." in host:
            return True
        return False
    except Exception:
        return False


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

            # Download audio from validated S3 URL
            response = requests.get(audio_url, timeout=30, allow_redirects=False)
            response.raise_for_status()

            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                tmp.write(response.content)
                tmp_path = tmp.name

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
