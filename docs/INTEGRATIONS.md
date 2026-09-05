# Integrations

Cineora consumes two public services. Neither requires an API key, an account, or a
secret of any kind, so there is nothing to provision before the app runs.

| Concern  | Service                                     | Adapter                                  |
| -------- | ------------------------------------------- | ---------------------------------------- |
| Metadata | Cinemeta (`https://v3-cinemeta.strem.io`)   | `src/lib/metadata/providers/cinemeta.ts` |
| Playback | Nxsha Embed (`https://nxsha.space/embed`)   | `src/lib/playback/providers/nxsha.ts`    |

Endpoints below were checked against the live services while building the app
(last verified 2026-09-05). Both adapters sit behind an interface, so a service
that changes shape is replaced in one file — see *Replacing a provider*.

## Metadata — Cinemeta

Cinemeta is the public catalogue addon behind Stremio's official catalogs. It was
chosen for one reason above all: it is **IMDb-first and key-free**, and it returns
the matching TMDb id alongside the IMDb id, which is exactly the identity pair the
Nxsha embed endpoints accept.

Verified endpoints:

| Request                                                    | Returns                             |
| ---------------------------------------------------------- | ----------------------------------- |
| `GET /manifest.json`                                       | Addon manifest — used for health    |
| `GET /catalog/{movie\|series}/{top\|year\|imdbRating}.json` | Catalogue page                      |
| `…/{catalog}/genre={genre}&skip={n}.json`                   | Filtered / paged catalogue          |
| `GET /catalog/{movie\|series}/top/search={query}.json`      | Search results                      |
| `GET /meta/{movie\|series}/{ttId}.json`                     | Full detail, including all episodes |

Notes that shaped the adapter:

- The namespace is `series`, not `tv`. Nxsha's namespace *is* `tv`. The two are
  deliberately separate types (`CatalogNamespace` vs `PlaybackKind`) so they can
  never be swapped by accident.
- There is no anime namespace. Anime is detected from genre and country signals in
  `src/lib/metadata/classify.ts` and routed to `/anime/...` as a first-class kind.
- Episode lists arrive with the detail payload, so a season picker needs no extra
  request.
- Ratings are IMDb ratings out of 10. Absent for many titles, in which case no
  rating is rendered rather than a zero.

### Identity rules

`MediaIds` keeps `imdbId`, `tmdbId` and `tvdbId` in separate fields and never
coerces between them. A bare number is never passed off as an IMDb id. The route
id is the IMDb id when one exists, otherwise `tmdb:<id>`, and playback prefers
IMDb because that is the identity Cineora is confident about.

## Playback — Nxsha Embed

Documentation: <https://nxsha.space/embed>. All URL construction lives in
`src/lib/nxsha/provider.ts`; no other file builds an embed URL.

```
https://nxsha.space/embed/movie/{tmdb_or_imdb_id}
https://nxsha.space/embed/tv/{tmdb_or_imdb_id}/{season}/{episode}
```

Documented query parameters, and nothing else:

| Parameter                | Effect                                             |
| ------------------------ | -------------------------------------------------- |
| `server=<node>`          | Preferred node; provider still fails over          |
| `one_server=true`        | Strict single-node playback, disables that fallback |
| `lang=<ISO 639-1>`       | Preferred audio track                              |
| `sub=<ISO 639-1>`        | Preferred subtitle track                           |
| `disable_dl_button=true` | Hides the player's download control                |
| `disable_app_ad=true`    | Hides Nxsha app branding in the player menu        |
| `color=<name\|%23hex>`   | Player accent colour                               |

No other parameter is sent, and no undocumented parameter is invented.

### Anime

**There is no documented anime endpoint.** `/embed/anime/...` is not published on
the embed documentation page and responds `404`. Anime therefore plays through the
documented `tv` endpoint using the series' IMDb or TMDb id — which is what an anime
series is in those databases.

The architecture still separates the three concepts, so a future documented anime
endpoint is a new `PlaybackProvider` plus one `supports()` check, with no change to
any screen:

- `MediaKind` — `movie | tv | anime` (routes and badges)
- `PlaybackKind` — `movie | tv` (what an embed URL can express)
- `CatalogNamespace` — `movie | series` (what Cinemeta reads)

### Servers

`src/lib/nxsha/servers.ts` holds the node names exactly as the documentation lists
them. That page states it lists only a subset and that more nodes exist inside the
player, so this file is a **configuration layer, not a guarantee**. The default
entry, "Auto", sends no `server` parameter at all, which is Nxsha's own documented
multi-server mode with provider-side fallback.

### What the integration cannot do

Nxsha publishes no control API for the embed. There is no documented `postMessage`
interface, no playback-progress event, and no way to ask which audio or subtitle
tracks a specific source actually carries. `PlaybackCapabilities` records this
explicitly:

```ts
trackAvailabilityReporting: false,
playbackProgressReporting:  false,
playerControlApi:           false,
```

Consequences, all of them deliberate:

- **No fake controls.** Play, pause, seek, quality and track switching belong to
  the player inside the iframe. Cineora's control bar only changes what it asks
  for: server, audio language, subtitle language, episode.
- **Failover is timeout-based, and honest about it.** The only observable fact
  about a cross-origin iframe is whether its document fired `load`. A missing
  `load` inside 14 seconds is a real network signal and triggers at most two
  automatic hops; after that the user picks manually. A `load` that *did* fire
  proves nothing about the stream, so nothing is claimed about it. `navigator.onLine
  === false` is treated as the genuine signal it is.
- **Languages are requests, not promises.** The UI says so, and marks nodes that
  are not flagged `[Multi-Lang]` upstream.
- **"Continue watching" records what was opened, not how far it got.** No progress
  bars, no invented percentages. `WatchHistoryEntry` reserves
  `positionSeconds`/`durationSeconds` for a provider that documents them.

## Environment variables

All three are optional and none is a secret. There is **no TMDB API key** anywhere
in this project, and TMDb is never a required dependency.

| Variable                    | Default                        | Purpose                        |
| --------------------------- | ------------------------------ | ------------------------------ |
| `NEXT_PUBLIC_SITE_URL`      | `http://localhost:3000`        | Canonical URLs, OG tags, sitemap |
| `NEXT_PUBLIC_NXSHA_ORIGIN`  | `https://nxsha.space`          | Embed origin override          |
| `CINEORA_CINEMETA_ORIGIN`   | `https://v3-cinemeta.strem.io` | Metadata origin override       |

## Replacing a provider

Metadata: implement `MetadataProvider` (`src/lib/metadata/provider.ts`) and add it
to the list in `src/lib/metadata/manager.ts`. The manager tries providers in order,
keeps a successful-but-empty answer, and reports `degraded` when every provider
failed — screens only ever see the normalized `MediaSummary` / `MediaDetail` types.

Playback: implement `PlaybackProvider` (`src/lib/playback/types.ts`) and register it
in `src/lib/playback/manager.ts`. Declare capabilities truthfully; the watch screen
reads them to decide which controls and caveats to render.

## Boundary

Cineora is a clean frontend over documented, public endpoints. It contains no DRM
circumvention, no authentication or access-control bypass, no scraping of protected
resources, and no attempt to reach inside a provider's player. If a capability is
not documented, it is not implemented — it is recorded as `false` and surfaced to
the user as a limitation.
