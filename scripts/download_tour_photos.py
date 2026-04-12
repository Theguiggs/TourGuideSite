#!/usr/bin/env python3
"""
🗺️ TourGuide Photo Downloader
Downloads free photos from Wikimedia Commons for all 15 tours.
Organized by tour folder and POI name.

Usage:
    pip install requests
    python download_tour_photos.py

Photos saved to: ./tour_photos/tourNN_City_Name/poi_NN_name.jpg
"""

import os
import sys
import time
import json
import re
import requests
from pathlib import Path
from urllib.parse import quote, unquote
from urllib.request import Request, urlopen

# ============================================================
# CONFIGURATION
# ============================================================
OUTPUT_DIR = Path("./tour_photos")
IMAGE_WIDTH = 1200  # Target width in pixels
MAX_RETRIES = 5
DELAY_BETWEEN_REQUESTS = 3.0  # Be polite to Wikimedia

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# ============================================================
# 15 TOURS — POIs with Wikimedia search queries
# ============================================================
TOURS = [
    {
        "id": 1, "city": "Nice", "name": "Tresors_Vieux_Nice",
        "title": "Trésors cachés du Vieux-Nice",
        "pois": [
            {"name": "Cathedrale_Sainte_Reparate", "query": "Cathédrale Sainte-Réparate Nice"},
            {"name": "Chapelle_Misericorde", "query": "Chapelle de la Miséricorde Nice"},
            {"name": "Palais_Lascaris", "query": "Palais Lascaris Nice"},
            {"name": "Place_Rossetti", "query": "Place Rossetti Nice fontaine"},
            {"name": "Cours_Saleya", "query": "Cours Saleya Nice marché fleurs"},
            {"name": "Colline_du_Chateau", "query": "Colline du Château Nice panorama"},
            {"name": "Opera_de_Nice", "query": "Opéra de Nice façade"},
            {"name": "Place_Saint_Francois", "query": "Place Saint-François Nice poissons"},
        ]
    },
    {
        "id": 2, "city": "Nice", "name": "Promenade_des_Anglais",
        "title": "Promenade des Anglais — Épopée Bleu Azur",
        "pois": [
            {"name": "Promenade_Chaises_Bleues", "query": "Promenade des Anglais Nice chaises bleues"},
            {"name": "Hotel_Negresco", "query": "Hôtel Negresco Nice"},
            {"name": "Palais_Mediterranee", "query": "Palais de la Méditerranée Nice"},
            {"name": "Musee_Massena", "query": "Villa Masséna Nice musée"},
            {"name": "Jardin_Albert_Premier", "query": "Jardin Albert Premier Nice"},
            {"name": "Monument_Centenaire", "query": "Monument du Centenaire Nice"},
        ]
    },
    {
        "id": 3, "city": "Nice", "name": "Cimiez_Rome_Matisse",
        "title": "Cimiez — De la Rome antique à Matisse",
        "pois": [
            {"name": "Arenes_Cimiez", "query": "Arènes de Cimiez Nice romaines"},
            {"name": "Musee_Matisse", "query": "Musée Matisse Nice Cimiez villa"},
            {"name": "Monastere_Cimiez", "query": "Monastère Cimiez Nice jardin"},
            {"name": "Thermes_Romains", "query": "Thermes romains Cimiez Nice"},
            {"name": "Musee_Archeologique", "query": "Musée archéologique Nice Cimiez"},
            {"name": "Jardin_Arenes", "query": "Jardin des Arènes Cimiez oliviers"},
            {"name": "Regina_Palace", "query": "Excelsior Regina Nice Cimiez palace"},
        ]
    },
    {
        "id": 4, "city": "Cannes", "name": "Suquet_Croisette",
        "title": "Du Suquet à la Croisette",
        "pois": [
            {"name": "Le_Suquet", "query": "Le Suquet Cannes vieille ville"},
            {"name": "Tour_Suquet_Castre", "query": "Tour du Suquet Cannes Musée Castre"},
            {"name": "Eglise_Notre_Dame_Esperance", "query": "Notre-Dame d'Espérance Cannes"},
            {"name": "Marche_Forville", "query": "Marché Forville Cannes"},
            {"name": "Palais_des_Festivals", "query": "Palais des Festivals Cannes"},
            {"name": "La_Croisette", "query": "Croisette Cannes boulevard"},
        ]
    },
    {
        "id": 5, "city": "Cannes", "name": "Iles_Lerins",
        "title": "Îles de Lérins — Masque de Fer",
        "pois": [
            {"name": "Ile_Sainte_Marguerite", "query": "Île Sainte-Marguerite Cannes"},
            {"name": "Fort_Royal", "query": "Fort Royal Sainte-Marguerite"},
            {"name": "Cellule_Masque_de_Fer", "query": "Masque de fer Fort Royal prison"},
            {"name": "Ile_Saint_Honorat", "query": "Île Saint-Honorat Lérins"},
            {"name": "Abbaye_Lerins", "query": "Abbaye de Lérins Saint-Honorat monastère"},
        ]
    },
    {
        "id": 6, "city": "Antibes", "name": "Remparts_Picasso",
        "title": "Remparts, Picasso et Bord de Mer",
        "pois": [
            {"name": "Musee_Picasso_Grimaldi", "query": "Musée Picasso Antibes Château Grimaldi"},
            {"name": "Remparts_Antibes", "query": "Remparts Antibes bord de mer"},
            {"name": "Port_Vauban", "query": "Port Vauban Antibes yachts"},
            {"name": "Marche_Provencal", "query": "Marché provençal Antibes"},
            {"name": "Cathedrale_Antibes", "query": "Cathédrale Immaculée Conception Antibes"},
            {"name": "Fort_Carre", "query": "Fort Carré Antibes"},
            {"name": "Cap_Antibes_Sentier", "query": "Cap d'Antibes sentier littoral"},
            {"name": "Place_Nationale", "query": "Place Nationale Antibes vieille ville"},
        ]
    },
    {
        "id": 7, "city": "Menton", "name": "Jardins_Eden",
        "title": "Jardins d'Éden entre France et Italie",
        "pois": [
            {"name": "Jardin_Serre_Madone", "query": "Serre de la Madone Menton jardin"},
            {"name": "Jardin_Val_Rahmeh", "query": "Val Rahmeh Menton botanique"},
            {"name": "Jardin_Fontana_Rosa", "query": "Fontana Rosa Menton jardin"},
            {"name": "Basilique_Saint_Michel", "query": "Basilique Saint-Michel Menton parvis"},
            {"name": "Vieille_Ville_Facades", "query": "Menton vieille ville façades colorées"},
            {"name": "Musee_Cocteau", "query": "Musée Jean Cocteau Menton"},
            {"name": "Jardin_Maria_Serena", "query": "Maria Serena Menton jardin"},
            {"name": "Promenade_Soleil", "query": "Promenade du Soleil Menton"},
        ]
    },
    {
        "id": 8, "city": "Saint_Paul", "name": "Village_Artistes",
        "title": "Village des Artistes",
        "pois": [
            {"name": "Fondation_Maeght", "query": "Fondation Maeght Saint-Paul-de-Vence"},
            {"name": "Remparts_Village", "query": "Remparts Saint-Paul-de-Vence"},
            {"name": "Porte_de_Vence", "query": "Porte de Vence Saint-Paul entrée"},
            {"name": "Grande_Fontaine", "query": "Grande Fontaine Saint-Paul-de-Vence"},
            {"name": "Eglise_Collegiale", "query": "Église collégiale Saint-Paul-de-Vence"},
            {"name": "Cimetiere_Chagall", "query": "Cimetière Saint-Paul-de-Vence tombe Chagall"},
            {"name": "Colombe_dOr", "query": "La Colombe d'Or Saint-Paul-de-Vence"},
        ]
    },
    {
        "id": 9, "city": "Eze", "name": "Nid_Aigle",
        "title": "Le Nid d'Aigle entre Ciel et Mer",
        "pois": [
            {"name": "Jardin_Exotique", "query": "Jardin exotique Èze village cactus"},
            {"name": "Eglise_Assomption", "query": "Église Notre-Dame Assomption Èze"},
            {"name": "Ruines_Chateau", "query": "Ruines château Èze sommet panorama"},
            {"name": "Sentier_Nietzsche", "query": "Sentier Nietzsche Èze"},
            {"name": "Fragonard_Eze", "query": "Fragonard Èze parfumerie"},
            {"name": "Porte_des_Maures", "query": "Èze village porte médiévale"},
            {"name": "Panorama_Mer", "query": "Èze village vue mer panorama Côte d'Azur"},
        ]
    },
    {
        "id": 10, "city": "Vence", "name": "Chapelle_Matisse",
        "title": "Chapelle Matisse et Cité Épiscopale",
        "pois": [
            {"name": "Chapelle_Rosaire_Matisse", "query": "Chapelle du Rosaire Matisse Vence"},
            {"name": "Cathedrale_Nativite", "query": "Cathédrale Nativité Vence"},
            {"name": "Place_du_Peyra", "query": "Place du Peyra Vence fontaine"},
            {"name": "Chateau_Villeneuve", "query": "Château Villeneuve Vence fondation"},
            {"name": "Fontaine_Peyra", "query": "Fontaine du Peyra Vence"},
            {"name": "Remparts_Vence", "query": "Remparts Vence porte"},
        ]
    },
    {
        "id": 11, "city": "Grasse", "name": "Routes_Parfum",
        "title": "Les Routes du Parfum",
        "pois": [
            {"name": "Fragonard_Usine", "query": "Parfumerie Fragonard Grasse usine historique"},
            {"name": "MIP_Musee_Parfumerie", "query": "Musée International Parfumerie Grasse"},
            {"name": "Molinard", "query": "Molinard Grasse parfumerie"},
            {"name": "Galimard", "query": "Galimard Grasse parfumerie"},
            {"name": "Cathedrale_Grasse", "query": "Cathédrale Notre-Dame du Puy Grasse"},
            {"name": "Place_aux_Aires", "query": "Place aux Aires Grasse fontaine marché"},
            {"name": "Jardins_MIP", "query": "Jardins MIP Mouans-Sartoux parfumerie"},
        ]
    },
    {
        "id": 12, "city": "Villefranche", "name": "Rade_Doree",
        "title": "La Rade Dorée",
        "pois": [
            {"name": "Chapelle_Cocteau", "query": "Chapelle Saint-Pierre Cocteau Villefranche"},
            {"name": "Citadelle", "query": "Citadelle Villefranche-sur-Mer"},
            {"name": "Rue_Obscure", "query": "Rue Obscure Villefranche-sur-Mer"},
            {"name": "Port_Darse", "query": "Port de la Darse Villefranche"},
            {"name": "Eglise_Saint_Michel", "query": "Église Saint-Michel Villefranche"},
            {"name": "Rade_Panorama", "query": "Rade Villefranche-sur-Mer panorama"},
        ]
    },
    {
        "id": 13, "city": "Nice", "name": "Street_Food",
        "title": "Street Food et Aventure Culinaire",
        "pois": [
            {"name": "Socca_Nice", "query": "Socca Nice spécialité niçoise"},
            {"name": "Marche_Cours_Saleya", "query": "Cours Saleya Nice marché provençal"},
            {"name": "Chez_Pipo", "query": "Chez Pipo Nice socca four"},
            {"name": "Lou_Pilha_Leva", "query": "Lou Pilha Leva Nice Vieux-Nice"},
            {"name": "Glacier_Fenocchio", "query": "Fenocchio glacier Nice glaces"},
            {"name": "Marche_Liberation", "query": "Marché de la Libération Nice"},
            {"name": "Chez_Theresa", "query": "Chez Thérésa Nice socca Cours Saleya"},
            {"name": "Pan_Bagnat", "query": "Pan bagnat Nice sandwich spécialité"},
        ]
    },
    {
        "id": 14, "city": "Nice", "name": "Scandales_Glamour",
        "title": "Scandales, Braquages et Glamour",
        "pois": [
            {"name": "Negresco_Histoire", "query": "Hôtel Negresco Nice dôme"},
            {"name": "Casino_Ruhl", "query": "Casino Ruhl Nice"},
            {"name": "Palais_Justice", "query": "Palais de Justice Nice"},
            {"name": "Promenade_Anglais_Nuit", "query": "Promenade des Anglais Nice nuit"},
            {"name": "Aeroport_Nice", "query": "Aéroport Nice Côte d'Azur"},
            {"name": "Musee_Beaux_Arts", "query": "Musée des Beaux-Arts Nice Chéret"},
            {"name": "Opera_Nice", "query": "Opéra Nice intérieur"},
        ]
    },
    {
        "id": 15, "city": "Nice", "name": "Legendes_Fantomes",
        "title": "Légendes, Fantômes et Passages Secrets",
        "pois": [
            {"name": "Colline_Chateau_Ruines", "query": "Colline du Château Nice ruines"},
            {"name": "Eglise_Gesu", "query": "Église du Gesù Nice baroque"},
            {"name": "Ruelles_Voutees", "query": "Vieux Nice ruelles voûtées passages"},
            {"name": "Tour_Bellanda", "query": "Tour Bellanda Nice"},
            {"name": "Cimetiere_Chateau", "query": "Cimetière du Château Nice"},
            {"name": "Place_Garibaldi", "query": "Place Garibaldi Nice"},
            {"name": "Cathedrale_Russe", "query": "Cathédrale orthodoxe russe Nice Saint-Nicolas"},
            {"name": "Crypte_Nice", "query": "Nice crypte archéologique souterrain"},
        ]
    },
]


def search_wikimedia(query: str) -> dict | None:
    """Search Wikimedia Commons for a free image."""
    api_url = "https://commons.wikimedia.org/w/api.php"
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": f"File: {query}",
        "gsrlimit": 5,
        "gsrnamespace": 6,
        "prop": "imageinfo",
        "iiprop": "url|size|mime",
        "iiurlwidth": IMAGE_WIDTH,
    }
    try:
        resp = requests.get(api_url, params=params, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        pages = data.get("query", {}).get("pages", {})
        if not pages:
            return None

        best = None
        best_score = -1
        for page in pages.values():
            info = page.get("imageinfo", [{}])[0]
            mime = info.get("mime", "")
            width = info.get("width", 0)
            thumb = info.get("thumburl", "")
            original = info.get("url", "")
            score = 0
            if "jpeg" in mime or "jpg" in mime:
                score += 10
            elif "png" in mime:
                score += 5
            if width >= 800:
                score += 5
            if width >= 1200:
                score += 3
            if thumb:
                score += 2
            if score > best_score:
                best_score = score
                best = {
                    "title": page.get("title", ""),
                    "url": thumb or original,
                    "mime": mime,
                }
        return best
    except Exception as e:
        print(f"    ⚠️  Search error: {e}")
        return None


def download_image(url: str, filepath: Path) -> bool:
    """Download image from URL to filepath using urllib (bypasses Wikimedia 403)."""
    for attempt in range(MAX_RETRIES):
        try:
            req = Request(url, headers=HEADERS)
            with urlopen(req, timeout=30) as resp:
                ct = resp.headers.get("Content-Type", "")
                if "image" not in ct and "octet" not in ct:
                    print(f"    ⚠️  Not an image ({ct})")
                    return False
                filepath.parent.mkdir(parents=True, exist_ok=True)
                with open(filepath, "wb") as f:
                    while True:
                        chunk = resp.read(8192)
                        if not chunk:
                            break
                        f.write(chunk)
            size_kb = filepath.stat().st_size / 1024
            if size_kb < 5:
                filepath.unlink(missing_ok=True)
                return False
            print(f"    ✅ {size_kb:.0f} KB")
            return True
        except Exception as e:
            is_rate_limit = "429" in str(e)
            if attempt < MAX_RETRIES - 1:
                wait = (10 * (attempt + 1)) if is_rate_limit else 2
                print(f"    ⚠️  Attempt {attempt+1} failed{' (rate limited)' if is_rate_limit else ''}, waiting {wait}s...")
                time.sleep(wait)
            else:
                print(f"    ❌ Failed: {e}")
    return False


def main():
    total_pois = sum(len(t["pois"]) for t in TOURS)
    print("=" * 60)
    print("🗺️  TourGuide Photo Downloader — Côte d'Azur")
    print("=" * 60)
    print(f"📁 Output: {OUTPUT_DIR.resolve()}")
    print(f"📷 {len(TOURS)} tours, {total_pois} POIs")
    print(f"🖼️  Target: {IMAGE_WIDTH}px width")
    print("=" * 60)

    ok, fail, skip = 0, 0, 0
    fails = []

    for tour in TOURS:
        tdir = OUTPUT_DIR / f"tour{tour['id']:02d}_{tour['city']}_{tour['name']}"
        tdir.mkdir(parents=True, exist_ok=True)
        print(f"\n{'─'*60}")
        print(f"📍 Tour {tour['id']:02d} — {tour['title']} ({len(tour['pois'])} POIs)")
        print(f"{'─'*60}")

        for i, poi in enumerate(tour["pois"], 1):
            fn = f"poi_{i:02d}_{poi['name']}.jpg"
            fp = tdir / fn

            if fp.exists() and fp.stat().st_size > 5000:
                print(f"  [{i}/{len(tour['pois'])}] {poi['name']} ⏭️ exists")
                skip += 1
                continue

            print(f"  [{i}/{len(tour['pois'])}] {poi['name']}")
            print(f"    🔍 \"{poi['query']}\"")

            result = search_wikimedia(poi["query"])
            if result and result.get("url"):
                print(f"    📷 {result['title'][:50]}")
                if download_image(result["url"], fp):
                    ok += 1
                    time.sleep(DELAY_BETWEEN_REQUESTS)
                    continue

            # Shorter query fallback
            short_q = " ".join(poi["query"].split()[:3])
            print(f"    🔄 Retry: \"{short_q}\"")
            result = search_wikimedia(short_q)
            if result and result.get("url"):
                if download_image(result["url"], fp):
                    ok += 1
                    time.sleep(DELAY_BETWEEN_REQUESTS)
                    continue

            fail += 1
            fails.append(f"Tour {tour['id']:02d} — {poi['name']} ({poi['query']})")
            time.sleep(DELAY_BETWEEN_REQUESTS)

    print(f"\n\n{'='*60}")
    print(f"📊 RÉSUMÉ")
    print(f"{'='*60}")
    print(f"  ✅ Téléchargées : {ok}")
    print(f"  ⏭️  Existantes   : {skip}")
    print(f"  ❌ Manquantes   : {fail}")

    if fails:
        print(f"\n  📋 À chercher manuellement sur unsplash.com / pexels.com :")
        for f in fails:
            print(f"    • {f}")

    # Generate a manifest
    manifest = OUTPUT_DIR / "manifest.json"
    data = {}
    for tour in TOURS:
        tdir = OUTPUT_DIR / f"tour{tour['id']:02d}_{tour['city']}_{tour['name']}"
        files = sorted(tdir.glob("*.jpg"))
        data[f"tour{tour['id']:02d}"] = {
            "title": tour["title"],
            "city": tour["city"],
            "photos": [str(f.relative_to(OUTPUT_DIR)) for f in files],
            "count": len(files),
            "expected": len(tour["pois"]),
        }
    with open(manifest, "w") as mf:
        json.dump(data, mf, indent=2, ensure_ascii=False)
    print(f"\n  📄 Manifest: {manifest}")
    print(f"\n✨ Done!")


if __name__ == "__main__":
    main()
