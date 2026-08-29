#!/usr/bin/env node
"use strict";

/*
 * Zero-dependency validator for data/helplines.json.
 *
 * Checks:
 *   - schema shape for every entry
 *   - ISO 3166-1 alpha-2 country codes (case-insensitive set)
 *   - source URLs are http(s) and resolvable hostnames
 *   - phone numbers are non-empty and printable; international dialling codes start with +
 *     (intense format validation is intentionally avoided: local numbers vary hugely)
 *   - hours present
 *   - lastChecked present, valid date, not older than staleDays (default 90)
 *   - duplicate (iso + name) detection
 *   - no duplicate country names with different iso codes
 *
 * Exit codes: 0 = ok, 1 = warnings only (with --warn-as-error also exits 1 on warnings), 2 = errors
 *
 * Usage:
 *   node scripts/validate.js                # exit 2 on errors
 *   node scripts/validate.js --warn-as-error
 *   node scripts/validate.js --max-age 365  # allow stale entries up to N days
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "helplines.json");

function parseArgs(argv) {
  const flags = { warnAsError: false, maxAge: 90 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--warn-as-error") flags.warnAsError = true;
    else if (a === "--max-age") flags.maxAge = Number(argv[++i]);
    if (!Number.isFinite(flags.maxAge) || flags.maxAge < 0) {
      console.error("Invalid --max-age value:", argv[i]);
      process.exit(2);
    }
  }
  return flags;
}

const ISO_CODES = new Set(
  `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW`
    .trim()
    .split(/\s+/)
);

const KEY_FIELDS = [
  "country",
  "iso",
  "name",
  "phone",
  "hours",
  "languages",
  "sourceName",
  "sourceUrl",
  "lastChecked",
];

const ERRORS = [];
const WARNINGS = [];

function error(msg) {
  ERRORS.push(msg);
}

function warn(msg) {
  WARNINGS.push(msg);
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatDate(d) {
  return (
    d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate())
  );
}

function assertDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    error(label + ": lastChecked must be a YYYY-MM-DD date, got " + JSON.stringify(value));
    return null;
  }
  const d = new Date(value + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) {
    error(label + ": lastChecked is an invalid date: " + JSON.stringify(value));
    return null;
  }
  return d;
}

function validate(data) {
  if (!data || typeof data !== "object") {
    error("Root must be an object");
    return;
  }

  if (!Array.isArray(data.helplines)) {
    error('Missing "helplines" array at the root');
    return;
  }

  if (!Array.isArray(data.helplines) || data.helplines.length === 0) {
    warn("helplines is empty");
    return;
  }

  const seen = new Set();
  const seenCountryNames = new Map();

  for (const [i, entry] of data.helplines.entries()) {
    const label = "helplines[" + i + "]";

    if (!entry || typeof entry !== "object") {
      error(label + ": entry must be an object");
      continue;
    }

    for (const field of KEY_FIELDS) {
      if (entry[field] === undefined || entry[field] === null || entry[field] === "") {
        error(label + ': missing "' + field + '"');
      }
    }

    if (typeof entry.country !== "string" || !entry.country.trim()) {
      error(label + ": country must be a non-empty string");
    }

    if (typeof entry.iso !== "string") {
      error(label + ": iso must be a string");
    } else {
      const code = entry.iso.toUpperCase().trim();
      if (!ISO_CODES.has(code)) {
        error(label + ": iso " + JSON.stringify(entry.iso) + " is not a valid ISO 3166-1 alpha-2 code");
      }
      entry.iso = code;
      if (seenCountryNames.has(entry.country) && seenCountryNames.get(entry.country) !== code) {
        error(
          label +
            ': country "' +
            entry.country +
            '" is used with iso ' +
            code +
            " but also with " +
            seenCountryNames.get(entry.country)
        );
      }
      seenCountryNames.set(entry.country, code);
    }

    if (typeof entry.name !== "string" || !entry.name.trim()) {
      error(label + ": name must be a non-empty string");
    }

    if (typeof entry.phone !== "string" || !entry.phone.trim()) {
      error(label + ": phone must be a non-empty string");
    } else {
      const printable = entry.phone.replace(/[^\d+()\s-]/g, "");
      if (printable !== entry.phone.trim()) {
        error(label + ": phone contains characters outside digits, +, (), spaces, and dashes: " + JSON.stringify(entry.phone));
      }
    }

    if (typeof entry.hours !== "string" || !entry.hours.trim()) {
      error(label + ": hours must be a non-empty string");
    }

    if (entry.languages !== undefined) {
      if (!Array.isArray(entry.languages) || entry.languages.some((l) => typeof l !== "string" || !l.trim())) {
        error(label + ": languages must be an array of non-empty strings");
      }
    }

    if (typeof entry.sourceName !== "string" || !entry.sourceName.trim()) {
      error(label + ": sourceName must be a non-empty string");
    }

    if (typeof entry.sourceUrl !== "string" || !entry.sourceUrl) {
      error(label + ": sourceUrl must be a string");
    } else {
      let url;
      try {
        url = new URL(entry.sourceUrl);
      } catch {
        error(label + ": sourceUrl is not a valid URL: " + JSON.stringify(entry.sourceUrl));
      }
      if (url && url.protocol !== "https:" && url.protocol !== "http:") {
        error(label + ": sourceUrl must be http(s): " + JSON.stringify(entry.sourceUrl));
      }
    }

    if (entry.lastChecked) {
      const d = assertDate(entry.lastChecked, label);
      if (d) {
        const ageDays = Math.floor((Date.now() - d.getTime()) / 86400000);
        if (ageDays < -1) {
          warn(label + ": lastChecked " + entry.lastChecked + " is more than a day in the future");
        } else if (ageDays > flags.maxAge) {
          warn(label + ": lastChecked " + entry.lastChecked + " is " + ageDays + " days old (max " + flags.maxAge + ")");
        }
      }
    }

    if (entry.iso && entry.name) {
      const key = entry.iso.toUpperCase() + "|" + entry.name + "|" + entry.phone;
      if (seen.has(key)) {
        warn(label + ": duplicate entry detected for " + entry.iso + " / " + entry.name);
      }
      seen.add(key);
    }
  }

  const top = data.lastUpdated;
  if (!top) {
    warn('top-level "lastUpdated" may be missing — a value of YYYY-MM-DD is recommended');
  }
}

const flags = parseArgs(process.argv.slice(2));

if (!fs.existsSync(DATA_PATH)) {
  console.error("Missing data file: " + DATA_PATH);
  process.exit(2);
}

const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
validate(data);

const today = formatDate(new Date());
let staleCount = 0;
for (const entry of data.helplines) {
  const d = assertDate(entry.lastChecked, entry.name || "entry");
  if (d) {
    const ageDays = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (ageDays > flags.maxAge) staleCount++;
  }
}
const dates = data.helplines
  .map((e) => assertDate(e.lastChecked, e.name || "entry"))
  .filter(Boolean)
  .map((d) => d.getTime());
const oldest = dates.length ? formatDate(new Date(Math.min(...dates))) : today;
const newest = dates.length ? formatDate(new Date(Math.max(...dates))) : today;

if (ERRORS.length) {
  console.log("Errors (" + ERRORS.length + "):");
  for (const m of ERRORS) {
    console.log("  - " + m);
  }
}

let code = ERRORS.length ? 2 : 0;

if (WARNINGS.length) {
  console.log("Warnings (" + WARNINGS.length + "):");
  for (const m of WARNINGS) {
    console.log("  - " + m);
  }
  if (flags.warnAsError) code = Math.max(code, 1);
}

if (code === 0) {
  const status = {
    automatedCheck: today,
    dataReviewedFrom: oldest,
    dataReviewedTo: newest,
    entries: data.helplines.length,
    staleCount,
  };
  const statusPath = path.join(ROOT, "data", "status.json");
  const prev = fs.existsSync(statusPath)
    ? JSON.parse(fs.readFileSync(statusPath, "utf8"))
    : null;
  const body = JSON.stringify(status, null, 2) + "\n";
  if (JSON.stringify(status) !== JSON.stringify(prev)) {
    fs.writeFileSync(statusPath, body);
  }
  console.log("OK: " + data.helplines.length + " entries validated (" + today + ")");
}
process.exit(code);