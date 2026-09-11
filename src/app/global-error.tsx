'use client';

import Link from 'next/link';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          margin: 0,
          // Valeurs des jetons DS, recopiées : ce fichier ne peut rien importer.
          background: '#F4ECDD', // paper
          color: '#102A43', // ink
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
          <p style={{ fontStyle: 'italic', color: 'rgba(16, 42, 67, 0.72)' /* ink-60 */, marginBottom: '0.5rem' }}>
            Erreur critique
          </p>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '1rem' }}>
            L&apos;application a planté
          </h2>
          <p style={{ color: 'rgba(16, 42, 67, 0.72)' /* ink-60 */, marginBottom: '2rem', lineHeight: '1.6' }}>
            Une erreur inattendue est survenue. Réessayez ou rechargez la page.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{
                background: '#C1262A',
                color: '#F4ECDD', // paper
                border: 'none',
                borderRadius: '9999px',
                padding: '0.75rem 2rem',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Réessayer
            </button>
            <Link
              href="/"
              style={{
                border: '1px solid rgba(16, 42, 67, 0.10)', // line
                color: '#102A43', // ink
                borderRadius: '9999px',
                padding: '0.75rem 1.5rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              Accueil
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
