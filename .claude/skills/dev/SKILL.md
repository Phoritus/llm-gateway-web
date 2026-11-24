---
name: dev
description: Check, run and drive the LLM Gateway dashboard locally. Use before declaring any change in this repo done, when starting the app against the Go backend, or when Vitest fails with "failed to find the current suite".
---

# Developing the LLM Gateway dashboard

The dashboard is a Vite SPA. The Go backend at `C:\llm-gateway` is its API and the reference for every shape. Do not build frontend code in the backend repo.

## Read before changing UI

1. `docs/01-api-contract.md` for endpoints, error codes, CSRF and cookie rules.
2. `docs/03-design-direction.md` for tokens, type, layout and copy rules.
3. `docs/04-build-plan.md` for slice status. Update a slice's status in the same change that moves it.

Load the `frontend-design:frontend-design` skill before writing UI, and the `dataviz` skill before writing a chart.

## Check

Run from a shell whose working directory is `C:\llm-gateway-web` with an uppercase drive letter:

```powershell
Set-Location 'C:\llm-gateway-web'; npm run check
```

`npm run check` runs `tsc -b`, the Vitest suite and `vite build`. All three must pass.

VS Code opens this folder as `c:\llm-gateway-web`. From that lowercase path Vitest loads its runner twice and every suite fails with "failed to find the current suite". The code is not at fault. Change the drive letter and rerun.

## Run against the backend

1. In `C:\llm-gateway`, run `make deps-up` to start Postgres and Redis.
2. In `C:\llm-gateway`, run `make run` with `ALLOWED_ORIGINS=http://localhost:3000` and `PUBLIC_BASE_URL=http://localhost:3000`.
3. Here, run `npm run dev`. The dev server listens on port 3000 and proxies `/api` and `/v1` to `GATEWAY_URL`, which defaults to `http://localhost:8080`.

To reach a working route with no real provider:

1. Sign up. In development the verification link is printed in the gateway log, not mailed.
2. Add a provider key with the `mock` provider.
3. Create a route that targets model `echo`.
4. Create a gateway key and run the curl shown on the route page.

## Verify UI changes

Open each changed page in a real browser at desktop and mobile widths, in both light and dark mode, and compare it against `docs/03-design-direction.md`. A passing `npm run check` does not show that a page works.
