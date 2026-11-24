Continue building the LLM Gateway dashboard in `C:\llm-gateway-web`, a new git repo with no commits yet. Its backend is `C:\llm-gateway`, a Go service. Use it as the API reference only, and build no frontend there.

Read these first, in order:
1. `docs/01-api-contract.md`: every `/api` endpoint, its shapes and error codes, and the CSRF and cookie rules.
2. `docs/03-design-direction.md`: the tokens, type, layout, copy rules and the "relay" route chain. Follow it, and load the `frontend-design:frontend-design` skill before writing UI.
3. `docs/04-build-plan.md`: the slices and their honest status.
4. `docs/02-research.md`: the stack choices and the show-once key pattern.

## What exists (written, but never compiled, tested or run)

- **Stack:** Vite 8, React 19, TypeScript 7, Tailwind v4 (tokens in `src/styles.css`), TanStack Query and Router (code-based routes in `src/router.tsx`), recharts, lucide-react, sonner. `npm install` is done.
- **`vite.config.ts`:** dev server on :3000 (strictPort), proxying `/api` and `/v1` to `GATEWAY_URL` (default `http://localhost:8080`).
- **`src/api/`:**
  - `client.ts`: `request()` sends `X-CSRF-Token` from `gw_csrf`, `__Host-gw_csrf` or `__Secure-gw_csrf`, and turns errors into `ApiError` with `status`, `code`, `param` and `retryAfter`. A `not_authenticated` error calls the handler set in `main.tsx`.
  - `client.test.ts`: tests for the client.
  - `types.ts`.
  - `queries.ts`: query options and mutation hooks.
- **`src/ui/`:**
  - `primitives.tsx`: Button, Field, TextField, Input, Select, Switch, Dialog on native `<dialog>`, ConfirmDialog, CopyButton, PageHeader, Panel, Empty, ErrorNote, `fieldError()`, Dot, Mono, Table.
  - `format.ts`: provider names, key health labels, `ago`, `usd`, `daysAgo`.
- **Shell:** `src/shell/AppShell.tsx` (sidebar, mobile menu, sign-out; an unverified user sees `VerifyGate` everywhere except `/account`) and `NotFound.tsx`.
- **Pages written:**
  - `features/auth`: login, signup, forgot, reset and verify-email pages, plus `VerifyGate`.
  - `features/credentials/CredentialsPage`.
  - `features/gateway-keys/GatewayKeysPage`, with the show-once reveal and budget dialog.
  - `features/budget/BudgetFields`.
  - `features/routes/RoutesPage` and `RouteEditorPage`: the relay editor at `/routes/$routeId`, where `new` creates a route.

## Do next

1. **Make it compile:** done. `npm run check` passes. The five missing pages are placeholders in `src/features/{overview,usage,logs,settings,account}/` that step 3 replaces. On Windows, run Vitest from a shell whose cwd is `C:\llm-gateway-web` with an uppercase drive letter. From `c:\` (how VS Code opens this folder) Vitest loads its runner twice and fails with "failed to find the current suite". Put this in the README.
2. **Check one invented hint:** in `RouteEditorPage`, `cacheHint.always` was guessed. Read `llm-gateway/internal/cache` (`RequestCacheable`) and write the real difference between `auto` and `always`.
3. **Write the missing pages**, per the build plan:
   - **Overview:** a numbered get-started sequence built from live data (provider key, then route, then gateway key, then first call), plus a 7-day summary.
   - **Usage:** filters, totals, a daily chart, a table by model, the budget meter and recent requests. Load the `dataviz` skill before writing the chart.
   - **Logs:** logging state, a route filter, expandable request and response, load more by `next_cursor`, and delete all.
   - **Settings:** `PUT` replaces the whole document, so send every field back, the budget included.
   - **Account:** change password and sign out everywhere.
4. **Run it for real:**
   - Start the backend with `make run` in `C:\llm-gateway`. It needs `make deps-up`, `ALLOWED_ORIGINS=http://localhost:3000`, and `PUBLIC_BASE_URL=http://localhost:3000` (the new default). Then run `npm run dev` here.
   - Walk through sign-up, verify (in development the mail link is in the gateway log), a provider key using the `mock` provider, a route using model `echo`, a gateway key, and the curl from the route page.
   - Screenshot and critique each page against the design doc in both light and dark mode, and check mobile widths.
5. **Finish the repo:**
   - `npm run check` must pass.
   - Add a README with the dev steps, and set every status in `docs/04-build-plan.md` honestly.
   - Run `/pstack:deslop`, then commit on `main` (first commit). Ask the user before creating a GitHub remote.

Later, in the backend repo: slice 11, Caddy serving `dist/` with SPA fallback on the VM. Production's mailed `/verify-email` and `/reset-password` links return 404 until that ships. Backend PR #50, which points the verify mail at `/verify-email`, is already merged.
