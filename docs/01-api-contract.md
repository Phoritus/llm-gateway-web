# API contract

What the dashboard calls on the gateway's control plane (`/api`), taken from
`llm-gateway/internal/api` as of commit `249e03a`. When the two disagree, the
backend's handlers win; update this file.

## Transport

- **Same origin.** The dashboard and `/api` are served from one origin. In
  development, Vite on `http://localhost:3000` proxies `/api` and `/v1` to the
  gateway on `:8080`. In production, Caddy serves the built dashboard at `/` and
  sends `/api` and `/v1` to the gateways.
- **Cookies.** Sign-in sets an HttpOnly session cookie and a readable CSRF
  cookie (`SameSite=Lax`). Their names depend on the deployment: `gw_csrf` over
  plain http, `__Host-gw_csrf` in production, `__Secure-gw_csrf` when
  `COOKIE_DOMAIN` is set. The client reads whichever exists.
- **CSRF.** Every `POST`, `PUT` and `DELETE` from a signed-in session sends the
  CSRF cookie's value as `X-CSRF-Token`. The browser's `Origin` must be listed
  in `ALLOWED_ORIGINS`, or a state-changing request answers
  `403 origin_not_allowed`. That covers signup and login as well.
- **Bodies** are JSON (`Content-Type: application/json`), at most 64 KiB, and
  an unknown field is refused with `400`.
- **Responses** carry `Cache-Control: no-store`.

## Errors

Every error uses OpenAI's shape:

```json
{ "error": { "message": "…", "type": "invalid_request_error", "param": "alias", "code": "invalid_value" } }
```

| Status | `code` | The dashboard does |
| --- | --- | --- |
| 400 | `invalid_value` (with `param`) | Shows `message` under the field `param` names |
| 400 | `invalid_token` | Shows "This link has expired or was already used" with a way to get a new one |
| 401 | `not_authenticated` | Drops the cached identity and goes to `/login?next=…` |
| 401 | `invalid_credentials` | "Email or password is incorrect" |
| 403 | `csrf_failed` | Reloads the identity once and retries; else signs out |
| 403 | `email_not_verified` | Shows the confirm-your-email state |
| 403 | `origin_not_allowed` | A deployment fault: shows `message` |
| 409 | `alias_taken` (with `param: "alias"`) | Shows `message` under the alias field |
| 409 | `credential_in_use`, `*_limit_reached` | Shows `message` |
| 429 | `rate_limit_exceeded` | Shows `message`; `Retry-After` gives seconds |
| 5xx | `internal_error` | Shows `message`, which quotes a request id |

## Auth (`/api/auth/*`, no session needed)

| Call | Body | Success |
| --- | --- | --- |
| `POST /auth/signup` | `{email, password, workspace_name}` | `201 {status:"pending_verification"}`. Does not sign in |
| `POST /auth/login` | `{email, password}` | `200` with the `/me` body; sets cookies |
| `POST /auth/logout` | none | `200 {status:"signed_out"}` |
| `POST /auth/verify-email` | `{token}` | `200 {status:"email_verified"}` |
| `POST /auth/resend-verification` | `{email}` | `202`, for every address |
| `POST /auth/forgot-password` | `{email}` | `202`, for every address |
| `POST /auth/reset-password` | `{token, password}` | `200`; revokes every session |

Passwords are 12 to 1024 characters, and a short list of common ones is refused
(`param: "password"` or `"new_password"`).

**Mailed links** point at the dashboard: `/verify-email?token=…` and
`/reset-password?token=…`, under `PUBLIC_BASE_URL`.

## Session (`/api`, session needed, email may be unconfirmed)

`GET /me`

```json
{ "user": { "id": "…", "email": "a@b.c", "email_verified": true, "email_verified_at": "…" },
  "workspace": { "id": "…", "name": "Acme" },
  "session": { "expires_at": "…" } }
```

`POST /auth/change-password` `{current_password, new_password}` → `200`.
`POST /auth/logout-all` → `200`, every session ends.

## Workspace resources (session and confirmed email needed)

Lists answer `{ "data": [...] }`.

### Provider keys: `/credentials`

```ts
{ id, provider, name, last4, base_url: string|null, created_at,
  last_check: { result, checked_at } | null }
```

- `provider` is one of `openai groq cerebras openrouter mistral gemini anthropic custom`.
  `mock` exists outside production only.
- `result` is one of `ok key_rejected quota_exhausted rate_limited provider_timeout provider_error provider_unavailable`.
- `POST /credentials` `{provider, name, secret, base_url?}` → `201` view.
  - `secret` is 20 to 512 printable characters with no spaces. `name` is at most 100 characters.
  - `base_url` is required only for `custom`: https, with no user, query or fragment, and not localhost or a private address.
  - A workspace holds at most 50. The 51st answers `409 credential_limit_reached`.
- `POST /credentials/{id}/test` → `200 {ok, code?, message?}`. Records `last_check`.
- `DELETE /credentials/{id}` → `204`. A key a route still uses answers `409 credential_in_use`.

### Gateway keys: `/gateway-keys`

```ts
{ id, name, prefix, created_at, last_used_at|null, revoked_at|null,
  monthly_budget_usd: number|null, budget_action: "block"|"warn",
  spent_this_month_usd: number|null }
```

- `POST /gateway-keys` `{name, monthly_budget_usd?, budget_action?}` → `201` view plus `key`. **This is the only response that holds the full key.**
- `PUT /gateway-keys/{id}/budget` `{monthly_budget_usd, budget_action}` → `200` view.
- `DELETE /gateway-keys/{id}` → `204`, which revokes the key. The list still shows revoked keys, with `revoked_at` set. A revoked key's budget cannot be changed.
- A workspace holds at most 50 active keys.
- A budget is 0 to 1e9 USD, or `null` for none. `0` is a real budget: free tiers only.

### Routes: `/routes`

```ts
{ id, alias, free_first, cache: "auto"|"always"|"off",
  context_handoff: "off"|"reorder"|"trim", max_hops,
  targets: [{ credential_id, model, first_byte_timeout_seconds|null }],
  created_at, updated_at }
```

- `POST /routes` → `201`. `PUT /routes/{id}` replaces the whole route, its target chain included, → `200`. `DELETE` → `204`.
- `alias` is 1 to 64 characters of letters, digits and `. _ - : /`, starting with a letter or digit. Apps send it as `model`.
- `targets` holds 1 to 10 entries, each `{credential_id, model}` at most once. `model` is 1 to 200 printable characters with no spaces. A timeout is 1 to 300 s, or `null`.
- `max_hops` is 1 to 10, 3 by default. `cache` defaults to `auto`, `context_handoff` to `reorder`.
- Saving a route stops its cached answers being served.

### Usage: `GET /usage?from=YYYY-MM-DD&to=YYYY-MM-DD&route=alias`

Defaults to the last 30 days, at most 366.

```ts
{ days: [{ day, route, vendor, model, requests, errors, prompt_tokens,
           completion_tokens, avg_latency_ms, cache_hits, cost_usd, unpriced_requests }],
  recent: [{ created_at, route, vendor, model, status, outcome, attempts,
             prompt_tokens, completion_tokens, latency_ms, ttft_ms, cached,
             context_handoff: "reordered"|"trimmed"|null, cost_usd: number|null }],
  budget: { monthly_budget_usd, budget_action, spent_this_month_usd, period, resets_at } }
```

- `days` has one row per day, route, vendor and model. The dashboard sums the rows.
- `recent` holds the 50 newest events, whatever the filter.
- `outcome` is one of `ok stream_error client_gone budget_exceeded`.

### Logs: `GET /logs?route=&from=&to=&cursor=&limit=`

`from` and `to` are RFC 3339; `to` is exclusive. `limit` defaults to 20, at most 50.

```ts
{ logging: { enabled, retention_days, on_disable },
  logs: [{ id, created_at, key_id, route, vendor, model, status, outcome,
           request, response, request_truncated, response_truncated }],
  next_cursor: string|null }
```

`request` and `response` are already redacted text, at most 32 KiB each, and
usually JSON. `DELETE /logs` → `204` deletes every log now.

### Settings: `/workspace/settings`

```ts
{ cache_enabled, semantic_cache_enabled, prompt_logging_enabled,
  prompt_log_retention_days /* 1–30 */, monthly_budget_usd, budget_action }
```

**`PUT` replaces the whole document.** A form must send every field back, or the
missing ones fall to their defaults. A missing `monthly_budget_usd`, for one,
removes the budget.

## Data plane, for the "make your first call" step

`POST /v1/chat/completions` with `Authorization: Bearer gwk_…` and an
OpenAI-shaped body whose `model` is a route alias. `GET /v1/models` lists the
aliases. Response headers worth showing: `X-Cache`, `X-Fallback-Attempts`,
`X-Fallback-Trail`, `X-Budget-Remaining-USD`.
