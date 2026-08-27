"""A/B the TTS render pipeline: old naive concatenation vs the post-processed one.

Renders the same script twice through the real edge-tts endpoint and writes two
WAV files so the difference can be judged by ear, plus the measured pause
lengths so it can be judged on numbers.

    python tts_ab.py                       # built-in sample scene
    python tts_ab.py --sample prosody      # scene using <prosody> / <emphasis>
    python tts_ab.py --text-file scene.txt # your own script (SSML allowed)
    python tts_ab.py --voice fr-FR-DeniseNeural --out-dir ./ab

Not part of the service — a bench tool, like loadtest.py.
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path

os.environ.setdefault("MICROSERVICE_API_KEY", "tts-ab-bench")
sys.path.insert(0, str(Path(__file__).resolve().parent))

from pydub import AudioSegment  # noqa: E402
from pydub.silence import detect_silence  # noqa: E402

# Le contournement du SSML vit desormais dans `services/tts_edge.py` : ce banc
# le visait via `local_server`, ou il n'existe plus. Il levait donc un
# AttributeError des le premier rendu — et c'est precisement l'instrument que la
# comparaison a l'ecoute standard/HD reclame.
import services.tts_edge as ls  # noqa: E402

SAMPLES = {}

SAMPLES["basic"] = (
    "Nous voici devant la villa Eugénie, construite en 1854 pour l'impératrice. "
    "<break time=\"1s\"/> "
    "Regardez la façade : ses briques rouges tranchent avec le blanc de la pierre, "
    "et le pavillon central avance vers la mer comme une proue. "
    "<break time=\"1.5s\"/> "
    "Un mot, enfin, sur le jardin. Il fut dessiné pour offrir, depuis chaque fenêtre, "
    "une vue différente sur l'océan."
)

# Same scene with the effects the studio toolbar currently hides. They were
# disabled because the old pipeline turned every run boundary into a ~1.1 s
# hole; render this one and listen before deciding whether to bring them back.
SAMPLES["prosody"] = (
    "Nous voici devant la villa Eugénie, "
    "<prosody rate=\"slow\">construite en 1854 pour l'impératrice.</prosody> "
    "<break time=\"1s\"/> "
    "Regardez la façade : ses briques rouges tranchent avec "
    "<emphasis level=\"strong\">le blanc de la pierre</emphasis>, "
    "et le pavillon central avance vers la mer comme une proue."
)


async def render_old(runs, voice):
    """The pipeline as it was: raw chunks concatenated, breaks added on top."""
    combined = AudioSegment.silent(duration=0, frame_rate=24000)
    for kind, value, params in runs:
        if kind == "break":
            combined += AudioSegment.silent(duration=value, frame_rate=24000)
            continue
        if not ls._is_speakable(value):
            continue
        for chunk in ls._split_for_tts(value):
            if ls._is_speakable(chunk):
                combined += await ls._synth_chunk(chunk, voice, params)
    return combined


def describe(label, seg, path):
    seg.export(path, format="wav")
    pauses = [
        end - start
        for start, end in detect_silence(seg, min_silence_len=120, silence_thresh=-50)
        if start > 0 and end < len(seg)
    ]
    lead = detect_silence(seg, min_silence_len=1, silence_thresh=-50)
    head = lead[0][1] if lead and lead[0][0] == 0 else 0
    print(f"\n{label}")
    print(f"  file      : {path}")
    print(f"  duration  : {len(seg) / 1000:.2f}s")
    print(f"  level     : {seg.dBFS:.1f} dBFS RMS / {seg.max_dBFS:.1f} dBFS peak")
    print(f"  head pad  : {head} ms")
    print(f"  pauses    : {', '.join(f'{p} ms' for p in pauses) or 'none'}")
    return len(seg), pauses


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--text-file", type=Path)
    ap.add_argument("--sample", choices=sorted(SAMPLES), default="basic")
    ap.add_argument("--voice", default="fr-FR-HenriNeural")
    ap.add_argument("--out-dir", type=Path, default=Path("."))
    args = ap.parse_args()

    text = (
        args.text_file.read_text(encoding="utf-8")
        if args.text_file
        else SAMPLES[args.sample]
    )
    args.out_dir.mkdir(parents=True, exist_ok=True)

    runs = []
    cleaned = text if text.strip().startswith("<speak") else f"<speak>{text}</speak>"
    import xml.etree.ElementTree as ET

    root = ET.fromstring(cleaned)
    if root.text and root.text.strip():
        runs.append(("text", root.text.strip(), {}))
    for child in root:
        ls._collect_runs(child, {}, runs)
        if child.tail and child.tail.strip():
            runs.append(("text", child.tail.strip(), {}))

    print(f"voice={args.voice}  chars={len(text)}  runs={len(runs)}")

    old = await render_old(runs, args.voice)
    new = await ls._render_runs(runs, args.voice)

    tag = args.text_file.stem if args.text_file else args.sample
    old_len, _ = describe("BEFORE (naive concatenation)", old, args.out_dir / f"{tag}_before.wav")
    new_len, _ = describe("AFTER  (trimmed + joined + normalized)", new, args.out_dir / f"{tag}_after.wav")

    print(
        f"\ndead air removed: {(old_len - new_len) / 1000:.2f}s "
        f"({(old_len - new_len) / old_len * 100:.0f}% of the old render)"
    )


if __name__ == "__main__":
    asyncio.run(main())
