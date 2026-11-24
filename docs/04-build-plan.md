# Build plan

Each slice runs end to end against a local gateway (`make run` in
`llm-gateway`, then `npm run dev` here) and is checked in a real browser before
the next one starts. Status reflects this repo's `main`.

| # | Slice | Done when | Status |
| --- | --- | --- | --- |
| 0 | Scaffold | Vite, React, TS, Tailwind v4 tokens, Query, Router, the `/api` proxy on :3000; `npm run check` passes | done |
| 1 | API client | Typed `request()` that sends `X-CSRF-Token`, parses the error shape into `ApiError`, and sends a 401 to sign-in; unit tested | done (7 tests pass) |
| 2 | Auth pages | Sign in, sign up, check-your-inbox, `/verify-email`, forgot and `/reset-password`; the unverified state with resend | written, not yet run |
| 3 | App shell | Sidebar, mobile bar, sign out, the session guard, theme follows the system | written, not yet run |
| 4 | Provider keys | List with health, add (custom base URL), test, delete with the in-use message | written, not yet run |
| 5 | Routes | List; the relay editor (add, reorder, remove, timeout); options; create, save, delete | written, not yet run |
| 6 | Gateway keys | List with revoked filter, create with show-once reveal, budget edit, revoke | written, not yet run |
| 7 | Overview | Get-started sequence from live data, a curl that calls the user's own route, a 7-day summary | written, not yet run |
| 8 | Usage | Range and route filter, totals, daily chart, by-model table, budget meter, recent requests | written, not yet run |
| 9 | Logs | Logging state, route filter, expandable request and response, load more, delete all | written, not yet run |
| 10 | Settings and account | The whole-document settings form; change password; sign out everywhere | written, not yet run |
| 11 | Production serving | Caddy serves `dist/` at `/` with SPA fallback, `/api` and `/v1` proxied; `PUBLIC_BASE_URL` = the public origin | open (backend repo: `deploy/`) |
| 12 | End-to-end tests | Playwright against `make run` and the mock provider: sign-up to first call | open |

## Backend follow-ups

- **Done (llm-gateway #50):** the verification mail links `/verify-email`, a
  dashboard page, instead of the JSON endpoint.
- **Open:** slice 11, serving the dashboard from the VM's Caddy. Until then,
  production's mailed links answer 404.
- **Open, small:** `GET /api/usage` returns per-day rows only. A per-route
  breakdown of the recent fallback trail (`X-Fallback-Trail`) is not stored on
  the usage event, so the usage page shows attempts, not the trail.
