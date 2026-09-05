import { ButtonLink } from '@/components/ui/Button';

/**
 * Shared 404 body. The numeral is decorative — the heading carries the meaning, so
 * it is the only thing a screen reader announces.
 */
export function NotFoundView({
  code = '404',
  title,
  description,
}: {
  code?: string;
  title: string;
  description: string;
}) {
  return (
    <div className="gutter-x flex flex-col items-center justify-center py-16 text-center md:py-24">
      <p
        aria-hidden
        className="bg-linear-to-b from-mist-200 to-mist-600 bg-clip-text font-display text-[4rem] leading-none font-semibold tracking-[-0.04em] text-transparent md:text-[5.5rem]"
      >
        {code}
      </p>

      <h1 className="mt-5 font-display text-xl font-semibold tracking-[-0.01em] text-white md:text-2xl">
        {title}
      </h1>
      <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-mist-500">{description}</p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <ButtonLink href="/" variant="accent">
          Go home
        </ButtonLink>
        <ButtonLink href="/search" variant="glass">
          Search titles
        </ButtonLink>
      </div>
    </div>
  );
}
