/**
 * Web logger compatible with mobile format (SERVICE_NAME, message, context?).
 *
 * ─── Ce que la redaction couvre, et pourquoi ─────────────────────────────────
 * La première version ne regardait que les NOMS de clés de premier niveau
 * (`password`, `token`, `email`…). Or ce qui fuit en production est une VALEUR :
 * `{ error: String(err) }` porte le message Cognito « User does not exist:
 * foo@bar.com », une réponse AppSync recopiée, un jeton dans un contexte
 * imbriqué. Tout cela partait dans la console du navigateur et dans le stdout
 * du conteneur — des journaux Docker persistants sur le VPS, hors de tout
 * registre RGPD.
 *
 * La redaction est donc RÉCURSIVE et porte aussi sur les valeurs : jetons JWT,
 * adresses électroniques, en-têtes d'autorisation, et toute clé sensible à
 * n'importe quelle profondeur.
 *
 * Sentry n'est pas installé (le paquet est absent de `package.json`) : les
 * niveaux `warn` et `error` restent sur la console, redigés. Le jour où un
 * collecteur arrive, c'est `emit()` qu'il remplace, et rien d'autre.
 */

type LogContext = Record<string, unknown>;

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 6;

/** Clés dont la VALEUR est masquée quelle que soit sa forme. */
const SENSITIVE_KEY = /password|passwd|secret|credential|authorization|cookie|session|token|jwt|api[-_]?key|email|e-mail|phone|telephone/i;

/** Jeton JWT : trois segments base64url séparés par des points. */
const JWT_VALUE = /\beyJ[\w-]{6,}\.[\w-]{6,}\.[\w-]{6,}\b/g;
/** Adresse électronique. */
const EMAIL_VALUE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
/** En-tête porteur recopié dans une chaîne. */
const BEARER_VALUE = /\bBearer\s+[\w.-]{10,}/gi;
/** Clés d'API AWS / Stripe reconnaissables à leur préfixe. */
const API_KEY_VALUE = /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\b(?:sk|pk|rk)_(?:test|live)_[A-Za-z0-9]{8,}\b/g;

function redactString(value: string): string {
  return value
    .replace(JWT_VALUE, REDACTED)
    .replace(BEARER_VALUE, `Bearer ${REDACTED}`)
    .replace(API_KEY_VALUE, REDACTED)
    .replace(EMAIL_VALUE, REDACTED);
}

function redactValue(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return '[TRUNCATED]';
  if (typeof value === 'string') return redactString(value);
  if (value instanceof Error) {
    return { name: value.name, message: redactString(value.message) };
  }
  if (Array.isArray(value)) return value.map((item) => redactValue(item, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key) ? REDACTED : redactValue(inner, depth + 1);
    }
    return out;
  }
  return value;
}

/** Redaction récursive, sur les clés ET sur les valeurs. Exportée pour l'épreuve. */
export function sanitizeContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;
  return redactValue(context, 0) as LogContext;
}

function formatMessage(serviceName: string, message: string): string {
  return `[${serviceName}] ${redactString(message)}`;
}

type Level = 'info' | 'warn' | 'error';

function emit(level: Level, serviceName: string, message: string, context?: LogContext): void {
  const sanitized = sanitizeContext(context);
  const line = formatMessage(serviceName, message);
  const sink = level === 'info' ? console.info : level === 'warn' ? console.warn : console.error;
  if (sanitized) sink(line, sanitized);
  else sink(line);
}

export const logger = {
  info(serviceName: string, message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') emit('info', serviceName, message, context);
  },

  warn(serviceName: string, message: string, context?: LogContext): void {
    emit('warn', serviceName, message, context);
  },

  error(serviceName: string, message: string, context?: LogContext): void {
    emit('error', serviceName, message, context);
  },
};
