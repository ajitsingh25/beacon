"use strict";

const dataUrl = "data/helplines.json";
const statusUrl = "data/status.json";

let all = [];
let filtered = [];
let activeLanguages = new Set();
let activeCategories = new Set();
let activeNGOCategories = new Set();
let pinnedIso = null;
let activeCountryHash = null;

// ITU-T E.164 country calling codes for countries in our dataset
const COUNTRY_CALLING_CODES = {
  US: "1", CA: "1", GB: "44", AU: "61", NZ: "64", IN: "91",
  DE: "49", FR: "33", ES: "34", IT: "39", NL: "31", JP: "81",
  KR: "82", SG: "65", IL: "972", ZA: "27", NG: "234", KE: "254",
  BR: "55", MX: "52",
};

const CATEGORIES = ["suicide", "domestic-violence", "child-protection", "sexual-assault", "substance-use", "human-trafficking", "lgbtq", "veterans"];

const CATEGORY_LABELS = {
  "suicide": "Suicide",
  "domestic-violence": "Domestic Violence",
  "child-protection": "Child Protection",
  "sexual-assault": "Sexual Assault",
  "substance-use": "Substance Use",
  "human-trafficking": "Human Trafficking",
  "lgbtq": "LGBTQ+",
  "veterans": "Veterans"
};

const NGO_CATEGORIES = ["food", "shelter", "medical", "education"];

const NGO_LABELS = {
  "food": "Food",
  "shelter": "Shelter",
  "medical": "Medical",
  "education": "Education"
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
    chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    message: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
    alt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
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

function createAltRow(entry, alt) {
  const row = el("div", "phone-row alt");
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.style.gap = "var(--space-3)";
  row.style.flexWrap = "wrap";
  row.style.paddingTop = "var(--space-2)";
  row.style.borderTop = "1px solid var(--color-border)";
  row.style.marginTop = "var(--space-1)";

  const labelEl = el("span", "phone-label alt", "If busy, try:");
  row.appendChild(labelEl);

  const link = el("a", "phone-link alt", alt.phone);
  link.href = alt.phone ? telLink(alt.phone) : "#";
  link.setAttribute("aria-label", "Fallback: " + alt.name + (alt.phone ? " " + alt.phone : ""));
  link.style.fontSize = "var(--font-size-base)";
  link.style.fontWeight = "var(--font-weight-medium)";
  link.style.color = "var(--color-accent)";
  row.appendChild(link);

  if (alt.notes) {
    const notes = el("span", "phone-label alt", alt.notes);
    notes.style.color = "var(--color-ink-muted)";
    notes.style.fontSize = "var(--font-size-sm)";
    row.appendChild(notes);
  }

  if (alt.phone) {
    const copyBtn = el("button", "phone-copy", "");
    copyBtn.type = "button";
    copyBtn.innerHTML = svg("copy");
    copyBtn.setAttribute("aria-label", "Copy fallback number");
    copyBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      copyToClipboard(alt.phone, copyBtn);
    });
    row.appendChild(copyBtn);
  }

  return row;
}

function createChatRow(entry) {
  if (!entry.chatUrl && !entry.textNumber) return null;

  const row = el("div", "phone-row chat-row");
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.style.gap = "var(--space-3)";
  row.style.flexWrap = "wrap";
  row.style.paddingTop = "var(--space-2)";
  row.style.borderTop = "1px solid var(--color-border)";
  row.style.marginTop = "var(--space-1)";

  if (entry.chatUrl) {
    const labelEl = el("span", "phone-label", "Chat");
    row.appendChild(labelEl);

    const link = el("a", "phone-link chat", "Open chat");
    link.href = entry.chatUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.setAttribute("aria-label", "Open web chat");
    link.style.fontSize = "var(--font-size-base)";
    link.style.fontWeight = "var(--font-weight-medium)";
    link.style.color = "var(--color-brand)";
    row.appendChild(link);

    const copyBtn = el("button", "phone-copy", "");
    copyBtn.type = "button";
    copyBtn.innerHTML = svg("copy");
    copyBtn.setAttribute("aria-label", "Copy chat URL");
    copyBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      copyToClipboard(entry.chatUrl, copyBtn);
    });
    row.appendChild(copyBtn);
  }

  if (entry.textNumber) {
    const labelEl = el("span", "phone-label", "Text");
    row.appendChild(labelEl);

    const link = el("a", "phone-link text", entry.textNumber);
    link.href = telLink(entry.textNumber);
    link.setAttribute("aria-label", "Text number: " + entry.textNumber);
    link.style.fontSize = "var(--font-size-base)";
    link.style.fontWeight = "var(--font-weight-semibold)";
    link.style.color = "var(--color-accent)";
    row.appendChild(link);

    const copyBtn = el("button", "phone-copy", "");
    copyBtn.type = "button";
    copyBtn.innerHTML = svg("copy");
    copyBtn.setAttribute("aria-label", "Copy text number");
    copyBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      copyToClipboard(entry.textNumber, copyBtn);
    });
    row.appendChild(copyBtn);
  }

  return row;
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

  // Chat / Text row
  const chatRow = createChatRow(entry);
  if (chatRow) phonesWrap.appendChild(chatRow);

  // Fallback numbers
  if (entry.fallback && entry.fallback.length) {
    for (const alt of entry.fallback) {
      phonesWrap.appendChild(createAltRow(entry, alt));
    }
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
  section.dataset.iso = firstEntry.iso;

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

function matchNGOEntry(entry, term) {
  const haystack = [
    entry.name,
    entry.category,
    contactToText(entry.contact),
    entry.countries ? entry.countries.join(" ") : "",
    entry.focus || "",
  ].join(" ").toLowerCase();

  return term.split(/\s+/).every((piece) => haystack.includes(piece));
}

function NGOMatches(entry) {
  if (activeNGOCategories.size === 0) return true;
  return activeNGOCategories.has(entry.category);
}

function contactToText(contact) {
  if (!contact) return "";
  if (contact.includes("http")) {
    // Extract domain from URL
    try {
      const url = new URL(contact);
      return url.hostname;
    } catch (e) {
      return contact;
    }
  }
  return contact;
}

function applyFilters() {
  const term = document.getElementById("search-input").value.trim().toLowerCase();
  let list = all;
  if (term) list = list.filter((e) => matchEntry(e, term));
  list = list.filter(languageMatches);
  list = list.filter(categoryMatches);
  filtered = list;
  render(list);
  renderLanguageChips();
  renderCategoryChips();

  // Also filter NGOs if ngos data is loaded (ngos.html page)
  if (typeof ngos !== "undefined" && ngos.length > 0) {
    let ngoList = ngos;
    if (term) ngoList = ngoList.filter((e) => matchNGOEntry(e, term));
    ngoList = ngoList.filter(NGOMatches);
    ngosFiltered = ngoList;
    renderNGOs();
    renderNGOChips();
  }
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

function renderCategoryChips() {
  const container = document.getElementById("category-chips");
  if (!container) return;

  const categoryCounts = {};
  for (const entry of filtered) {
    const cat = entry.category;
    if (cat) {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
  }

  container.innerHTML = "";
  // Show only categories that have entries in the filtered set, in the defined order
  for (const cat of CATEGORIES) {
    if (!(cat in categoryCounts) || categoryCounts[cat] === 0) continue;
    const active = activeCategories.has(cat);
    const chip = el("button", "cat-chip" + (active ? " active" : ""));
    chip.type = "button";
    chip.setAttribute("aria-pressed", active);
    chip.innerHTML = `${CATEGORY_LABELS[cat]} <span class="cat-chip-count">${categoryCounts[cat]}</span>`;
    chip.addEventListener("click", () => {
      if (activeCategories.has(cat)) activeCategories.delete(cat);
      else activeCategories.add(cat);
      applyFilters();
    });
    container.appendChild(chip);
  }
}

function renderNGOChips() {
  const container = document.getElementById("category-chips");
  if (!container) return;

  const categoryCounts = {};
  for (const entry of ngosFiltered) {
    const cat = entry.category;
    if (cat) {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
  }

  container.innerHTML = "";
  // Show only categories that have entries in the filtered set, in the defined order
  for (const cat of NGO_CATEGORIES) {
    if (!(cat in categoryCounts) || categoryCounts[cat] === 0) continue;
    const active = activeNGOCategories.has(cat);
    const chip = el("button", "ngo-chip" + (active ? " active" : ""));
    chip.type = "button";
    chip.setAttribute("aria-pressed", active);
    chip.innerHTML = `${NGO_LABELS[cat]} <span class="ngo-chip-count">${categoryCounts[cat]}</span>`;
    chip.addEventListener("click", () => {
      if (activeNGOCategories.has(cat)) activeNGOCategories.delete(cat);
      else activeNGOCategories.add(cat);
      applyFilters();
    });
    container.appendChild(chip);
  }
}

function renderNGO(entry) {
  const ngoCard = el("article", "ngo-card");

  // Name and category
  const header = el("div", "ngo-header");
  header.style.display = "flex";
  header.style.alignItems = "flex-start";
  header.style.justifyContent = "space-between";
  header.style.gap = "var(--space-3)";
  header.style.flexWrap = "wrap";

  const name = el("h3", "ngo-name display-3 text-ink", entry.name);
  header.appendChild(name);

  const category = el("span", "ngo-category mono-sm text-brand", NGO_LABELS[entry.category]);
  header.appendChild(category);

  ngoCard.appendChild(header);

  // Contact/website
  const contactRow = el("div", "ngo-contact");
  contactRow.style.display = "flex";
  contactRow.style.flexDirection = "column";
  contactRow.style.gap = "var(--space-2)";
  contactRow.style.paddingTop = "var(--space-2)";
  contactRow.style.borderTop = "1px solid var(--color-border)";
  contactRow.style.marginTop = "var(--space-1)";

  if (entry.contact) {
    const contactLink = el("a", "ngo-contact-link", "Official Website");
    contactLink.href = entry.contact;
    contactLink.target = "_blank";
    contactLink.rel = "noopener";
    contactLink.style.color = "var(--color-brand)";
    contactLink.style.fontWeight = "var(--font-weight-medium)";
    contactLink.style.textDecoration = "none";
    contactRow.appendChild(contactLink);
  }

  ngoCard.appendChild(contactRow);

  // Focus/reach
  if (entry.reach) {
    const reach = el("p", "ngo-reach body-sm text-muted", entry.reach);
    ngoCard.appendChild(reach);
  }

  // Focus
  if (entry.focus) {
    const focus = el("p", "ngo-focus body-sm text-muted", entry.focus);
    ngoCard.appendChild(focus);
  }

  // Verified badge
  const badge = el("span", "ngo-verified", "Verified");
  badge.style.color = "var(--color-brand)";
  badge.style.fontSize = "var(--font-size-xs)";
  badge.style.fontWeight = "var(--font-weight-medium)";
  badge.style.marginLeft = "var(--space-2)";
  badge.style.background = "var(--color-bg-subtle)";
  badge.style.padding = "var(--space-1) var(--space-2)";
  badge.style.borderRadius = "4px";
  ngoCard.appendChild(badge);

  return ngoCard;
}

function renderNGOs() {
  const container = document.getElementById("ngo-list");
  if (!container) return;

  container.innerHTML = "";

  if (!ngosFiltered.length) {
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

  // Group by category
  const byCategory = {};
  for (const entry of ngosFiltered) {
    if (!byCategory[entry.category]) byCategory[entry.category] = [];
    byCategory[entry.category].push(entry);
  }

  // Sort categories in defined order
  const categories = NGO_CATEGORIES.filter(c => byCategory[c]);

  for (const cat of categories) {
    const categoryHeader = el("h2", "category-header", NGO_LABELS[cat]);
    container.appendChild(categoryHeader);

    const ngoGrid = el("div", "ngo-grid");
    ngoGrid.style.display = "grid";
    ngoGrid.style.gap = "var(--space-4)";
    ngoGrid.style.gridTemplateColumns = "1fr";

    for (const entry of byCategory[cat]) {
      const card = renderNGO(entry);
      ngoGrid.appendChild(card);
    }

    container.appendChild(ngoGrid);
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

function handleHashRouting() {
  const hash = window.location.hash.slice(1);
  if (hash) {
    const iso = hash.toUpperCase();
    if (all.some((e) => e.iso === iso)) {
      activeCountryHash = iso;
      const input = document.getElementById("search-input");
      input.value = iso;
      applyFilters();
      // Scroll to country section
      setTimeout(() => {
        const section = document.querySelector('[data-iso="' + iso + '"]');
        if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }
}

function updateHashFromPinned() {
  if (pinnedIso && !activeCountryHash) {
    window.history.replaceState(null, "", "#" + pinnedIso);
  }
}

function handlePrintWallet() {
  const country = pinnedIso || activeCountryHash;
  if (!country) {
    alert("Please select a country first (tap a country or allow location detection).");
    return;
  }
  const entries = all.filter((e) => e.iso === country);
  if (!entries.length) return;

  const printWindow = window.open("", "_blank");
  printWindow.document.write(generateWalletHTML(entries[0].country, entries));
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function generateWalletHTML(countryName, entries) {
  const primary = entries[0];
  const intl = toInternational(primary.iso, primary.phone);
  const fallback = primary.fallback || [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Beacon Wallet Card — ${countryName}</title>
<style>
@page { margin: 12mm; size: auto; }
* { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11pt; line-height: 1.4; color: #0f172a; margin: 0; padding: 0; }
.wallet { max-width: 85mm; margin: 0 auto; padding: 12px; border: 2px solid #0d9488; border-radius: 8px; }
.header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #0d9488; padding-bottom: 8px; }
.header h1 { margin: 0; font-size: 18pt; font-weight: 800; color: #0d9488; }
.header .country { margin: 4px 0 0; font-size: 10pt; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }
.section { margin-top: 10px; }
.section-title { font-size: 8pt; font-weight: 700; color: #0d9488; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
.section-title::before { content: ""; width: 8px; height: 8px; background: #0d9488; border-radius: 2px; }
.phone-row { display: flex; justify-content: space-between; align-items: baseline; padding: 6px 0; border-bottom: 1px dashed #cbd5e1; font-family: "JetBrains Mono", monospace; font-size: 11pt; }
.phone-row:last-child { border-bottom: none; }
.phone-label { font-family: inherit; font-size: 9pt; color: #475569; font-weight: 600; }
.phone-number { color: #0f172a; font-weight: 700; text-decoration: none; }
.phone-number.emergency { color: #dc2626; }
.phone-number.chat { color: #0d9488; }
.phone-number.alt { color: #f97316; }
.note { font-size: 8pt; color: #64748b; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
.source { font-size: 7pt; color: #94a3b8; margin-top: 10px; text-align: center; }
.disclaimer { font-size: 7pt; color: #dc2626; margin-top: 8px; text-align: center; font-weight: 600; }
@media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="wallet">
  <div class="header">
    <h1>Beacon</h1>
    <div class="country">${countryName}</div>
  </div>

  <div class="section">
    <div class="section-title">Primary</div>
    <div class="phone-row"><span class="phone-label">Call</span><a class="phone-number" href="tel:${telLink(primary.phone).replace("tel:", "")}">${primary.phone}</a></div>
    ${intl ? `<div class="phone-row"><span class="phone-label">Intl</span><a class="phone-number" href="tel:${intl.replace(/\s+/g, "")}">${intl}</a></div>` : ""}
    ${primary.textNumber ? `<div class="phone-row"><span class="phone-label">Text</span><a class="phone-number" href="tel:${telLink(primary.textNumber).replace("tel:", "")}">${primary.textNumber}</a></div>` : ""}
    ${primary.chatUrl ? `<div class="phone-row"><span class="phone-label">Chat</span><a class="phone-number chat" href="${primary.chatUrl}" target="_blank">Open chat →</a></div>` : ""}
  </div>

  <div class="section">
    <div class="section-title">Emergency</div>
    <div class="phone-row"><span class="phone-label">${primary.emergency.includes("/") ? "Emergency" : "Police/Ambulance"}</span><a class="phone-number emergency" href="tel:${telLink(primary.emergency.split("/")[0].trim()).replace("tel:", "")}">${primary.emergency}</a></div>
  </div>

  ${fallback.length ? `
  <div class="section">
    <div class="section-title">If busy, try</div>
    ${fallback.map(f => `<div class="phone-row"><span class="phone-label">${f.name}</span>${f.phone ? `<a class="phone-number alt" href="tel:${telLink(f.phone).replace("tel:", "")}">${f.phone}</a>` : `<span class="phone-number alt">${f.notes || "See notes"}</span>`}</div>`).join("")}
  </div>
  ` : ""}

  <div class="note">Data verified ${primary.lastChecked}. Sources: ${entries.map(e => e.sourceName).join(", ")}.</div>
  <p class="disclaimer">Not a substitute for emergency services. In immediate danger, call your local emergency number.</p>
  <p class="source">beacon.help · Crisis helpline finder</p>
</div>
</body>
</html>`;
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

    // Also fetch NGO data
    const ngoRes = await fetch("data/ngos.json");
    if (ngoRes.ok) {
      const ngoData = await ngoRes.json();
      ngos = ngoData.ngos;
      ngosFiltered = ngos;
    } else {
      ngos = [];
      ngosFiltered = [];
    }

    injectJSONLD();
    initPinnedCountry();
    handleHashRouting();
    window.addEventListener("hashchange", handleHashRouting);
    render(all);
    initSearch();
    initQuickExit();
    initPinnedDismiss();
    initPrintButton();
    renderCategoryChips();
    renderNGOChips();
    loadStatus();
    updateHashFromPinned();
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

function injectJSONLD() {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  const items = all.map((e) => ({
    "@type": "EmergencyService",
    "name": e.name,
    "telephone": e.phone,
    "url": e.sourceUrl,
    "areaServed": { "@type": "Country", "name": e.country },
    "availableLanguage": e.languages,
    "hoursAvailable": e.hours,
    "description": e.notes,
  }));
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Beacon Crisis Helplines",
    "description": "Verified crisis and suicide-prevention helplines by country",
    "itemListElement": items.map((item, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "item": item,
    })),
  });
  document.head.appendChild(script);
}

function initPrintButton() {
  const footer = document.querySelector(".footer-inner");
  if (!footer) return;

  const printBtn = document.createElement("a");
  printBtn.className = "contribute-link no-print";
  printBtn.href = "#";
  printBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="6 9 6 21 18 21 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><line x1="12" y1="3" x2="12" y2="9"/>
    </svg>
    Print wallet card
  `;
  printBtn.addEventListener("click", (e) => {
    e.preventDefault();
    handlePrintWallet();
  });

  const contributeP = footer.querySelector(".contribute");
  if (contributeP) {
    contributeP.insertAdjacentElement("beforebegin", printBtn);
    contributeP.style.marginTop = "var(--space-4)";
  }
}

document.addEventListener("DOMContentLoaded", initApp);