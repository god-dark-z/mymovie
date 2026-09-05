/**
 * The player shell.
 *
 * Watch routes sit outside the `(app)` group deliberately: no header, no footer,
 * no bottom navigation. The player owns the viewport, and the only navigation is
 * the back control the screen renders for itself — which is also what an Android
 * WebView build needs, since there is no browser chrome to fall back on.
 */
export default function WatchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-app flex-col bg-ink-950">
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
