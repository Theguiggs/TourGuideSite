"""
TourGuide TTS/Translation Microservice — production Qwen3 + MarianMT server.

Heavy work follows the submit -> job_id -> poll contract used by the web client.
"""

import asyncio
import logging
import os
from collections.abc import Awaitable, Callable
from contextlib import asynccontextmanager

API_KEY = os.getenv("MICROSERVICE_API_KEY")
if not API_KEY or not API_KEY.strip():
    raise RuntimeError("MICROSERVICE_API_KEY is required")

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from services.job_manager import JobManager, QueueFull
from services.silence_service import SilenceService
from services.translation_service import TranslationService
from services.tts_service import TTSService

logger = logging.getLogger("tourguide-microservice")

tts_service: TTSService | None = None
translation_service: TranslationService | None = None
silence_service: SilenceService | None = None
job_manager: JobManager | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global tts_service, translation_service, silence_service, job_manager

    max_inflight = int(os.getenv("MAX_INFLIGHT_JOBS", "50"))
    translate_concurrency = int(os.getenv("TRANSLATE_CONCURRENCY", "1"))
    tts_concurrency = int(os.getenv("TTS_CONCURRENCY", "1"))
    if max_inflight <= 0 or translate_concurrency <= 0 or tts_concurrency <= 0:
        raise RuntimeError("Microservice job limits must be positive")

    job_manager = JobManager(
        max_inflight=max_inflight,
        concurrency={
            "translate": translate_concurrency,
            "tts": tts_concurrency,
        },
    )
    job_manager.start()

    logger.info("Loading TTS service")
    tts_service = TTSService()
    tts_service.load()
    translation_service = TranslationService()
    silence_service = SilenceService()
    logger.info("Production services initialized")

    yield

    if job_manager:
        await job_manager.stop()
    if tts_service:
        tts_service.unload()
    logger.info("Microservice shutdown complete")


app = FastAPI(
    title="TourGuide TTS/Translation Microservice",
    version="0.2.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def verify_api_key(request: Request, call_next):
    if request.url.path == "/health":
        return await call_next(request)
    if request.headers.get("X-API-Key") != API_KEY:
        return JSONResponse(
            status_code=401,
            content={"detail": "Invalid or missing API key"},
        )
    return await call_next(request)


class HealthResponse(BaseModel):
    status: str = "ok"
    tts: bool = False
    translation: bool = False
    silence_detection: bool = True
    inflight_jobs: int = 0


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


class SilenceDetectRequest(BaseModel):
    audio_url: str = Field(..., min_length=1)


def submit_job(kind: str, work: Callable[[], Awaitable[dict]]) -> JSONResponse:
    if job_manager is None:
        return JSONResponse(
            status_code=503,
            content={"ok": False, "error": "service starting"},
        )
    try:
        job_id = job_manager.submit(kind, work)
    except QueueFull:
        return JSONResponse(
            status_code=429,
            content={"ok": False, "error": "busy", "retry_after": 5},
            headers={"Retry-After": "5"},
        )
    return JSONResponse(
        status_code=202,
        content={"ok": True, "job_id": job_id, "status": "queued"},
    )


async def generate_tts_work(text: str, language: str, voice_id: str | None) -> dict:
    if not tts_service or not tts_service.is_ready:
        raise RuntimeError("TTS service not available")
    result = await asyncio.to_thread(tts_service.generate, text, language, voice_id)
    if result is None:
        raise RuntimeError("TTS generation failed")
    return result


async def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    if not translation_service:
        raise RuntimeError("Translation service not available")
    if source_lang == target_lang or not text.strip():
        return text
    translated = await asyncio.to_thread(
        translation_service.translate,
        text,
        source_lang,
        target_lang,
    )
    if translated is None:
        raise RuntimeError(f"Translation pair not supported: {source_lang}->{target_lang}")
    return translated


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        tts=tts_service.is_ready if tts_service else False,
        translation=translation_service is not None,
        silence_detection=silence_service is not None,
        inflight_jobs=job_manager.inflight_count() if job_manager else 0,
    )


@app.post("/v1/tts/generate")
async def generate_tts(req: TTSRequest):
    if not tts_service or not tts_service.is_ready:
        return JSONResponse(
            status_code=503,
            content={"ok": False, "error": "TTS service not available"},
        )
    return submit_job(
        "tts",
        lambda: generate_tts_work(req.text, req.language, req.voice_id),
    )


@app.post("/v1/translate/marianmt")
async def translate_marianmt(req: TranslateRequest):
    if not translation_service:
        return JSONResponse(
            status_code=503,
            content={"ok": False, "error": "Translation service not available"},
        )

    async def work():
        return {
            "translated_text": await translate_text(
                req.text,
                req.source_lang,
                req.target_lang,
            ),
        }

    return submit_job("translate", work)


@app.post("/v1/translate/batch")
async def translate_batch(req: BatchTranslateRequest):
    if not translation_service:
        return JSONResponse(
            status_code=503,
            content={"ok": False, "error": "Translation service not available"},
        )

    if any(len(text) > 50_000 for text in req.texts):
        return JSONResponse(
            status_code=422,
            content={"ok": False, "error": "Each text must contain at most 50000 characters"},
        )

    async def work():
        translations = []
        for text in req.texts:
            translations.append(
                await translate_text(text, req.source_lang, req.target_lang),
            )
        return {"translations": translations}

    return submit_job("translate", work)


@app.get("/v1/jobs/{job_id}")
async def get_job(job_id: str):
    if job_manager is None:
        return JSONResponse(
            status_code=503,
            content={"ok": False, "error": "service starting"},
        )
    job = job_manager.get(job_id)
    if job is None:
        return JSONResponse(
            status_code=404,
            content={"ok": False, "error": "job not found"},
        )
    body: dict = {"ok": True, "status": job.status}
    if job.status == "completed" and job.result is not None:
        body.update(job.result)
    elif job.status == "failed":
        body["ok"] = False
        body["error"] = "job failed"
    return body


@app.post("/v1/silence-detect")
async def detect_silences(req: SilenceDetectRequest):
    if not silence_service:
        return JSONResponse(
            status_code=503,
            content={"ok": False, "error": "Silence detection service not available"},
        )
    result = await asyncio.to_thread(silence_service.detect, req.audio_url)
    if result is None:
        return {"ok": False, "segments": [], "error": "Silence detection failed"}
    return {
        "ok": True,
        "segments": [{"start_ms": start, "end_ms": end} for start, end in result],
    }
