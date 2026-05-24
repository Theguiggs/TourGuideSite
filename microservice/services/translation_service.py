"""
Translation Service — MarianMT (Helsinki-NLP) integration.
Lazy-loads models per language pair on first request to save RAM.

Source normalization + output cleaning live in services/text_sanitize.py and
are shared with local_server.py so the two entrypoints can never diverge.
"""

import logging

from services.text_sanitize import normalize_source, postclean_translation

logger = logging.getLogger("tourguide-microservice.translation")

# Helsinki-NLP model names for FR→target pairs
MARIAN_MODELS = {
    ("fr", "en"): "Helsinki-NLP/opus-mt-fr-en",
    ("fr", "it"): "Helsinki-NLP/opus-mt-fr-it",
    ("fr", "de"): "Helsinki-NLP/opus-mt-fr-de",
    ("fr", "es"): "Helsinki-NLP/opus-mt-fr-es",
    ("en", "fr"): "Helsinki-NLP/opus-mt-en-fr",
    ("it", "fr"): "Helsinki-NLP/opus-mt-it-fr",
    ("de", "fr"): "Helsinki-NLP/opus-mt-de-fr",
    ("es", "fr"): "Helsinki-NLP/opus-mt-es-fr",
}


class TranslationService:
    def __init__(self):
        self._models: dict[tuple[str, str], object] = {}
        self._tokenizers: dict[tuple[str, str], object] = {}

    def _load_pair(self, source: str, target: str) -> bool:
        """Lazy-load a translation model for a specific language pair."""
        pair = (source, target)
        if pair in self._models:
            return True

        model_name = MARIAN_MODELS.get(pair)
        if not model_name:
            logger.warning("No MarianMT model for pair %s->%s", source, target)
            return False

        try:
            from transformers import MarianMTModel, MarianTokenizer

            logger.info("Loading MarianMT model: %s", model_name)
            tokenizer = MarianTokenizer.from_pretrained(model_name)
            model = MarianMTModel.from_pretrained(model_name)

            self._tokenizers[pair] = tokenizer
            self._models[pair] = model
            logger.info("MarianMT model loaded: %s", model_name)
            return True
        except Exception as e:
            logger.error("Failed to load MarianMT model %s: %s", model_name, e)
            return False

    def translate(self, text: str, source_lang: str, target_lang: str) -> str | None:
        """Translate text from source to target language. Returns None if pair unsupported."""
        pair = (source_lang, target_lang)

        if not self._load_pair(source_lang, target_lang):
            return None

        try:
            import torch

            tokenizer = self._tokenizers[pair]
            model = self._models[pair]

            # Normalize typographic punctuation BEFORE the model sees it, so a
            # narrative em-dash can't trigger garbage output / repetition loops.
            normalized = normalize_source(text)

            # Split long text into chunks (MarianMT has 512 token limit)
            sentences = normalized.replace("\n", " \n ").split(". ")
            translated_parts = []

            for sentence in sentences:
                if not sentence.strip():
                    translated_parts.append("")
                    continue

                inputs = tokenizer(sentence, return_tensors="pt", padding=True, truncation=True, max_length=512)

                with torch.no_grad():
                    # no_repeat_ngram_size + repetition_penalty are guard rails:
                    # without them MarianMT can fall into a degenerate loop and
                    # emit a token hundreds of times (the "^ ^ ^ ..." bug).
                    translated_tokens = model.generate(
                        **inputs,
                        max_length=512,
                        num_beams=4,
                        no_repeat_ngram_size=3,
                        repetition_penalty=1.3,
                    )

                result = tokenizer.decode(translated_tokens[0], skip_special_tokens=True)
                translated_parts.append(result)

            return postclean_translation(". ".join(translated_parts))

        except Exception as e:
            logger.error("Translation failed for %s->%s: %s", source_lang, target_lang, e)
            return None

    def get_supported_pairs(self) -> list[tuple[str, str]]:
        """Return list of supported language pairs."""
        return list(MARIAN_MODELS.keys())
