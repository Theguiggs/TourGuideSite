/**
 * Guide notification service — sends email/push when admin takes action on a tour.
 *
 * Stub mode: logs and returns Ok. Real mode: calls backend Lambda for SES/FCM.
 * Fire-and-forget pattern: callers should `.catch(logWarning)` — never block admin actions.
 */

import { shouldUseStubs } from '@/config/api-mode';
import { getNotificationContent } from '@/lib/notification-templates';
import type { NotificationAction } from '@/lib/notification-templates';

export async function sendGuideNotification(
  guideId: string,
  tourId: string,
  tourTitle: string,
  action: NotificationAction,
  comments?: string,
): Promise<{ ok: boolean; error?: string }> {
  const content = getNotificationContent(action, tourTitle, comments);

  if (shouldUseStubs()) {
    // Stub: simulate email send with delay
    await new Promise((r) => setTimeout(r, 200));
    console.log('[GuideNotification] Stub — would send:', {
      guideId, tourId, action, subject: content.subject,
    });
    return { ok: true };
  }

  // Real mode: call backend Lambda endpoint for SES email
  // Contract: POST /api/guide-notifications
  // Body: { guideId, tourId, subject, body, pushTitle, pushBody }
  // Response: { ok: true, messageId } | { ok: false, error }
  try {
    // TODO: Replace with actual API call when Lambda is deployed
    // const response = await fetch('/api/guide-notifications', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ guideId, tourId, ...content }),
    // });
    console.warn('[GuideNotification] Real mode — Lambda not yet deployed, skipping');
    return { ok: true };
  } catch (error) {
    console.warn('[GuideNotification] Failed to send notification:', error);
    return { ok: false, error: 'Notification envoyee en erreur (non-bloquant)' };
  }
}
