"""
TourGuide TTS/Translation Microservice — Local (edge-tts + MarianMT)
No GPU required. Runs on any machine with Python 3.11+.
"""

import asyncio
import base64
import hashlib
import io
import logging
import os
import re
import tempfile
import threading
import xml.etree.ElementTree as ET
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from urllib.parse import urlparse

import edge_tts
import soundfile as sf
import requests as req_lib
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services.job_manager import JobManager, QueueFull
from services.text_sanitize import normalize_source, postclean_translation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tourguide-local")

API_KEY = os.getenv("MICROSERVICE_API_KEY", "")

# -- MarianMT lazy loading --
translation_models = {}
translation_tokenizers = {}

MARIAN_MODELS = {
    ("fr", "en"): "Helsinki-NLP/opus-mt-fr-en",
    ("fr", "de"): "Helsinki-NLP/opus-mt-fr-de",
    ("fr", "es"): "Helsinki-NLP/opus-mt-fr-es",
    # No direct fr->it model exists on Helsinki-NLP; we pivot via English.
    ("en", "it"): "Helsinki-NLP/opus-mt-en-it",
}

# Pairs without a direct model translate through an intermediate language.
PIVOT_VIA = {
    ("fr", "it"): "en",  # fr -> en -> it
}


def load_translation_pair(src, tgt):
    pair = (src, tgt)
    if pair in translation_models:
        return True
    model_name = MARIAN_MODELS.get(pair)
    if not model_name:
        return False
    logger.info(f"Loading MarianMT {src} -> {tgt} ({model_name})...")
    from transformers import MarianMTModel, MarianTokenizer
    import torch  # noqa: F401
    translation_tokenizers[pair] = MarianTokenizer.from_pretrained(model_name)
    translation_models[pair] = MarianMTModel.from_pretrained(model_name)
    logger.info(f"MarianMT {src} -> {tgt} loaded")
    return True


def _translate_list_direct(pair, texts):
    """Translate a list of texts with a directly-loaded model pair (sub-batched)."""
    import torch
    tokenizer = translation_tokenizers[pair]
    model = translation_models[pair]
    out = []
    SUB = 16
    for start in range(0, len(texts), SUB):
        # Normalize punctuation (em-dashes etc.) the model chokes on BEFORE it
        # reaches the tokenizer — prevents garbage output and repetition loops.
        chunk = [normalize_source(t) for t in texts[start:start + SUB]]
        inputs = tokenizer(chunk, return_tensors="pt", padding=True, truncation=True, max_length=512)
        with torch.no_grad():
            # Greedy decoding (num_beams=1) for CPU speed. no_repeat_ngram_size +
            # repetition_penalty are guard rails: without them greedy decoding can
            # fall into a degenerate loop and emit one token hundreds of times
            # (the "^ ^ ^ …" bug). They cost nothing and work with greedy.
            generated = model.generate(
                **inputs,
                num_beams=1,
                max_new_tokens=512,
                no_repeat_ngram_size=3,
                repetition_penalty=1.3,
            )
        decoded = tokenizer.batch_decode(generated, skip_special_tokens=True)
        out.extend(postclean_translation(t) for t in decoded)
    return out


def translate_texts(src, tgt, texts):
    """Translate a list of non-empty texts from src to tgt, using a direct model
    when available, otherwise pivoting through an intermediate language.
    Raises ValueError if the pair is unsupported."""
    if (src, tgt) in MARIAN_MODELS:
        if not load_translation_pair(src, tgt):
            raise ValueError(f"Paire non supportee: {(src, tgt)}")
        return _translate_list_direct((src, tgt), texts)
    via = PIVOT_VIA.get((src, tgt))
    if via:
        mid = translate_texts(src, via, texts)
        return translate_texts(via, tgt, mid)
    raise ValueError(f"Paire non supportee: {(src, tgt)}")


async def _run_blocking(fn, *args):
    """Run a short blocking call (e.g. pydub/ffmpeg decode) in the default thread
    pool so it does not freeze the asyncio event loop."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, fn, *args)


# All MarianMT inference runs on ONE dedicated thread. This is deliberate:
#  - PyTorch CPU inference is GIL-bound, so N concurrent generate() calls don't
#    run faster — they thrash, starve the event loop (even /health stalls), and
#    every request blows past the proxy's timeout (502).
#  - A shared model/tokenizer is not safe to call from multiple threads at once
#    (intermittent 500s). Serializing on a single worker removes both problems:
#    requests queue and each completes at full speed, well under the timeout.
_INFERENCE_EXECUTOR = ThreadPoolExecutor(max_workers=1, thread_name_prefix="marianmt")


async def _run_inference(fn, *args):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_INFERENCE_EXECUTOR, fn, *args)


# -- Translation cache --
# Keyed by sha256(src|tgt|sentence). Dedups identical sentences across scenes and
# guides, and makes a retry of a previously-translated scene instant (it never
# re-occupies the single inference thread). Bounded LRU so memory stays flat.
_TRANSLATION_CACHE: "OrderedDict[str, str]" = OrderedDict()
_TRANSLATION_CACHE_MAX = int(os.getenv("TRANSLATION_CACHE_MAX", "5000"))
_cache_lock = threading.Lock()


def _cache_key(src: str, tgt: str, text: str) -> str:
    return hashlib.sha256(f"{src}|{tgt}|{text}".encode("utf-8")).hexdigest()


def _cache_get(src: str, tgt: str, text: str) -> str | None:
    key = _cache_key(src, tgt, text)
    with _cache_lock:
        if key in _TRANSLATION_CACHE:
            _TRANSLATION_CACHE.move_to_end(key)
            return _TRANSLATION_CACHE[key]
    return None


def _cache_set(src: str, tgt: str, text: str, translated: str) -> None:
    key = _cache_key(src, tgt, text)
    with _cache_lock:
        _TRANSLATION_CACHE[key] = translated
        _TRANSLATION_CACHE.move_to_end(key)
        while len(_TRANSLATION_CACHE) > _TRANSLATION_CACHE_MAX:
            _TRANSLATION_CACHE.popitem(last=False)


# -- Job manager (async submit -> job_id -> poll) --
# Created in the lifespan so its semaphores bind to the running event loop.
job_manager: JobManager | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global job_manager
    job_manager = JobManager(
        max_inflight=int(os.getenv("MAX_INFLIGHT_JOBS", "50")),
        concurrency={
            # MarianMT inference is GIL-bound + not thread-safe -> serialize to 1.
            "translate": int(os.getenv("TRANSLATE_CONCURRENCY", "1")),
            # edge-tts hits the FREE Azure endpoint -> keep low to avoid rate-limits.
            "tts": int(os.getenv("TTS_CONCURRENCY", "2")),
        },
    )
    job_manager.start()
    logger.info(
        "Job manager started (max_inflight=%d, translate=%s, tts=%s)",
        job_manager._max_inflight,
        os.getenv("TRANSLATE_CONCURRENCY", "1"),
        os.getenv("TTS_CONCURRENCY", "2"),
    )
    yield
    if job_manager:
        await job_manager.stop()


# -- Edge-TTS voices --
EDGE_VOICES = {
    "fr": "fr-FR-HenriNeural",
    "en": "en-US-GuyNeural",
    "it": "it-IT-DiegoNeural",
    "de": "de-DE-ConradNeural",
    "es": "es-ES-AlvaroNeural",
    "ja": "ja-JP-KeitaNeural",
    "ko": "ko-KR-InJoonNeural",
    "zh": "zh-CN-YunxiNeural",
    "ru": "ru-RU-DmitryNeural",
}

# -- FastAPI --
app = FastAPI(title="TourGuide Microservice (local)", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def verify_api_key(request: Request, call_next):
    # Skip auth for health check and CORS preflight
    if request.url.path == "/health" or request.method == "OPTIONS":
        return await call_next(request)
    if API_KEY and request.headers.get("X-API-Key") != API_KEY:
        return JSONResponse(status_code=401, content={"detail": "Invalid API key"})
    return await call_next(request)


# -- Models --
class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    language: str = Field(default="fr", pattern="^(fr|en|it|de|es|ja|ko|zh|ru)$")
    voice_id: str | None = None


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000)
    source_lang: str = Field(default="fr", pattern="^(fr|en|it|de|es)$")
    target_lang: str = Field(..., pattern="^(fr|en|it|de|es)$")


class BatchTranslateRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1, max_length=200)
    source_lang: str = Field(default="fr", pattern="^(fr|en|it|de|es)$")
    target_lang: str = Field(..., pattern="^(fr|en|it|de|es)$")


class SilenceRequest(BaseModel):
    audio_url: str = Field(..., min_length=1)


# -- Endpoints --
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "tts": True,
        "tts_mode": "edge-tts",
        "translation": True,
        "silence_detection": True,
        "inflight_jobs": job_manager.inflight_count() if job_manager else 0,
        "cache_size": len(_TRANSLATION_CACHE),
    }


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


async def _synthesize_ssml(text: str, voice: str):
    """Render SSML to a single pydub AudioSegment."""
    from pydub import AudioSegment

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

    combined = AudioSegment.silent(duration=0, frame_rate=24000)
    skipped = 0
    failed = 0
    for kind, value, params in runs:
        if kind == "break":
            combined += AudioSegment.silent(duration=value, frame_rate=24000)
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
                combined += seg
            except Exception as e:
                failed += 1
                logger.error(
                    "Skipping unrenderable chunk after %d retries (%s); chunk[:60]=%r",
                    RETRY_ATTEMPTS, e, chunk[:60],
                )

    if skipped or failed:
        logger.info("SSML render summary: skipped=%d, failed=%d", skipped, failed)
    return combined


async def _tts_work(text: str, language: str, voice_id: str | None) -> dict:
    """Render TTS audio. Runs as a 'tts' job under the concurrency cap so the free
    edge-tts endpoint isn't rate-limited. Raises on failure (recorded as job error)."""
    from pydub import AudioSegment

    voice = voice_id or EDGE_VOICES.get(language, "fr-FR-HenriNeural")

    # Detect if text contains SSML tags we need to interpret ourselves
    has_ssml = bool(re.search(r"<(break|prosody|emphasis|say-as|phoneme|sub)\b", text))

    if has_ssml:
        logger.info(f"TTS (SSML): voice={voice}, len={len(text)}")
        audio_seg = await _synthesize_ssml(text, voice)
    else:
        logger.info(f"TTS: voice={voice}, text={text[:80]}...")
        tmp_path = tempfile.mktemp(suffix=".mp3")
        communicate = edge_tts.Communicate(text, voice)
        await asyncio.wait_for(communicate.save(tmp_path), timeout=TTS_CHUNK_TIMEOUT_S)
        audio_seg = await _run_blocking(AudioSegment.from_file, tmp_path)
        os.unlink(tmp_path)

    buf = io.BytesIO()
    audio_seg.export(buf, format="wav")
    buf.seek(0)
    audio_b64 = base64.b64encode(buf.read()).decode("ascii")
    duration_ms = len(audio_seg)
    logger.info(f"TTS OK: {duration_ms}ms, {len(audio_b64)//1024}KB")
    return {"audio_base64": audio_b64, "duration_ms": duration_ms}


@app.post("/v1/tts/generate")
async def generate_tts(req: TTSRequest):
    """Enqueue TTS generation. Returns 202 {job_id, status} or 429 if the
    in-flight cap is reached. Poll GET /v1/jobs/{job_id} for the result."""
    if job_manager is None:
        return JSONResponse(status_code=503, content={"ok": False, "error": "service starting"})
    try:
        job_id = job_manager.submit("tts", lambda: _tts_work(req.text, req.language, req.voice_id))
    except QueueFull:
        return JSONResponse(
            status_code=429,
            content={"ok": False, "error": "busy", "retry_after": 5},
            headers={"Retry-After": "5"},
        )
    return JSONResponse(status_code=202, content={"ok": True, "job_id": job_id, "status": "queued"})


@app.post("/v1/translate/marianmt")
async def translate(req: TranslateRequest):
    if req.source_lang == req.target_lang:
        return {"ok": True, "translated_text": req.text}
    try:
        result = await _run_inference(translate_texts, req.source_lang, req.target_lang, [req.text])
        return {"ok": True, "translated_text": result[0]}
    except ValueError as e:
        return {"ok": False, "error": str(e)}
    except Exception as e:
        logger.error(f"Translation error: {e}")
        return {"ok": False, "error": str(e)}


async def _translate_batch_work(src: str, tgt: str, texts: list[str]) -> dict:
    """Translate a list of sentences in a single batched forward pass. Cache hits
    are filled without touching the inference thread; only misses are translated.
    Runs as a 'translate' job (serialized). Pairs without a direct MarianMT model
    (e.g. fr->it) pivot through English. Raises ValueError on an unsupported pair."""
    if src == tgt:
        return {"translations": list(texts)}

    out = list(texts)  # default: echo originals (covers empties)
    miss_idx: list[int] = []
    miss_texts: list[str] = []
    for i, t in enumerate(texts):
        if not t or not t.strip():
            continue  # don't feed empties to the model; echo them back
        cached = _cache_get(src, tgt, t)
        if cached is not None:
            out[i] = cached
        else:
            miss_idx.append(i)
            miss_texts.append(t)

    if miss_texts:
        translated = await _run_inference(translate_texts, src, tgt, miss_texts)
        for j, text in enumerate(translated):
            out[miss_idx[j]] = text
            _cache_set(src, tgt, miss_texts[j], text)

    return {"translations": out}


@app.post("/v1/translate/batch")
async def translate_batch(req: BatchTranslateRequest):
    """Enqueue batch translation. Returns 202 {job_id, status} or 429 if the
    in-flight cap is reached. Poll GET /v1/jobs/{job_id} for {translations}."""
    if job_manager is None:
        return JSONResponse(status_code=503, content={"ok": False, "error": "service starting"})
    try:
        job_id = job_manager.submit(
            "translate",
            lambda: _translate_batch_work(req.source_lang, req.target_lang, list(req.texts)),
        )
    except QueueFull:
        return JSONResponse(
            status_code=429,
            content={"ok": False, "error": "busy", "retry_after": 5},
            headers={"Retry-After": "5"},
        )
    return JSONResponse(status_code=202, content={"ok": True, "job_id": job_id, "status": "queued"})


@app.get("/v1/jobs/{job_id}")
async def get_job(job_id: str):
    """Poll a submitted job. status is queued|processing|completed|failed.
    On 'completed' the result fields (translations / audio_base64+duration_ms) are
    inlined at top level; on 'failed' the error message is returned."""
    if job_manager is None:
        return JSONResponse(status_code=503, content={"ok": False, "error": "service starting"})
    job = job_manager.get(job_id)
    if job is None:
        return JSONResponse(status_code=404, content={"ok": False, "error": "job not found"})
    body: dict = {"ok": True, "status": job.status}
    if job.status == "completed" and job.result is not None:
        body.update(job.result)
    elif job.status == "failed":
        body["ok"] = False
        body["error"] = job.error or "job failed"
    return body


ALLOWED_HOSTS = {"s3.amazonaws.com", "s3.us-east-1.amazonaws.com"}


def is_allowed_url(url):
    try:
        parsed = urlparse(url)
        host = parsed.hostname or ""
        return host in ALLOWED_HOSTS or (host.endswith(".amazonaws.com") and ".s3." in host)
    except Exception:
        return False


def _silence_detect_sync(audio_url: str) -> list[dict]:
    """Blocking: download audio + detect non-silent segments. Run via _run_blocking
    so the HTTP download + ffmpeg decode never freeze the asyncio event loop (they
    previously ran inline in the async handler, stalling every other request)."""
    from pydub import AudioSegment
    from pydub.silence import detect_nonsilent

    resp = req_lib.get(audio_url, timeout=30, allow_redirects=False)
    resp.raise_for_status()
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(resp.content)
        tmp_path = tmp.name
    try:
        audio = AudioSegment.from_file(tmp_path)
        segments = detect_nonsilent(audio, min_silence_len=800, silence_thresh=-40)
        if not segments:
            segments = [(0, len(audio))]
        return [{"start_ms": s[0], "end_ms": s[1]} for s in segments]
    finally:
        os.unlink(tmp_path)


@app.post("/v1/silence-detect")
async def silence_detect(req: SilenceRequest):
    if not is_allowed_url(req.audio_url):
        return {"ok": False, "error": "URL non autorisee"}
    try:
        segments = await _run_blocking(_silence_detect_sync, req.audio_url)
        return {"ok": True, "segments": segments}
    except Exception as e:
        logger.error(f"Silence detection error: {e}")
        return {"ok": False, "error": str(e)}
