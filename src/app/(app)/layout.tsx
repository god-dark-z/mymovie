import { Footer } from '@/components/layout/Footer';
import { GlassNav } from '@/components/layout/GlassNav';

/**
 * Chrome for every browsing surface.
 *
 * Watch routes deliberately live outside this group: the player owns the whole
 * viewport, and keeping it out of the group means no client-side pathname check
 * decides whether the navigation renders.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-app flex-col">
      <GlassNav />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      {/* Room for the pill, which floats over the bottom of the page on handsets. */}
      <div aria-hidden className="h-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom,0px))] md:hidden" />
    </div>
  );
}
