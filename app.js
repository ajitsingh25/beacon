"use strict";

const dataUrl = "data/helplines.json";
const statusUrl = "data/status.json";

let all = [];

// ITU-T E.164 country calling codes for countries in our dataset
const COUNTRY_CALLING_CODES = {
  US: "1", CA: "1", GB: "44", AU: "61", NZ: "64", IN: "91",
  DE: "49", FR: "33", ES: "34", IT: "39", NL: "31", JP: "81",
  KR: "82", SG: "65", IL: "972", ZA: "27", NG: "234", KE: "254",
  BR: "55", MX: "52",
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

function card(entry) {
  const c = el("article", "card");

  c.appendChild(el("h3", "name", entry.name));

  const phoneWrap = el("div", "phone-wrap");

  const localPhone = el("a", "phone local", entry.phone);
  localPhone.href = telLink(entry.phone);
  localPhone.setAttribute("aria-label", "Local: " + entry.phone);
  phoneWrap.appendChild(localPhone);

  const intl = toInternational(entry.iso, entry.phone);
  if (intl) {
    const intlPhone = el("a", "phone intl", intl);
    intlPhone.href = "tel:" + intl.replace(/\s+/g, "");
    intlPhone.setAttribute("aria-label", "International: " + intl);
    phoneWrap.appendChild(intlPhone);
  }

  c.appendChild(phoneWrap);

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
  wrap.appendChild(heading);
  wrap.dataset.country = entry.country;
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
    entry.languages ? entry.languages.join(" ") : "",
    entry.notes || "",
  ]
    .join(" ")
    .toLowerCase();

  return term.split(/\s+/).every((piece) => haystack.includes(piece));
}

function applyFilters() {
  const term = document.getElementById("search-input").value.trim().toLowerCase();
  const list = term ? all.filter((e) => matchEntry(e, term)) : all;
  render(list);
}

function init() {
  const input = document.getElementById("search-input");
  input.addEventListener("input", applyFilters);
  input.focus();
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
    render(all);
    init();
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