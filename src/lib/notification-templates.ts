/**
 * Notification content templates for admin→guide communication.
 * RGPD: subject is always generic — never includes guide name or tour title.
 */

export type NotificationAction = 'validate' | 'revision' | 'reject';

export interface NotificationContent {
  subject: string;
  body: string;
  pushTitle: string;
  pushBody: string;
}

const GENERIC_SUBJECT = 'Mise à jour de votre visite';

export function getNotificationContent(
  action: NotificationAction,
  tourTitle: string,
  comments?: string,
): NotificationContent {
  switch (action) {
    case 'validate':
      return {
        subject: GENERIC_SUBJECT,
        body: `Bonne nouvelle ! Votre visite «${tourTitle}» est maintenant en ligne et visible par tous les consommateurs.`,
        pushTitle: 'Visite en ligne !',
        pushBody: `Votre visite «${tourTitle}» est en ligne !`,
      };
    case 'revision':
      return {
        subject: GENERIC_SUBJECT,
        body: `L'equipe TourGuide demande des corrections sur votre visite «${tourTitle}».${comments ? `\n\nCommentaires :\n${comments}` : ''}\n\nConnectez-vous a votre espace guide pour apporter les modifications.`,
        pushTitle: 'Corrections demandees',
        pushBody: `L'admin demande des corrections sur «${tourTitle}»`,
      };
    case 'reject':
      return {
        subject: GENERIC_SUBJECT,
        body: `Votre visite «${tourTitle}» a ete refusee.${comments ? `\n\nMotif :\n${comments}` : ''}\n\nConnectez-vous a votre espace guide pour consulter les commentaires.`,
        pushTitle: 'Visite refusee',
        pushBody: `Visite «${tourTitle}» refusee — voir commentaires`,
      };
  }
}
