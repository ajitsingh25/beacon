// Country calling codes (ITU-T E.164)
// Only codes for countries in our dataset
const COUNTRY_CALLING_CODES = {
  US: "1",
  CA: "1",
  GB: "44",
  AU: "61",
  NZ: "64",
  IN: "91",
  DE: "49",
  FR: "33",
  ES: "34",
  IT: "39",
  NL: "31",
  JP: "81",
  KR: "82",
  SG: "65",
  IL: "972",
  ZA: "27",
  NG: "234",
  KE: "254",
  BR: "55",
  MX: "52",
};

function toInternational(iso, localPhone) {
  const cc = COUNTRY_CALLING_CODES[iso];
  if (!cc) return null;
  // Strip leading trunk prefix (0) common in many countries
  let national = localPhone.replace(/[^\d]/g, "");
  if (national.startsWith("0")) national = national.slice(1);
  return "+" + cc + " " + national;
}