# MediaSources — Lampa plugin (Filmix catalog → TMDB cards)

Single-file browser plugin for the [Lampa](https://github.com/yumata/lampa) media
player. Adds Filmix as a content source, enriches cards with TMDB data, and
redirects card opens to native TMDB pages.

## Code Style

- **Plain browser ES5** — `var`, function expressions, no modules, no build step.
- Single IIFE in `mediasources.js`. No TypeScript, no npm.
- 4-space indent. English comments/identifiers; user strings go through `L(key)`.
- Match the surrounding style exactly before adding code.

## Build and Test

```sh
# Syntax validation (required before every commit)
node -c mediasources.js

# Commit and deploy
git add -A && git commit -m "<message>"
git push origin HEAD:main        # worktree — always push to main explicitly
```

Deployed via GitHub Pages: `https://iosheff.github.io/lampa-plugins/mediasources.js`.  
Propagation takes 1–5 min; hard-reload Lampa (Ctrl+Shift+R) or re-add the plugin.

## Architecture

| File | Purpose |
|------|---------|
| `mediasources.js` | Entire plugin — single IIFE |
| `filmix_api.md` | Reverse-engineered Filmix API v2 docs |
| `filmix_test.html` | Standalone browser smoke-test with mock Lampa |

**Source key** is `filmix`; settings component is `mediasources` (avoids conflict with a
third-party "Filmix" plugin).

## Critical Conventions

### Lampa source contract
Methods receive **positional callbacks** — `main(params, oncomplite, onerror)`, not
`params.onComplite`. Always match the signature exactly.

### Card rules (hard-won — do not regress)
- Every Filmix card **must** have `source: 'filmix'`; missing → clicks route to TMDB.
- Lampa computes type as `card.original_name ? 'tv' : 'movie'`.  
  Keep `original_name` empty on serial lane cards for quality-badge rendering;  
  use `filmix_is_serial` / `filmix_original_name` instead.
- Always set `card.title` (string), `card.genres` (`[]`), `card.production_companies` (`[]`),  
  `card.production_countries` — these are read without null-guards and will throw.
- Filmix posters: set `poster` **and** `img` to the full URL; do **not** set `poster_path`.  
  TMDB-enriched cards: set `poster_path`/`backdrop_path` only.

### Networking
- Use native `fetch` in `get()` (not `Lampa.Reguest` — unstable on some builds).
- TMDB calls use `Lampa.Reguest` (raw fetch fails CORS).
- `fetch().then(onFulfilled, onRejected)` two-arg form — never `.catch()` (swallows
  exceptions thrown inside the success callback).

### TMDB redirect
`Lampa.Activity.replace(...)` inside `full()` **must** be wrapped in `setTimeout(...,0)`;
calling it synchronously races activity creation → infinite spinner.

### Settings toggles
`Lampa.Storage` stores trigger values as strings (`"true"`, `"false"`, `"1"`, `"0"`).
Never parse with `!!value` — always normalise explicitly.

### i18n
`Lampa.Lang.translate` returns the **key itself** when a translation is missing.
Use the `L(key)` helper (falls back to `LANG[key].en`).  
Every key must define both `en` and `ru`.

### Filmix API v2 gotchas
- Catalog params are `filter=` and `orderby=`; `cat=`/`sort=` are silently ignored.
- Search param is `story=`; `s=` silently returns `[]`. Requires a token.
- Titles come HTML-entity-encoded — always run through `decodeHtml()` before use or
  TMDB matching fails.
- `/post/{id}` can return 404 for items that exist in the catalog — handle gracefully.

## UX / Input Model (mandatory)

- **Keyboard/remote-first.** Mouse is secondary; TV remotes have top priority.
- Prefer **Lampa-native UI** (`Lampa.Modal`, `Lampa.Select`) over custom DOM.
- Any custom interaction layer **must** be wired to `Lampa.Controller`; otherwise TV
  remotes will not work.
- Back button **must** close UI via `Controller.back()` — not only via `Escape`.

## Workflow for AI Assistants

1. After any compact conversation, re-read `.github/copilot-instructions.md` for full
   context before making decisions.
2. Always validate syntax (`node -c mediasources.js`) before committing.
3. Commit and push to `main` after each self-contained change.
4. For UI/navigation changes, note that device testing (TV remote) is authoritative;
   desktop `KeyboardEvent` tests are informational only.
5. Do not add features, refactor, or improve beyond what was asked.
