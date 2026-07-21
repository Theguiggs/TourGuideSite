"""
Seed script: creates the "Grasse — Ombres & Légendes" tour (thème légendes &
mystères) for steffen.guillaume@gmail.com from the markdown sources in
content/tours/grasse-ombres-et-legendes/scenes/.

Sister tour to "Grasse — Les Routes du Parfum" (same city, inverse lens).
Writes directly to DynamoDB (bypasses AppSync) so it works without a logged-in JWT.

Usage:
    python scripts/seed-grasse-ombres-tour.py            # dry-run preview
    python scripts/seed-grasse-ombres-tour.py --apply    # actually write to DynamoDB
"""
import boto3
import re
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Windows consoles default to cp1252 and choke on the previews (é, ᵉ, …) — force UTF-8.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

REGION = "us-east-1"
API_SUFFIX = "t5nxxao3orh6za2bjj6uegulru-NONE"
GUIDE_SUB = "84a88428-e0e1-70d8-6a57-ec9f1421822e"  # steffen.guillaume@gmail.com Cognito sub
# IMPORTANT: GuideTour.guideId / StudioSession.guideId reference GuideProfile.id, NOT the Cognito sub.
GUIDE_PROFILE_ID = "159473d2-8509-4d01-aa14-180d87772225"
OWNER = f"{GUIDE_SUB}::{GUIDE_SUB}"

TOUR_TITLE = "Grasse — Ombres & Légendes"
TOUR_CITY = "Grasse"
TOUR_THEMES = ["legendes", "histoire"]
TOUR_DESCRIPTION = (
    "La face nocturne de la capitale du parfum. En six stations, de la Place aux Aires "
    "à la nuit tombée jusqu'au belvédère, on descend dans l'ombre de Grasse : la puanteur "
    "des tanneurs d'où naquit le parfum, la peste de 1348, les Pénitents Noirs qui "
    "escortaient les morts, le Drac et la masco de la superstition provençale, et le "
    "parfumeur-assassin de Süskind dont l'histoire se noue ici. Ton intime, voix basse, "
    "tutoiement. Légende clairement marquée comme légende."
)

CONTENT_DIR = Path(__file__).parent.parent / "content" / "tours" / "grasse-ombres-et-legendes" / "scenes"

# Approximate GPS for each scene (file name → lat,lng). TODO: affiner sur place.
GPS = {
    "01-place-aux-aires-nuit.md":     (43.6582, 6.9229),
    "02-ruelle-tanneurs-peste.md":    (43.6585, 6.9233),
    "03-penitents-noirs.md":          (43.6594, 6.9239),
    "04-masco-et-drac.md":            (43.6588, 6.9225),
    "05-le-parfum-assassin.md":       (43.6589, 6.9211),
    "06-belvedere-nocturne.md":       (43.6597, 6.9215),
}

TOUR_DISTANCE_KM = 1.8

NOW_ISO = datetime.now(timezone.utc).isoformat()


def parse_scene(path: Path):
    """Extract title, position hint, and narration body from a scene markdown file."""
    raw = path.read_text(encoding="utf-8")
    # Title after '# Scène N — '
    m = re.search(r"^# Scène \d+ — (.+)$", raw, re.MULTILINE)
    title = m.group(1).strip() if m else path.stem

    # Position hint
    m = re.search(r"^\*\*Position :\*\* (.+)$", raw, re.MULTILINE)
    position = m.group(1).strip().rstrip(".") if m else ""

    # Body: everything after the first '---' line
    parts = raw.split("\n---\n", 1)
    body = parts[1].strip() if len(parts) == 2 else raw.strip()
    return title, position, body


# ─── Build content list from files ──────────────────────────────────────────

scenes_content = []
for scene_file in sorted(CONTENT_DIR.glob("*.md")):
    title, position, body = parse_scene(scene_file)
    lat, lng = GPS.get(scene_file.name, (None, None))
    if lat is None:
        print(f"WARNING: no GPS for {scene_file.name}, skipping", file=sys.stderr)
        continue
    scenes_content.append({
        "file": scene_file.name,
        "title": title,
        "position": position,
        "body": body,
        "lat": lat,
        "lng": lng,
        "wordCount": len(body.split()),
    })

# ─── Preview ────────────────────────────────────────────────────────────────

print("=" * 70)
print(TOUR_TITLE)
print("=" * 70)
print(f"Owner       : {OWNER}")
print(f"Thèmes      : {', '.join(TOUR_THEMES)}")
print(f"POIs        : {len(scenes_content)}")
print(f"Total words : {sum(s['wordCount'] for s in scenes_content)}")
print()
for i, sc in enumerate(scenes_content):
    print(f"{i+1}. {sc['title']}")
    print(f"   GPS    : {sc['lat']}, {sc['lng']}")
    print(f"   Hint   : {sc['position']}")
    print(f"   Words  : {sc['wordCount']}")
    print(f"   Preview: {sc['body'][:120]}...")
    print()

if "--apply" not in sys.argv:
    print("=" * 70)
    print("DRY RUN — nothing written. Re-run with --apply to insert into DynamoDB.")
    sys.exit(0)

# ─── Apply ──────────────────────────────────────────────────────────────────

ddb = boto3.client("dynamodb", region_name=REGION)
TOUR_ID = str(uuid.uuid4())
SESSION_ID = str(uuid.uuid4())

def s(value): return {"S": str(value)}
def n(value): return {"N": str(value)}
def b(value): return {"BOOL": bool(value)}

# Total duration in minutes from word count (~150 wpm narrated)
total_words = sum(s_["wordCount"] for s_ in scenes_content)
total_minutes = max(1, round(total_words / 150))

guide_tour = {
    "id": s(TOUR_ID),
    "guideId": s(GUIDE_PROFILE_ID),
    "title": s(TOUR_TITLE),
    "city": s(TOUR_CITY),
    "status": s("draft"),
    "description": s(TOUR_DESCRIPTION),
    "version": n(1),
    "duration": n(total_minutes),
    "distance": {"N": str(TOUR_DISTANCE_KM)},
    "poiCount": n(len(scenes_content)),
    "sessionId": s(SESSION_ID),
    "owner": s(OWNER),
    "createdAt": s(NOW_ISO),
    "updatedAt": s(NOW_ISO),
    "__typename": s("GuideTour"),
}

studio_session = {
    "id": s(SESSION_ID),
    "guideId": s(GUIDE_PROFILE_ID),
    "sourceSessionId": s(""),
    "tourId": s(TOUR_ID),
    "title": s(TOUR_TITLE),
    "status": s("draft"),
    "language": s("fr"),
    "version": n(1),
    "consentRGPD": b(True),
    "availableLanguages": {"L": [s("fr")]},
    "description": s(TOUR_DESCRIPTION),
    "themes": {"L": [s(t) for t in TOUR_THEMES]},
    "durationMinutes": n(total_minutes),
    "owner": s(OWNER),
    "createdAt": s(NOW_ISO),
    "updatedAt": s(NOW_ISO),
    "__typename": s("StudioSession"),
}

scene_items = []
for idx, sc in enumerate(scenes_content):
    scene_items.append({
        "id": s(str(uuid.uuid4())),
        "sessionId": s(SESSION_ID),
        "sceneIndex": n(idx),
        "title": s(sc["title"]),
        "transcriptText": s(sc["body"]),
        "poiDescription": s(sc["position"]),
        "latitude": {"N": str(sc["lat"])},
        "longitude": {"N": str(sc["lng"])},
        "status": s("transcribed"),
        "photosRefs": {"L": []},
        "archived": b(False),
        "owner": s(OWNER),
        "createdAt": s(NOW_ISO),
        "updatedAt": s(NOW_ISO),
        "__typename": s("StudioScene"),
    })

def put(table_suffix, item, label):
    table = f"{table_suffix}-{API_SUFFIX}"
    ddb.put_item(TableName=table, Item=item)
    print(f"  OK  {label}")

print("=" * 70)
print(f"Writing tourId={TOUR_ID}")
print(f"        sessionId={SESSION_ID}")
print(f"        total {total_minutes} min, {total_words} mots")
print("=" * 70)
put("GuideTour", guide_tour, "GuideTour")
put("StudioSession", studio_session, "StudioSession")
for sc_item in scene_items:
    put("StudioScene", sc_item, f"Scene {int(sc_item['sceneIndex']['N']) + 1}: {sc_item['title']['S']}")

print()
print("Done.")
print(f"  Open editor: http://localhost:3000/guide/studio/{SESSION_ID}/itinerary")
print(f"  Open scenes: http://localhost:3000/guide/studio/{SESSION_ID}/scenes")
