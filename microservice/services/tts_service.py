"""
TTS Service — Qwen3-TTS 0.6B integration.
Loads model at startup, generates WAV audio from text.
"""

import base64
import io
import logging
import os

logger = logging.getLogger("tourguide-microservice.tts")

# Default voices per language (Qwen3-TTS standard voices)
DEFAULT_VOICES = {
    "fr": "Chelsie",
    "en": "Chelsie",
    "it": "Chelsie",
    "de": "Chelsie",
    "es": "Chelsie",
    "ja": "Chelsie",
    "ko": "Chelsie",
    "zh": "Chelsie",
    "ru": "Chelsie",
}

MODEL_NAME = "Qwen/Qwen3-TTS-12Hz-0.6B-Base"


class TTSService:
    def __init__(self):
        self.model = None
        self.processor = None
        self.is_ready = False
        self._device = "cpu"

    def load(self):
        """Load Qwen3-TTS model. Falls back to CPU if no GPU."""
        try:
            import torch
            from transformers import AutoModelForCausalLM, AutoProcessor

            self._device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info("Loading Qwen3-TTS on %s", self._device)

            self.processor = AutoProcessor.from_pretrained(MODEL_NAME)
            self.model = AutoModelForCausalLM.from_pretrained(
                MODEL_NAME,
                torch_dtype=torch.float16 if self._device == "cuda" else torch.float32,
                device_map=self._device,
            )
            self.is_ready = True
            logger.info("Qwen3-TTS loaded successfully on %s", self._device)
        except Exception as e:
            logger.error("Failed to load Qwen3-TTS: %s", e)
            self.is_ready = False

    def unload(self):
        """Release model memory."""
        try:
            import torch
            self.model = None
            self.processor = None
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            self.is_ready = False
            logger.info("Qwen3-TTS unloaded")
        except Exception as e:
            logger.warning("Error during unload: %s", e)

    def generate(self, text: str, language: str, voice_id: str | None = None) -> dict | None:
        """
        Generate audio from text.
        Returns {"audio_base64": str, "duration_ms": int} or None on failure.
        """
        if not self.is_ready or not self.model or not self.processor:
            return None

        try:
            import torch
            import soundfile as sf

            voice = voice_id or DEFAULT_VOICES.get(language, "Chelsie")

            # Sanitize text: strip Qwen3 control tokens to prevent prompt injection
            import re
            sanitized_text = re.sub(r"<\|[^|]*\|>", "", text)

            # Build prompt for Qwen3-TTS
            prompt = f"<|speaker:{voice}|><|lang:{language}|>{sanitized_text}"

            inputs = self.processor(prompt, return_tensors="pt").to(self._device)

            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=4096,
                    do_sample=True,
                    temperature=0.7,
                )

            # Decode audio tokens to waveform
            audio_array = self.processor.decode_audio(outputs[0])

            if self._device == "cuda":
                torch.cuda.empty_cache()

            # Convert to WAV bytes
            sample_rate = 24000  # Qwen3-TTS default
            buf = io.BytesIO()
            sf.write(buf, audio_array, sample_rate, format="WAV")
            buf.seek(0)
            audio_bytes = buf.read()

            duration_ms = int(len(audio_array) / sample_rate * 1000)

            return {
                "audio_base64": base64.b64encode(audio_bytes).decode("ascii"),
                "duration_ms": duration_ms,
            }

        except Exception as e:
            logger.error("TTS generation failed: %s", e)
            try:
                import torch
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
            except Exception:
                pass
            return None
