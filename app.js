"use strict";

const dataUrl = "data/helplines.json";
const statusUrl = "data/status.json";

let all = [];
let filtered = [];
let activeLanguages = new Set();
let pinnedIso = null;

// ITU-T E.164 country calling codes for countries in our dataset
const COUNTRY_CALLING_CODES = {
  US: "1", CA: "1", GB: "44", AU: "61", NZ: "64", IN: "91",
  DE: "49", FR: "33", ES: "34", IT: "39", NL: "31", JP: "81",
  KR: "82", SG: "65", IL: "972", ZA: "27", NG: "234", KE: "254",
  BR: "55", MX: "52",
};

// Timezone → ISO mapping for auto-detect (no permission needed)
const TIMEZONE_TO_ISO = {
  "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US",
  "America/Los_Angeles": "US", "America/Anchorage": "US", "Pacific/Honolulu": "US",
  "America/Toronto": "CA", "America/Vancouver": "CA", "America/Edmonton": "CA",
  "America/Winnipeg": "CA", "America/Halifax": "CA", "America/St_Johns": "CA",
  "Europe/London": "GB", "Europe/Dublin": "GB",
  "Europe/Berlin": "DE", "Europe/Paris": "FR", "Europe/Madrid": "ES",
  "Europe/Rome": "IT", "Europe/Amsterdam": "NL", "Europe/Stockholm": "SE",
  "Europe/Oslo": "NO", "Europe/Copenhagen": "DK", "Europe/Helsinki": "FI",
  "Europe/Warsaw": "PL", "Europe/Vienna": "AT", "Europe/Zurich": "CH",
  "Europe/Athens": "GR", "Europe/Bucharest": "RO", "Europe/Budapest": "HU",
  "Europe/Prague": "CZ", "Europe/Lisbon": "PT", "Europe/Bratislava": "SK",
  "Europe/Ljubljana": "SI", "Europe/Tallinn": "EE", "Europe/Riga": "LV",
  "Europe/Vilnius": "LT", "Europe/Dublin": "IE", "Europe/Belgrade": "RS",
  "Europe/Zagreb": "HR", "Europe/Sofia": "BG", "Europe/Chisinau": "MD",
  "Europe/Kiev": "UA", "Europe/Minsk": "BY", "Europe/Moscow": "RU",
  "Europe/Istanbul": "TR", "Asia/Jerusalem": "IL", "Asia/Tehran": "IR",
  "Asia/Dubai": "AE", "Asia/Riyadh": "SA", "Asia/Baghdad": "IQ",
  "Asia/Karachi": "PK", "Asia/Kolkata": "IN", "Asia/Dhaka": "BD",
  "Asia/Kathmandu": "NP", "Asia/Colombo": "LK", "Asia/Yangon": "MM",
  "Asia/Bangkok": "TH", "Asia/Phnom_Penh": "KH", "Asia/Vientiane": "LA",
  "Asia/Ho_Chi_Minh": "VN", "Asia/Jakarta": "ID", "Asia/Kuala_Lumpur": "MY",
  "Asia/Singapore": "SG", "Asia/Manila": "PH", "Asia/Taipei": "TW",
  "Asia/Shanghai": "CN", "Asia/Hong_Kong": "HK", "Asia/Seoul": "KR",
  "Asia/Tokyo": "JP", "Australia/Sydney": "AU", "Australia/Melbourne": "AU",
  "Australia/Brisbane": "AU", "Australia/Perth": "AU", "Australia/Adelaide": "AU",
  "Australia/Darwin": "AU", "Pacific/Auckland": "NZ", "Pacific/Fiji": "FJ",
  "Pacific/Guam": "GU", "Pacific/Port_Moresby": "PG", "Pacific/Noumea": "NC",
  "Africa/Johannesburg": "ZA", "Africa/Lagos": "NG", "Africa/Nairobi": "KE",
  "Africa/Cairo": "EG", "Africa/Casablanca": "MA", "Africa/Algiers": "DZ",
  "Africa/Tunis": "TN", "Africa/Accra": "GH", "Africa/Addis_Ababa": "ET",
  "Africa/Khartoum": "SD", "America/Sao_Paulo": "BR", "America/Argentina/Buenos_Aires": "AR",
  "America/Santiago": "CL", "America/Lima": "PE", "America/Bogota": "CO",
  "America/Caracas": "VE", "America/Mexico_City": "MX", "America/Panama": "PA",
  "America/Guatemala": "GT", "America/Managua": "NI", "America/San_Salvador": "SV",
  "America/Tegucigalpa": "HN", "America/Costa_Rica": "CR",
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function svg(iconName) {
  const icons = {
    phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
    copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    copied: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
  };
  return icons[iconName] || "";
}

function toInternational(iso, localPhone) {
  const cc = COUNTRY_CALLING_CODES[iso];
  if (!cc) return null;
  let national = localPhone.replace(/[^\d]/g, "");
  if (national.startsWith("0")) national = national.slice(1);
  return "+" + cc + " " + national;
}

function telLink(p) {
  let s = p.replace(/[^\d+]/g, "");
  if (!s.startsWith("+")) {
    s = s.replace(/^00(?=\d)/, "+");
    if (!s.startsWith("+")) s = "+" + s;
  }
  return "tel:" + s;
}

function copyToClipboard(text, btn) {
  const originalHtml = btn.innerHTML;
  navigator.clipboard.writeText(text).then(() => {
    btn.innerHTML = svg("copied");
    btn.classList.add("copied");
    btn.setAttribute("aria-label", "Copied!");
    setTimeout(() => {
      btn.innerHTML = originalHtml;
      btn.classList.remove("copied");
      btn.setAttribute("aria-label", "Copy number");
    }, 1500);
  }).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    btn.innerHTML = svg("copied");
    btn.classList.add("copied");
    setTimeout(() => {
      btn.innerHTML = originalHtml;
      btn.classList.remove("copied");
    }, 1500);
  });
}

function createPhoneRow(entry, phone, label, isIntl = false, isEmergency = false) {
  const row = el("div", "phone-row" + (isEmergency ? " emergency" : ""));
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.style.gap = "var(--space-3)";
  row.style.flexWrap = "wrap";

  const link = el("a", "phone-link" + (isIntl ? " intl" : "") + (isEmergency ? " emergency" : ""), phone);
  link.href = telLink(phone);
  link.setAttribute("aria-label", label + ": " + phone);
  if (isIntl) link.style.fontSize = "var(--font-size-sm)";
  if (isEmergency) link.style.fontSize = "var(--font-size-base)";
  row.appendChild(link);

  const labelEl = el("span", "phone-label" + (isEmergency ? " emergency" : ""), isEmergency ? "Emergency" : (isIntl ? "Intl" : "Local"));
  row.appendChild(labelEl);

  const copyBtn = el("button", "phone-copy", "");
  copyBtn.type = "button";
  copyBtn.innerHTML = svg("copy");
  copyBtn.setAttribute("aria-label", "Copy " + label.toLowerCase() + " number");
  copyBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    copyToClipboard(phone, copyBtn);
  });
  row.appendChild(copyBtn);

  return row;
}

function createMetaItem(iconName, text) {
  const item = el("span", "meta-item");
  item.innerHTML = svg(iconName) + text;
  return item;
}

function card(entry) {
  const cardEl = el("article", "helpline-card");

  // Header with name and hours
  const header = el("div", "helpline-header");
  header.style.display = "flex";
  header.style.alignItems = "flex-start";
  header.style.justifyContent = "space-between";
  header.style.gap = "var(--space-3)";
  header.style.flexWrap = "wrap";

  const name = el("h3", "helpline-name display-3 text-ink", entry.name);
  header.appendChild(name);

  const hours = el("span", "helpline-hours", entry.hours);
  header.appendChild(hours);

  cardEl.appendChild(header);

  // Phones
  const phonesWrap = el("div", "helpline-phones");
  phonesWrap.style.display = "flex";
  phonesWrap.style.flexDirection = "column";
  phonesWrap.style.gap = "var(--space-2)";

  phonesWrap.appendChild(createPhoneRow(entry, entry.phone, "Local number", false, false));

  const intl = toInternational(entry.iso, entry.phone);
  if (intl) {
    phonesWrap.appendChild(createPhoneRow(entry, intl, "International number", true, false));
  }

  if (entry.emergency) {
    phonesWrap.appendChild(createPhoneRow(entry, entry.emergency, "Emergency number", false, true));
  }

  cardEl.appendChild(phonesWrap);

  // Meta (languages)
  if (entry.languages && entry.languages.length) {
    const meta = el("div", "helpline-meta");
    meta.style.display = "flex";
    meta.style.flexWrap = "wrap";
    meta.style.gap = "var(--space-3)";
    meta.style.paddingTop = "var(--space-2)";
    meta.style.borderTop = "1px solid var(--color-border)";
    meta.style.marginTop = "var(--space-1)";

    const langItem = createMetaItem("globe", entry.languages.join(", "));
    meta.appendChild(langItem);
    cardEl.appendChild(meta);
  }

  // Notes
  if (entry.notes) {
    const notes = el("p", "helpline-notes body-sm text-muted", entry.notes);
    notes.style.lineHeight = "var(--line-height-relaxed)";
    cardEl.appendChild(notes);
  }

  // Source
  const source = el("div", "helpline-source");
  source.style.display = "flex";
  source.style.alignItems = "center";
  source.style.gap = "var(--space-2)";
  source.style.fontSize = "var(--font-size-xs)";
  source.style.color = "var(--color-ink-subtle)";
  source.style.paddingTop = "var(--space-2)";
  source.style.borderTop = "1px solid var(--color-border)";
  source.style.marginTop = "var(--space-1)";

  const sourceLabel = el("span", "", "Source:");
  source.appendChild(sourceLabel);

  const sourceLink = el("a", "", entry.sourceName);
  sourceLink.href = entry.sourceUrl;
  sourceLink.target = "_blank";
  sourceLink.rel = "noopener";
  sourceLink.style.color = "var(--color-brand)";
  sourceLink.style.textDecoration = "none";
  sourceLink.style.fontWeight = "var(--font-weight-medium)";
  sourceLink.style.transition = "color var(--transition-fast)";
  sourceLink.addEventListener("mouseenter", () => sourceLink.style.color = "var(--color-brand-hover)");
  sourceLink.addEventListener("mouseleave", () => sourceLink.style.color = "var(--color-brand)");
  source.appendChild(sourceLink);

  cardEl.appendChild(source);

  return cardEl;
}

function countrySection(entries) {
  const section = el("section", "country-section");
  const firstEntry = entries[0];

  const header = el("div", "country-header");
  header.style.display = "flex";
  header.style.alignItems = "baseline";
  header.style.gap = "var(--space-3)";
  header.style.marginBottom = "var(--space-5)";
  header.style.flexWrap = "wrap";

  const name = el("h2", "country-name heading-1 text-ink", firstEntry.country);
  header.appendChild(name);

  const iso = el("span", "country-iso mono-sm text-brand", firstEntry.iso);
  header.appendChild(iso);

  if (firstEntry.iso === pinnedIso) {
    const pin = el("span", "country-pin", "📍 Your country");
    header.appendChild(pin);
  }

  section.appendChild(header);

  const grid = el("div", "card-grid");
  grid.style.display = "grid";
  grid.style.gap = "var(--space-4)";
  grid.style.gridTemplateColumns = "1fr";

  for (const entry of entries) {
    grid.appendChild(card(entry));
  }

  section.appendChild(grid);
  return section;
}

function render(list) {
  const container = document.getElementById("country-list");
  container.innerHTML = "";

  if (!list.length) {
    const empty = el("div", "empty-state");
    empty.style.gridColumn = "1 / -1";
    empty.style.textAlign = "center";
    empty.style.padding = "var(--space-16) var(--space-6)";
    empty.style.color = "var(--color-ink-muted)";
    empty.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:64px;height:64px;margin-bottom:var(--space-4);opacity:0.5;margin-left:auto;margin-right:auto;" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      <h3 class="display-3 text-ink" style="margin:0 0 var(--space-2);">No matches found</h3>
      <p class="body text-muted" style="max-width:28rem;margin:0 auto;">Try a different search term or clear the filters.</p>
    `;
    container.appendChild(empty);
    return;
  }

  // Group by country
  const byCountry = new Map();
  for (const entry of list) {
    if (!byCountry.has(entry.country)) byCountry.set(entry.country, []);
    byCountry.get(entry.country).push(entry);
  }

  // Sort countries alphabetically, but pin first if applicable
  const countries = Array.from(byCountry.keys()).sort((a, b) => {
    if (a === byCountry.get(pinnedIso)?.[0]?.country) return -1;
    if (b === byCountry.get(pinnedIso)?.[0]?.country) return 1;
    return a.localeCompare(b);
  });

  for (const country of countries) {
    container.appendChild(countrySection(byCountry.get(country)));
  }
}

function matchEntry(entry, term) {
  const haystack = [
    entry.country,
    entry.iso,
    entry.name,
    entry.phone,
    entry.emergency || "",
    entry.languages ? entry.languages.join(" ") : "",
    entry.notes || "",
  ].join(" ").toLowerCase();

  return term.split(/\s+/).every((piece) => haystack.includes(piece));
}

function languageMatches(entry) {
  if (activeLanguages.size === 0) return true;
  if (!entry.languages) return false;
  return entry.languages.some((l) => activeLanguages.has(l.toLowerCase()));
}

function applyFilters() {
  const term = document.getElementById("search-input").value.trim().toLowerCase();
  let list = all;
  if (term) list = list.filter((e) => matchEntry(e, term));
  list = list.filter(languageMatches);
  filtered = list;
  render(list);
  renderLanguageChips();
}

function renderLanguageChips() {
  const container = document.getElementById("language-chips");
  if (!container) return;

  const langCounts = {};
  for (const entry of filtered) {
    if (entry.languages) {
      for (const lang of entry.languages) {
        const key = lang.toLowerCase();
        langCounts[key] = (langCounts[key] || 0) + 1;
      }
    }
  }

  container.innerHTML = "";
  for (const [lang, count] of Object.entries(langCounts).sort((a, b) => b[1] - a[1])) {
    const chip = el("button", "lang-chip" + (activeLanguages.has(lang) ? " active" : ""));
    chip.type = "button";
    chip.setAttribute("aria-pressed", activeLanguages.has(lang));
    chip.innerHTML = lang + `<span class="lang-chip-count">${count}</span>`;
    chip.addEventListener("click", () => {
      if (activeLanguages.has(lang)) activeLanguages.delete(lang);
      else activeLanguages.add(lang);
      applyFilters();
    });
    container.appendChild(chip);
  }
}

function initSearch() {
  const input = document.getElementById("search-input");
  const clearBtn = document.getElementById("search-clear");

  input.addEventListener("input", () => {
    clearBtn.classList.toggle("visible", input.value.length > 0);
    applyFilters();
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    clearBtn.classList.remove("visible");
    applyFilters();
    input.focus();
  });

  input.focus();
}

function initQuickExit() {
  const btn = document.getElementById("quick-exit");
  if (!btn) return;
  btn.addEventListener("click", () => {
    window.location.href = "https://www.bbc.com/weather";
  });
}

function initPinnedDismiss() {
  const btn = document.getElementById("pinned-dismiss");
  if (!btn) return;
  btn.addEventListener("click", () => {
    pinnedIso = null;
    const banner = document.getElementById("pinned-banner");
    if (banner) banner.classList.add("hidden");
    applyFilters();
  });
}

function detectCountryFromTimezone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIMEZONE_TO_ISO[tz] || null;
  } catch { return null; }
}

function initPinnedCountry() {
  const detected = detectCountryFromTimezone();
  if (detected && all.some((e) => e.iso === detected)) {
    pinnedIso = detected;
    const banner = document.getElementById("pinned-banner");
    const textEl = document.getElementById("pinned-banner-text");
    if (banner && textEl) {
      const countryEntry = all.find((e) => e.iso === detected);
      if (countryEntry) {
        textEl.innerHTML = `Showing <strong>${countryEntry.country}</strong> first (detected from your timezone).`;
        banner.classList.remove("hidden");
      }
    }
  }
}

function setFreshness(status) {
  const stamp = document.getElementById("freshness");
  if (!stamp) return;
  if (status && status.dataReviewedTo) {
    stamp.textContent = "Helpline data last reviewed: " + status.dataReviewedTo + ".";
    if (status.staleCount > 0) {
      stamp.textContent += " " + status.staleCount + " number(s) are due for re-verification.";
    }
  }
}

async function loadStatus() {
  try {
    const res = await fetch(statusUrl);
    if (res.ok) setFreshness(await res.json());
  } catch { /* optional */ }
}

async function initApp() {
  try {
    const res = await fetch(dataUrl);
    if (!res.ok) throw new Error("fetch failed: " + res.status);
    const data = await res.json();
    all = data.helplines;
    filtered = all;

    initPinnedCountry();
    render(all);
    initSearch();
    initQuickExit();
    initPinnedDismiss();
    loadStatus();
  } catch (err) {
    const container = document.getElementById("country-list");
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;text-align:center;padding:var(--space-16) var(--space-6);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:64px;height:64px;margin-bottom:var(--space-4);opacity:0.5;margin-left:auto;margin-right:auto;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        <h3 class="display-3 text-ink" style="margin:0 0 var(--space-2);">Could not load helplines</h3>
        <p class="body text-muted">Please try again shortly.</p>
      </div>
    `;
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", initApp);