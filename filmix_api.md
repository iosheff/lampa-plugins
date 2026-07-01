# Filmix API v2 (discovered from official Android app)

Last updated: 2026-07-01

## Sources

- `https://filmix.my/consoles/android-uhd`
- APK: `https://filmix.my/android/filmixapp-2.2.13.apk`
- Extracted strings from `classes.dex` / `classes2.dex`
- Runtime probe with `curl` against API host

## Base URL

- `http://filmixapp.cyou/api/v2/`

## Common auth/query params

Observed in app strings and verified requests:

- `app_lang` (example: `ru_RU`)
- `user_dev_apk` (example: `2.2.13`)
- `user_dev_id` (16-char id)
- `user_dev_name` (example: `Xiaomi`)
- `user_dev_os` (example: `11`)
- `user_dev_vendor` (example: `Xiaomi`)
- `user_dev_token` (empty for public endpoints, token required for user features)

Example query suffix:

`app_lang=ru_RU&user_dev_apk=2.2.13&user_dev_id=abcdefghijklmnop&user_dev_name=Xiaomi&user_dev_os=11&user_dev_vendor=Xiaomi&user_dev_token=`

## Endpoints discovered in APK

### Catalog and discovery

- `GET /catalog`
- `GET /popular`
- `GET /top_views`
- `GET /suggest?word=...`
- `GET /search?story=...`
- `GET /category_list`
- `GET /filter_list`
- `GET /deferred`

### Content details

- `GET /post/{id}`
- `GET /person/{id}`
- `GET /comments/{id}`
- `GET /episode_date/{id}`
- `POST /post/rate`
- `GET /torrent/{id}`

### User/history/watchlist/favorites

- `GET /history`
- `POST /history/remove`
- `POST /history_clean`
- `POST /add_watched`
- `GET /favourites`
- `POST /toggle_fav/{id}`
- `POST /toggle_wl/{id}`

### Notifications

- `GET /notifications/all`
- `POST /notifications/read`
- `POST /notifications/readall`
- `POST /notifications/clean`

### Auth/device/update/system

- `GET /token_request`
- `GET /user_profile`
- `GET /check_update`
- `POST /change_server`
- `GET /playlist-items/{id}`

## Verified behavior notes

- `/popular` responds and supports section filter via `section=`:
  - `section=7` returns series-focused list
  - `section=999` returns movies-focused list
  - `section=14` returns cartoons (verified 2026-07-01: 50 items, all `section:14`)
  - `section=93` returns anime (verified 2026-07-01)
  - `section=0` behaves like `999` (movies)
- `/top_views` responds, but ignores `section=`/`filter=` entirely — always
  returns a movies-only (`s0`) list (re-verified 2026-07-01). Not usable for
  per-category "now watching".
- The filmix.gg site's "Сейчас смотрят" sliders are server-rendered from the
  web-only `/api/movies/list_watched` (Cloudflare-protected, no CORS) — their
  exact item list/order cannot be reproduced via the app API; `/popular?section=`
  is the closest equivalent.
- `/catalog` works as expected with `filter=` and `orderby=` (`s0`, `s7`, `s14`, `s93`).

## Verified integration quirks (plugin-side)

- `GET /search` uses `story=` (not `s=`). Requests with `s=` may return empty
  results without an explicit error.
- In plugin testing, `/search` required a valid `user_dev_token` for stable
  non-empty responses.
- `GET /post/{id}` can return `404` with body like `{ "message": null }` for
  IDs that are still present in catalog responses.
- `GET /comments/{id}` returns flat items that should be grouped by `parent_id`
  to render a thread tree.
- Titles/descriptions can contain HTML entities (`&#...;`), so decoding is
  recommended before title matching against external sources.

## Related web endpoints (site frontend, not app API)

Found in `https://filmix.my/templates/Filmix/media/public/js/site-main.js`:

- `/api/movies/list_watched`
- `/api/notifications/get`
- `/api/v2/suggestions`

Notes:

- Direct external calls to many `https://filmix.my/api/...` endpoints may return `403`/`503` due to Cloudflare protection.
- For plugin integration, prefer `filmixapp.cyou/api/v2` endpoints when possible.
