"""
Seed script: creates the "Grasse — Les Routes du Parfum" tour for
steffen.guillaume@gmail.com from the markdown sources in
content/tours/grasse-routes-du-parfum/.

Writes directly to DynamoDB (bypasses AppSync) so it works without a logged-in JWT.

Usage:
    python scripts/seed-grasse-tour.py            # dry-run preview
    python scripts/seed-grasse-tour.py --apply    # actually write to DynamoDB
"""
import boto3
import re
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

REGION = "us-east-1"
API_SUFFIX = "t5nxxao3orh6za2bjj6uegulru-NONE"
GUIDE_SUB = "84a88428-e0e1-70d8-6a57-ec9f1421822e"  # steffen.guillaume@gmail.com Cognito sub
# IMPORTANT: GuideTour.guideId / StudioSession.guideId reference GuideProfile.id, NOT the Cognito sub.
# Owner-based auth uses the sub, but the guideId foreign key is the profile id.
GUIDE_PROFILE_ID = "159473d2-8509-4d01-aa14-180d87772225"
OWNER = f"{GUIDE_SUB}::{GUIDE_SUB}"

CONTENT_DIR = Path(__file__).parent.parent / "content" / "tours" / "grasse-routes-du-parfum" / "scenes"

# Approximate GPS for each scene (file name → lat,lng). Adjust as needed.
GPS = {
    "01-place-aux-aires.md":          (43.6582, 6.9229),
    "02-fragonard.md":                (43.6587, 6.9213),
    "03-mip.md":                      (43.6593, 6.9211),
    "04-villa-musee-fragonard.md":    (43.6577, 6.9243),
    "05-cathedrale.md":               (43.6594, 6.9239),
    "06-place-24-aout.md":            (43.6589, 6.9223),
    "07-molinard.md":                 (43.6573, 6.9261),
}

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
print("Grasse — Les Routes du Parfum")
print("=" * 70)
print(f"Owner       : {OWNER}")
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
    "title": s("Grasse — Les Routes du Parfum"),
    "city": s("Grasse"),
    "status": s("draft"),
    "description": s(
        "Trois siècles de mutation, du tanneur au gantier-parfumeur, du gantier à l'industriel "
        "du parfum. Une promenade confidence en sept stations, du marché aux fleurs de la Place "
        "aux Aires jusqu'au belvédère de Molinard, en passant par le MIP et trois Rubens "
        "insoupçonnés à la cathédrale. Ton intime, voix basse, tutoiement."
    ),
    "version": n(1),
    "duration": n(total_minutes),
    "distance": {"N": "2.2"},
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
    "title": s("Grasse — Les Routes du Parfum"),
    "status": s("draft"),
    "language": s("fr"),
    "version": n(1),
    "consentRGPD": b(True),
    "availableLanguages": {"L": [s("fr")]},
    "description": s(
        "Trois siècles de mutation, du tanneur au gantier-parfumeur, du gantier à l'industriel du parfum."
    ),
    "themes": {"L": [s("histoire"), s("art"), s("gastronomie")]},
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
