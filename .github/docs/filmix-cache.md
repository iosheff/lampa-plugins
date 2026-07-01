# Lane enrichment, cache & pagination — implementation details

## Card enrichment

`enrichCards(cards, done)` fills each lane/list card with TMDB
rating/poster/backdrop/tmdb_id via `tmdbFindMeta` (one TMDB search per title,
concurrency 8). Filmix gives no ratings, so first load of a screen is slow
(~150 searches); cached after. Gated by the `filmix_tmdb_cards` toggle.

For Filmix serial cards, TMDB title lookup should use `filmix_original_name`
(fallback: `original_name`/`name`) because `original_name` may be intentionally
empty for quality-badge rendering.

## Persistent cache

`_tmdbMeta` (key `tv:|mv: + title|year` → `{m, ts}`) is saved to
`Lampa.Storage('filmix_tmdb_cache')` with a **7-day TTL** (soft cap 3000,
debounced save, pruned in `loadMetaCache()` at init).

Warm `category()` ≈ 190ms / 0 network vs ~10s / 100 fetches cold.

## Pagination ("more" element)

Each lane row carries `total_pages:999` and `url:'filmix?filter=<cat>&sort=<sort>'`.
Lampa shows the "more" element when `row.total_pages > 1`; clicking opens
`category_full` → calls `list()` which paginates (infinite scroll + page indicator).
`parseCat()` reads `filter=`/`sort=` from that url authoritatively (handles
`s7-c6` collection codes too).

## "Continue watching" lane

`continueCards(type)` uses `Lampa.Favorite.continues('movie'|'tv'|'anime')`
(drops viewed/thrown, filters by type) for category pages, and
`Favorite.get({type:'history'})` minus viewed/thrown for the all-types home lane.

Section → type: `s0`→movie, `s93`→anime, `s7`/`s14`→tv.

History cards are already TMDB cards (from the redirect), so no enrichment/"more".

> **Note:** Lampa only adds to history on **playback start**
> (`Favorite.add('history', movie, 100)`), not on card open — so the lane is
> empty until something is actually watched.

## Home title fix

`fixHomeTitle()` is called at the start of `main()`. A third-party custom-home
plugin (`surs.js`, action `custom-main`) sets the title as `Главная - filmix`
(lowercase source key). We rewrite the active activity title and the
`.head__title` DOM to uppercase (`FILMIX`).
