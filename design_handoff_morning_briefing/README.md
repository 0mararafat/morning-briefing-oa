# Handoff: Morning Briefing

## Overview
Morning Briefing is a multi-user web app: a personal daily intelligence briefing each user
configures once and then reads in their browser every morning. This package covers the full
product surface — landing, a 8-step setup wizard, two briefing-viewer layouts, and an archive —
plus the design system they all share.

Brand & feel: calm, editorial, premium (a modern newspaper). Warm-to-crisp **white** paper,
ink-black type set in **Spectral** (serif for everything), **IBM Plex Mono** for kickers/metadata
only, and a single deep "Dodgers" **blue** accent (#005A9C light / #3D8FDB dark). Liquid-glass
surfaces. Full light + dark mode via `[data-theme="dark"]` on `<html>`.

## About the Design Files
The files in `designs/` are **design references created in HTML** (they open directly in a browser).
They are prototypes showing intended look and behavior — **not** production code to copy verbatim.
Recreate them in the target codebase's environment (React + Tailwind) using its established patterns.
The `.dc.html` files use a small in-house "Design Component" runtime (`support.js`); ignore that
runtime — read the markup/logic for structure, copy, styling, and interactions, and rebuild as
ordinary React components.

## Fidelity
**High-fidelity.** Final colors, type, spacing, and interactions. Recreate pixel-faithfully using
`tokens.css` (the source of truth) and `tailwind.config.js` (semantic tokens already mapped). Both
are in this folder.

## Theming
- Define the CSS variables from `tokens.css` once globally. Light is `:root`; dark is applied by
  setting `data-theme="dark"` on `<html>`.
- Every screen toggles theme by writing that attribute (see each file's `_t()` / `toggleTheme`).
- Tailwind semantic colors (`bg`, `ink`, `accent`, `accent-ink`, `green`, `amber`, `ink-panel`, …)
  resolve to those variables, so the same classes flip automatically in dark mode.

## Screens / Views

### 1. Landing — `designs/Landing.dc.html`
Single "personal newspaper front page". Dated masthead (Vol · Personal Edition / date), "THE
Morning Briefing" display title (Spectral 700, ~72px desktop), italic tagline, a 3-double-rule
masthead, then a 3-column front page: **What you get** / **Inside each edition** (6 section list
with status dots) / **Start reading** (primary "Sign in with GitHub" = inverted `ink` button;
secondary "Sign in with Google" = glass outline) + microcopy. Columns separated by hairline rules;
they stack on ≤760px. Use generic provider glyph placeholders, not real GitHub/Google logos.

### 2. Setup Wizard — `designs/Setup Wizard.dc.html`
8 steps with a clickable numbered stepper, top progress bar, and a Back / Continue footer with a
dot indicator. Steps:
1. **Topics** — editable rows (name + description inputs), add/remove, reorder by drag handle OR ▲▼.
2. **Sources** — selectable pill chips + "add your own" (name/URL) with removable custom chips.
3. **Sections** — 6 on/off toggles (Top Stories, Sector Scan, Week Ahead, Pattern Watch, Deep Dive, Signal Scan).
4. **Voices** — list of tracked people (name + link chips), add/remove.
5. **Schedule** — time input, timezone select, day-of-week multi-select chips.
6. **Mode** — two choice cards ("Use my own API key" / "Use my Claude subscription"); selecting one
   reveals an inline summary panel.
7. **Connect** — asymmetric by mode:
   - *API key:* password input + Show/Hide, **Test key** (Testing → "Key looks valid" / "Couldn't
     validate"), helper "we only ever display the last 4 characters", **Save key** → collapses to a
     read-only `•••••••• last4` chip with **Replace** / **Remove**.
   - *Subscription:* three read-only **copy-boxes** — Ingest URL, Secret token (amber "Shown once —
     copy it now" pill + **Regenerate** that invalidates the prior token), and a dark monospace
     **Routine prompt** box (Copy + Expand/Collapse); a numbered "How to set this up" list; an
     "I've set up my routine" confirm checkbox; and a "Last received: —" status line.
8. **Review** — per-row summary with Edit jump-links → **Start my mornings** → success screen.

### 3. Briefing Viewer (masthead/newspaper) — `designs/Briefing Viewer Masthead.dc.html`
Same content as a **scrolling personal newspaper**: double-rule masthead, sticky section nav with a
**scroll-spy** active highlight, front-page Top Stories deck (large lead + image + drop cap +
secondary column), "At a glance" Sector Scan, Week Ahead schedule, inked Pattern Watch "Analysis"
boxes, centered Deep Dive with pull-quote rules, two-column Signal Scan. Top bar links: **Change
setup** (→ wizard), **Archive**, theme toggle. This is the chosen primary viewer direction.

### 4. Archive — `designs/Archive.dc.html`
Back issues as a newspaper index. Masthead header with lifetime stats (editions, stories read,
reading time, first edition), search + filter chips (All / New only / Saved), editions grouped by
month — each row: date numeral + status dot + lead headline + topic tags + quick stats
(stories · new · read time). Rows link into an edition.

### 0. Design System — `designs/Design System.dc.html`
The living spec: color tokens, Spectral type scale, spacing/radius, and every component
(buttons primary/secondary/ghost, text + password inputs, toggles, chips, cards, tabs, badges,
3-state status dot, copy-fields, "shown once"/status pills, and the editorial story-card hierarchy).

## Interactions & Behavior
- **Theme toggle:** write `data-theme="dark"`/remove on `<html>`; persist to localStorage.
- **Wizard:** local state for every field (see "State"); stepper jumps; Continue/Back clamp; topics
  drag-reorder via HTML5 drag on the handle + ▲▼ fallback (keyboard-friendly).
- **Test key:** async validate (simulated 800ms) → ok/err pill.
- **Copy-boxes:** `navigator.clipboard.writeText`; show "Copied ✓" ~1.6s; Regenerate replaces token
  and marks the old one invalid.
- **Viewer:** masthead nav scroll-spy via IntersectionObserver
  (`rootMargin:'-12% 0px -78% 0px'`) sets the active section. (A Reader⇄Tabs layout switch was also
  explored; the masthead/scroll direction is the chosen one.)
- **Top Stories cards:** click to expand standfirst → full brief + source links.
- Status dot: green = new (subtle pulse), amber = light, grey = nothing.

## State Management
- **Theme:** `'light' | 'dark'` (persist).
- **Wizard:** `step`, `topics[{name,desc}]`, `sources[]` + `custom[]`, `sections{6 bools}`,
  `voices[{name,links[]}]`, `schedTime`, `schedTz`, `days[]`, `mode`, and Connect fields:
  `apiKey`/`keySaved`/`testState`, `token`/`tokenRegen`, `routineConfirmed`, `copied`, `done`.
- **Viewer:** `activeSection`, `expanded[]` (expanded Top Stories cards).
- **Persistence (to wire):** load the user's **saved** preferences into the wizard when entered via
  "Change setup" (not the demo defaults). Connect-path server values: `ingestUrl` (per-user),
  `token` (server-issued secret, regenerable → invalidates prior), `routinePrompt` (templated from
  the user's topics/sections), `lastReceivedAt` (flips "Last received: —" to a real time).

## Design Tokens
See `tokens.css` (CSS variables, light + dark) and `tailwind.config.js` (semantic color/font/radius/
shadow mappings + the type scale and `mb-pulse` keyframe in comments). Accent `#005A9C` light /
`#3D8FDB` dark; status green `#0E8A4F`/`#2EC27E`, amber `#BD7F0E`/`#E0A52F`, grey `#BCC1C9`/`#5B626C`.

## Assets
No raster assets. Imagery is shown as striped placeholders labelled in mono (e.g. "lead image · 16:9")
— replace with real images. Provider sign-in buttons use generic glyph placeholders, not brand logos.

## Files
- `tokens.css` — design-token source of truth (light + dark).
- `tailwind.config.js` — semantic tokens, fonts, radius, shadows, type scale notes.
- `designs/*.dc.html` — the HTML design references (open in a browser to view).
- `designs/support.js` — the Design Component runtime (reference only; do not port).

Fonts: Spectral + IBM Plex Mono (Google Fonts).
