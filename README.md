# Beacon — Verified Crisis Helplines Worldwide

A single-page, zero-dependency directory of suicide and crisis helplines by country. Every number links to its official source so you can trust what you see.

**Live site:** https://ajitsingh25.github.io/beacon/  
*(Configure your custom domain in GitHub Pages settings if desired.)*

---

## Why this exists

When someone is in crisis, they need a number that works **now** — not a stale list, not a broken link, not a guess. Beacon ships only entries that have been verified against an official source (government health ministry, the helpline’s own site, or a long-standing NGO). Each card shows the source name and a direct link to the page where the number appears.

Data is version-controlled, validated on every push, and re-checked daily via GitHub Actions. Stale entries automatically open an issue so maintainers (and the community) can update them.

---

## Data model (`data/helplines.json`)

```json
{
  "disclaimer": "...",
  "lastUpdated": "2026-08-29",
  "helplines": [
    {
      "country": "United States",
      "iso": "US",
      "name": "988 Suicide & Crisis Lifeline",
      "phone": "988",
      "hours": "24/7",
      "languages": ["English", "Spanish"],
      "notes": "Call or text 988. Press 2 for Spanish, or text AYUDA.",
      "sourceName": "988 Lifeline",
      "sourceUrl": "https://988lifeline.org/get-help/",
      "lastChecked": "2026-08-29"
    }
  ]
}
```

### Required fields

| Field | Type | Notes |
|-------|------|-------|
| `country` | string | Full country name |
| `iso` | string | ISO 3166-1 alpha-2 (e.g., `US`, `GB`, `IN`) |
| `name` | string | Official helpline name |
| `phone` | string | Number as dialed locally (e.g., `988`, `116 123`, `0800 111 0 111`) |
| `hours` | string | e.g., `24/7`, `Mon–Fri 9–17` |
| `languages` | string[] | e.g., `["English", "Spanish"]` |
| `notes` | string | Free text for caller context |
| `sourceName` | string | Organization that publishes the number |
| `sourceUrl` | string | **Must be HTTPS**, direct link to the page listing the number |
| `lastChecked` | string | `YYYY-MM-DD` — date you verified the number on the source page |

---

## Sourcing policy (no assumptions)

1. **Primary sources only** — the helpline’s own website, a government health ministry page, or a well-established NGO that runs the line.  
2. **No Wikipedia, news articles, aggregator sites, or crowd-sourced lists** as the primary citation. They may be consulted but must not be the `sourceUrl`.  
3. **One entry per helpline per country**. If a country has multiple lines (e.g., general + youth + veterans), each gets its own entry.  
4. **`lastChecked` is the date you personally confirmed the number on the source page** — not the date the source page was last updated.  
5. **No fabricated data** — if you can’t find an official source for a country, open an issue instead of guessing.

---

## Contributing

### Add or correct a helpline

1. Open an issue using the **“Add or update a helpline”** template (`.github/ISSUE_TEMPLATE/add-helpline.yml`).  
2. Fill every field; the template enforces the sourcing policy.  
3. A maintainer will run the validator, merge, and the site auto-deploys.

### Local development

```bash
# 1. Clone your fork
git clone https://github.com/ajitsingh25/beacon.git
cd beacon

# 2. Validate data (zero dependencies, Node 18+)
node scripts/validate.js

# 3. Serve locally (any static server)
npx serve .   # or python3 -m http.server 8000
# open http://localhost:3000 (or 8000)
```

### Validation rules (enforced in CI)

- All required fields present, non-empty
- `iso` is a valid ISO 3166-1 alpha-2 code
- `sourceUrl` is a valid HTTPS URL
- `phone` contains only digits, `+`, spaces, parentheses, dashes
- `lastChecked` is a valid `YYYY-MM-DD`, not > 90 days old (warning)
- No duplicate `(iso, name, phone)` tuples

Run with `--warn-as-error` to treat warnings as failures (used in CI):

```bash
node scripts/validate.js --warn-as-error
```

---

## GitHub Actions

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `deploy.yml` | Push to `main` | Validate → build → deploy to GitHub Pages |
| `validate.yml` | Daily 06:00 UTC + manual | Re-validate dataset; open/update a `validation` issue if stale/invalid entries found |

The scheduled validation writes `data/status.json` (used for the “last reviewed” badge on the page) and opens/updates a single GitHub issue tagged `validation` + `automated` when problems are detected. It does **not** auto-modify data — a human must review and merge.

---

## Deployment

1. Create a **public** GitHub repo from this folder.  
2. In repo **Settings → Pages**:  
   - Source: “GitHub Actions”  
   - (Optional) Custom domain: add your domain, commit a `CNAME` file to the repo root  
3. Push to `main` — the `deploy.yml` workflow will run and publish the site.  
4. The scheduled validation runs daily; check the `validation` issue if one appears.

---

## License

MIT — see [LICENSE](LICENSE).  
Data (`data/helplines.json`) is factual (phone numbers, hours) and not copyrightable; the curated selection and source links are licensed MIT.

---

## Disclaimer

> Beacon is a directory, not a substitute for professional care or local emergency services.  
> If you are in immediate danger, call your local emergency number.  
> Numbers were reviewed against the official sources linked on each card; they can change — if a line fails, visit the source or ask local services.