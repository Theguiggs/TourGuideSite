/**
 * Web logger compatible with mobile format (SERVICE_NAME, message, context?).
 * Wraps console methods and will integrate with Sentry when SDK is added.
 */

type LogContext = Record<string, unknown>;

function formatMessage(serviceName: string, message: string): string {
  return `[${serviceName}] ${message}`;
}

function sanitizeContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;
  const sanitized = { ...context };
  // Strip sensitive fields
  for (const key of Object.keys(sanitized)) {
    if (/password|token|secret|credential|email/i.test(key)) {
      sanitized[key] = '[REDACTED]';
    }
  }
  return sanitized;
}

export const logger = {
  info(serviceName: string, message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      const sanitized = sanitizeContext(context);
      if (sanitized) {
        console.info(formatMessage(serviceName, message), sanitized);
      } else {
        console.info(formatMessage(serviceName, message));
      }
    }
    // TODO: Sentry breadcrumb
  },

  warn(serviceName: string, message: string, context?: LogContext): void {
    const sanitized = sanitizeContext(context);
    if (sanitized) {
      console.warn(formatMessage(serviceName, message), sanitized);
    } else {
      console.warn(formatMessage(serviceName, message));
    }
    // TODO: Sentry breadcrumb
  },

  error(serviceName: string, message: string, context?: LogContext): void {
    const sanitized = sanitizeContext(context);
    if (sanitized) {
      console.error(formatMessage(serviceName, message), sanitized);
    } else {
      console.error(formatMessage(serviceName, message));
    }
    // TODO: Sentry captureMessage
  },
};
