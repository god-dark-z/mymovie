# Downloads

Cineora offers a file for download **only** when the operator of a deployment has
declared that file and named the licence that permits distributing it. There is no
default catalogue, and the feature is invisible until one exists.

That is not caution for its own sake. Cineora is a front end over public metadata and
a third-party embed: it hosts no video and holds no distribution rights to anything
the metadata or playback providers serve. So it does not inspect, unwrap, re-host or
extract a provider's stream, and it does not remove or work around any protection on
one. The only bytes it will hand out are bytes an operator has supplied.

## How it works

Authorization and transfer are two separate requests, because a download cannot rely
on a session cookie. A browser's downloader — or a WebView host's download manager —
issues its own request, often more than one to resume or seek, without the credentials
the page had.

1. `POST /api/downloads/grant` — same-origin, CSRF-checked, requires a **verified**
   signed-in account, rate limited to 60 per hour per account, and logged as a
   `download.authorized` security event. It answers with a root-relative URL
   containing a signed grant, plus the file name, size and content type.
2. `GET /api/downloads/file?g=…` — cookie-free. The grant is the whole authorization
   and it lasts **15 minutes**. Say that plainly rather than hiding it: for those
   fifteen minutes the URL *is* the permission. It is not a session, cannot be
   exchanged for one, carries no personal data beyond an account id its holder already
   is, and stops working when the clock runs out or `SESSION_SECRET` is rotated.

Asset URLs never reach a browser. They exist only in `src/server/downloads/catalog.ts`;
a client sees an opaque key, and the server turns that key back into a file by scanning
the operator's own declared list, so an edited or forged key cannot point anywhere that
was not declared.

## Configuring the catalogue

Set `CINEORA_DOWNLOAD_CATALOG` to a JSON array (or an object with a `titles` array).
It belongs in your host's environment variables, not in the repository: a signed
storage URL is a credential.

```json
[
  {
    "titleId": "tt1234567",
    "kind": "movie",
    "title": "Our Own Short Film",
    "licence": "Produced by us. CC BY-SA 4.0, distribution permitted.",
    "files": [
      {
        "quality": "1080p",
        "sizeBytes": 1476395008,
        "contentType": "video/mp4",
        "url": "https://files.example.com/short-film-1080p.mp4",
        "delivery": "redirect"
      },
      {
        "quality": "720p",
        "sizeBytes": 734003200,
        "contentType": "video/mp4",
        "url": "https://files.example.com/short-film-720p.mp4"
      }
    ]
  },
  {
    "titleId": "tt7654321",
    "kind": "tv",
    "season": 1,
    "episode": 2,
    "title": "Our Own Series",
    "licence": "Owned outright. Cleared for download by the rights holder, 2026-04-01.",
    "files": [
      {
        "quality": "720p",
        "sizeBytes": 512000000,
        "contentType": "video/x-matroska",
        "url": "https://files.example.com/series-s01e02-720p.mkv"
      }
    ]
  }
]
```

### Entry fields

| Field | Required | Notes |
| --- | --- | --- |
| `titleId` | yes | The route id the title is reachable at, e.g. the IMDb id in `/movie/tt1234567`. This is how a Download button finds its files. May not contain `~`. |
| `kind` | yes | `movie`, `tv` or `anime`. |
| `title` | yes | Shown in the sheet and used to build the file name. |
| `licence` | yes | Your stated basis for distributing these files. **Rendered verbatim to the reader.** An entry without one is rejected. |
| `season`, `episode` | for episodes | Omit both for a film. An episode entry is one object per episode. |
| `files` | yes | At least one. An entry with no valid file is dropped. |

### File fields

| Field | Required | Notes |
| --- | --- | --- |
| `quality` | yes | `auto`, `480p`, `720p` or `1080p`. One file per rung per entry; a duplicate is dropped rather than served ambiguously. `auto` means "source quality". |
| `sizeBytes` | yes | A whole number. Shown before the download starts, and passed to a native download manager. |
| `contentType` | yes | `video/mp4`, `video/webm` or `video/x-matroska`. Also decides the file extension. |
| `url` | yes | Absolute `https`. Never sent to a browser on the `proxy` path. |
| `delivery` | no | `proxy` (default) or `redirect`. |

### `proxy` or `redirect`

`proxy` streams the bytes through `/api/downloads/file`, which keeps the origin
private and forwards `Range` so a resume still works. It is the right default, and the
wrong choice for a large file on a serverless host: a Netlify Function has a response
time limit, and a long transfer through it will be cut off.

`redirect` answers `302` with your own URL instead. Use it for anything substantial,
and pair it with an expiring signed URL from your storage provider — that URL becomes
visible to the client, which is the cost of not passing the bytes through a function.

### When something is wrong

Invalid entries are dropped and counted on the server console. The messages never
include the value or the host, because a catalogue holds credentials. If nothing
appears in the UI, check the deploy log for a line beginning
`[cineora] download catalogue:`.

The catalogue is parsed once per process. Changing the variable takes effect on the
next deploy or cold start, not on the next request.

## What the reader sees

A Download button appears on a title page only when that title has an offer, and the
`/downloads` screen lists every offered title. Both are rendered from operator
configuration alone, with nothing user-specific in them, so a cached page cannot leak
one reader's state to another. Which file is *recommended* is decided in the browser
from the account's download-quality preference.

Signing in and verifying an address are required before a link is issued, and the
sheet says so instead of failing at the last step.

## The optional native bridge

A web page cannot behave like Android's download manager. It cannot queue, pause,
resume across a restart, survive the tab closing, or learn how many bytes have
arrived — a browser download leaves the page's control the moment it starts. Cineora
therefore shows no progress bar it cannot honestly fill, and the device list on
`/downloads` is described as what it is: a note kept in that browser, not a view of
your storage.

A WebView host that *can* do those things may inject a bridge, and downloads are handed
to it instead:

```ts
window.CineoraNative = {
  downloads: {
    version: 1,
    // Returning an id lets Cineora record which queue item this was.
    enqueue(request) { /* url, fileName, contentType, sizeBytes, title, quality, expiresAt */ },
    list?() { /* [{ id, fileName, title, state, progress, sizeBytes }] */ },
    cancel?(id) {},
    remove?(id) {},
  },
};
```

Every member is checked before it is called, an unknown `version` is ignored, and a
host that throws is treated as absent so the browser path still runs. `progress` is
`null` where the host does not track it — it is never invented. The grant expires, so
a host that queues a download for later must ask the page for a fresh link rather than
storing the URL.
