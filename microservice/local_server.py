"""
TourGuide TTS/Translation Microservice — Local (edge-tts + MarianMT)
No GPU required. Runs on any machine with Python 3.11+.
"""

import base64
import io
import logging
import os
import re
import tempfile
from urllib.parse import urlparse

import edge_tts
import soundfile as sf
import requests as req_lib
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tourguide-local")

API_KEY = os.getenv("MICROSERVICE_API_KEY", "")

# -- MarianMT lazy loading --
translation_models = {}
translation_tokenizers = {}

MARIAN_MODELS = {
    ("fr", "en"): "Helsinki-NLP/opus-mt-fr-en",
    ("fr", "it"): "Helsinki-NLP/opus-mt-fr-it",
    ("fr", "de"): "Helsinki-NLP/opus-mt-fr-de",
    ("fr", "es"): "Helsinki-NLP/opus-mt-fr-es",
}


def load_translation_pair(src, tgt):
    pair = (src, tgt)
    if pair in translation_models:
        return True
    model_name = MARIAN_MODELS.get(pair)
    if not model_name:
        return False
    logger.info(f"Loading MarianMT {src} -> {tgt}...")
    from transformers import MarianMTModel, MarianTokenizer
    import torch
    translation_tokenizers[pair] = MarianTokenizer.from_pretrained(model_name)
    translation_models[pair] = MarianMTModel.from_pretrained(model_name)
    logger.info(f"MarianMT {src} -> {tgt} loaded")
    return True


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
app = FastAPI(title="TourGuide Microservice (local)")

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
    }


@app.post("/v1/tts/generate")
async def generate_tts(req: TTSRequest):
    try:
        voice = req.voice_id or EDGE_VOICES.get(req.language, "fr-FR-HenriNeural")
        text = req.text

        # Detect if text contains SSML tags
        has_ssml = bool(re.search(r'<(break|prosody|emphasis|say-as|phoneme|sub)\b', text))

        if has_ssml:
            # Wrap in <speak> if not already wrapped
            if not text.strip().startswith('<speak'):
                text = f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="{req.language}">{text}</speak>'
            logger.info(f"TTS (SSML): voice={voice}, len={len(text)}")
        else:
            logger.info(f"TTS: voice={voice}, text={text[:80]}...")

        tmp_path = tempfile.mktemp(suffix=".mp3")
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(tmp_path)

        # Read and convert to WAV
        from pydub import AudioSegment
        audio_seg = AudioSegment.from_file(tmp_path)
        os.unlink(tmp_path)

        buf = io.BytesIO()
        audio_seg.export(buf, format="wav")
        buf.seek(0)
        audio_b64 = base64.b64encode(buf.read()).decode("ascii")
        duration_ms = len(audio_seg)

        logger.info(f"TTS OK: {duration_ms}ms, {len(audio_b64)//1024}KB")
        return {"ok": True, "audio_base64": audio_b64, "duration_ms": duration_ms}
    except Exception as e:
        logger.error(f"TTS error: {e}")
        return {"ok": False, "error": str(e)}


@app.post("/v1/translate/marianmt")
async def translate(req: TranslateRequest):
    if req.source_lang == req.target_lang:
        return {"ok": True, "translated_text": req.text}
    pair = (req.source_lang, req.target_lang)
    if not load_translation_pair(*pair):
        return {"ok": False, "error": f"Paire non supportee: {pair}"}
    try:
        import torch
        tokenizer = translation_tokenizers[pair]
        model = translation_models[pair]
        inputs = tokenizer(req.text, return_tensors="pt", padding=True, truncation=True, max_length=512)
        with torch.no_grad():
            translated = model.generate(**inputs)
        result = tokenizer.decode(translated[0], skip_special_tokens=True)
        return {"ok": True, "translated_text": result}
    except Exception as e:
        logger.error(f"Translation error: {e}")
        return {"ok": False, "error": str(e)}


ALLOWED_HOSTS = {"s3.amazonaws.com", "s3.us-east-1.amazonaws.com"}


def is_allowed_url(url):
    try:
        parsed = urlparse(url)
        host = parsed.hostname or ""
        return host in ALLOWED_HOSTS or (host.endswith(".amazonaws.com") and ".s3." in host)
    except Exception:
        return False


@app.post("/v1/silence-detect")
async def silence_detect(req: SilenceRequest):
    if not is_allowed_url(req.audio_url):
        return {"ok": False, "error": "URL non autorisee"}
    try:
        from pydub import AudioSegment
        from pydub.silence import detect_nonsilent

        resp = req_lib.get(req.audio_url, timeout=30, allow_redirects=False)
        resp.raise_for_status()
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(resp.content)
            tmp_path = tmp.name
        try:
            audio = AudioSegment.from_file(tmp_path)
            segments = detect_nonsilent(audio, min_silence_len=800, silence_thresh=-40)
            if not segments:
                segments = [(0, len(audio))]
            return {"ok": True, "segments": [{"start_ms": s[0], "end_ms": s[1]} for s in segments]}
        finally:
            os.unlink(tmp_path)
    except Exception as e:
        logger.error(f"Silence detection error: {e}")
        return {"ok": False, "error": str(e)}
