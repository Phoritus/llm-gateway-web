# Research

Gathered on 2026-11-24, to settle the stack and the patterns the dashboard
follows.

## Stack versions (npm registry, 2026-11-24)

| Package | Version | Role |
| --- | --- | --- |
| `vite` | 8.3 | Dev server and build. Its proxy keeps `/api` on the same origin in development |
| `react`, `react-dom` | 19.3 | UI |
| `typescript` | 7.0 | Types |
| `tailwindcss`, `@tailwindcss/vite` | 4.3 | Styling. v4 needs no `tailwind.config.js`; tokens live in CSS `@theme` |
| `@tanstack/react-query` | 5.108 | Server state: caching, refetch, mutations, invalidation |
| `@tanstack/react-router` | 1.170 | Type-safe routes and search params. Code-based routes, so there is no codegen step |
| `recharts` | 3.11 | The usage charts |
| `lucide-react` | 1.79 | Icons |
| `sonner` | 2.0 | Toasts confirming an action |
| `@fontsource-variable/instrument-sans`, `…/jetbrains-mono` | 5.3 | Self-hosted fonts, so no third-party request on load |
| `vitest` | 5.1 | Unit tests |

Considered and left out:
- **shadcn/ui, Radix, Base UI.** The dashboard needs a dialog, a switch, a
  select and a menu. The native `<dialog>` with `showModal()` gives focus
  trapping, `Esc` and the inert backdrop. A switch is a `button` with
  `role="switch"`. A select is native `<select>`. Writing about five small
  components keeps one look throughout, and keeps component-library CSS out of
  it. Revisit if a combobox becomes necessary.
- **Drag-and-drop for the route chain** (`@dnd-kit`). OpenRouter reorders BYOK
  keys by drag-and-drop [1], but move-up and move-down buttons do the same job,
  work from the keyboard and screen readers without extra work, and suit a
  chain of at most 10 targets.
- **Next.js.** Every page sits behind sign-in and nothing needs SEO, so server
  rendering adds a Node runtime to the VM for no gain. A static SPA served by
  the Caddy already there is the cheaper fit.

## How comparable gateways present the same things

- **Ordered provider keys.** OpenRouter's BYOK splits keys into a prioritized
  group and a fallback group, tried in that order [1][2]. Our route is the same
  idea with no groups: one ordered chain. Show the order as the primary visual
  fact.
- **Config attached to keys.** Portkey defines fallbacks as configs created in
  the dashboard and attached to API keys [3]. Here the app chooses the route by
  `model`, so the route page should show the exact `model` string to send.
- **Analytics.** Helicone's dashboard is strongest on usage, cost and latency
  per provider [4]. Our usage page follows it: requests, errors, cost and
  latency, broken down by route and model.

## The show-once key reveal

Sources agree on the pattern [5][6][7][8]:

- Show the full key once, in the dialog that created it, with a copy button
  that confirms success ("Copied").
- Keep the whole key selectable rather than truncated.
- Say plainly that it will not be shown again.
- Close only through an explicit Done button. An accidental backdrop click must
  not lose an uncopied key.
- Let people name keys at creation. Show the creation date and last use, so
  keys can be told apart.

The gateway already shows `prefix` and stores only a hash, so the list shows
`gwk_abc…` and the dialog is the only place the full key appears.

## Accessibility rules applied

- `<dialog>` with `showModal()`: focus moves into the dialog and returns on
  close, and `Esc` closes it, except in the key reveal, where `Esc` is ignored
  until the key has been copied or the user confirms.
- Every form field has a visible `<label>`. An error is joined to its field
  with `aria-describedby`, and `aria-invalid` is set.
- Toasts are announced by `sonner`'s live region. Destructive actions confirm in
  a dialog that names the thing being deleted.
- A visible focus ring on everything. `prefers-reduced-motion` turns motion off.
  Colour is never the only signal: a health state also has a word.

## Sources

1. [OpenRouter: BYOK](https://openrouter.ai/docs/use-cases/byok)
2. [TrueFoundry: OpenRouter BYOK explained](https://www.truefoundry.com/blog/openrouter-byok-explained-cheaper-often-faster-and-changing)
3. [Portkey: OpenAI-compatible integrations](https://portkey.ai/docs/integrations/libraries/openai-compatible.md)
4. [Helicone gateway overview](https://docs.helicone.ai/gateway/overview.md)
5. [Clerk: secret keys visible only on creation](https://clerk.com/changelog/2026-10-19-secret-keys-visible-only-on-creation)
6. [SaaS UI: API keys and tokens UX patterns](https://www.saasui.design/blog/saas-api-keys-tokens-ux-patterns)
7. [Carbon Design System: generate an API key](https://carbondesignsystem.com/community/patterns/generate-an-api-key)
8. [Zuplo: API key best practices](https://zuplo.com/blog/2026/05/04/api-key-best-practices)
9. [shadcn/ui: Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4), read to confirm the Vite + Tailwind v4 setup
