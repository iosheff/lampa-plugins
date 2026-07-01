# MediaSources — Lampa plugin (Filmix catalog → TMDB cards)

See [AGENTS.md](AGENTS.md) for project overview, conventions, and workflow.

## Key reference files

| File | Contents |
|------|----------|
| `AGENTS.md` | Project overview, conventions, critical rules, workflow |
| `filmix_api.md` | Filmix API v2 full reference |
| `.github/docs/filmix-tmdb.md` | TMDB proxy, redirect, `Activity.replace` details |
| `.github/docs/filmix-cache.md` | Enrichment, cache TTL, pagination, "continue watching" |
| `.github/copilot-instructions.md` | Extended Copilot-specific context |

## Critical rules (quick reference)

- Every Filmix card must have `source: 'filmix'`.
- Always set `card.title`, `card.genres`, `card.production_companies`, `card.production_countries`.
- `Lampa.Activity.replace(...)` inside `full()` must be in `setTimeout(..., 0)`.
- Use `fetch().then(ok, err)` two-arg form — never `.catch()`.
- Settings toggles are stored as strings — never parse with `!!value`.
- Titles from Filmix are HTML-entity-encoded — always `decodeHtml()` before use.
- Work only in the `main` branch.
- Do not create `working tree` / `git worktree` or additional branches.

## Build & deploy

```sh
node -c mediasources.js          # validate syntax
git add -A && git commit -m "…"
git push origin HEAD:main
```

After deploy: verify in Chrome via MCP browser tools at `https://bylampa.online`.
