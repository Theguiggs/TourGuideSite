"""
TourGuide TTS/Translation Microservice — synthese sous contrat (Azure AI
Speech) ou mode degrade (edge-tts), et traduction MarianMT
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
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from urllib.parse import urlparse

API_KEY = os.getenv("MICROSERVICE_API_KEY")
if not API_KEY or not API_KEY.strip():
    raise RuntimeError("MICROSERVICE_API_KEY is required")

import requests as req_lib
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services.job_manager import JobManager, QueueFull
from services.text_sanitize import normalize_source, postclean_translation
from services.audio_post import normalize_loudness
from services.tts_provider import (
    billed_characters,
    build_provider,
    resolve_tier,
    resolve_voice,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tourguide-local")

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
            # Le fournisseur est desormais choisi a l'execution ; la borne
            # basse reste calee sur le mode degrade, le plus fragile des deux.
            "tts": int(os.getenv("TTS_CONCURRENCY", "2")),
        },
    )
    job_manager.start()
    # `deploy/docker-compose.yml` promet a l'exploitant que le repli sur le
    # service gratuit est « journalise en avertissement a chaque demarrage ».
    # `build_provider()` ne s'executait qu'a la demande de synthese : celui qui
    # demarrait en mode degrade ne lisait rien avant la premiere visite
    # fabriquee. On honore la promesse ici — la fabrique journalise son choix,
    # il suffit de l'appeler une fois au demarrage.
    try:
        logger.info("Fournisseur de synthese : %s", build_provider().name)
    except Exception as exc:  # une configuration fautive ne doit pas empecher
        # le service de repondre : les autres routes (traduction, sante) n'ont
        # rien a voir avec la synthese.
        logger.error("Fournisseur de synthese indisponible au demarrage : %s", exc)
    logger.info(
        "Job manager started (max_inflight=%d, translate=%s, tts=%s)",
        job_manager._max_inflight,
        os.getenv("TRANSLATE_CONCURRENCY", "1"),
        os.getenv("TTS_CONCURRENCY", "2"),
    )
    yield
    if job_manager:
        await job_manager.stop()


# La table des voix vit desormais dans `services/tts_provider.py`
# (VOICES_STANDARD / VOICES_HD) : un seul endroit la porte, et le palier de
# voix y est un reglage plutot qu une constante recopiee.

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
    if request.headers.get("X-API-Key") != API_KEY:
        return JSONResponse(status_code=401, content={"detail": "Invalid API key"})
    return await call_next(request)


# -- Models --
class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    # `nl` manquait : les deux tables de voix le portent depuis la bascule, et le
    # corpus certifie le couvre — mais l'API repondait 422. Le motif et la table
    # doivent lister les memes langues.
    language: str = Field(default="fr", pattern="^(fr|en|it|de|es|nl|ja|ko|zh|ru)$")
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
def _nom_du_fournisseur() -> str:
    """Le fournisseur en service, ou le motif de son absence.

    Une configuration fautive — une region mal saisie, par exemple — fait lever
    la fabrique. Laisser l'exception remonter jusqu'a `/health` rendrait 500 sur
    l'endpoint meme que la sonde Docker interroge : le conteneur passerait
    « unhealthy » sans qu'un mot n'explique pourquoi, et la moitie TRADUCTION du
    service, etrangere a la synthese, deviendrait inatteignable derriere la
    sonde. La sante se DIT degradee, elle ne se tait pas en tombant.
    """
    try:
        return build_provider().name
    except Exception as exc:
        logger.error("Fournisseur de synthese indisponible : %s", exc)
        return f"indisponible: {exc}"


@app.get("/health")
async def health():
    fournisseur = _nom_du_fournisseur()
    return {
        "status": "ok",
        # La synthese est annoncee HORS SERVICE quand elle l'est. Un `true`
        # inconditionnel promettait une capacite que le service n'avait pas.
        "tts": not fournisseur.startswith("indisponible"),
        # Le fournisseur REELLEMENT en service, et non une constante. C'est le
        # seul point qu'un exploitant peut interroger sans cle : l'y faire mentir
        # rendait la declaration du mode degrade illisible dans les deux sens.
        "tts_mode": fournisseur,
        "translation": True,
        "silence_detection": True,
        "inflight_jobs": job_manager.inflight_count() if job_manager else 0,
        "cache_size": len(_TRANSLATION_CACHE),
    }


# --- Synthese ------------------------------------------------------------
#
# Le contournement du SSML — analyse maison, decoupage a 2000 caracteres,
# silences recolles, reprises — a demenage dans `services/tts_edge.py`. Il
# n'etait pas du code de synthese, c'etait la compensation d'un endpoint
# gratuit qui n'honore pas le SSML. Le chemin nominal passe desormais par
# `services/tts_provider.py`, qui choisit le fournisseur et le NOMME.

async def _tts_work(text: str, language: str, voice_id: str | None) -> dict:
    """Rend l'audio d'une Scene. Tourne comme job « tts » sous le plafond de
    concurrence. Leve en cas d'echec — le motif est conserve dans le job."""
    provider = build_provider()
    tier = resolve_tier()
    voice = resolve_voice(language, tier, voice_id)
    facturables = billed_characters(text)

    logger.info(
        "TTS : fournisseur=%s voix=%s palier=%s facturables=%d",
        provider.name, voice, tier, facturables,
    )

    audio_seg = await provider.synthesize(text, voice, tier)

    # La normalisation de niveau ne depend pas du fournisseur : CAP-5 exige que
    # l'ecart entre deux Scenes consecutives n'excede pas 1 dB, quel que soit le
    # moteur qui les a produites.
    if len(audio_seg) == 0:
        # Garde-fou de l'ancien chemin : un audio vide publierait une Scene de
        # 0 ms comme un succes. Chaque fournisseur a le sien, celui-ci est le
        # filet commun.
        raise RuntimeError("TTS n'a produit aucun audio")

    audio_seg = normalize_loudness(audio_seg)

    buf = io.BytesIO()
    audio_seg.export(buf, format="wav")
    buf.seek(0)
    audio_b64 = base64.b64encode(buf.read()).decode("ascii")
    duration_ms = len(audio_seg)
    logger.info("TTS OK : %d ms, %d Ko", duration_ms, len(audio_b64) // 1024)

    # `provider` et `billed_characters` ne sont pas decoratifs : sans eux, une
    # fabrication en mode degrade serait indiscernable d'une fabrication sous
    # contrat, et CAP-9 n'aurait rien a agreger.
    return {
        "audio_base64": audio_b64,
        "duration_ms": duration_ms,
        "provider": provider.name,
        "voice": voice,
        "tier": tier,
        # Zero en mode degrade : l'endpoint gratuit ne facture rien, et compter
        # comme s'il facturait fausserait l'agregat de couts.
        "billed_characters": facturables if provider.name == "azure" else 0,
    }



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
