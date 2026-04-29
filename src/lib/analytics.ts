/**
 * Web analytics events — will integrate with Amplitude when SDK is added.
 * For now, logs to console in development.
 */

export const AnalyticsEvents = {
  WEB_LANDING_VISIT: 'web_landing_visit',
  WEB_CATALOGUE_BROWSE: 'web_catalogue_browse',
  WEB_TOUR_DETAIL_VIEW: 'web_tour_detail_view',
  WEB_APP_DOWNLOAD_CLICK: 'web_app_download_click',
  WEB_QR_CODE_SCAN: 'web_qr_code_scan',
  WEB_GUIDE_PROFILE_VIEW: 'web_guide_profile_view',
  WEB_GUIDE_TOUR_CLICK: 'web_guide_tour_click',
} as const;

export const GuideAnalyticsEvents = {
  GUIDE_PORTAL_LOGIN: 'guide_portal_login',
  GUIDE_PORTAL_DASHBOARD_VIEW: 'guide_portal_dashboard_view',
  GUIDE_PORTAL_TOUR_EDIT: 'guide_portal_tour_edit',
  GUIDE_PORTAL_TOUR_SUBMIT: 'guide_portal_tour_submit',
  GUIDE_PORTAL_TOUR_SUBMIT_REVIEW: 'tour_submit_review',
  GUIDE_PORTAL_TOUR_PREVIEW: 'guide_portal_tour_preview',
  GUIDE_PORTAL_PROFILE_EDIT: 'guide_portal_profile_edit',
  GUIDE_PORTAL_REVENUE_VIEW: 'guide_portal_revenue_view',
} as const;

export const AdminAnalyticsEvents = {
  ADMIN_MODERATION_QUEUE_VIEW: 'admin_moderation_queue_view',
  ADMIN_MODERATION_REVIEW_START: 'admin_moderation_review_start',
  ADMIN_MODERATION_APPROVED: 'admin_moderation_approved',
  ADMIN_MODERATION_REJECTED: 'admin_moderation_rejected',
  ADMIN_TOUR_REVIEW_ACTION: 'tour_review_action',
  ADMIN_NEW_SUBMISSION: 'admin_new_submission',
} as const;

export const StudioAnalyticsEvents = {
  STUDIO_SESSIONS_VIEW: 'studio_sessions_view',
  STUDIO_RGPD_CONSENT_ACCEPTED: 'studio_rgpd_consent_accepted',
  STUDIO_SESSION_OPENED: 'studio_session_opened',
  STUDIO_SESSION_CREATED: 'studio_session_created',
  STUDIO_TRANSCRIPTION_TRIGGERED: 'studio_transcription_triggered',
  STUDIO_TRANSCRIPTION_COMPLETED: 'studio_transcription_completed',
  STUDIO_TRANSCRIPTION_FAILED: 'studio_transcription_failed',
  STUDIO_TRANSCRIPTION_RETRIED: 'studio_transcription_retried',
  STUDIO_QUOTA_WARNING: 'studio_quota_warning',
  STUDIO_QUOTA_EXCEEDED: 'studio_quota_exceeded',
  STUDIO_SATISFACTION_SUBMITTED: 'studio_satisfaction_submitted',
  STUDIO_ONBOARDING_DISMISSED: 'studio_onboarding_dismissed',
  CLEANUP_COMPLETED: 'cleanup_completed',
} as const;

export const FilterAnalyticsEvents = {
  CATALOGUE_FILTER_APPLIED: 'catalogue_filter_applied',
} as const;

export type EventName =
  | (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents]
  | (typeof GuideAnalyticsEvents)[keyof typeof GuideAnalyticsEvents]
  | (typeof AdminAnalyticsEvents)[keyof typeof AdminAnalyticsEvents]
  | (typeof StudioAnalyticsEvents)[keyof typeof StudioAnalyticsEvents]
  | (typeof FilterAnalyticsEvents)[keyof typeof FilterAnalyticsEvents];

export function trackEvent(event: EventName, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics] ${event}`, properties);
  }

  // TODO: Integrate @amplitude/analytics-browser
  // amplitude.track(event, properties);
}
