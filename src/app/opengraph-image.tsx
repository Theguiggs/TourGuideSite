import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'Murmure — Le monde a une voix.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#C1262A', // grenadine (jeton DS, recopié : route Edge)
          fontFamily: 'Georgia, serif',
        }}
      >
        <div
          style={{
            fontSize: 96,
            color: '#F4ECDD', // paper
            letterSpacing: '-2px',
            marginBottom: 24,
          }}
        >
          Murmure
        </div>
        <div
          style={{
            fontSize: 36,
            color: '#F4ECDD', // paper
            opacity: 0.85,
            letterSpacing: '1px',
          }}
        >
          Le monde a une voix.
        </div>
      </div>
    ),
    { ...size },
  );
}
