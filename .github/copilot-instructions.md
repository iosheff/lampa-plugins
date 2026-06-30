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
- Lampa computes media type as `card.original_name ? 'tv' : 'movie'`. So
  **series** get `name`/`original_name`; **movies** get `title`/`original_title`.
- The full-card renderer reads several fields **without a guard** — a card
  missing them throws and the page hangs on an infinite spinner:
  - `card.production_companies.length`, `card.production_countries`, `card.genres`
    → always set these (at least `[]`).
  - `card.title.length` → **every card must have `title`**, including series
    (set `title` in addition to `name`; it doesn't affect tv/movie detection,
    which is by `original_name`).
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

## Filmix API v2 quirks (verified)

Auth query string on every request (token optional, kept only for search):
```
app_lang=ru_RU&user_dev_apk=2.1.2&user_dev_id={16-char id}&user_dev_name=Xiaomi
&user_dev_os=11&user_dev_vendor=Xiaomi&user_dev_token={token}
```

- **Catalog**: `GET /catalog?filter=s0|s7|s14|s93&orderby=date|rating|year|kp_rating&page=N`.
  - ⚠️ The params are `filter` and `orderby`. `cat` and `sort` are **silently
    ignored** (return a default mixed list).
  - Sections: `s0`=movies, `s7`=series, `s14`=cartoons, `s93`=anime.
  - `orderby=date` = recently updated (new episodes); `orderby=year` = newest
    titles by release year (used for the "New series" lane).
  - **Country/collection filter**: `filter=<section>-c<id>` where `c6`=Russian,
    `c996`=Foreign. E.g. `filter=s7-c6` (Russian series), `filter=s0-c996`
    (foreign films). Works with `orderby`/`page`. `country=`/`category=` params
    are silently ignored; there are NO `/genres`,`/categories`,`/countries`
    endpoints (all 404). IDs come from filmix.my URLs like `/seria/c6/`.
- **Search**: `GET /search?story={query}&{auth}`. ⚠️ The param is `story`, not
  `s` (which silently returns `[]`). **Requires a token.**
- **Post details**: `GET /post/{id}?{auth}`. Can return **404 `{message:null}`**
  for items that exist in the catalog — handle gracefully (fall back to the
  catalog card + TMDB; never an empty card).
- **Person**: `GET /person/{id}?{auth}`.
- Titles/overviews come **HTML-entity-encoded** (e.g. `33 d&#237;as`). They MUST
  be decoded (`decodeHtml()`) before use, or TMDB matching fails.
- **No external IDs**: the API does NOT return `tmdb_id`/`kinopoisk_id`/`imdb_id`
  (only `kp_rating`/`imdb_rating`, often `"-"`). So TMDB matching is by
  **title + year only**.

### Token (device-activation flow)

The Filmix token = the long `code` returned by `token_request`, which becomes
valid once the user enters the short `user_code` on filmix.me → Profile →
Devices. Flow:
1. `GET /token_request?{auth}` → `{status:'ok', code, user_code}`.
2. Show `user_code` in a persistent `Lampa.Select.show` dialog.
3. Poll `GET /user_profile?{auth}&user_dev_token={code}` every 5s — returns `{}`
   until confirmed, then `{user_data:{...}}`. On `user_data` → save `code` as
   the token. (There is NO `token_request/check` endpoint.)
4. `user_dev_id` must stay the SAME between request and all later calls (the
   token is bound to the device). Persisted in `Lampa.Storage('filmix_device_id')`.

The token is kept **only for the plugin's own `search()`**. Catalog and the
TMDB redirect do not need it.

## TMDB integration

- `Lampa.TMDB.key` is a **function** — call `Lampa.TMDB.key()` (returns the
  standard public key). `Lampa.TMDB.api(path)` returns the proxied URL.
- `tmdbGet(path, onok, onerr, valid)` tries the Lampa proxy first, then falls
  back to `https://api.themoviedb.org/3/` directly. The optional `valid(data)`
  predicate retries on the direct host if the proxy returns a 200 that's missing
  expected data (the proxy sometimes strips `append_to_response`).
- Detail call uses `append_to_response=credits,recommendations,similar,external_ids,videos`
  to fill cast (with photos), similar, recommendations, imdb_id in one request.
- **Redirect mode** (`full()`): search TMDB by decoded title+year (with a
  no-year fallback retry, since Filmix year often differs from TMDB), then
  `Lampa.Activity.replace({component:'full', source:'tmdb', id:tmdbId, method})`.
  `replace` (not `push`) so Back returns to the lane. If the card already carries
  a `tmdb_id` (from lane enrichment), redirect immediately with no search.
  ⚠️ The `Activity.replace` MUST be wrapped in `setTimeout(...,0)` — calling it
  synchronously inside `full()`/onCreate races the activity creation and hangs
  on an infinite spinner.

## Lane enrichment, cache & pagination

- `enrichCards(cards, done)` fills each lane/list card with TMDB
  rating/poster/backdrop/tmdb_id via `tmdbFindMeta` (one TMDB search per title,
  concurrency 8). Filmix gives no ratings, so first load of a screen is slow
  (~150 searches); cached after. Gated by the `filmix_tmdb_cards` toggle.
- **Persistent cache** `_tmdbMeta` (key `tv:|mv: + title|year` → `{m, ts}`) is
  saved to `Lampa.Storage('filmix_tmdb_cache')` with a **7-day TTL** (soft cap
  3000, debounced save, pruned in `loadMetaCache()` at init). Warm `category()`
  ≈ 190ms / 0 network vs ~10s/100 fetches cold.
- **"more" element + pagination**: each lane row carries `total_pages:999` and
  `url: 'filmix?filter=<cat>&sort=<sort>'`. Lampa shows the "more" element when
  `row.total_pages > 1`; clicking opens `category_full` → calls `list()` which
  paginates (infinite scroll + page indicator). `parseCat()` reads `filter=`/
  `sort=` from that url authoritatively (handles `s7-c6` collection codes too).
- **"Continue watching"** lane: `continueCards(type)` uses
  `Lampa.Favorite.continues('movie'|'tv'|'anime')` (drops viewed/thrown, filters
  by type) for categories, and `Favorite.get({type:'history'})` minus
  viewed/thrown for the all-types home lane. Section→type: s0→movie, s93→anime,
  s7/s14→tv. History cards are already TMDB cards (from the redirect), so no
  enrichment/"more". NOTE: Lampa only adds to history on **playback start**
  (`Favorite.add('history', movie, 100)`), not on card open — so the lane is
  empty until something is actually watched.
- **Home title fix** (`fixHomeTitle()`, called at the start of `main()`): a
  third-party custom-home plugin (`surs.js`, action `custom-main`) sets the
  title as `Главная - filmix` (lowercase source key). We rewrite the active
  activity title and the `.head__title` DOM to uppercase (`FILMIX`).

## Settings (Lampa.SettingsApi → component "mediasources")

- `filmix_token` (input) — Filmix token for search.
- `filmix_tmdb_cards` (trigger, default on) — enrich cards with TMDB
  rating/poster/data (also drives lane enrichment + persistent cache).
- `filmix_tmdb_redirect` (trigger, default on) — open the native TMDB card.
- `filmix_foreign` (trigger, default on) — show "Foreign" lanes
  on the films and series pages.
- `filmix_russian` (trigger, default on) — show "Russian" lanes
  on the films and series pages.
- "Link Filmix account" (button) — runs the device-activation flow.
- "Check token" (button).

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

## Deploy & testing notes

- Deployed via GitHub Pages; **propagation is often slow (1–5 min)** after a
  push, and Lampa caches plugin JS in the browser — a normal reload may run
  stale code. Hard-reload (Ctrl+Shift+R) or re-add the plugin to pick up changes.
- Live testing was done against the real Lampa instance at `bylampa.online`.
- Lampa globals available: `Lampa.Api.sources`, `Lampa.Storage`, `Lampa.TMDB`,
  `Lampa.Reguest`, `Lampa.Activity`, `Lampa.Select`, `Lampa.Noty`,
  `Lampa.Controller`, `Lampa.SettingsApi`, `Lampa.Lang`, `Lampa.Utils`,
  `Lampa.Listener`, `Lampa.Params`.
