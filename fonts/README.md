# Vendored fonts

Self-hosted so the site has no third-party font request and no render-blocking
CDN dependency. `next/font/local` preloads these and sets `font-display: swap`.

| File | Family | Weight | Used for |
|---|---|---|---|
| `InterVariable-latin.woff2` | Inter Variable | 100–900 | All UI and display text (`--font-notion-sans`) |
| `IBMPlexMono-latin-{400,500,600}.woff2` | IBM Plex Mono | 400/500/600 | Code, labels, endpoints (`--font-notion-mono`) |
| `Inter-{400,700}.woff` | Inter | 400/700 | `app/opengraph-image.tsx` only |
| `IBMPlexMono-500.woff` | IBM Plex Mono | 500 | `app/opengraph-image.tsx` only |

The `.woff` files exist because the OG image is rendered by satori, which
cannot decode WOFF2 (`Unsupported OpenType signature wOF2`). The browser-facing
files are the smaller WOFF2s.

## Why these faces

Notion serves a self-hosted cut of Inter under the name "NotionInter", and uses
iA Writer Mono for code and label text. iA Writer Mono is derived from IBM Plex
Mono, which is the closest freely redistributable match. Notion's editorial
serif, Lyon Text, is licensed from Commercial Type and cannot be bundled, so
Georgia stands in — it is the first fallback Notion itself lists.

## Licences

Both families are SIL Open Font License 1.1:

- Inter — `LICENSE-Inter.txt`
- IBM Plex Mono — `LICENSE-IBMPlexMono.txt`

Sourced from `@fontsource-variable/inter`, `@fontsource/inter` and
`@fontsource/ibm-plex-mono`. The latin subsets only; no other scripts are
shipped.
