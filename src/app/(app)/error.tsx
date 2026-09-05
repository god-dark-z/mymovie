'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageShell } from '@/components/layout/Page';

/**
 * Boundary for every browsing surface.
 *
 * `reset` re-renders the segment, which is the right first move for a failed
 * metadata fetch. The error itself is logged to the console for whoever is
 * debugging and never shown — the user gets plain copy, plus the digest, which is
 * an opaque reference rather than a stack trace.
 */
export default function AppError({
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
    <PageShell>
      <ErrorState
        as="h1"
        kind="metadata"
        onRetry={reset}
        retryLabel="Reload this page"
        action={{ label: 'Go home', href: '/' }}
      />
      {error.digest ? (
        <p className="gutter-x text-center text-[0.6875rem] text-mist-500">
          Reference {error.digest}
        </p>
      ) : null}
    </PageShell>
  );
}
