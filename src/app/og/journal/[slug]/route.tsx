/* eslint-disable react/no-unknown-property */
// Story 3.5 — Route Edge OG dynamique pour articles Journal (Phase B).
// Stub minimal : Phase A (V1.0) n'a pas encore d'API journal — on rend un layout
// paper avec un fallback `Journal TourGuide` + slug humanisé.
//
// TODO Story 6.6 (Phase B) : remplacer le stub par fetch via `getArticleBySlug(slug)`
// (à créer côté `src/lib/api/journal-server.ts`). Composer eyebrow `${article.author} · ${article.publishDate}`,
// titre `article.title`, pullquote `article.excerpt`.

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';
export const contentType = 'image/png';

interface Params {
  slug: string;
}

const PAPER = '#F4ECDD';
const INK = '#102A43';
const GRENADINE = '#C1262A';

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
    const { slug } = await params;

    // Stub Phase A — pas d'API journal encore.
    const article = {
      title: humanize(slug),
      eyebrow: 'Journal TourGuide',
      excerpt: 'Récits, portraits et coulisses des audio guides.',
    };

    const safeTitle = truncate(article.title, 80);
    const safeExcerpt = truncate(article.excerpt, 200);

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: PAPER,
            padding: 80,
            fontFamily: 'serif',
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: GRENADINE,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              marginBottom: 32,
              fontFamily: 'sans-serif',
            }}
          >
            {article.eyebrow.toUpperCase()}
          </div>
          <div
            style={{
              fontSize: 64,
              color: INK,
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
              color: 'rgba(16,42,67,0.75)',
              fontFamily: 'serif',
              display: 'flex',
            }}
          >
            « {safeExcerpt} »
          </div>
          <div style={{ flex: 1 }} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32">
              <path
                d="M16 3 c-5 0 -9 4 -9 9 c0 6.5 9 17 9 17 s9 -10.5 9 -17 c0 -5 -4 -9 -9 -9 z"
                fill={GRENADINE}
              />
              <circle cx="16" cy="13" r="3" fill={PAPER} />
            </svg>
            <span
              style={{
                fontSize: 18,
                color: INK,
                fontWeight: 600,
                fontFamily: 'sans-serif',
              }}
            >
              TourGuide · Journal
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
    console.error('[og-journal] render failed', err);
    return Response.redirect(new URL('/og-default.png', 'https://tourguide.app'), 302);
  }
}
