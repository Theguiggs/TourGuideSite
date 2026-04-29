/* eslint-disable react/no-unknown-property */
// Story 3.5 — Route Edge OG dynamique pour pages tour.
// Compose une preview 1200×630 via Satori (next/og built-in) avec :
//   - color-block ville (mapping accent grenadine/ocre/mer/olive)
//   - eyebrow `${VILLE} · ${DURÉE} MIN`
//   - titre tour (fallback `serif` system tant que les TTF DM Serif Display ne sont pas bundled)
//   - PullQuote teaser
//   - Pin signature SVG inline
//
// TODO Story 3.5 follow-up (T6) : pré-fetch DM Serif Display + DM Serif Text Italic
// + Manrope Bold en ArrayBuffer (`new URL('../../../../../../assets/fonts/...', import.meta.url)`)
// puis passer dans `ImageResponse({ fonts: [...] })`. Pour l'instant fallback `serif` system.
//
// TODO Story 3.5 follow-up : remplacer le stub `tour` par fetch via `getTourBySlug()` —
// vérifier que le client AppSync server est compatible Edge runtime (sinon créer un endpoint
// REST cache-friendly `/api/og-tour/{city}/{slug}`). Actuellement stub minimal.

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';
export const contentType = 'image/png';

interface Params {
  city: string;
  tourSlug: string;
}

interface AccentColors {
  bg: string;
  fg: string;
}

// Map accent ville → soft pastel + foreground accent (token DS v2 — version simplifiée).
// TODO Story 3.5 follow-up : extraire dans `src/lib/og/city-colors.ts` et enrichir avec
// les villes du catalogue réel (Aix → grenadine, Marseille → mer, Avignon → ocre, Provence → olive).
const ACCENT_MAP: Record<string, AccentColors> = {
  grenadine: { bg: '#FBE5E2', fg: '#C1262A' },
  ocre:      { bg: '#F5E4C7', fg: '#C68B3E' },
  mer:       { bg: '#D7E5EC', fg: '#2B6E8A' },
  olive:     { bg: '#E2E5D2', fg: '#6B7A45' },
};

// Heuristique stub : map citySlug → accent. À remplacer par `tour.theme` ou `city.nature`.
function pickAccent(citySlug: string): AccentColors {
  const lower = citySlug.toLowerCase();
  if (lower.includes('marseille') || lower.includes('mer')) return ACCENT_MAP.mer;
  if (lower.includes('avignon') || lower.includes('arles')) return ACCENT_MAP.ocre;
  if (lower.includes('provence') || lower.includes('luberon')) return ACCENT_MAP.olive;
  return ACCENT_MAP.grenadine;
}

function humanize(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + '…';
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
): Promise<Response> {
  try {
    const { city, tourSlug } = await params;

    // TODO : fetch tour data from AppSync via `getTourBySlug(city, tourSlug)`.
    // Pour V1.0 stub minimal — le rendu Edge marche, le contenu est à raccorder.
    const tour = {
      title: humanize(tourSlug),
      city: humanize(city),
      duration: 38,
      quote: 'Le monde a une voix.',
    };

    const accent = pickAccent(city);
    const safeTitle = truncate(tour.title, 80);
    const safeQuote = truncate(tour.quote, 200);

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: accent.bg,
            padding: 80,
            fontFamily: 'serif',
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: accent.fg,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              marginBottom: 32,
              fontFamily: 'sans-serif',
            }}
          >
            {tour.city.toUpperCase()} · {tour.duration} MIN
          </div>
          <div
            style={{
              fontSize: 64,
              color: '#102A43',
              marginBottom: 32,
              fontFamily: 'serif',
              lineHeight: 1.05,
              display: 'flex',
            }}
          >
            {safeTitle}
          </div>
          <div
            style={{
              fontSize: 28,
              fontStyle: 'italic',
              color: 'rgba(16,42,67,0.8)',
              fontFamily: 'serif',
              display: 'flex',
            }}
          >
            « {safeQuote} »
          </div>
          <div style={{ flex: 1 }} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {/* Pin signature grenadine — SVG inline simple (Satori-safe). */}
            <svg width="32" height="32" viewBox="0 0 32 32">
              <path
                d="M16 3 c-5 0 -9 4 -9 9 c0 6.5 9 17 9 17 s9 -10.5 9 -17 c0 -5 -4 -9 -9 -9 z"
                fill="#C1262A"
              />
              <circle cx="16" cy="13" r="3" fill="#F4ECDD" />
            </svg>
            <span
              style={{
                fontSize: 18,
                color: '#102A43',
                fontWeight: 600,
                fontFamily: 'sans-serif',
              }}
            >
              TourGuide
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      }
    );
  } catch (err) {
    // Fallback robuste : redirect 302 vers static og-default.png plutôt que 500 visible côté crawler.
    // Edge runtime : `console.error` accepté (logger app non importable en Edge).
    console.error('[og-tour] render failed', err);
    return Response.redirect(new URL('/og-default.png', 'https://tourguide.app'), 302);
  }
}
