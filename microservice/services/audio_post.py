"""Audio post-processing shared by the TTS entrypoints.

Why this exists
---------------
Neural TTS endpoints pad every utterance with silence. Measured on edge-tts /
fr-FR-HenriNeural: ~210 ms of lead-in and ~900 ms of trail-out per call. That is
inaudible when a scene is one single call, but the SSML path renders a scene as a
*sequence* of calls (one per text run, one per 2000-char chunk) and concatenates
them. Every seam then carries trail + lead = ~1.1 s of dead air, and an explicit
`<break time="1s"/>` lands on top of that padding instead of replacing it, so the
guide hears ~2.1 s. That is the "choppy / robotic" rendering that got prosody and
emphasis disabled in the studio toolbar.

The fix is mechanical, not a model change:
  1. trim_silence()      — strip the padding off each rendered chunk
  2. SpeechJoiner        — re-insert ONE deliberate gap per seam, and let an
                           explicit <break> absorb it rather than add to it
  3. normalize_loudness()— one gain pass over the finished scene so scenes don't
                           jump in level relative to each other

Everything here is pure pydub — no new dependency, no network, unit-testable
without touching Azure.
"""

import os

# --- Tunables (env-overridable so the VPS can be adjusted without a rebuild) ---

def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


def _env_int(name: str, default: int) -> int:
    try:
        return int(float(os.getenv(name, default)))
    except (TypeError, ValueError):
        return default


# Padding from a neural TTS endpoint is digital silence; real speech onsets sit
# far above -50 dBFS, so this threshold never eats a consonant.
TRIM_SILENCE_DB = _env_float("TTS_TRIM_DB", -50.0)
# Leave a hair of room tone so a plosive onset isn't clipped flat.
TRIM_KEEP_MS = _env_int("TTS_TRIM_KEEP_MS", 25)
# A hard cut between two PCM buffers clicks; 8 ms of fade removes it inaudibly.
EDGE_FADE_MS = _env_int("TTS_EDGE_FADE_MS", 8)
# Seam between two chunks that were split at a sentence boundary.
SENTENCE_GAP_MS = _env_int("TTS_SENTENCE_GAP_MS", 220)
# Seam between two adjacent SSML runs — usually mid-sentence (text around a
# <prosody> span), so it must stay short or the sentence falls apart.
RUN_GAP_MS = _env_int("TTS_RUN_GAP_MS", 70)
# Target RMS for the finished scene, with a peak ceiling so the gain can never
# clip. Speech at -18 dBFS RMS peaks around -4 dBFS: loud enough to hear outdoors
# on a phone speaker, still clear of 0.
TARGET_DBFS = _env_float("TTS_TARGET_DBFS", -18.0)
PEAK_CEILING_DBFS = _env_float("TTS_PEAK_CEILING_DBFS", -1.0)


def silence_like(seg, duration_ms: int):
    """Silence matching seg's format, so concatenation never resamples."""
    from pydub import AudioSegment

    return AudioSegment.silent(
        duration=max(0, duration_ms), frame_rate=seg.frame_rate
    ).set_channels(seg.channels).set_sample_width(seg.sample_width)


def trim_silence(seg, threshold_db: float = None, keep_ms: int = None):
    """Strip leading/trailing silence, keeping `keep_ms` of it as breathing room.

    Returns a zero-length segment if the whole input is silence — the caller is
    expected to drop it rather than emit a chunk of nothing.
    """
    from pydub.silence import detect_leading_silence

    if len(seg) == 0:
        return seg
    threshold_db = TRIM_SILENCE_DB if threshold_db is None else threshold_db
    keep_ms = TRIM_KEEP_MS if keep_ms is None else keep_ms

    lead = detect_leading_silence(seg, silence_threshold=threshold_db, chunk_size=5)
    if lead >= len(seg):  # nothing but silence
        return seg[:0]
    trail = detect_leading_silence(seg.reverse(), silence_threshold=threshold_db, chunk_size=5)

    start = max(0, lead - keep_ms)
    end = min(len(seg), len(seg) - max(0, trail - keep_ms))
    if end <= start:
        return seg[:0]
    return seg[start:end]


def edge_silence_ms(seg, threshold_db: float = None) -> tuple[int, int]:
    """(leading, trailing) silence still present in a segment, in ms.

    After trim_silence() this is the `keep_ms` breathing room. The joiner
    subtracts it from every requested pause so a `<break time="1s"/>` is one
    second of silence end to end, not one second plus whatever the trim left.
    """
    from pydub.silence import detect_leading_silence

    threshold_db = TRIM_SILENCE_DB if threshold_db is None else threshold_db
    if len(seg) == 0:
        return 0, 0
    lead = detect_leading_silence(seg, silence_threshold=threshold_db, chunk_size=5)
    if lead >= len(seg):
        return len(seg), len(seg)
    trail = detect_leading_silence(seg.reverse(), silence_threshold=threshold_db, chunk_size=5)
    return lead, trail


def apply_edge_fades(seg, fade_ms: int = None):
    """Short fade in/out so a spliced chunk doesn't click at the join."""
    fade_ms = EDGE_FADE_MS if fade_ms is None else fade_ms
    if fade_ms <= 0 or len(seg) < fade_ms * 2:
        return seg
    return seg.fade_in(fade_ms).fade_out(fade_ms)


def clean_chunk(seg):
    """Full treatment for one rendered TTS chunk: de-pad, then de-click."""
    return apply_edge_fades(trim_silence(seg))


def normalize_loudness(seg, target_dbfs: float = None, peak_ceiling_dbfs: float = None):
    """Bring the scene to a target RMS without ever letting the peak clip.

    One gain over the whole scene — deliberately NOT per chunk, which would
    squash the natural dynamics of the narration.
    """
    target_dbfs = TARGET_DBFS if target_dbfs is None else target_dbfs
    peak_ceiling_dbfs = PEAK_CEILING_DBFS if peak_ceiling_dbfs is None else peak_ceiling_dbfs

    if len(seg) == 0:
        return seg
    rms_dbfs = seg.dBFS
    peak_dbfs = seg.max_dBFS
    # Pure silence: dBFS is -inf, there is nothing to normalize.
    if rms_dbfs == float("-inf") or peak_dbfs == float("-inf"):
        return seg

    gain = target_dbfs - rms_dbfs
    headroom = peak_ceiling_dbfs - peak_dbfs
    gain = min(gain, headroom)
    if abs(gain) < 0.1:
        return seg
    return seg.apply_gain(gain)


class SpeechJoiner:
    """Assembles rendered chunks into one scene with deliberate, exact pauses.

    Gap accounting is the point: a pause is *requested*, never accumulated. The
    joiner holds at most one pending gap between two pieces of speech, and takes
    the longest request rather than summing them, so an explicit
    `<break time="1s"/>` yields exactly 1 s instead of 1 s stacked on top of the
    sentence gap and the endpoint's own padding.
    """

    def __init__(self):
        self._parts = []          # list of AudioSegment (speech only)
        self._gaps = []           # silence in ms to insert BEFORE _parts[i] (i > 0)
        self._pending_gap_ms = 0
        self._prev_trail_ms = 0   # silence already sitting at the end of the last part

    def add_speech(self, seg, gap_before_ms: int = 0) -> bool:
        """Append a chunk of speech. Returns False if it was empty after cleaning."""
        seg = clean_chunk(seg)
        if len(seg) == 0:
            return False

        lead_ms, trail_ms = edge_silence_ms(seg)
        if self._parts:
            requested = max(self._pending_gap_ms, max(0, gap_before_ms))
            # The pause the listener hears is what we insert PLUS the silence
            # already on both edges — insert only the difference.
            self._gaps.append(max(0, requested - self._prev_trail_ms - lead_ms))
        self._pending_gap_ms = 0
        self._prev_trail_ms = trail_ms
        self._parts.append(seg)
        return True

    def request_pause(self, duration_ms: int) -> None:
        """Ask for a pause before the next chunk (an SSML <break>).

        Absorbed into the pending gap instead of added to it. A pause requested
        after the last chunk is dropped — trailing silence is padding, not
        content.
        """
        self._pending_gap_ms = max(self._pending_gap_ms, max(0, duration_ms))

    def build(self, normalize: bool = True):
        """Concatenate everything into a single normalized segment."""
        from pydub import AudioSegment

        if not self._parts:
            return AudioSegment.silent(duration=0, frame_rate=24000)

        out = self._parts[0]
        for gap_ms, part in zip(self._gaps, self._parts[1:]):
            if gap_ms > 0:
                out += silence_like(part, gap_ms)
            out += part

        return normalize_loudness(out) if normalize else out

    @property
    def is_empty(self) -> bool:
        return not self._parts
