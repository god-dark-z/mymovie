# Accounts and security

Accounts are **optional**. With none of the variables below set, Cineora deploys and
runs exactly as it did before them: browsing, search, playback, watchlist and history
all work, the account endpoints answer "not configured", and the UI hides sign-in
rather than offering a door that leads nowhere. What is never done is inventing a
session secret at runtime — that would forge sessions which stop validating on the
next cold start.

## Turning accounts on

| Variable | Required | Notes |
| --- | --- | --- |
| `SESSION_SECRET` | always | 32+ characters. `openssl rand -base64 48`. Signs session cookies, CSRF tokens, email tokens and download grants. |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` | in production | Without all three, mail goes to a local outbox instead of being sent. |
| `CINEORA_DATA_DRIVER` | on non-Netlify production | Defaults to `blobs` on Netlify, `fs` locally. `memory` loses everything on restart, so production refuses to report accounts as enabled while it is in use. |

`accountsStatus()` in `src/server/env.ts` is the single check, and it is the only
place that decides whether this deployment can run accounts end to end.

### Gmail

Use an **App Password**, never the account password:

1. Turn on 2-Step Verification for the Google account.
2. Create an App Password (Google Account → Security → App passwords).
3. `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=you@gmail.com`,
   `SMTP_PASSWORD=` the 16-character App Password.

Set these in your host's environment variable UI, marked secret. They are read
server-side only, in one file, and never enter a client bundle, a log line or an error
message. `SMTP_SECURE` is derived from the port — 465 is implicit TLS, 587 is
STARTTLS — and only needs setting for a relay that disagrees.

### Development without SMTP

With no credentials configured, every message is written to
`.data/outbox/*.html` (or `CINEORA_DATA_DIR`) and the console logs the recipient,
subject and file name. Open the file to click the link. This is a development
convenience and never a production fallback: `accountsStatus()` treats missing SMTP in
production as a configuration error, because otherwise nobody could verify an address.

`.data` is gitignored. It holds password hashes, session records and live tokens.

## How it is put together

```
src/server/env.ts          every secret is read here and nowhere else
src/server/crypto/         password hashing, token minting, HMAC signing
src/server/data/           KeyValueStore + repositories + three adapters
src/server/auth/           sessions, cookies, CSRF, rate limits, device labels
src/server/mail/           transport, templates, the sending decisions
src/server/http/           route wrapper, validation, error shapes
src/app/api/               the endpoints
```

The storage layer is deliberately thin and swappable. One `KeyValueStore` primitive
has three adapters — in-memory, filesystem, Netlify Blobs — and above it sit
repositories for users, sessions, tokens, security events, rate buckets and avatars.
Moving to Postgres, Supabase or Firebase means writing one more adapter, or replacing
a repository, without touching a single component.

## Passwords

scrypt from Node's own crypto, N=2^16, r=8, p=2, a 32-byte key and a 16-byte random
salt. OWASP accepts scrypt alongside Argon2id and bcrypt, and it is the only one of
the three available without a native addon — which matters when the same code has to
run in a serverless function with no compile step that could fail at deploy time.

The work factors are stored inside the hash string, so raising them later invalidates
nobody's password: verification reports when a hash used weaker settings and the login
route re-hashes silently. Comparison is constant-time. Passwords are never logged,
never emailed, and never included in an export.

## Sessions

The browser holds one opaque, HMAC-signed session id. Nothing else — no token in
`localStorage`, where any injected script could read it.

- `HttpOnly`, so no script can read the cookie.
- `SameSite=Lax`, so a cross-site form post cannot carry the session, while an
  ordinary link from an email still arrives signed in.
- `Secure` in production. Off in development only because `localhost` is plain HTTP
  and a `Secure` cookie there would simply be dropped.
- Validated against the stored record on **every** request, which is why revoking a
  device takes effect on that device's next request rather than whenever a token
  happens to expire. This is the whole reason it is not a self-contained JWT.
- Renewed once past the halfway mark of its lifetime, so an active session does not
  expire under someone mid-use.
- 7 days by default, 30 with "keep me signed in" (`CINEORA_SESSION_TTL`,
  `CINEORA_REMEMBER_TTL`), and at most 12 concurrent sessions per account.
- A fresh 32-byte id is minted on every sign-in, on verification and on a password
  reset, so no id is ever reused across an authentication event; a password change
  revokes every *other* session and keeps the current one alive.

Authenticated pages are protected server-side at the route, not by hiding a link.
There is no `middleware.ts`: adding one would opt the whole app out of static
prerendering, and the endpoints already check for themselves.

## CSRF and origin

Every state-changing endpoint requires both a matching `Origin`/`Referer` and a
`x-cineora-csrf` header equal to the `cineora_csrf` cookie. The CSRF cookie is
HttpOnly and minted for anonymous visitors too, because sign-in and password reset
need the same protection as an authenticated write. Requests must be
`application/json` with a size limit, and every field goes through explicit
validation before it reaches storage.

## Email tokens

32 random bytes, delivered in the link, stored **only** as a SHA-256 digest. A leaked
database therefore cannot be replayed against the live site. Each token is single-use
and expires — 60 minutes for address verification, 30 for a password reset, because
that one is a live path to changing a password. Issuing a new one invalidates the
previous one, and using one marks it used.

Links are never built from the request's `Host` header unless it matches the
configured site or localhost, so a forged host cannot mail a victim a link pointing at
a copy of the site.

Verification also accepts a typeable `XXXX-XXXX` code for anyone reading mail on a
different device. The code is short by design; rate limiting and single use are what
carry the security.

## Account enumeration

Sign-in, registration and "forgot password" answer the same whether or not an address
exists. Registering an address that is already in use sends *that address* a notice
that someone tried, which is useful to its owner and tells the sender nothing.

## Rate limiting

Buckets are persisted in the same store as everything else — a counter in module scope
would be worthless where every container starts fresh. Blocks double on repetition and
stop at fifteen minutes; a successful sign-in clears the bucket. Nobody is locked out
of their own account for mistyping a password.

| Endpoint | Limit |
| --- | --- |
| Sign in | 8 per 15 min per account, 30 per 15 min per IP |
| Register | 5 per hour per IP, 3 per hour per address |
| Resend verification | 3 per hour |
| Verify | 12 per 15 min |
| Forgot password | 5 per hour |
| Reset password | 10 per hour |
| Change password | 5 per 15 min |
| Profile edits | 30 per 5 min |
| Avatar upload | 12 per hour |
| Download authorization | 60 per hour |
| Data export | 4 per hour |
| Account deletion | 5 per hour |

IP addresses are stored as digests, never in the clear.

## Uploads

An avatar is never stored as it arrived. The bytes are size-capped as they are read,
the real magic bytes decide the format rather than the client's declared content type,
the number of pixels the decoder will accept is bounded, and the image is re-encoded
through sharp — so what lands in storage is output this server produced, not input a
stranger supplied. It is served from an authenticated endpoint with `nosniff`, never
from a public path.

## What is deliberately absent

- **Two-factor authentication.** Not implemented, and not faked. The security screen
  says so in plain words instead of offering a switch that stores a flag — a toggle
  labelled "two-factor authentication" that adds no second factor tells someone they
  are protected when they are not.
- **Password recovery by email of the password.** Impossible by construction: only a
  hash is stored.
- **Any client-side secret.** Nothing prefixed `NEXT_PUBLIC_` is confidential, so
  nothing confidential carries that prefix.

## Logging

Never logged: passwords, password hashes, SMTP credentials, the session secret, raw
session ids, raw email tokens, download grants, asset URLs. `src/server/log.ts` masks
addresses and long opaque strings in anything derived from an error, unconditionally,
rather than trusting each call site to remember — third-party libraries quote server
replies, and those replies sometimes contain the authenticating address.

A security event log *is* kept, and readers can see their own in
Account → Recent activity: sign-ins, sign-outs, password changes, verification,
profile edits, session revocations, authorized downloads, and the device and coarse
location each came from.

## What a reader can take with them

Account → Privacy offers a JSON export of everything the server holds about them, and
account deletion behind a deliberate typed confirmation. The export contains no
password hash, session id or reset token: it is going to sit in a downloads folder, so
it holds what is theirs and nothing that could be replayed against the account.
