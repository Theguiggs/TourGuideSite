/**
 * La projection partagée par le rendu serveur et la redemande côté navigateur.
 *
 * Elle a été extraite pour que les deux affichent la MÊME liste ; sans épreuve,
 * elle peut dériver (numérotation, longueur d'accroche, replis) et la dérive ne
 * se verrait qu'après l'hydratation, sous les yeux du lecteur.
 */

import { FREE_PREVIEW_SCENES, isFullContent, mapScenesToPois } from '../scene-pois';
import type { PublicTourScene } from '@/lib/api/published-tour-content';

function scene(overrides: Partial<PublicTourScene> = {}): PublicTourScene {
  return {
    id: 's',
    order: 0,
    title: 'Une étape',
    description: 'Un texte',
    photos: [],
    ...overrides,
  };
}

describe('mapScenesToPois', () => {
  it("numérote d'après le rang d'affichage, pas d'après scene.order", () => {
    // `order` porte le `sceneIndex` du Studio : compté à partir de zéro, et
    // troué dès qu'une scène est archivée. Le visiteur, lui, lit 1, 2, 3.
    const pois = mapScenesToPois([
      scene({ id: 'a', order: 0 }),
      scene({ id: 'b', order: 4 }),
      scene({ id: 'c', order: 9 }),
    ]);

    expect(pois.map((poi) => poi.order)).toEqual([1, 2, 3]);
    expect(pois.map((poi) => poi.id)).toEqual(['a', 'b', 'c']);
  });

  it("tronque l'accroche à 200 caractères", () => {
    const [poi] = mapScenesToPois([scene({ description: 'x'.repeat(500) })]);
    expect(poi.description).toHaveLength(200);
  });

  it('nomme une étape sans titre par son rang', () => {
    const pois = mapScenesToPois([scene({ title: '' }), scene({ title: '' })]);
    expect(pois.map((poi) => poi.title)).toEqual(['Point 1', 'Point 2']);
  });

  it('supporte une description absente sans lever', () => {
    // Le Lambda vide la description des étapes tronquées ; rien ne garantit
    // qu'il envoie toujours une chaîne plutôt que rien du tout, et cette
    // projection tourne maintenant AUSSI dans le navigateur, dans un effet dont
    // l'échec laisserait le visiteur sur un aperçu périmé.
    const [poi] = mapScenesToPois([
      scene({ description: undefined as unknown as string }),
    ]);
    expect(poi.description).toBe('');
  });

  it('conserve les coordonnées, et retombe à zéro quand elles manquent', () => {
    const pois = mapScenesToPois([
      scene({ id: 'a', latitude: 43.7, longitude: 7.2 }),
      scene({ id: 'b' }),
    ]);
    expect(pois[0]).toMatchObject({ latitude: 43.7, longitude: 7.2 });
    expect(pois[1]).toMatchObject({ latitude: 0, longitude: 0 });
  });
});

describe('isFullContent — ce que le serveur a accordé', () => {
  const preview = [
    scene({ id: 's1' }),
    scene({ id: 's2' }),
    scene({ id: 's3', description: '', photos: [] }),
    scene({ id: 's4', description: '', photos: [] }),
  ];

  it("reconnaît l'aperçu tronqué : au-delà, plus rien", () => {
    expect(isFullContent(preview)).toBe(false);
  });

  it('reconnaît une description rendue au-delà de l’aperçu', () => {
    expect(
      isFullContent([...preview.slice(0, 3), scene({ id: 's4', description: 'Le secret' })]),
    ).toBe(true);
  });

  it('reconnaît un audio rendu au-delà de l’aperçu', () => {
    expect(
      isFullContent([
        ...preview.slice(0, 3),
        scene({ id: 's4', description: '', audioKey: 'guide-studio/s4.mp3' }),
      ]),
    ).toBe(true);
  });

  it('reconnaît une photo rendue au-delà de l’aperçu', () => {
    expect(
      isFullContent([
        ...preview.slice(0, 3),
        scene({ id: 's4', description: '', photos: ['guide-studio/s4.jpg'] }),
      ]),
    ).toBe(true);
  });

  it("ne se prononce pas sur les scènes de l'aperçu lui-même", () => {
    // Les deux premières sont intégrales pour TOUT LE MONDE : les lire comme un
    // droit accordé déverrouillerait la visite pour un anonyme.
    expect(isFullContent(preview.slice(0, FREE_PREVIEW_SCENES))).toBe(false);
  });
});
