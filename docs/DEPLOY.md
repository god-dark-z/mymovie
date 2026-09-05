# Deploying Cineora to Netlify

Cineora is a **server-rendered** Next.js App Router app, not a static export. It
needs Netlify's Next.js runtime, which `netlify.toml` already asks for.

## Deploy

This folder is not a git repository yet, so start there:

```bash
git init
git add .
git commit -m "Cineora"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

Then in Netlify: **Add new site → Import an existing project**, pick the repo,
and accept the detected settings. They come from `netlify.toml`:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Publish directory | `.next` |
| Node version | 22 (also pinned in `.nvmrc`) |
| Plugin | `@netlify/plugin-nextjs` |

Deploy. Nothing else to configure — there are **no required environment
variables**, because metadata comes from Cinemeta, a public key-free catalogue.

Drag-and-drop upload will not work: this is a server build, and the zip importer
only serves static files. Use Git, or `npx netlify-cli deploy --build`.

## Environment variables (all optional)

| Variable | Effect if unset |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, `og:image` and the sitemap fall back to Netlify's own `URL`, so they are already correct. Set it only to pin a custom domain, e.g. `https://cineora.app`. |
| `CINEORA_CINEMETA_ORIGIN` | Requests go to the public Cinemeta addon. Set it only to point at your own mirror. See [INTEGRATIONS.md](./INTEGRATIONS.md). |

There is no API key anywhere in this project — not for metadata, not for
playback. If a deploy guide ever asks you for a TMDB key, it is not this one.

## Why `publish = ".next"`

`next build` here produces server components, two route handlers under `/api`
and several ISR pages. `@netlify/plugin-nextjs` maps those onto Netlify
Functions and Netlify's cache, and points `next/image` at Netlify's image CDN
using the `remotePatterns` allowlist in `next.config.ts`.

Do **not** switch to `output: 'export'` and `publish = "out"`. That would drop
the search route handlers and every dynamically rendered title page.

## Local checks before pushing

```bash
npx tsc --noEmit     # types
npm run build        # the exact command Netlify runs
npm start            # serve the production build locally
```

To rehearse the Netlify build itself, including the plugin:

```bash
npx netlify-cli build     # runs the build the way Netlify will
npx netlify-cli dev       # proxies the real Next dev server
```

## Things that would break a deploy, and are already handled

- **Lockfile drift.** Netlify runs `npm ci`, which fails if `package.json` and
  `package-lock.json` disagree. `@netlify/plugin-nextjs` is deliberately *not* a
  dependency in `package.json`; Netlify installs toml-declared plugins itself.
- **Node version drift.** Pinned twice, in `netlify.toml` and `.nvmrc`.
- **Absolute URLs baked at build time.** `src/lib/site.ts` reads Netlify's `URL`
  and `DEPLOY_PRIME_URL`, so metadata never ships a `localhost` address.
- **Response headers.** The `headers()` block in `next.config.ts` is applied by
  the plugin; there is no competing `[[headers]]` table in `netlify.toml`.
