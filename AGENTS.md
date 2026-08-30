# Beacon — AGENTS.md

Verified crisis-helpline directory (`index.html`) plus NGO directory (`ngos.html`). Zero-dependency static site: no build step, `app.js` fetches `data/helplines.json` / `data/ngos.json` at runtime. Deploys to GitHub Pages from `main` via `.github/workflows/deploy.yml`. Clone lives locally at `~/stories/projects/beacon`.

**README.md is authoritative** for the data model, sourcing policy, validation rules, and data schema — read it before touching anything under `data/`.

## Layout gotchas (the rest is in README)

- One `app.js` powers **both** pages; rendering is page-aware (detects `#country-list` on index vs `#ngo-list` on the NGO page). Changes to the shell HTML must keep all hooks/IDs the app reads.
- `index.html` / `ngos.html` are static shells: no inline layout. All styling lives in `styles.css`.
- `data/helplines.json` + `data/ngos.json` are the **trust core** — the single source of truth for what ships.

## Editing data (trust core)

1. Every number must be verified against an official primary source **before** it is added — the helpline's own site, a government health ministry page, or the established NGO that runs the line. Cross-check whenever possible.
2. Entries from third-party skills (e.g. `Romportl/crisis-helpline-skill`) are leads, never truth — cross-check them; format and errors are common.
3. `lastChecked` = the date *you* personally confirmed the number on the source page — never the source page's own last-updated date.
4. A new country needs a valid ISO 3166-1 alpha-2 `iso` **and** a `COUNTRY_CALLING_CODES` entry in `app.js` (pattern: `CZ: "420"`).
5. Unverifiable entries are dropped, not guessed. A country left uncovered beats a wrong number reaching someone in crisis.
6. Gate before any push: `node scripts/validate.js --warn-as-error` — CI treats warnings as failures.

## Design (styles.css)

- Token-driven only. `:root` holds the light theme and all tokens; the single `[data-theme="dark"]` block overrides colors. Components must use `--color-*`, `--font-*`, `--space-*`, `--radius-*` — never hardcoded hex/px.
- Light (white) is the default. Dark is opt-in only via the header toggle (persists `localStorage "beacon-theme"`); never auto-dark from `prefers-color-scheme`.
- Contrast bar: every text/background pair must pass WCAG AA (≥ 4.5:1) in **both** themes. Text on `--color-brand` uses `--color-on-brand` (flips white↔dark per theme), never literal `#ffffff`.
- Phone number is the card hero: `.phone-link.local` at 1.25rem/700. Cards 16px radius. Search is a pill (`--radius-full`) at max-width 34rem; card grid up to 3 columns.
- No layout via inline JS styles — add a class and put the rule in `styles.css`.

## Verify before push

1. `node -c app.js` — syntax.
2. `node scripts/validate.js --warn-as-error` — data gate.
3. After structural or JS changes, render both pages headless (jsdom) with a stubbed `fetch` (the app fetches data JSON) and require zero console/page errors; confirm rendered card counts track the data.

## Deploy

Any push to `main` runs `deploy.yml` (validate → build → Pages). After pushing, confirm the run completes — a queued run is not success. `validate.yml` re-validates daily and opens a `validation` issue when data goes stale; it never auto-modifies data, so a human (you) merges fixes.