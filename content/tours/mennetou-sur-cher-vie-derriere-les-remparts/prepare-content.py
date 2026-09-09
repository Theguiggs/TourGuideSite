"""Build the reviewable payload and a pedestrian route from the saved OSM extract."""
import heapq
import json
import math
import re
import xml.etree.ElementTree as ET
from pathlib import Path

root = Path(__file__).parent
raw = (root / 'script-narration.md').read_text(encoding='utf8')
descriptions = [
    'La porte sud de la cité fortifiée, observée depuis la place d’Armes.',
    'Une entrée fortifiée au débouché de la Grande Rue, à comparer à la porte d’En-Bas.',
    'La maison à pans de bois au pied de la porte d’En-Haut : ossature, remplissages et relief de façade.',
    'Les façades de la Grande Rue autour de la maison dite François Ier.',
    'La grange aux dîmes et le rôle des récoltes dans la vie du bourg.',
    'Une vue extérieure sur une tour et les vestiges de l’enceinte, côté rue des Fossés.',
    'La porte orientale et les vestiges voisins du prieuré, visibles de l’extérieur.',
    'Le parvis de Saint-Urbain, pour découvrir un édifice construit à plusieurs époques.',
]
scenes = []
for block in re.split(r'\n---\n', raw):
    m = re.search(r'## Scène (\d+) — (.*?) : .*\n\*\*GPS :\*\* ([\d.]+), ([\d.]+)\n\n([\s\S]+)', block)
    if m:
        n, title, lat, lng, body = m.groups()
        scenes.append(dict(sceneIndex=int(n)-1, title=title, latitude=float(lat), longitude=float(lng), transcriptText=body.strip(), poiDescription=descriptions[int(n)-1]))
assert len(scenes) == 8 and [s['sceneIndex'] for s in scenes] == list(range(8))
assert all(len(s['transcriptText'].split()) >= 180 for s in scenes)

def distance(a, b):
    lat1, lat2 = math.radians(a[0]), math.radians(b[0])
    h = math.sin((lat2-lat1)/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(math.radians(b[1]-a[1])/2)**2
    return 6371000 * 2 * math.asin(math.sqrt(h))

xml = ET.parse(root / 'osm-source.xml').getroot()
nodes = {n.attrib['id']: (float(n.attrib['lat']), float(n.attrib['lon'])) for n in xml.findall('node')}
graph = {}
for way in xml.findall('way'):
    tags = {t.attrib['k']: t.attrib['v'] for t in way.findall('tag')}
    if tags.get('highway') not in {'residential','living_street','pedestrian','footway','path','steps','service','unclassified','tertiary'}:
        continue
    if tags.get('foot') in {'no','private'} or tags.get('access') in {'no','private'}:
        continue
    refs = [n.attrib['ref'] for n in way.findall('nd')]
    for a,b in zip(refs,refs[1:]):
        d = distance(nodes[a],nodes[b])
        graph.setdefault(a,[]).append((b,d)); graph.setdefault(b,[]).append((a,d))

def nearest(p):
    return min(graph, key=lambda n: distance(nodes[n],p))

def route(a,b):
    queue = [(0,a,[])]; seen = set()
    while queue:
        cost,n,path = heapq.heappop(queue)
        if n in seen: continue
        seen.add(n); path = path+[n]
        if n == b: return cost,path
        for k,d in graph[n]:
            if k not in seen: heapq.heappush(queue,(cost+d,k,path))
    raise RuntimeError('Pedestrian route disconnected')

anchors = []
for i,s in enumerate(scenes):
    anchors.append((s['latitude'],s['longitude']))
    if i == 0:
        anchors.extend([(47.26947,1.86553),(47.26980,1.86553)])
anchors.append(anchors[0])
path = []; metres = 0
for a,b in zip(anchors,anchors[1:]):
    d,part = route(nearest(a),nearest(b)); metres += d
    path.extend(part if not path else part[1:])
assert 400 < metres < 1400
points = [dict(lat=nodes[n][0],lng=nodes[n][1]) for n in path]
content = dict(
    id='mennetou-sur-cher-vie-derriere-les-remparts',
    title='Mennetou-sur-Cher — La vie derrière les remparts',
    city='Mennetou-sur-Cher',
    description='Franchissez les portes de Mennetou-sur-Cher et découvrez la vie derrière ses remparts. Huit étapes relient maisons à pans de bois, Grande Rue, grange aux dîmes, tours défensives, prieuré et église Saint-Urbain. Une promenade à pied ponctuée de récits et de petits défis d’observation, à suivre en extérieur. Prévoyez environ une heure avec les pauses.',
    durationMinutes=60, themes=['histoire','patrimoine','architecture'],
    route=dict(manualMode=True,waypoints=points,pathOverride=True,computedPath=points,distanceMeters=round(metres),durationSeconds=3600),
    scenes=scenes,
    editorialNotes=['Durée de visite estimée, incluant marche et observation ; distincte de la durée de narration.', 'Coordonnées de points d’observation issues de la cartographie, sans reconnaissance sur place.', 'Le passage derrière la grange comprend des marches ; accès actuel à vérifier sur place. Détour par la porte d’En-Haut décrit dans le texte.', 'Étapes 2 et 3 très proches : progression manuelle recommandée.', 'Audio et photos non produits ; conserver en brouillon avant préparation de la publication.'],
)
(root/'tour.json').write_text(json.dumps(content,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps(dict(scenes=len(scenes),words=sum(len(s['transcriptText'].split()) for s in scenes),distanceMeters=round(metres),pathPoints=len(points)),ensure_ascii=False))
