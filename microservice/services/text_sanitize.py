"""Shared text sanitization for MarianMT translation.

Used by BOTH microservice entrypoints so the behaviour can never drift again:
  - local_server.py        (local dev server)
  - services/translation_service.py  (production / GPU service via main.py)

Why this exists
---------------
MarianMT (Helsinki-NLP opus-mt), especially the fr→de model, mishandles
typographic punctuation. Em/en dashes used as narrative asides ("… rien — et
tout …") make it emit stray garbage (Ÿ, ✓, •, ·) or, with greedy decoding, fall
into a degenerate repetition loop that prints one token hundreds of times
("^ ^ ^ ^ …"). Source text in this project uses em-dashes heavily.

Two-layer defence:
  1. normalize_source()       — rewrite the punctuation the model chokes on
                                 BEFORE it reaches the tokenizer (non-destructive:
                                 only the text sent to the model is changed).
  2. postclean_translation()  — scrub any residual garbage / degenerate runs
                                 from the model output, so a bad generation can
                                 never reach storage or the user.

The real prevention is (1) plus the generation guard rails
(no_repeat_ngram_size / repetition_penalty) applied at the call sites; (2) is a
belt-and-braces safety net.
"""

import re

# --- Layer 1: source normalization -----------------------------------------

# Map the typographic characters the MT models mishandle to safe equivalents.
# A dash-aside becomes a comma pause — meaning is preserved.
_SOURCE_REPLACEMENTS = {
    "—": ", ",   # — em dash
    "–": ", ",   # – en dash
    "―": ", ",   # ― horizontal bar
    "…": "...",   # … ellipsis
    "‘": "'",     # ' left single quote
    "’": "'",     # ' right single quote / apostrophe
    "“": '"',     # " left double quote
    "”": '"',     # " right double quote
    "«": '"',     # « guillemet
    "»": '"',     # » guillemet
    " ": " ",     # no-break space
    " ": " ",     # narrow no-break space
    " ": " ",     # thin space
}
_SOURCE_TABLE = {ord(k): v for k, v in _SOURCE_REPLACEMENTS.items()}

_SPACE_BEFORE_PUNCT = re.compile(r"[ \t]+([,.;:!?])")
_MULTISPACE = re.compile(r"[ \t]{2,}")


def _tidy_spaces(text: str) -> str:
    text = _SPACE_BEFORE_PUNCT.sub(r"\1", text)
    text = _MULTISPACE.sub(" ", text)
    return text


def normalize_source(text: str) -> str:
    """Replace punctuation MarianMT mishandles and tidy the spacing it leaves.
    The stored source text is never modified — this only shapes the model input."""
    if not text:
        return text
    return _tidy_spaces(text.translate(_SOURCE_TABLE))


# --- Layer 2: output post-cleaning ------------------------------------------

# Characters MarianMT emits when it mangles a dash/quote. None occur in normal
# FR/DE/ES/IT/EN prose for this content, so they are safe to strip outright.
_GARBAGE_CHARS = "Ÿˆ✓•·¨"  # Ÿ ˆ ✓ • · ¨
_GARBAGE_RE = re.compile(f"[{_GARBAGE_CHARS}]")

# A non-word, non-space symbol repeated 4+ times (optionally space-separated):
# "^ ^ ^ ^ …", "----", "::::". Always a degeneration artifact at this length;
# legitimate runs like "..." (3) or "!!" (2) are left untouched.
_DEGENERATE_RUN = re.compile(r"([^\w\s])(?:\s*\1){3,}")


def postclean_translation(text: str) -> str:
    """Remove stray garbage characters and degenerate repetition runs from a
    translation. Idempotent and safe on already-clean text."""
    if not text:
        return text
    text = _GARBAGE_RE.sub("", text)
    text = _DEGENERATE_RUN.sub(" ", text)
    return _tidy_spaces(text).strip()
