# TMDB integration — implementation details

## API helpers

- `Lampa.TMDB.key` is a **function** — call `Lampa.TMDB.key()` (returns the
  standard public key). `Lampa.TMDB.api(path)` returns the proxied URL.
- `tmdbGet(path, onok, onerr, valid)` tries the Lampa proxy first, then falls
  back to `https://api.themoviedb.org/3/` directly. The optional `valid(data)`
  predicate retries on the direct host if the proxy returns a 200 that's missing
  expected data (the proxy sometimes strips `append_to_response`).
- Detail call uses `append_to_response=credits,recommendations,similar,external_ids,videos`
  to fill cast (with photos), similar, recommendations, imdb_id in one request.

## Redirect mode (`full()`)

Search TMDB by decoded title+year (with a no-year fallback retry, since Filmix
year often differs from TMDB), then:

```js
Lampa.Activity.replace({ component: 'full', source: 'tmdb', id: tmdbId, method });
```

- Use `replace` (not `push`) so Back returns to the lane.
- If the card already carries a `tmdb_id` (from lane enrichment), redirect
  immediately with no search.
- ⚠️ `Activity.replace` **must** be wrapped in `setTimeout(..., 0)` — calling it
  synchronously inside `full()`/onCreate races the activity creation and causes
  an infinite spinner.
