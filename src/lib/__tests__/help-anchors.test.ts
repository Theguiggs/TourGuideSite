/**
 * Chaque ancre visée depuis un accueil doit exister dans la page d'aide de
 * la même langue — sinon le clic mène en haut de page, sans rien dire.
 */
import { HELP_ANCHORS, helpAnchorHref } from '../help-anchors';
import { STEPS as STEPS_FR } from '@/app/aide/_content';
import { STEPS as STEPS_EN } from '@/app/en/help/_content';

describe('HELP_ANCHORS', () => {
  it('vise des étapes qui existent en français', () => {
    const ids = STEPS_FR.map((s) => s.id);
    for (const anchor of Object.values(HELP_ANCHORS.fr)) expect(ids).toContain(anchor);
  });

  it('vise des étapes qui existent en anglais', () => {
    const ids = STEPS_EN.map((s) => s.id);
    for (const anchor of Object.values(HELP_ANCHORS.en)) expect(ids).toContain(anchor);
  });

  it('construit le lien de la bonne page', () => {
    expect(helpAnchorHref('fr', 'creer')).toBe('/aide#creer');
    expect(helpAnchorHref('en', 'raconter')).toBe('/en/help#tell');
  });
});
