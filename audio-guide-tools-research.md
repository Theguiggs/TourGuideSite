# Outils audio guide — Recherche & décision

> Date : 25 mai 2026  
> Contexte : App Côte d'Azur tourist guide (~105 POIs, FR + EN)

---

## 1. Outils d'enregistrement & édition

| Outil | Prix | Usage |
|---|---|---|
| Audacity | Gratuit | Enregistrement + édition, multiplateforme |
| Adobe Audition | ~55 €/mois | Pro, débruitage avancé, batch |
| GarageBand | Gratuit (Mac) | Facile, export direct |
| Reaper | ~60 € licence | Léger, puissant, bon rapport Q/P |
| Descript | 12–24 $/mois | Édition par transcript texte |

---

## 2. Outils IA — génération de voix

| Outil | Prix | Points forts |
|---|---|---|
| ElevenLabs | Freemium → 5 $/mois | Meilleure qualité voix naturelle, multilingue |
| Murf.ai | Dès 19 $/mois | Interface simple, voix FR studio |
| Play.ht | Freemium | Variété de voix françaises |
| Azure Neural TTS | Pay-as-you-go ~4 $/M chars | API, voix FR Henri & Denise, SSML complet |
| Google TTS | Pay-as-you-go | Wavenet/Studio FR, intégration Flutter |

---

## 3. Estimation coût ElevenLabs — 105 POIs

### Hypothèses

| Paramètre | Valeur |
|---|---|
| Durée moyenne / POI | ~2 min |
| Débit vocal | ~130 mots/min |
| Caractères / POI | ~1 430 |
| Total 105 POIs (FR) | ~150 000 chars |
| + corrections 20 % | ~180 000 chars |
| FR + EN (×2) | ~360 000 chars |

### Plans ElevenLabs 2026

| Plan | Prix | Caractères/mois |
|---|---|---|
| Free | 0 $ | 10 000 |
| Starter | 5 $/mois | 30 000 |
| Creator | 22 $/mois | 100 000 |
| Pro | 99 $/mois | 500 000 |
| Scale | 330 $/mois | 2 000 000 |

### Estimation pour le projet

| Scénario | Plan | Coût total |
|---|---|---|
| FR uniquement | Creator × 2 mois | ~44 $ |
| FR + EN | Creator × 4 mois | ~88 $ |
| FR + EN en 1 mois | Pro | 99 $ |
| Mises à jour ponctuelles | Creator en continu | 22 $/mois |

> ⚠️ Voice cloning professionnel (sur sa propre voix) : plan Pro minimum (30+ min audio requis)

---

## 4. Comparatif ElevenLabs vs Azure Neural TTS

### Qualité vocale

| Critère | ElevenLabs | Azure Neural TTS |
|---|---|---|
| Naturalité | ⭐⭐⭐⭐⭐ — Meilleur | ⭐⭐⭐⭐ — Très bon |
| Voix FR disponibles | ~10 voix + clonage | 35+ voix (FR-FR, FR-BE, FR-CA, FR-CH) |
| Contrôle SSML | Limité | Complet (pauses, emphase, pitch, phonème) |

### Coût

| Critère | ElevenLabs | Azure Neural TTS |
|---|---|---|
| Production initiale 105 POIs | ~44–88 $ | **~1–2 $** |
| Mise à jour 1 POI | Abonnement actif requis | **~0,01 $** |
| Modèle de facturation | Abonnement mensuel | **Pay-as-you-go** |

### Intégration technique

| Critère | ElevenLabs | Azure Neural TTS |
|---|---|---|
| SDK Flutter | REST API uniquement | SDK Flutter natif + REST |
| Génération batch | Oui (REST) | Oui (REST + SDK Python) |
| Offline / on-device | Non | Oui (conteneur Docker) |

---

## 5. Décision

### ✅ Recommandation : Azure Neural TTS

**Raisons :**
- Coût de production ~50× moins cher (~1 $ vs ~44–88 $)
- Pay-as-you-go : pas d'abonnement à gérer, mises à jour au centime
- SSML complet → prononciation correcte des noms propres (`Villefranche-sur-Mer`, `Maeght`, `Antibes`...)
- SDK Python `azure-cognitiveservices-speech` → pipeline batch → upload S3 direct
- Integration Flutter documentée officiellement

**Voix recommandées :**
- `fr-FR-HenriNeural` — voix masculine, guide touristique
- `fr-FR-DeniseNeural` — voix féminine, alternative

### 🔄 Quand basculer sur ElevenLabs ?

- Si voice cloning sur voix personnelle (identité de marque forte)
- Si la qualité "indiscernable d'un humain" devient un argument commercial clé

---

## 6. Prochaines étapes

- [ ] Écrire le script Python batch Azure TTS → upload S3
- [ ] Tester les voix Henri & Denise sur 2–3 POIs de référence (Nice, Cannes, Eze)
- [ ] Définir les balises SSML pour les noms propres locaux
- [ ] Intégrer le player audio dans Flutter (S3 URLs)
