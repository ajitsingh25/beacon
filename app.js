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
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = "Copied!";
    btn.style.color = "var(--accent)";
    setTimeout(() => {
      btn.textContent = orig;
      btn.style.color = "";
    }, 1500);
  }).catch(() => {
    // Fallback for older browsers
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    btn.textContent = "Copied!";
    setTimeout(() => btn.textContent = "Copy", 1500);
  });
}

function phoneLinkEntry(phone, label, ariaLabel, isIntl = false) {
  const wrap = el("span", "phone-entry");
  const link = el("a", "phone" + (isIntl ? " intl" : " local"), phone);
  link.href = telLink(phone);
  link.setAttribute("aria-label", ariaLabel);
  wrap.appendChild(link);

  const copyBtn = el("button", "copy-btn", "Copy");
  copyBtn.type = "button";
  copyBtn.setAttribute("aria-label", "Copy " + label + " to clipboard");
  copyBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    copyToClipboard(phone, copyBtn);
  });
  wrap.appendChild(copyBtn);

  return wrap;
}

function card(entry) {
  const c = el("article", "card");

  c.appendChild(el("h3", "name", entry.name));

  const phoneWrap = el("div", "phone-wrap");

  phoneWrap.appendChild(phoneLinkEntry(
    entry.phone,
    "local number",
    "Local: " + entry.phone
  ));

  const intl = toInternational(entry.iso, entry.phone);
  if (intl) {
    phoneWrap.appendChild(phoneLinkEntry(
      intl,
      "international number",
      "International: " + intl,
      true
    ));
  }

  c.appendChild(phoneWrap);

  if (entry.emergency) {
    const emerg = el("p", "emergency");
    emerg.innerHTML = '<strong>Emergency:</strong> <a class="phone" href="tel:' + telLink(entry.emergency).replace("tel:", "") + '">' + entry.emergency + '</a>';
    c.appendChild(emerg);
  }

  const meta = el("p", "meta");
  const bits = [entry.hours];
  if (entry.languages && entry.languages.length) {
    bits.push(entry.languages.join(", "));
  }
  meta.textContent = bits.join(" · ");
  c.appendChild(meta);

  if (entry.notes) {
    c.appendChild(el("p", "notes", entry.notes));
  }

  const source = el("p", "source", "Source: ");
  const link = el("a", null, entry.sourceName);
  link.href = entry.sourceUrl;
  link.target = "_blank";
  link.rel = "noopener";
  source.appendChild(link);
  c.appendChild(source);

  return c;
}

function group(entry) {
  const wrap = el("div", "country-group");
  const heading = el("h2", "country-heading", entry.country);
  heading.appendChild(el("span", "iso", entry.iso));
  if (entry.iso === pinnedIso) {
    const pin = el("span", "pin", "📍 Your country");
    heading.appendChild(pin);
  }
  wrap.appendChild(heading);
  wrap.dataset.country = entry.country;
  wrap.dataset.iso = entry.iso;
  return wrap;
}

function render(list) {
  const container = document.getElementById("country-list");
  container.innerHTML = "";

  if (!list.length) {
    container.appendChild(
      el("p", "empty", "No numbers match that search. Try a country name, or clear the search.")
    );
    return;
  }

  let currentWrap = null;
  for (const entry of list) {
    if (!currentWrap || currentWrap.dataset.country !== entry.country) {
      currentWrap = group(entry);
      container.appendChild(currentWrap);
    }
    currentWrap.appendChild(card(entry));
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
  ]
    .join(" ")
    .toLowerCase();

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
  if (term) {
    list = list.filter((e) => matchEntry(e, term));
  }
  list = list.filter(languageMatches);
  filtered = list;
  render(list);
  renderLanguageChips();
}

function renderLanguageChips() {
  const container = document.getElementById("language-chips");
  if (!container) return;

  // Collect all languages from filtered results
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
    const chip = el("button", "lang-chip" + (activeLanguages.has(lang) ? " active" : ""), lang);
    chip.type = "button";
    chip.setAttribute("aria-pressed", activeLanguages.has(lang));
    chip.addEventListener("click", () => {
      if (activeLanguages.has(lang)) {
        activeLanguages.delete(lang);
      } else {
        activeLanguages.add(lang);
      }
      applyFilters();
    });
    container.appendChild(chip);
  }
}

function initSearch() {
  const input = document.getElementById("search-input");
  input.addEventListener("input", applyFilters);
  input.focus();
}

function initQuickExit() {
  const btn = document.getElementById("quick-exit");
  if (!btn) return;
  btn.addEventListener("click", () => {
    // Redirect to a neutral site
    window.location.href = "https://www.bbc.com/weather";
  });
}

function initLanguageFilter() {
  // Language chips are rendered dynamically in applyFilters
}

function detectCountryFromTimezone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIMEZONE_TO_ISO[tz] || null;
  } catch {
    return null;
  }
}

function initPinnedCountry() {
  const detected = detectCountryFromTimezone();
  if (detected && all.some((e) => e.iso === detected)) {
    pinnedIso = detected;
    const banner = document.getElementById("pinned-banner");
    if (banner) {
      const countryEntry = all.find((e) => e.iso === detected);
      if (countryEntry) {
        banner.textContent = "Showing " + countryEntry.country + " first (detected from your timezone). ";
        const clearBtn = el("button", "clear-pin", "Show all countries");
        clearBtn.type = "button";
        clearBtn.addEventListener("click", () => {
          pinnedIso = null;
          banner.remove();
          applyFilters();
        });
        banner.appendChild(clearBtn);
        banner.style.display = "block";
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
    if (res.ok) {
      setFreshness(await res.json());
    }
  } catch {
    /* freshness badge is optional */
  }
}

async function initApp() {
  const container = document.getElementById("country-list");

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
    loadStatus();
  } catch (err) {
    container.innerHTML = "";
    container.appendChild(
      el("p", "empty", "Could not load the helpline list. Please try again shortly.")
    );
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", initApp);