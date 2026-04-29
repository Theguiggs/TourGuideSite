"""
Generate 16 procedural ambient sounds for the Studio audio mixer.

Each sound is 10s, mono, 44.1kHz, encoded as MP3 128kbps (loop-friendly).
Outputs to public/sounds/ambiance/.

Usage:
    cd microservice && .venv/Scripts/activate
    cd .. && python scripts/generate-ambiance-sounds.py
"""
import os
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

SAMPLE_RATE = 44100
DURATION = 10.0  # seconds
OUTPUT_DIR = Path(__file__).parent.parent / "public" / "sounds" / "ambiance"
N = int(SAMPLE_RATE * DURATION)

rng = np.random.default_rng(42)


# --- Noise generators ---

def white_noise(n=N):
    return rng.standard_normal(n).astype(np.float32)


def pink_noise(n=N):
    """Pink noise via Voss-McCartney algorithm (1/f)."""
    num_rows = 16
    array = rng.standard_normal((num_rows, n))
    cumulative = np.zeros(n)
    for i in range(num_rows):
        step = 2 ** i
        for j in range(0, n, step):
            cumulative[j:j + step] += array[i, j:j + step]
    cumulative /= num_rows
    return (cumulative / np.max(np.abs(cumulative))).astype(np.float32)


def brown_noise(n=N):
    """Brown noise (random walk, 1/f²)."""
    steps = rng.standard_normal(n)
    walk = np.cumsum(steps)
    walk -= walk.mean()
    walk /= np.max(np.abs(walk))
    return walk.astype(np.float32)


# --- Simple biquad filters ---

def lowpass(x, cutoff_hz, sr=SAMPLE_RATE):
    from scipy.signal import butter, sosfilt
    sos = butter(4, cutoff_hz / (sr / 2), btype='lowpass', output='sos')
    return sosfilt(sos, x).astype(np.float32)


def highpass(x, cutoff_hz, sr=SAMPLE_RATE):
    from scipy.signal import butter, sosfilt
    sos = butter(4, cutoff_hz / (sr / 2), btype='highpass', output='sos')
    return sosfilt(sos, x).astype(np.float32)


def bandpass(x, low, high, sr=SAMPLE_RATE):
    from scipy.signal import butter, sosfilt
    sos = butter(4, [low / (sr / 2), high / (sr / 2)], btype='bandpass', output='sos')
    return sosfilt(sos, x).astype(np.float32)


# --- Helpers ---

def fade_inout(x, fade_s=0.1):
    """Loop-friendly fade in/out."""
    n_fade = int(fade_s * SAMPLE_RATE)
    fade = np.linspace(0, 1, n_fade)
    x[:n_fade] *= fade
    x[-n_fade:] *= fade[::-1]
    return x


def normalize(x, peak=0.8):
    return (x * peak / np.max(np.abs(x) + 1e-9)).astype(np.float32)


def sine(freq, n=N, phase=0.0):
    t = np.arange(n) / SAMPLE_RATE
    return np.sin(2 * np.pi * freq * t + phase).astype(np.float32)


# --- Ambient generators ---

def gen_rain():
    """Rain: pink noise low-passed ~4kHz + soft highpass."""
    x = pink_noise()
    x = highpass(x, 200)
    x = lowpass(x, 4500)
    # Random droplet bursts
    bursts = np.zeros(N)
    for _ in range(120):
        pos = rng.integers(0, N - 200)
        bursts[pos:pos + 200] += rng.standard_normal(200) * 0.4 * np.exp(-np.arange(200) / 40)
    bursts = lowpass(bursts, 8000)
    return normalize(x * 0.7 + bursts * 0.3)


def gen_river():
    """River: brown noise filtered + slow LFO modulation."""
    x = brown_noise()
    x = bandpass(x, 100, 2500)
    t = np.arange(N) / SAMPLE_RATE
    lfo = 0.7 + 0.3 * np.sin(2 * np.pi * 0.15 * t)
    return normalize(x * lfo)


def gen_fountain():
    """Fountain: pink noise + splash transients."""
    base = bandpass(pink_noise(), 300, 4000) * 0.4
    # Splashes
    splashes = np.zeros(N)
    for _ in range(60):
        pos = rng.integers(0, N - 4000)
        dur = rng.integers(800, 3000)
        burst = rng.standard_normal(dur) * np.exp(-np.arange(dur) / 500)
        splashes[pos:pos + dur] += burst * 0.5
    splashes = bandpass(splashes, 500, 6000)
    return normalize(base + splashes * 0.6)


def gen_waves():
    """Waves: low brown noise with slow periodic LFO (breathing)."""
    x = brown_noise()
    x = lowpass(x, 1500)
    t = np.arange(N) / SAMPLE_RATE
    # Period ~5s (wave cycle), wave envelope
    env = 0.3 + 0.7 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.2 * t - np.pi / 2))
    env = env ** 2  # sharpen peaks
    return normalize(x * env)


def gen_wind():
    """Wind: brown noise with slow LFO + occasional gusts."""
    x = brown_noise()
    x = bandpass(x, 80, 2000)
    t = np.arange(N) / SAMPLE_RATE
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * 0.1 * t)
    # Gusts
    gusts = np.zeros(N)
    for _ in range(4):
        pos = rng.integers(0, N - 30000)
        dur = rng.integers(20000, 40000)
        env = np.exp(-np.linspace(-3, 3, dur) ** 2)
        gusts[pos:pos + dur] += env * 0.8
    return normalize(x * (lfo + gusts * 0.5))


def gen_birds():
    """Birds: random chirps (FM-modulated sine bursts)."""
    out = np.zeros(N)
    for _ in range(40):
        pos = rng.integers(0, N - 5000)
        dur = rng.integers(1000, 4000)
        freq = rng.uniform(1800, 4500)
        # FM warble
        t = np.arange(dur) / SAMPLE_RATE
        mod = np.sin(2 * np.pi * rng.uniform(8, 20) * t)
        chirp = np.sin(2 * np.pi * freq * t + mod * 2)
        env = np.exp(-np.linspace(0, 3, dur))
        out[pos:pos + dur] += (chirp * env * rng.uniform(0.3, 0.7)).astype(np.float32)
    # Add light forest bed
    bed = bandpass(pink_noise(), 500, 3000) * 0.08
    return normalize(out + bed)


def gen_cicadas():
    """Cicadas: dense high-freq buzzing with AM modulation."""
    out = np.zeros(N)
    t = np.arange(N) / SAMPLE_RATE
    for _ in range(6):
        freq = rng.uniform(3500, 6500)
        am_rate = rng.uniform(15, 40)
        carrier = np.sin(2 * np.pi * freq * t)
        am = 0.5 + 0.5 * np.sin(2 * np.pi * am_rate * t + rng.uniform(0, np.pi))
        out += carrier * am * rng.uniform(0.15, 0.25)
    out = bandpass(out, 2500, 8000)
    return normalize(out)


def gen_forest():
    """Forest: birds + light wind + rustling leaves."""
    birds_arr = gen_birds() * 0.5
    wind_arr = gen_wind() * 0.3
    rustling = bandpass(pink_noise(), 2000, 6000) * 0.15
    return normalize(birds_arr + wind_arr + rustling)


def gen_footsteps():
    """Footsteps on cobblestone: sharp transient hits at ~walking pace."""
    out = np.zeros(N)
    step_interval = 0.55  # seconds (walking pace)
    t = 0.0
    while t < DURATION - 0.1:
        pos = int(t * SAMPLE_RATE)
        # Short burst of filtered noise + click
        dur = 1500
        click = (rng.standard_normal(dur) * np.exp(-np.linspace(0, 8, dur))).astype(np.float32)
        click = bandpass(click, 200, 3000)
        # Low thud
        thud_dur = 1000
        thud_t = np.arange(thud_dur) / SAMPLE_RATE
        thud = (np.sin(2 * np.pi * 80 * thud_t) * np.exp(-thud_t * 30)).astype(np.float32)
        if pos + dur < N:
            out[pos:pos + dur] += click * 0.5
        if pos + thud_dur < N:
            out[pos:pos + thud_dur] += thud * 0.4
        t += step_interval + rng.uniform(-0.05, 0.05)
    # Light ambient room tone
    bed = bandpass(brown_noise(), 100, 1500) * 0.08
    return normalize(out + bed)


def gen_cafe():
    """Cafe: pink noise bed + random "babble" tones + clinks."""
    bed = bandpass(pink_noise(), 150, 2500) * 0.35
    # Babble: random voice-band tones
    babble = np.zeros(N)
    for _ in range(80):
        pos = rng.integers(0, N - 8000)
        dur = rng.integers(3000, 8000)
        freq = rng.uniform(150, 400)
        env = np.exp(-np.linspace(0, 3, dur))
        tone = np.sin(2 * np.pi * freq * np.arange(dur) / SAMPLE_RATE) * env * rng.uniform(0.05, 0.15)
        babble[pos:pos + dur] += tone
    # Clinks (cups/glasses)
    clinks = np.zeros(N)
    for _ in range(10):
        pos = rng.integers(0, N - 3000)
        dur = 2500
        freq = rng.uniform(2500, 5500)
        env = np.exp(-np.linspace(0, 6, dur))
        clk = (np.sin(2 * np.pi * freq * np.arange(dur) / SAMPLE_RATE) * env * 0.4).astype(np.float32)
        clinks[pos:pos + dur] += clk
    return normalize(bed + babble + clinks * 0.5)


def gen_market():
    """Market: busier cafe with more babble and more transients."""
    cafe = gen_cafe()
    # Add extra bustle
    extra_babble = np.zeros(N)
    for _ in range(60):
        pos = rng.integers(0, N - 5000)
        dur = rng.integers(2000, 5000)
        freq = rng.uniform(200, 500)
        env = np.exp(-np.linspace(0, 3, dur))
        tone = np.sin(2 * np.pi * freq * np.arange(dur) / SAMPLE_RATE) * env * rng.uniform(0.08, 0.2)
        extra_babble[pos:pos + dur] += tone
    return normalize(cafe * 0.7 + extra_babble * 0.4)


def gen_church_bells():
    """Church bells: fundamental + harmonics with long decay."""
    out = np.zeros(N)
    # Ring bells at different positions
    for i, pos_s in enumerate([0.2, 3.5, 6.8]):
        pos = int(pos_s * SAMPLE_RATE)
        dur = min(int(6.0 * SAMPLE_RATE), N - pos)
        if dur <= 0:
            continue
        t = np.arange(dur) / SAMPLE_RATE
        fundamental = 220 + i * 30
        harmonics = [1.0, 2.0, 2.756, 5.432]
        amps = [1.0, 0.6, 0.4, 0.2]
        bell = np.zeros(dur)
        for h, a in zip(harmonics, amps):
            bell += a * np.sin(2 * np.pi * fundamental * h * t) * np.exp(-t * (1.5 + h * 0.3))
        out[pos:pos + dur] += bell * 0.5
    return normalize(out)


def gen_guitar():
    """Acoustic guitar: plucked string notes (Karplus-Strong-like)."""
    out = np.zeros(N)
    notes = [196, 247, 294, 330, 392, 440, 494, 523]  # G3..C5
    # Chord pattern
    chord_pattern = [
        [0, 2, 4, 7],  # Gm
        [0, 3, 5, 7],  # major
        [2, 4, 6],
    ]
    t = 0.0
    chord_idx = 0
    while t < DURATION - 0.3:
        chord = chord_pattern[chord_idx % len(chord_pattern)]
        for offset, note_idx in enumerate(chord):
            freq = notes[note_idx % len(notes)]
            start = t + offset * 0.12
            pos = int(start * SAMPLE_RATE)
            if pos >= N:
                break
            dur = int(1.5 * SAMPLE_RATE)
            dur = min(dur, N - pos)
            # Karplus-Strong pluck
            period = max(1, int(SAMPLE_RATE / freq))
            buf = rng.standard_normal(period) * 0.5
            sample = np.zeros(dur)
            for i in range(dur):
                sample[i] = buf[i % period]
                if i >= period:
                    buf[i % period] = 0.5 * (buf[i % period] + buf[(i - 1) % period]) * 0.996
            env = np.exp(-np.linspace(0, 4, dur))
            out[pos:pos + dur] += (sample * env * 0.3).astype(np.float32)
        t += 2.0
        chord_idx += 1
    out = lowpass(out, 5000)
    return normalize(out)


def gen_classical():
    """Classical: sustained string chord (polyphonic sines)."""
    out = np.zeros(N)
    t = np.arange(N) / SAMPLE_RATE
    # Two chords: C major, F major
    chord1 = [261.63, 329.63, 392.00, 523.25]  # C E G C
    chord2 = [349.23, 440.00, 523.25, 698.46]  # F A C F
    # First half chord1, second half chord2
    half = N // 2
    for f in chord1:
        partial = np.sin(2 * np.pi * f * t[:half])
        # Vibrato
        vibrato = np.sin(2 * np.pi * 5 * t[:half]) * 0.005
        partial = np.sin(2 * np.pi * f * (1 + vibrato) * t[:half])
        out[:half] += partial * 0.15
    for f in chord2:
        partial = np.sin(2 * np.pi * f * t[half:])
        vibrato = np.sin(2 * np.pi * 5 * t[half:]) * 0.005
        partial = np.sin(2 * np.pi * f * (1 + vibrato) * t[half:])
        out[half:] += partial * 0.15
    # Envelope
    env = np.ones(N)
    attack = int(0.5 * SAMPLE_RATE)
    release = int(0.5 * SAMPLE_RATE)
    env[:attack] = np.linspace(0, 1, attack)
    env[-release:] = np.linspace(1, 0, release)
    out = lowpass(out, 4000) * env
    return normalize(out)


def gen_museum():
    """Museum: very quiet room tone + faint footsteps."""
    bed = bandpass(brown_noise(), 50, 300) * 0.15
    # Occasional faint steps
    steps = np.zeros(N)
    for _ in range(4):
        pos = rng.integers(0, N - 3000)
        dur = 2000
        tick = (rng.standard_normal(dur) * np.exp(-np.linspace(0, 8, dur))).astype(np.float32)
        tick = bandpass(tick, 500, 2500) * 0.1
        steps[pos:pos + dur] += tick
    # HVAC hum
    t = np.arange(N) / SAMPLE_RATE
    hum = np.sin(2 * np.pi * 60 * t) * 0.02
    return normalize(bed + steps + hum, peak=0.4)


def gen_cathedral():
    """Cathedral: large reverb bed with a faint distant bell."""
    # Low drone
    t = np.arange(N) / SAMPLE_RATE
    drone = (np.sin(2 * np.pi * 110 * t) * 0.15 + np.sin(2 * np.pi * 165 * t) * 0.1)
    # Noise bed with resonant filter
    noise = bandpass(pink_noise(), 100, 1500) * 0.15
    # Faint bell at 5s
    bell = np.zeros(N)
    pos = int(5.0 * SAMPLE_RATE)
    dur = min(int(4.0 * SAMPLE_RATE), N - pos)
    if dur > 0:
        bt = np.arange(dur) / SAMPLE_RATE
        b = (np.sin(2 * np.pi * 440 * bt) * np.exp(-bt * 1.5)
             + 0.5 * np.sin(2 * np.pi * 880 * bt) * np.exp(-bt * 2))
        bell[pos:pos + dur] = b * 0.2
    combined = drone + noise + bell
    # Simulate reverb with a simple feedback delay
    delay_samples = int(0.15 * SAMPLE_RATE)
    reverb = combined.copy()
    for d in [0.08, 0.15, 0.25, 0.4]:
        ds = int(d * SAMPLE_RATE)
        attenuation = 0.5 * (1 - d)
        if ds < N:
            delayed = np.concatenate([np.zeros(ds), combined[:N - ds]]) * attenuation
            reverb += delayed
    return normalize(reverb, peak=0.6)


# --- Generation map ---

GENERATORS = {
    "rain": gen_rain,
    "river": gen_river,
    "fountain": gen_fountain,
    "waves": gen_waves,
    "wind": gen_wind,
    "birds": gen_birds,
    "cicadas": gen_cicadas,
    "forest": gen_forest,
    "footsteps": gen_footsteps,
    "cafe": gen_cafe,
    "market": gen_market,
    "church-bells": gen_church_bells,
    "guitar": gen_guitar,
    "classical": gen_classical,
    "museum": gen_museum,
    "cathedral": gen_cathedral,
}


def wav_to_mp3(wav_path: Path, mp3_path: Path):
    """Convert WAV to MP3 128kbps via ffmpeg."""
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(wav_path),
            "-codec:a", "libmp3lame", "-b:a", "128k", "-ar", str(SAMPLE_RATE),
            "-ac", "1", str(mp3_path),
        ],
        check=True, capture_output=True,
    )


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Output directory: {OUTPUT_DIR}")

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        for name, gen in GENERATORS.items():
            print(f"[{name}] generating...", end=" ", flush=True)
            audio = gen()
            audio = fade_inout(audio, 0.15)
            wav_path = tmp_path / f"{name}.wav"
            sf.write(wav_path, audio, SAMPLE_RATE, subtype="PCM_16")
            mp3_path = OUTPUT_DIR / f"{name}.mp3"
            wav_to_mp3(wav_path, mp3_path)
            size_kb = mp3_path.stat().st_size / 1024
            print(f"OK -> {mp3_path.name} ({size_kb:.1f} KB)")

    print("\nDone.")


if __name__ == "__main__":
    main()
