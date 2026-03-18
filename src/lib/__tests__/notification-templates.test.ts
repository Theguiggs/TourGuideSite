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
    expect(content.body).toContain('refusee');
    expect(content.body).toContain(TOUR_TITLE);
    expect(content.body).toContain('Contenu inapproprie');
    expect(content.pushTitle).toContain('refusee');
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
