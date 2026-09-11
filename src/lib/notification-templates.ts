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
        body: `Bonne nouvelle ! Votre visite « ${tourTitle} » est maintenant en ligne et visible par tous les consommateurs.`,
        pushTitle: 'Visite en ligne !',
        pushBody: `Votre visite « ${tourTitle} » est en ligne !`,
      };
    case 'revision':
      return {
        subject: GENERIC_SUBJECT,
        body: `L’équipe Murmure demande des corrections sur votre visite « ${tourTitle} ».${comments ? `\n\nCommentaires :\n${comments}` : ''}\n\nConnectez-vous à votre espace guide pour apporter les modifications.`,
        pushTitle: 'Corrections demandées',
        pushBody: `L’admin demande des corrections sur « ${tourTitle} »`,
      };
    case 'reject':
      return {
        subject: GENERIC_SUBJECT,
        body: `Votre visite « ${tourTitle} » a été refusée.${comments ? `\n\nMotif :\n${comments}` : ''}\n\nConnectez-vous à votre espace guide pour consulter les commentaires.`,
        pushTitle: 'Visite refusée',
        pushBody: `Visite « ${tourTitle} » refusée — voir commentaires`,
      };
  }
}
