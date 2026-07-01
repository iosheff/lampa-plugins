# MediaSources — Lampa plugin (Filmix catalog → TMDB cards)

Project context for AI coding assistants. This repo contains a single source
plugin for the [Lampa](https://github.com/yumata/lampa) media player.

## What this plugin does

- Adds **Filmix** (`http://filmixapp.cyou/api/v2/`) as a content source in Lampa.
- The **catalog** (home rows, category lanes, search) comes from Filmix.
- Lane cards are **enriched with TMDB rating + poster + tmdb_id** (CUB-like look),
  with a 7-day persistent cache. Each lane shows a "more" element → a paginated
  full grid with infinite scroll.
- When a card is opened, it **redirects to the native TMDB card** (reviews,
  seasons/episodes, recommendations — all native) by matching Filmix
  title+year against TMDB. If no TMDB match, it renders a Filmix card enriched
  with TMDB data as a fallback.
- A **"Continue watching"** lane (from Lampa history) is the first lane on home
  (all types) and in each category (type-filtered).
- **"Foreign"/"Russian" collection lanes** on the films and series pages
  (via `filter=<section>-c996/-c6`).
- **Playback is intentionally NOT implemented here** — the user relies on the
  `online_mod` plugin (nb557) for the player, which has its own Filmix token.
- The plugin registers a settings section named **"MediaSources"** (the name
  "Filmix" is already used by another third-party plugin).
- The home title is normalized to uppercase (`Главная - FILMIX`) — see below.

## Files

- `mediasources.js` — the entire plugin (single IIFE, plain ES5-style browser
  JS, no build step). **This is the only source file.** Was renamed from
  `filmix.js` to match the "MediaSources" settings name.
- `filmix_api.md` — reverse-engineered Filmix API v2 documentation.
- `filmix_test.html` — a standalone browser smoke-test page with a mock Lampa.
- Deployed via GitHub Pages at
  `https://iosheff.github.io/lampa-plugins/mediasources.js`.

## How Lampa calls a source plugin (the contract)

The plugin sets `Lampa.Api.sources['filmix'] = Source` (note: the **source key
is `filmix`**, only the *settings UI* is called MediaSources). Lampa invokes
methods with **positional callbacks**, NOT `params.onComplite`:

- `main(params, oncomplite, onerror)` → `oncomplite([{title, results:[cards]}, ...])` — array of rows.
- `category(params, oncomplite, onerror)` → same shape (array of rows). Reads `params.url` / `params.genres`.
- `list(params, oncomplite, onerror)` → `oncomplite({results:[cards], total_pages})`.
- `full(params, oncomplite, onerror)` → `oncomplite({movie, persons:{cast,crew}, simular:{results}, recomend:{results}, episodes:{episodes,seasons_count,name}, videos:{results}})`.
- `seasons(tv, from, oncomplite)` → `oncomplite({[seasonNum]:{episodes, seasons_count}})`.
- `person(params, oncomplite, onerror)` → `oncomplite({person, credits:{knownFor:[{name, credits:[cards]}]}})`.
- `menu(params, oncomplite)`, `search(params, oncomplite, onerror)`, `clear()`.

### Card rules (hard-won, do not regress)

- Every Filmix card MUST have `source: 'filmix'`, otherwise clicks route to TMDB.
- Lampa computes media type as `card.original_name ? 'tv' : 'movie'`.
- In this plugin we intentionally keep `original_name` empty for Filmix series
  lane/list cards so Lampa renders the quality badge for serials (otherwise it
  shows `TV` and hides quality).
- To preserve series logic despite empty `original_name`, use plugin fields:
  `filmix_is_serial` and `filmix_original_name`.
- The full-card renderer reads several fields **without a guard** — a card
  missing them throws and the page hangs on an infinite spinner:
  - `card.production_companies.length`, `card.production_countries`, `card.genres`
    → always set these (at least `[]`).
  - `card.title.length` → **every card must have `title`**, including series
    (set `title` in addition to `name`).
- Posters: Filmix returns full poster URLs, but `Lampa.Api.img` always prepends
  the TMDB base. So for Filmix posters set `card.poster` AND `card.img` to the
  full URL and DO NOT set `poster_path`. For TMDB-enriched cards, set
  `poster_path`/`backdrop_path` (TMDB paths) — Lampa then renders TMDB art.

### Networking gotchas

- Use native `fetch` (in `get()`), not `Lampa.Reguest` — `Lampa.Reguest` is
  unstable on some builds (`clear is not defined`). Exception: TMDB calls use
  `Lampa.Reguest` because raw `fetch` to TMDB fails CORS.
- In `get()`, use `fetch().then(onFulfilled, onRejected)` (two-arg form), NOT
  `.catch()` — otherwise exceptions thrown inside the success/build callback
  falsely trigger `onError`.

## Filmix API v2 quirks

> Full reference: [`filmix_api.md`](../filmix_api.md)

- Catalog: `filter=` + `orderby=` only (`cat=`/`sort=` silently ignored).
- Sections: `s0`=movies, `s7`=series, `s14`=cartoons, `s93`=anime.
- Country filter: `filter=<section>-c<id>` (`c6`=Russian, `c996`=Foreign).
- Search: `story=` param, token required (`s=` returns `[]` silently).
- `/post/{id}` can 404 for catalog items — handle gracefully, never show empty card.
- Titles are HTML-entity-encoded — always `decodeHtml()` before TMDB matching.
- No external IDs — matching is title+year only.
- Token flow: `GET /token_request` → show `user_code` → poll `/user_profile` every 5s until `user_data` → save `code` as token. `user_dev_id` must be stable.

## TMDB integration

> Details: [`.github/docs/filmix-tmdb.md`](docs/filmix-tmdb.md)

- `Lampa.TMDB.key()` is a function (not a property). `Lampa.TMDB.api(path)` returns the proxied URL.
- `tmdbGet(path, onok, onerr, valid)` — proxy first, direct fallback; `valid(data)` triggers retry.
- Detail: `append_to_response=credits,recommendations,similar,external_ids,videos`.
- **Redirect**: `Lampa.Activity.replace(...)` — use `replace` not `push`, wrap in `setTimeout(...,0)`.

## Lane enrichment, cache & pagination

> Details: [`.github/docs/filmix-cache.md`](docs/filmix-cache.md)

- `enrichCards(cards, done)` fills TMDB data per card (concurrency 8). Gated by `filmix_tmdb_cards`.
- Serial cards: use `filmix_original_name` for TMDB lookup (not `original_name` — intentionally empty).
- Cache: `Lampa.Storage('filmix_tmdb_cache')`, 7-day TTL, max 3000 entries.
- Pagination: rows carry `total_pages:999` + `url:'filmix?filter=...'`; `parseCat()` parses the url.
- Continue watching: `continueCards(type)` — history cards are already TMDB cards, no enrichment needed.

## Settings (Lampa.SettingsApi → component "mediasources")

- `filmix_token` (input) — Filmix token for search.
- `filmix_tmdb_cards` (trigger, default on) — enrich cards with TMDB
  rating/poster/data (also drives lane enrichment + persistent cache).
- `filmix_quality_label` (trigger, default on) — show/hide quality labels on
  cards in lanes/lists.
- `filmix_tmdb_redirect` (trigger, default on) — open the native TMDB card.
- `filmix_foreign` (trigger, default on) — show "Foreign" lanes
  on the films and series pages.
- `filmix_russian` (trigger, default on) — show "Russian" lanes
  on the films and series pages.
- "Link Filmix account" (button) — runs the device-activation flow.
- "Check token" (button).

### Trigger value parsing

- Lampa SettingsApi trigger values can be stored as strings (`"true"`,
  `"false"`, `"1"`, `"0"`). Do NOT parse toggles with raw `!!value`.
- Use explicit normalization for booleans when reading trigger settings.

## i18n

- English is the base language; Russian is a translation.
- All UI strings live in the `LANG` dict (`{ en, ru }` per key), registered via
  `Lampa.Lang.add(LANG)` in `init()`. Resolve strings with the `L(key)` helper.
- ⚠️ `Lampa.Lang.translate` returns the **key itself** (not English) when a
  translation is missing — that's why `L()` falls back to `LANG[key].en`, and
  why every key should define both `en` and `ru`.

## Conventions / constraints

- Plain browser JS, ES5-ish (the file runs directly in Lampa/webviews). No build,
  no modules, no TypeScript. Keep it as a single IIFE.
- Match the existing code style: 4-space indent, `var`, function expressions.
- Comments and identifiers are in English; user-facing strings go through i18n.
- After editing, validate with `node -c mediasources.js`.

## Assistant workflow

- After any compact conversation, re-read this file before making further
  decisions or code changes.
- **Be concise.** Keep responses as short as possible. Skip explanations unless
  explicitly asked.

## Input model (critical)

- **Keyboard/remote-first UX is mandatory.** Mouse is secondary.
- **Always choose standard Lampa integration first.** For new UI/UX behavior,
  first look for native Lampa components/APIs and integrate through them.
- Any new popup/overlay for user interaction should prefer **Lampa-native UI**
  (`Lampa.Modal`, `Lampa.Select`) over custom DOM overlays.
- Do **not** implement custom UI immediately. If no standard Lampa approach is
  found, propose options and **get explicit agreement** before implementing a
  custom solution.
- If a custom interaction layer is unavoidable, it MUST be wired to
  `Lampa.Controller` (`toggle`, `back`, directional navigation), otherwise TV
  remotes may not work correctly.
- The **Back button on remote** must close active UI via controller flow
  (`Controller.back()`/active controller `back` handler), not only via browser
  key handlers like `Escape` or `Backspace`.

## Deploy & testing notes

- Deployed via **GitHub Pages** from the `main` branch.
- Plugin URL: `https://iosheff.github.io/lampa-plugins/mediasources.js`.
- **Workflow**: commit and push directly to `main` (no PRs needed).
- **Propagation is often slow (1–5 min)** after a push, and Lampa caches
  plugin JS in the browser — a normal reload may run stale code.
  Hard-reload (Ctrl+Shift+R) or re-add the plugin to pick up changes.
- Live testing is done against the real Lampa instance at `bylampa.online`.
- For keyboard/remote behavior, **device testing has priority** (TV/STB remote
  events). Synthetic browser `KeyboardEvent` checks are useful for smoke checks
  but are not authoritative for Lampa controller behavior.

### Deploy steps (for AI assistants)

1. Make changes to `mediasources.js`.
2. Validate syntax: `node -c mediasources.js`.
3. Commit: `git add -A && git commit -m "<message>"`.
4. Push to main: `git push origin HEAD:main` (or `git push` if already on main).
5. Wait for GitHub Pages propagation (usually 1–5 min) and confirm freshness
   (e.g. compare local/remote SHA with cache-busting query).
6. Verify in Lampa (`bylampa.online`) after hard-reload.
7. **Check functional behavior in Chrome via MCP browser tools** — open
   `https://bylampa.online`, navigate to the changed feature, confirm it works
   as expected (click, keyboard nav, card open, etc.).
8. For input/navigation changes, verify on real TV/STB remote (Back, arrows,
   Enter/OK), not only in desktop browser.

### Lampa globals available

`Lampa.Api.sources`, `Lampa.Storage`, `Lampa.TMDB`, `Lampa.Reguest`,
`Lampa.Activity`, `Lampa.Select`, `Lampa.Noty`, `Lampa.Controller`,
`Lampa.SettingsApi`, `Lampa.Lang`, `Lampa.Utils`, `Lampa.Listener`,
`Lampa.Params`.
