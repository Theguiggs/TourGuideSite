import { getNotificationContent } from '../notification-templates';
import type { NotificationAction } from '../notification-templates';

describe('notification-templates', () => {
  const TOUR_TITLE = 'Les Parfums de Grasse';
  const GENERIC_SUBJECT = 'Mise à jour de votre visite';

  it('should return correct content for validate action', () => {
    const content = getNotificationContent('validate', TOUR_TITLE);
    expect(content.subject).toBe(GENERIC_SUBJECT);
    expect(content.body).toContain('en ligne');
    expect(content.body).toContain(TOUR_TITLE);
    expect(content.pushTitle).toContain('en ligne');
    expect(content.pushBody).toContain(TOUR_TITLE);
  });

  it('should return correct content for revision action', () => {
    const content = getNotificationContent('revision', TOUR_TITLE, 'Audio trop faible');
    expect(content.subject).toBe(GENERIC_SUBJECT);
    expect(content.body).toContain('corrections');
    expect(content.body).toContain(TOUR_TITLE);
    expect(content.body).toContain('Audio trop faible');
    expect(content.pushTitle).toContain('Corrections');
  });

  it('should return correct content for reject action', () => {
    const content = getNotificationContent('reject', TOUR_TITLE, 'Contenu inapproprie');
    expect(content.subject).toBe(GENERIC_SUBJECT);
    expect(content.body).toContain('refusée');
    expect(content.body).toContain(TOUR_TITLE);
    expect(content.body).toContain('Contenu inapproprie');
    expect(content.pushTitle).toContain('refusée');
  });

  it('encadre le titre de guillemets français espacés et ne perd aucun accent', () => {
    const content = getNotificationContent('reject', TOUR_TITLE, 'Contenu inapproprié');
    expect(content.body).toContain('«\u00a0Les Parfums de Grasse\u00a0»');
    expect(content.body).toMatch(/a été refusée/);
    expect(content.body).not.toMatch(/\b(a ete|equipe|refusee|demandees)\b/);
  });

  it('should use generic subject for all actions (RGPD)', () => {
    const actions: NotificationAction[] = ['validate', 'revision', 'reject'];
    actions.forEach((action) => {
      const content = getNotificationContent(action, TOUR_TITLE);
      expect(content.subject).toBe(GENERIC_SUBJECT);
      // Subject must NOT contain tour title or guide name
      expect(content.subject).not.toContain(TOUR_TITLE);
    });
  });

  it('should handle revision without comments', () => {
    const content = getNotificationContent('revision', TOUR_TITLE);
    expect(content.body).toContain(TOUR_TITLE);
    expect(content.body).not.toContain('Commentaires');
  });

  it('should handle reject without comments', () => {
    const content = getNotificationContent('reject', TOUR_TITLE);
    expect(content.body).toContain(TOUR_TITLE);
    expect(content.body).not.toContain('Motif');
  });
});
