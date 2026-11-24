# Design direction

## Subject, audience, job

- **Subject:** a self-hosted gateway that lets one app call many LLM providers
  through one key, falling back down an ordered chain when a provider fails.
- **Audience:** developers wiring their own provider keys, often free-tier
  ones, into apps and IDE tools. They read model ids and JSON every day.
- **Primary job:** set up a route and trust it. That means knowing which
  provider answers, in what order, at what cost, and seeing it working.

## The one memorable thing: the relay

A route is an ordered chain: try this provider, then that one. Every other
gateway hides the order in a list. Here it is the main visual. Each target is a
stop on a vertical line, with its provider, model, key health and timeout, and
the line shows the path a request takes. The same shape returns small in the
usage page's fallback trail. The numbering is earned, because the order is the
meaning.

Everything else stays quiet: plain tables, few borders, no card grid.

## Tokens

| Name | Light | Dark | Use |
| --- | --- | --- | --- |
| `paper` | `#F2F4F3` | `#121614` | Page ground: a cool grey with a trace of green, not cream or blue-white |
| `surface` | `#FFFFFF` | `#191E1B` | Panels, tables, dialogs |
| `ink` | `#17201C` | `#E4EAE6` | Text. Green-black, so it reads as ink rather than a tinted `#111` |
| `muted` | `#5D6A64` | `#93A29B` | Secondary text |
| `line` | `#D7DDDA` | `#2A322E` | Rules and borders |
| `relay` | `#1F6B52` | `#5CC79C` | The accent: primary buttons, focus ring, the relay line, live state |
| `caution` | `#9A6212` | `#E0A54A` | Warn budgets, rate limits |
| `fault` | `#B23A2B` | `#F07B6B` | Errors, destructive actions |

One accent. Status colours appear only as small dots beside words, never as
filled panels.

## Type

- **Instrument Sans** (variable) for everything readable: headings at 600,
  body at 400. The scale runs 13 / 14 / 16 / 20 / 28 px on a 1.5 line height,
  with headings at 1.2. Headings are sentence case. Small labels are never
  tracked caps.
- **JetBrains Mono** only for values a developer copies or matches: model ids,
  route aliases, key prefixes, request bodies, curl. It never sets labels.
- Body copy stays under about 70 characters a line.

## Layout

```
┌──────────────┬──────────────────────────────────────────────┐
│ Acme         │  Routes                         [New route]  │
│              │  The model name your app sends, and the      │
│ Overview     │  providers it tries, in order.               │
│ Routes       │                                              │
│ Provider keys│  alias            targets        cache       │
│ Gateway keys │  ───────────────────────────────────────     │
│ Usage        │  fast-chat        groq → gemini  auto        │
│ Logs         │  coder            anthropic      off         │
│              │                                              │
│ Settings     │                                              │
│ Account      │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

- A 224 px sidebar with text links and an icon for each. The workspace name sits
  at the top, and the signed-in email and sign-out at the bottom. Below 768 px it
  becomes a top bar with a menu button.
- Content is left-aligned in a column up to 1040 px wide. Each page opens with
  a heading, one plain sentence saying what the page is for, and its one
  primary action on the right.
- Tables for lists. A panel (surface, 1 px line, 10 px radius) only where content
  is a unit: a form, the relay, a dialog. Radius follows hierarchy: 10 px for
  panels, 6 px for controls, full for status dots.
- No shadows except under dialogs.

Route editor:

```
  fast-chat                                   [Delete] [Save route]

  ● 1  groq · llama-3.3-70b          key healthy   30 s   ↑ ↓ ✕
  │
  ● 2  gemini · gemini-2.5-flash     key healthy   30 s   ↑ ↓ ✕
  │
  ○    Add a fallback…

  Options  Free tiers first [on]   Cache [auto ▾]   Long chats [reorder ▾]   Max tries [3]
```

## Words

- **Names from the user's side:** "Provider keys" (the API's credentials),
  "Gateway keys", "Routes". "Long conversations" names `context_handoff`, with
  its modes "Reorder" and "Trim to fit".
- **Buttons say what happens:** "Add provider key", "Create gateway key",
  "Save route", "Revoke key". A toast repeats the verb: "Key revoked".
- **Empty states point to the next step:** "No routes yet. A route is the model
  name your app sends. Add a provider key first, then create one."
- **Errors say what to do:** the backend's `message` is already written that
  way, so it is shown as-is under the field `param` names.

## Motion

One deliberate moment: when a route saves, the relay line draws from the first
stop to the last (300 ms). Dialogs fade in (120 ms). Nothing animates on page
load. All of it is off under `prefers-reduced-motion`.

## Review against the brief

The first plan was the default one: Inter, an indigo accent on blue-white, and
a grid of rounded stat cards on the overview. That is any SaaS dashboard. It was
changed as follows:

- **Accent:** indigo became a deep relay green, tied to "the line is live".
  Paper and ink were tinted toward it, so the palette reads as one.
- **Overview:** the stat-card grid was replaced by the get-started sequence
  (a real sequence, so numbered) and one usage line, because a new workspace
  has no numbers to show.
- **Mono:** limited to copyable values, which drops the "mono for small labels"
  tell.
