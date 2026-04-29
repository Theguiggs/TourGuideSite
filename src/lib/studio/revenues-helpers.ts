/**
 * Format a number into a French-style euro string ("1 247,30 €" or "1 247 €").
 *
 * Default: 2 decimals. With `withCents: false`, no decimals (rounds half-even).
 */
export function formatEuros(
  value: number,
  options: { withCents?: boolean; currency?: string } = {},
): string {
  const { withCents = true, currency = 'EUR' } = options;
  const formatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: withCents ? 2 : 0,
    maximumFractionDigits: withCents ? 2 : 0,
  });
  // Intl returns "1 247,30 €" with non-breaking spaces — keep as-is.
  return formatter.format(value);
}

interface NextPaymentInfo {
  /** The actual date object of the next payment. */
  date: Date;
  /** Human label, e.g. "5 mai 2026". */
  label: string;
  /** Whole days from `today` to `date` (rounds down, never negative). */
  daysUntil: number;
}

/**
 * Compute the next monthly payment date — always the 5th of the next month
 * after `today`. If today is the 5th or earlier, target this month's 5th.
 */
export function nextPaymentDate(today: Date = new Date()): NextPaymentInfo {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let target: Date;
  if (t.getDate() <= 5) {
    target = new Date(t.getFullYear(), t.getMonth(), 5);
  } else {
    target = new Date(t.getFullYear(), t.getMonth() + 1, 5);
  }
  if (target.getTime() < t.getTime()) {
    // Edge: 5th already passed, push to next month
    target = new Date(t.getFullYear(), t.getMonth() + 1, 5);
  }
  const ms = target.getTime() - t.getTime();
  const daysUntil = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  const label = target.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return { date: target, label, daysUntil };
}

const MONTH_SHORT_FR = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Jun',
  'Jul',
  'Aoû',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
];

/**
 * Convert "YYYY-MM" to a short FR label like "Avr 26".
 * Returns the input as-is on parse failure.
 */
export function monthLabel(yyyymm: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(yyyymm);
  if (!m) return yyyymm;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return yyyymm;
  const yy = String(year).slice(-2);
  return `${MONTH_SHORT_FR[month - 1]} ${yy}`;
}

export interface DeltaResult {
  /** Percentage change rounded to int. */
  pct: number;
  /** Sign indicator. */
  sign: '+' | '-' | '=';
}

export function computeDelta(curr: number, prev: number): DeltaResult {
  if (prev === 0) {
    if (curr === 0) return { pct: 0, sign: '=' };
    return { pct: 100, sign: '+' };
  }
  const raw = ((curr - prev) / Math.abs(prev)) * 100;
  const pct = Math.round(Math.abs(raw));
  if (raw > 0) return { pct, sign: '+' };
  if (raw < 0) return { pct, sign: '-' };
  return { pct: 0, sign: '=' };
}

/**
 * Extract the city name from a tour title (the part before the first em-dash,
 * hyphen or comma). Falls back to the full trimmed title or "Tour".
 */
export function cityFromTourTitle(title: string | null | undefined): string {
  if (!title) return 'Tour';
  return title.split(/[—\-,]/)[0]?.trim() || title.trim() || 'Tour';
}
