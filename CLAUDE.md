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
# Always invoke subagent "MediaSources Deploy Agent" for deployment.
# Do not perform manual deploy from the main coding agent.
```

## Claude Code handoff (self-contained)

- This file is the primary instruction entrypoint for Claude Code continuation.
- Keep work on `main` only. Do not create branches or worktrees.
- Before deploy, always run `node -c mediasources.js`.

## Subagent routing (canonical for Claude Code)

- Use **"Code Researcher Agent"** proactively for read-only investigation tasks.
- Triggers: code research, repo/file search, grep/ripgrep, symbol usage lookup,
  log reading, module investigation, "where is X used/defined", audits/reviews
  without edits.
- Scope: read-only exploration and reporting.
- Do not use **"Code Researcher Agent"** for edits, commits, pushes, or
  deployment actions.

- Use **"MediaSources Deploy Agent"** for deployment workflows.
- Triggers: deploy, release, publish, push-to-main for release, post-push
  verification, CDN freshness checks, browser verification after deploy.
- Required flow: syntax validation when code changed, commit+push to `main`, CDN
  propagation verification via curl/hash, then browser verification on
  `http://bylampa.online/`.
- Do not perform manual deploy from the main coding agent.

- Precedence:
- If task is primarily investigation, use **"Code Researcher Agent"** first.
- If task includes deployment, hand off deployment execution to
  **"MediaSources Deploy Agent"**.
- If both apply, do investigation first, then deploy via
  **"MediaSources Deploy Agent"**.

- Fallback:
- If no trigger matches, continue in main agent mode.

After deploy: verify in Chrome via MCP browser tools at `http://bylampa.online/`.
