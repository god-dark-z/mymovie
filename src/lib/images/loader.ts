/**
 * Custom image loader.
 *
 * Bypasses Next.js's built-in optimizer, which fetches every remote image through
 * a worker to resize/re-encode it. That worker crashes when the upstream CDN returns
 * a 404 — and in dev, a single crashed worker takes the whole server down with it,
 * which is what made the whole site look scrambled.
 *
 * The metadata CDN already serves posters at the size we ask for (small/medium/large
 * are baked into the path), so there is nothing useful for the optimizer to do here.
 * This loader hands the URL straight back and lets the browser fetch it directly,
 * keeping Next.js's lazy-loading, sizing and placeholder benefits without the worker.
 */
export default function imageLoader({ src }: { src: string; width: number; quality?: number }): string {
  return src;
}
