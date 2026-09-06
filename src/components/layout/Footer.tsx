import Link from 'next/link';
import { CineoraLogo } from '@/components/brand/Logo';

/**
 * Footer. States plainly what Cineora is and where the data and playback come
 * from — the app aggregates public, documented services and hosts nothing itself.
 */
const COLUMNS = [
  {
    title: 'Browse',
    links: [
      { href: '/movies', label: 'Movies' },
      { href: '/series', label: 'Series' },
      { href: '/anime', label: 'Anime' },
      { href: '/my-list', label: 'My List' },
    ],
  },
  {
    title: 'Discover',
    links: [
      { href: '/movies?sort=rating', label: 'Top rated films' },
      { href: '/series?sort=rating', label: 'Top rated series' },
      { href: '/movies?sort=new', label: 'New releases' },
      { href: '/anime?sort=new', label: 'New anime' },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="mt-16 border-t border-(--glass-line) bg-ink-950/40">
      <div className="gutter-x py-10 md:py-14">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between md:gap-16">
          <div className="max-w-sm">
            <CineoraLogo />
            <p className="mt-4 text-[0.8125rem] leading-relaxed text-mist-400">
              A cinematic front end for movies, series and anime. Cineora stores no media of its own — titles and
              artwork come from public metadata catalogues, and playback is handled by embedded third-party players.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:gap-14">
            {COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className="font-display text-[0.6875rem] font-semibold tracking-[0.16em] text-mist-500 uppercase">
                  {column.title}
                </h2>
                {/*
                  Full-height rows on touch: a 13px label is a 16px tap target
                  otherwise. Desktop relaxes to 24px, the WCAG 2.2 minimum, rather
                  than to the bare line box.
                */}
                <ul className="mt-1.5 flex flex-col md:mt-3.5 md:gap-2.5">
                  {column.links.map((link) => (
                    <li key={link.href} className="flex">
                      <Link
                        href={link.href}
                        className="tap inline-flex min-h-11 items-center text-[0.8125rem] text-mist-400 transition-colors duration-200 md:min-h-6 md:hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <p className="mt-10 border-t border-(--glass-line) pt-6 text-[0.6875rem] leading-relaxed text-mist-500">
          Cineora is a personal, non-commercial project. Metadata is provided by Cinemeta, the public catalogue behind
          Stremio. Playback is provided by the Nxsha embed service. All trademarks and artwork belong to their
          respective owners.
        </p>
      </div>
    </footer>
  );
}
