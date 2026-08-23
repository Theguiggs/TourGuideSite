"""Unit tests for services.audio_post — no network, no Azure, pure pydub.

The behaviour under test is the one that made TTS sound choppy: every rendered
chunk arrives wrapped in ~210 ms / ~900 ms of endpoint padding, and the old
pipeline concatenated it as-is.
"""

import sys
from pathlib import Path

import pytest
from pydub import AudioSegment
from pydub.generators import Sine
from pydub.silence import detect_leading_silence, detect_silence

MICROSERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(MICROSERVICE_ROOT))

from services.audio_post import (  # noqa: E402
    TRIM_KEEP_MS,
    SpeechJoiner,
    normalize_loudness,
    silence_like,
    trim_silence,
)

FRAME_RATE = 24000


def tone(duration_ms: int, gain_db: float = -20.0) -> AudioSegment:
    """A speech stand-in: same format edge-tts returns (24 kHz mono 16-bit)."""
    return (
        Sine(440, sample_rate=FRAME_RATE)
        .to_audio_segment(duration=duration_ms)
        .set_channels(1)
        .set_sample_width(2)
        .apply_gain(gain_db)
    )


def padded(seg: AudioSegment, lead_ms: int = 210, trail_ms: int = 900) -> AudioSegment:
    """Wrap a segment the way the TTS endpoint does."""
    return silence_like(seg, lead_ms) + seg + silence_like(seg, trail_ms)


# --- trim_silence ------------------------------------------------------------

def test_trim_strips_endpoint_padding_but_keeps_breathing_room():
    speech = tone(500)
    trimmed = trim_silence(padded(speech))
    # 500 ms of speech + TRIM_KEEP_MS of room tone on each side.
    assert len(trimmed) == pytest.approx(500 + 2 * TRIM_KEEP_MS, abs=10)


def test_trim_is_idempotent():
    once = trim_silence(padded(tone(400)))
    assert len(trim_silence(once)) == pytest.approx(len(once), abs=10)


def test_trim_returns_empty_for_pure_silence():
    assert len(trim_silence(silence_like(tone(10), 800))) == 0


def test_trim_leaves_an_already_tight_segment_alone():
    speech = tone(300)
    assert len(trim_silence(speech)) == pytest.approx(len(speech), abs=10)


# --- normalize_loudness ------------------------------------------------------

def test_normalize_brings_quiet_audio_up_to_target():
    quiet = tone(1000, gain_db=-40)
    assert normalize_loudness(quiet, target_dbfs=-18.0).dBFS == pytest.approx(-18.0, abs=0.5)


def test_normalize_never_pushes_the_peak_past_the_ceiling():
    # Quiet narration with one loud transient: reaching the RMS target would
    # clip, so the peak ceiling has to win.
    seg = tone(1000, gain_db=-40) + tone(10, gain_db=-2)
    out = normalize_loudness(seg, target_dbfs=-18.0, peak_ceiling_dbfs=-1.0)
    assert out.max_dBFS <= -1.0 + 0.1
    assert out.dBFS < -18.0  # gain was capped, target not reached


def test_normalize_leaves_silence_untouched():
    silence = silence_like(tone(10), 500)
    assert len(normalize_loudness(silence)) == 500


# --- SpeechJoiner ------------------------------------------------------------

def interior_pauses(joined: AudioSegment) -> list[int]:
    """Durations of the silences BETWEEN speech — what the listener perceives."""
    ranges = detect_silence(joined, min_silence_len=30, silence_thresh=-50)
    return [
        end - start
        for start, end in ranges
        if start > 0 and end < len(joined)  # ignore the edges
    ]


def test_joiner_replaces_endpoint_padding_with_the_requested_gap():
    j = SpeechJoiner()
    j.add_speech(padded(tone(500)))
    j.add_speech(padded(tone(500)), gap_before_ms=220)
    out = j.build(normalize=False)

    # Naive concatenation would have produced 900 + 210 = 1110 ms of dead air.
    assert interior_pauses(out) == [pytest.approx(220, abs=15)]
    assert len(out) == pytest.approx(2 * (500 + 2 * TRIM_KEEP_MS) + 220 - 2 * TRIM_KEEP_MS, abs=20)


def test_break_absorbs_the_seam_gap_instead_of_stacking_on_it():
    j = SpeechJoiner()
    j.add_speech(padded(tone(500)))
    j.request_pause(1000)                                  # <break time="1s"/>
    j.add_speech(padded(tone(500)), gap_before_ms=220)     # + sentence gap
    out = j.build(normalize=False)

    # Exactly the break the script asked for — not 1000 + 220, and not the
    # ~2.1 s the padded concatenation used to produce.
    assert interior_pauses(out) == [pytest.approx(1000, abs=15)]


def test_longest_pause_request_wins():
    j = SpeechJoiner()
    j.add_speech(padded(tone(300)))
    j.request_pause(100)
    j.add_speech(padded(tone(300)), gap_before_ms=400)
    out = j.build(normalize=False)
    assert interior_pauses(out) == [pytest.approx(400, abs=15)]


def test_no_gap_before_the_first_chunk():
    j = SpeechJoiner()
    j.request_pause(800)  # a <break> opening the scene is padding, not content
    j.add_speech(padded(tone(400)), gap_before_ms=220)
    out = j.build(normalize=False)
    assert detect_leading_silence(out, silence_threshold=-50.0, chunk_size=5) <= TRIM_KEEP_MS + 10


def test_trailing_pause_is_dropped():
    j = SpeechJoiner()
    j.add_speech(padded(tone(400)))
    j.request_pause(3000)
    out = j.build(normalize=False)
    assert len(out) == pytest.approx(400 + 2 * TRIM_KEEP_MS, abs=15)


def test_silent_chunk_is_rejected_and_consumes_no_gap():
    j = SpeechJoiner()
    assert j.add_speech(padded(tone(400))) is True
    assert j.add_speech(silence_like(tone(10), 600), gap_before_ms=220) is False
    assert j.add_speech(padded(tone(400)), gap_before_ms=220) is True
    out = j.build(normalize=False)
    assert interior_pauses(out) == [pytest.approx(220, abs=15)]


def test_empty_joiner_builds_empty_audio():
    j = SpeechJoiner()
    assert j.is_empty
    assert len(j.build()) == 0


def test_joined_output_keeps_the_source_format():
    j = SpeechJoiner()
    j.add_speech(padded(tone(300)))
    j.add_speech(padded(tone(300)), gap_before_ms=220)
    out = j.build()
    assert (out.frame_rate, out.channels, out.sample_width) == (FRAME_RATE, 1, 2)
