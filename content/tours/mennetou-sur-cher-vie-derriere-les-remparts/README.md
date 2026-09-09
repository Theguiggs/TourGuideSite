# Mennetou-sur-Cher — La vie derrière les remparts

Visite française créée à la demande de l’utilisateur et importée dans le Studio de Guillaume STEFFEN en brouillon. Identifiant : `mennetou-sur-cher-vie-derriere-les-remparts`.

- Huit scènes originales, 2 065 mots, environ 14 minutes de narration à 150 mots/minute.
- Prévoir environ une heure au total avec les pauses et les exercices d’observation ; durée indicative.
- Boucle cartographique calculée : 611 mètres. Départ et retour porte d’En-Bas.
- Coordonnées placées près des lieux dans l’espace public, d’après la cartographie ; aucun relevé terrain effectué.
- Les deux arrêts porte d’En-Haut / maison à pans de bois sont voisins : passage manuel conseillé.
- Le passage de la grange comprend des marches. Son ouverture et l’accessibilité doivent être vérifiées avant diffusion publique. Le texte propose un détour par la porte d’En-Haut.
- Visite conçue pour l’extérieur. L’ouverture de l’église n’est pas nécessaire.
- Audio et photos non générés. Le statut brouillon est effectif dans GuideTour et StudioSession.

## Contenu et import

`script-narration.md` contient la narration et les points d’observation. `tour.json` contient le contenu structuré, le tracé et les notes de préparation. `osm-source.xml` conserve l’extrait cartographique utilisé. `import-receipt.json` est produit uniquement après relecture de tous les enregistrements en base.

```powershell
python content/tours/mennetou-sur-cher-vie-derriere-les-remparts/prepare-content.py
node scripts/seed-mennetou-tour.mjs
node scripts/seed-mennetou-tour.mjs --confirm
node scripts/seed-mennetou-tour.mjs --verify
```

L’import écrit dix enregistrements dans une transaction DynamoDB : un GuideTour, une StudioSession, huit StudioScene. Chaque écriture impose l’absence de l’identifiant pour éviter tout remplacement. Le propriétaire est lu sur le profil existant ; aucune identité, note client ou statistique n’est créée. La relecture compare les champs attendus de chaque enregistrement.

## Sources consultées le 7 septembre 2026

- [ADT Val de Loire — fiche patrimoniale](https://www.val-de-loire-41.com/visite/cite-medievale-de-mennetou-sur-cher-pcu41aasor100180/) : enceinte, portes, tours, maisons et chronologie de Saint-Urbain.
- [ADT Val de Loire — présentation du village](https://www.val-de-loire-41.com/loir-et-cher/mennetou-sur-cher/) : maison près de la porte d’En-Haut, porte Bonne-Nouvelle et prieuré.
- [Journées du patrimoine — cité médiévale](https://journeesdupatrimoine.culture.gouv.fr/w/391796/evenement/20188371/visite-libre-de-la-cite-medievale) : grange aux dîmes et ensembles patrimoniaux.
- [Sologne Tourisme — visite de la cité](https://www.sologne-tourisme.fr/visite-jeune-public-de-la-cite-medievale/) : anciennes maisons commerçantes.
- [Randoland / office de tourisme — carnet de route](https://www.randoland.fr/telecharger_apercu.php?id_to_dwn=4113501) : continuité des rues, passage public près de la grange et accès aux abords de l’enceinte. Document de 2017, employé pour le repérage uniquement ; énigmes non reprises.
- [OpenStreetMap — extrait du centre](https://www.openstreetmap.org/api/0.6/map?bbox=1.8643,47.2683,1.8685,47.2712) : coordonnées des monuments et réseau piéton. Données © les contributeurs OpenStreetMap, [ODbL](https://www.openstreetmap.org/copyright). Le chemin est calculé sur ce réseau, sans prétendre à une validation terrain.
- [Grange dîmière — définition](https://fr.wikipedia.org/wiki/Grange_d%C3%AEmi%C3%A8re) : fonction de stockage du prélèvement agricole.

Les scènes associent ces faits locaux à des explications générales de construction et à des exercices d’observation originaux. Les scènes imaginées sont présentées explicitement comme des exercices. Aucun séjour royal ni origine légendaire du nom Bonne-Nouvelle n’est affirmé. Le grand PDF touristique n’a pas pu être chargé et n’est pas présenté comme une source lue.
