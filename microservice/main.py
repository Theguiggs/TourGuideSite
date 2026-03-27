"""
TourGuide TTS/Translation Microservice — FastAPI
Colocated GPU service for Qwen3-TTS + MarianMT + silence detection.
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from services.tts_service import TTSService
from services.translation_service import TranslationService
from services.silence_service import SilenceService

API_KEY = os.getenv("MICROSERVICE_API_KEY", "")

logger = logging.getLogger("tourguide-microservice")

# --- Singleton services ---
tts_service: TTSService | None = None
translation_service: TranslationService | None = None
silence_service: SilenceService | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models at startup, cleanup at shutdown."""
    global tts_service, translation_service, silence_service

    logger.info("Loading TTS service...")
    tts_service = TTSService()
    tts_service.load()
    logger.info("TTS service ready: %s", tts_service.is_ready)

    logger.info("Loading Translation service...")
    translation_service = TranslationService()
    logger.info("Translation service ready (lazy loading)")

    silence_service = SilenceService()
    logger.info("Silence detection service ready")

    yield

    # Cleanup
    if tts_service:
        tts_service.unload()
    logger.info("Microservice shutdown complete")


app = FastAPI(
    title="TourGuide TTS/Translation Microservice",
    version="0.1.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def verify_api_key(request: Request, call_next):
    """Reject requests without valid API key (skip health endpoint)."""
    if request.url.path == "/health":
        return await call_next(request)
    if API_KEY and request.headers.get("X-API-Key") != API_KEY:
        return JSONResponse(status_code=401, content={"detail": "Invalid or missing API key"})
    return await call_next(request)


# --- Request/Response models ---


class HealthResponse(BaseModel):
    status: str = "ok"
    tts: bool = False
    translation: bool = False
    silence_detection: bool = True


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    language: str = Field(default="fr", pattern="^(fr|en|it|de|es|ja|ko|zh|ru)$")
    voice_id: str | None = None


class TTSResponse(BaseModel):
    ok: bool
    audio_base64: str | None = None
    duration_ms: int | None = None
    error: str | None = None


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000)
    source_lang: str = Field(default="fr", pattern="^(fr|en|it|de|es)$")
    target_lang: str = Field(..., pattern="^(fr|en|it|de|es)$")


class TranslateResponse(BaseModel):
    ok: bool
    translated_text: str | None = None
    error: str | None = None


class SilenceDetectRequest(BaseModel):
    audio_url: str = Field(..., min_length=1)


class SilenceSegment(BaseModel):
    start_ms: int
    end_ms: int


class SilenceDetectResponse(BaseModel):
    ok: bool
    segments: list[SilenceSegment] = []
    error: str | None = None


# --- Endpoints ---


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        tts=tts_service.is_ready if tts_service else False,
        translation=translation_service is not None,
        silence_detection=silence_service is not None,
    )


@app.post("/v1/tts/generate", response_model=TTSResponse)
async def generate_tts(req: TTSRequest):
    if not tts_service or not tts_service.is_ready:
        return TTSResponse(ok=False, error="TTS service not available (GPU required)")

    result = tts_service.generate(req.text, req.language, req.voice_id)
    if result is None:
        return TTSResponse(ok=False, error="TTS generation failed")

    return TTSResponse(
        ok=True,
        audio_base64=result["audio_base64"],
        duration_ms=result["duration_ms"],
    )


@app.post("/v1/translate/marianmt", response_model=TranslateResponse)
async def translate_marianmt(req: TranslateRequest):
    if not translation_service:
        return TranslateResponse(ok=False, error="Translation service not available")

    if req.source_lang == req.target_lang:
        return TranslateResponse(ok=True, translated_text=req.text)

    result = translation_service.translate(req.text, req.source_lang, req.target_lang)
    if result is None:
        return TranslateResponse(ok=False, error=f"Translation pair not supported: {req.source_lang}→{req.target_lang}")

    return TranslateResponse(ok=True, translated_text=result)


@app.post("/v1/silence-detect", response_model=SilenceDetectResponse)
async def detect_silences(req: SilenceDetectRequest):
    if not silence_service:
        return SilenceDetectResponse(ok=False, error="Silence detection service not available")

    result = silence_service.detect(req.audio_url)
    if result is None:
        return SilenceDetectResponse(ok=False, error="Silence detection failed")

    return SilenceDetectResponse(
        ok=True,
        segments=[SilenceSegment(start_ms=s[0], end_ms=s[1]) for s in result],
    )
