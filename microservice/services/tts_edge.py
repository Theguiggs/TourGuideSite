"""
Mode DÉGRADÉ — synthèse par l'endpoint gratuit d'Edge (`edge-tts`).

Ce module n'est pas une alternative : c'est un pis-aller, et le SPEC le dit —
« le service de synthèse gratuit n'est pas un plan de continuité, il reste un
mode dégradé journalisé ». Aucun compte, aucune condition acceptée, aucune
licence d'usage commercial sur l'audio produit.

Tout ce qui suit est le CONTOURNEMENT de son défaut central : l'endpoint gratuit
n'honore pas le SSML transmis en ligne. Le code analyse donc le SSML lui-même,
le réduit à une suite d'appels avec des paramètres natifs de débit et de volume,
recolle les silences avec pydub, et découpe à 2 000 caractères parce que
l'endpoint casse au-delà d'une taille empirique.

Il a été DÉPLACÉ ICI sans être modifié. Sous contrat, rien de tout cela n'a
d'objet : la Scène part d'un bloc et le moteur rend les pauses. Le garder intact
dans un fichier qui dit ce qu'il est vaut mieux que le laisser au milieu du
chemin nominal, où on finirait par croire que c'est ainsi qu'on synthétise.
"""

from __future__ import annotations

import asyncio
import io
import logging
import os
import re
import tempfile
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor

import edge_tts

from services.audio_post import RUN_GAP_MS, SENTENCE_GAP_MS, SpeechJoiner
from services.tts_provider import ProviderError

logger = logging.getLogger("tourguide-microservice.tts.edge")

# Le decodage d'un fichier audio est bloquant : le sortir de la boucle
# d'evenements evite de figer le service pendant qu'il lit un WAV.
#
# Cette fonction vivait dans `local_server.py` et le deplacement du
# contournement l'a laissee derriere : `_synth_chunk` l'appelait donc sans
# qu'elle existe ici. Le NameError etait avale par la boucle de reprise, puis
# rapporte comme « pas d'audio » — et comme la configuration livre une cle Azure
# vide, ce chemin degrade EST le chemin par defaut. Toute synthese echouait.
_EXECUTEUR = ThreadPoolExecutor(max_workers=2, thread_name_prefix="tts-edge")


async def _run_blocking(fn, *args):
    return await asyncio.get_running_loop().run_in_executor(_EXECUTEUR, fn, *args)


# --- SSML helpers --------------------------------------------------------
#
# edge-tts uses the free Azure endpoint which does NOT honor inline SSML
# tags (<break>, <prosody>, <emphasis>) passed in the `text` arg. So we
# parse the SSML ourselves and reduce it to a sequence of edge-tts calls
# (text segments + native rate/volume/pitch kwargs) + pydub silences,
# then concatenate.

def _parse_time_ms(s: str) -> int:
    s = (s or "").strip().lower()
    try:
        if s.endswith("ms"):
            return max(0, int(float(s[:-2])))
        if s.endswith("s"):
            return max(0, int(float(s[:-1]) * 1000))
        return max(0, int(float(s)))
    except ValueError:
        return 500


_PROSODY_NAMED = {
    "rate":   {"x-slow": "-50%", "slow": "-30%", "medium": "+0%", "fast": "+30%", "x-fast": "+50%"},
    "volume": {"silent": "-100%", "x-soft": "-50%", "soft": "-30%", "medium": "+0%", "loud": "+30%", "x-loud": "+50%"},
    "pitch":  {"x-low": "-50Hz", "low": "-30Hz", "medium": "+0Hz", "high": "+30Hz", "x-high": "+50Hz"},
}

_EMPHASIS_VOLUME = {"reduced": "-20%", "moderate": "+15%", "strong": "+30%"}

# Safety limits to keep edge-tts happy.
# Empirically, the free Azure endpoint behind edge-tts starts returning
# "No audio was received" around 5-7k chars per call. We chunk at 2k to
# leave plenty of headroom for the prosody envelope and language voice.
MAX_RUN_CHARS = 2000
RETRY_ATTEMPTS = 3
RETRY_BASE_DELAY_S = 0.8
# edge-tts talks to Azure over a WebSocket with no built-in timeout. If Azure
# stalls, communicate.save() hangs forever — the Next.js proxy then aborts at
# 60s and the whole TTS step fails silently. Bound each attempt so a stall
# becomes a retryable error instead of an indefinite hang.
TTS_CHUNK_TIMEOUT_S = 25


def _map_prosody(attr: str, value: str) -> str:
    return _PROSODY_NAMED.get(attr, {}).get(value, value)


# Strip whitespace + common punctuation to decide if a run is worth speaking.
# edge-tts can return "No audio" on pure-punctuation inputs (".", "—", "…").
_PUNCT_STRIP_RE = re.compile(r"[\s.,;:!?\-—–«»\"'`()\[\]{}…·•/\\]+")


def _is_speakable(text: str) -> bool:
    if not text:
        return False
    stripped = _PUNCT_STRIP_RE.sub("", text)
    return len(stripped) >= 2


# Split a long run into sentence-bounded chunks <= max_chars.
# Falls back to comma/semicolon breaks if a single sentence is itself too long.
def _split_for_tts(text: str, max_chars: int = MAX_RUN_CHARS) -> list[str]:
    text = text.strip()
    if len(text) <= max_chars:
        return [text] if text else []

    def _flush(buf: list[str], out: list[str]) -> None:
        joined = " ".join(p for p in buf if p).strip()
        if joined:
            out.append(joined)

    chunks: list[str] = []
    buf: list[str] = []
    buf_len = 0

    # First pass: split on sentence enders. Look-behind keeps the punctuation.
    sentences = re.split(r"(?<=[.!?…])\s+", text)
    for s in sentences:
        s = s.strip()
        if not s:
            continue
        # If the sentence alone is over the limit, split it further on commas.
        if len(s) > max_chars:
            if buf:
                _flush(buf, chunks)
                buf, buf_len = [], 0
            sub_parts = re.split(r"(?<=[,;:])\s+", s)
            sub_buf: list[str] = []
            sub_len = 0
            for sp in sub_parts:
                if sub_len + len(sp) + 1 > max_chars and sub_buf:
                    _flush(sub_buf, chunks)
                    sub_buf, sub_len = [], 0
                sub_buf.append(sp)
                sub_len += len(sp) + 1
            _flush(sub_buf, chunks)
            continue

        if buf_len + len(s) + 1 > max_chars and buf:
            _flush(buf, chunks)
            buf, buf_len = [], 0
        buf.append(s)
        buf_len += len(s) + 1

    _flush(buf, chunks)
    return chunks


async def _synth_chunk(text: str, voice: str, params: dict | None):
    """Render one chunk via edge-tts with retry on transient errors."""
    from pydub import AudioSegment

    kwargs: dict = {"voice": voice}
    for k in ("rate", "volume", "pitch"):
        v = (params or {}).get(k)
        if v and v not in ("+0%", "+0Hz"):
            kwargs[k] = v

    last_err: Exception | None = None
    for attempt in range(1, RETRY_ATTEMPTS + 1):
        tmp_path = tempfile.mktemp(suffix=".mp3")
        try:
            communicate = edge_tts.Communicate(text, **kwargs)
            await asyncio.wait_for(communicate.save(tmp_path), timeout=TTS_CHUNK_TIMEOUT_S)
            seg = await _run_blocking(AudioSegment.from_file, tmp_path)
            return seg
        except Exception as e:
            last_err = e
            logger.warning(
                "edge-tts attempt %d/%d failed (%s); chunk[:60]=%r",
                attempt, RETRY_ATTEMPTS, e, text[:60],
            )
            if attempt < RETRY_ATTEMPTS:
                await asyncio.sleep(RETRY_BASE_DELAY_S * attempt)
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    raise last_err if last_err else RuntimeError("edge-tts failed without exception")


def _collect_runs(elem, params: dict, runs: list) -> None:
    """Depth-first walk of the SSML tree producing a flat list of runs.
    Each run is ('text', str, params) or ('break', ms, None).
    """
    if elem.tag == "break":
        runs.append(("break", _parse_time_ms(elem.attrib.get("time", "500ms")), None))
        return

    new_params = dict(params)
    if elem.tag == "prosody":
        for k in ("rate", "volume", "pitch"):
            if k in elem.attrib:
                new_params[k] = _map_prosody(k, elem.attrib[k])
    elif elem.tag == "emphasis":
        level = elem.attrib.get("level", "moderate")
        new_params["volume"] = _EMPHASIS_VOLUME.get(level, "+15%")
    # <sub alias="..."> -> speak the alias instead of inner text
    elif elem.tag == "sub" and "alias" in elem.attrib:
        runs.append(("text", elem.attrib["alias"].strip(), dict(new_params)))
        return

    if elem.text and elem.text.strip():
        runs.append(("text", elem.text.strip(), dict(new_params)))

    for child in elem:
        _collect_runs(child, new_params, runs)
        if child.tail and child.tail.strip():
            runs.append(("text", child.tail.strip(), dict(new_params)))


async def _render_runs(runs: list, voice: str):
    """Render a flat run list to one scene.

    Every rendered chunk is de-padded (see services.audio_post) and the pauses
    are re-inserted deliberately by the joiner, so the seams carry the gap the
    script asked for instead of ~1.1 s of endpoint padding.
    """
    joiner = SpeechJoiner()
    skipped = 0
    failed = 0
    prev_text: str | None = None

    for kind, value, params in runs:
        if kind == "break":
            joiner.request_pause(value)
            continue
        if not _is_speakable(value):
            skipped += 1
            continue
        # Split long runs to stay under edge-tts limits, and render each chunk
        # with retry. If a chunk still can't be rendered after retries, skip it
        # rather than failing the whole scene — partial audio beats no audio.
        for chunk in _split_for_tts(value):
            if not _is_speakable(chunk):
                skipped += 1
                continue
            try:
                seg = await _synth_chunk(chunk, voice, params)
            except Exception as e:
                failed += 1
                logger.error(
                    "Skipping unrenderable chunk after %d retries (%s); chunk[:60]=%r",
                    RETRY_ATTEMPTS, e, chunk[:60],
                )
                continue
            # Size the seam from what the PREVIOUS chunk ended on: a full stop
            # gets a sentence pause, anything else (a comma-split of an
            # over-long sentence, or the text on either side of a <prosody>
            # span) is mid-sentence and must stay tight or the phrase breaks.
            if prev_text is None:
                gap = 0
            elif prev_text.rstrip().endswith((".", "!", "?", "…", ":", ";")):
                gap = SENTENCE_GAP_MS
            else:
                gap = RUN_GAP_MS
            if joiner.add_speech(seg, gap_before_ms=gap):
                prev_text = chunk

    if skipped or failed:
        logger.info("TTS render summary: skipped=%d, failed=%d", skipped, failed)
    return joiner.build()


async def _synthesize_ssml(text: str, voice: str):
    """Render SSML to a single pydub AudioSegment."""
    # Strip namespace / version attrs so ElementTree stays in default ns
    cleaned = re.sub(r'\s(?:xmlns(?::[a-z]+)?|version|xml:lang)="[^"]*"', "", text)
    if not cleaned.strip().startswith("<speak"):
        cleaned = f"<speak>{cleaned}</speak>"

    runs: list = []
    try:
        root = ET.fromstring(cleaned)
        if root.text and root.text.strip():
            runs.append(("text", root.text.strip(), {}))
        for child in root:
            _collect_runs(child, {}, runs)
            if child.tail and child.tail.strip():
                runs.append(("text", child.tail.strip(), {}))
    except ET.ParseError as e:
        logger.warning(f"SSML parse error, falling back to plain text: {e}")
        plain = re.sub(r"<[^>]+>", "", text).strip()
        runs = [("text", plain, {})] if plain else []

    return await _render_runs(runs, voice)

class EdgeTTSProvider:
    """Le pis-aller, derrière le même protocole que le fournisseur sous contrat.

    Sa seule raison d'exister est de rester disponible quand la clé manque — et
    d'être NOMMÉ dans la réponse quand il sert, pour qu'aucune fabrication ne
    passe pour contractuelle sans l'être.
    """

    name = "edge"

    async def synthesize(self, ssml: str, voice: str, tier: str) -> object:
        # Le palier n'a pas de sens ici : l'endpoint gratuit ne sert que les voix
        # standard. On le dit plutôt que de laisser croire à une haute définition.
        if tier == "hd":
            logger.warning(
                "Palier « hd » demandé en mode dégradé : l'endpoint gratuit ne "
                "sert que les voix standard. Palier ignoré."
            )
        try:
            segment = await _synthesize_ssml(ssml, voice)
        except Exception as e:
            raise ProviderError(f"Synthèse dégradée en échec : {e}") from e
        if len(segment) == 0:
            raise ProviderError("Synthèse dégradée sans audio (tous les fragments ont échoué)")
        return segment
