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

Deploy. Nothing else is needed to get the site up — there are **no required
environment variables** for browsing, search or playback, because metadata comes from
Cinemeta, a public key-free catalogue.

Accounts are the part that needs configuration. Without it the account endpoints
answer "not configured" and the UI hides sign-in, which is a working deployment rather
than a broken one. See [ACCOUNTS.md](./ACCOUNTS.md) to switch them on.

Drag-and-drop upload will not work: this is a server build, and the zip importer
only serves static files. Use Git, or `npx netlify-cli deploy --build`.

## Environment variables

Set these in **Site configuration → Environment variables**, not in a committed file.
[.env.example](../.env.example) lists every name with a comment; nothing there has a
value.

### The paste-ready list

Five values switch everything on — browsing, search, playback, sign-up, verification
mail and password reset. Paste this into **Site configuration → Environment
variables** (one name per variable, the value beside it), replacing the two `<…>`
placeholders with your own values:

```bash
# Generate this first — works on any OS, no openssl needed:
#   node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
SESSION_SECRET=<the 64-character base64 string that command prints>

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASSWORD=<16-character App Password — https://myaccount.google.com/apppasswords>
```

The SMTP lines assume Gmail, whose App Passwords require 2-Step Verification to be
on. Any other provider works the same way: point the host, port and user at what it
documents. The password is an *App Password*, never the mailbox password, and it is
read server-side only — it can never reach the browser bundle.

Optional refinements:

```bash
NEXT_PUBLIC_SITE_URL=https://your-site.netlify.app   # pins the origin; auto-detected from Netlify's URL if unset
MAIL_FROM=Cineora <you@gmail.com>                    # this is already the default
SUPPORT_EMAIL=you@gmail.com                          # defaults to SMTP_USER
```

Leave alone, on purpose:

- **`SMTP_SECURE`** — derived from the port (587 → STARTTLS, 465 → implicit TLS). Guessing wrong is how mail gets stuck; unset is correct.
- **`CINEORA_DATA_DRIVER`** — on Netlify it defaults to `blobs`, which needs nothing beyond the site being linked. That is the only durable option here.
- **Anything `NEXT_PUBLIC_` carrying a secret** — every `NEXT_PUBLIC_` value is compiled into the browser bundle for anyone to read. `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_NXSHA_ORIGIN` are public by design; nothing else carries that prefix.

Two Netlify UI details that matter:

- Mark **`SESSION_SECRET`** and **`SMTP_PASSWORD`** as **Secret** (the padlock) so the dashboard hides their values and deploy logs mask them.
- Variable changes only reach a new deploy. After pasting, run **Deploys → Trigger deploy → Clear cache and deploy site**.

If a value is missing or mistyped, the site still builds and still plays, but the
account endpoints answer "not configured" and the UI hides sign-in — a deliberate
guard so a first deploy succeeds before configuration, described under
[ACCOUNTS.md](./ACCOUNTS.md). The response never names the culprit (a public endpoint
should not discuss configuration); diagnosing it means comparing what is set against
the five names above, and the exact rule lives in `accountsStatus()` in
`src/server/env.ts`.

Optional everywhere:

| Variable | Effect if unset |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, `og:image` and the sitemap fall back to Netlify's own `URL`, so they are already correct. Set it only to pin a custom domain, e.g. `https://cineora.app`. |
| `NEXT_PUBLIC_NXSHA_ORIGIN` | Playback uses `https://nxsha.space`. This also feeds the CSP `frame-src` allowlist, so change both or neither — it is one variable for exactly that reason. |
| `CINEORA_CINEMETA_ORIGIN` | Requests go to the public Cinemeta addon. Set it only to point at your own mirror. See [INTEGRATIONS.md](./INTEGRATIONS.md). |

Required to enable accounts:

| Variable | Notes |
| --- | --- |
| `SESSION_SECRET` | 32+ random characters. `openssl rand -base64 48`. Rotating it signs everyone out and invalidates pending email links. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Required in production, or nobody can verify an address. For Gmail, `SMTP_PASSWORD` is a 16-character App Password — never the account password. Mark it secret in the Netlify UI. |
| `MAIL_FROM`, `SUPPORT_EMAIL` | Optional. Default to `SMTP_USER`. |
| `CINEORA_DATA_DRIVER` | Defaults to `blobs` on Netlify, which needs nothing beyond the site being linked. |
| `CINEORA_SESSION_TTL`, `CINEORA_REMEMBER_TTL` | Optional session lifetimes in seconds. Default 7 and 30 days. |

Optional, and off by default:

| Variable | Notes |
| --- | --- |
| `CINEORA_DOWNLOAD_CATALOG` | JSON describing files this deployment is licensed to distribute. Absent means no downloads are offered. See [DOWNLOADS.md](./DOWNLOADS.md). |

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
  the plugin; there is no competing `[[headers]]` table in `netlify.toml`. Two
  `Content-Security-Policy` headers from two files would be enforced as their
  intersection, and a drift between them is genuinely hard to diagnose.
- **A missing session secret.** Does not fail the build. Accounts report themselves
  as unconfigured and the UI hides sign-in, so a first deploy succeeds before the
  variables are set. What is never done is generating a secret at runtime — that
  forges sessions which stop validating on the next cold start.
- **The in-memory data driver in production.** `accountsStatus()` refuses to report
  accounts as enabled while it is in use, because every cold start would drop every
  account. On Netlify the default is Blobs, which needs no configuration.
- **Native modules.** `sharp` is the only one, it ships prebuilt binaries, and it is
  used server-side for icon generation and avatar re-encoding. Password hashing is
  scrypt from Node's own crypto precisely so no addon has to compile at deploy time.
- **A serverless response limit on large downloads.** Files served with
  `delivery: 'proxy'` stream through a Function and a long transfer will be cut off.
  Use `delivery: 'redirect'` for anything substantial — see [DOWNLOADS.md](./DOWNLOADS.md).

## Verifying a deploy

```bash
curl -sI https://your-site/ | grep -i "content-security-policy\|strict-transport"
curl -sI https://your-site/account | grep -i cache-control    # private, no-store
```

Then in a browser: open a title, start playback, switch servers, save something to My
List, and — if accounts are configured — register, verify from the email, sign in,
change the password and revoke a device.
