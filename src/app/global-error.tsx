'use client';

import { useEffect } from 'react';

/**
 * Last-resort boundary: this replaces the root layout, so the fonts, the design
 * tokens and the stylesheet may all be gone. Everything here is inline-styled with
 * a system font stack so the page still looks deliberate when nothing else loaded.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" dir="ltr">
      <body
        style={{
          margin: 0,
          minHeight: '100svh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.25rem',
          background: 'radial-gradient(120% 90% at 50% 0%, #12151d 0%, #05060a 60%)',
          color: '#f8f9fb',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          textAlign: 'center',
        }}
      >
        <main style={{ maxWidth: '30rem' }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.6875rem',
              fontWeight: 600,
              letterSpacing: '0.34em',
              textTransform: 'uppercase',
              color: '#f4506a',
            }}
          >
            Cineora
          </p>

          <h1 style={{ margin: '1.25rem 0 0', fontSize: '1.5rem', lineHeight: 1.2, fontWeight: 600 }}>
            The app could not start
          </h1>

          <p style={{ margin: '0.75rem 0 0', fontSize: '0.9375rem', lineHeight: 1.6, color: '#939bad' }}>
            Something failed before the interface could load. Reloading usually clears it. Your saved
            list and preferences are stored on this device and are not affected.
          </p>

          <div
            style={{
              marginTop: '1.75rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                minHeight: '2.75rem',
                padding: '0 1.25rem',
                borderRadius: '999px',
                border: '1px solid #d4213d',
                background: '#d4213d',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: '2.75rem',
                padding: '0 1.25rem',
                borderRadius: '999px',
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'rgba(255,255,255,0.05)',
                color: '#f8f9fb',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Reload Cineora
            </a>
          </div>

          {error.digest ? (
            <p style={{ margin: '1.5rem 0 0', fontSize: '0.6875rem', color: '#515868' }}>
              Reference {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
