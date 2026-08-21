/**
 * Egypt's 27 governorates.
 *
 * One list, because the governorate is asked for in five places — the cart's
 * shipping estimate, checkout, the address book, the shipping zones and the
 * courier mapping — and four of them were free text. A shopper typing "cairo"
 * against a zone saved as "Cairo " matched on luck, and the fee quoted in the
 * cart was not the fee charged at checkout.
 *
 * `value` is what gets stored and compared. It stays English regardless of the
 * interface language: the zones an administrator saves, the addresses shoppers
 * file and the courier's own mapping all have to agree on one spelling, and a
 * value that changes with the locale cannot be that.
 *
 * Ordered by where the parcels actually go — Greater Cairo, then the Delta,
 * the canal and Sinai, Upper Egypt, and the frontier governorates last — so
 * the common answers are near the top of a 27-item list rather than sorted
 * alphabetically into the middle of it.
 */
export interface Governorate {
  /** Stored and matched against. Never localised. */
  value: string;
  ar: string;
  region: "greater-cairo" | "delta" | "canal-sinai" | "upper-egypt" | "frontier";
}

export const GOVERNORATES: Governorate[] = [
  { value: "Cairo", ar: "القاهرة", region: "greater-cairo" },
  { value: "Giza", ar: "الجيزة", region: "greater-cairo" },
  { value: "Qalyubia", ar: "القليوبية", region: "greater-cairo" },

  { value: "Alexandria", ar: "الإسكندرية", region: "delta" },
  { value: "Beheira", ar: "البحيرة", region: "delta" },
  { value: "Gharbia", ar: "الغربية", region: "delta" },
  { value: "Monufia", ar: "المنوفية", region: "delta" },
  { value: "Dakahlia", ar: "الدقهلية", region: "delta" },
  { value: "Sharqia", ar: "الشرقية", region: "delta" },
  { value: "Kafr El Sheikh", ar: "كفر الشيخ", region: "delta" },
  { value: "Damietta", ar: "دمياط", region: "delta" },

  { value: "Port Said", ar: "بورسعيد", region: "canal-sinai" },
  { value: "Ismailia", ar: "الإسماعيلية", region: "canal-sinai" },
  { value: "Suez", ar: "السويس", region: "canal-sinai" },
  { value: "North Sinai", ar: "شمال سيناء", region: "canal-sinai" },
  { value: "South Sinai", ar: "جنوب سيناء", region: "canal-sinai" },

  { value: "Beni Suef", ar: "بني سويف", region: "upper-egypt" },
  { value: "Faiyum", ar: "الفيوم", region: "upper-egypt" },
  { value: "Minya", ar: "المنيا", region: "upper-egypt" },
  { value: "Asyut", ar: "أسيوط", region: "upper-egypt" },
  { value: "Sohag", ar: "سوهاج", region: "upper-egypt" },
  { value: "Qena", ar: "قنا", region: "upper-egypt" },
  { value: "Luxor", ar: "الأقصر", region: "upper-egypt" },
  { value: "Aswan", ar: "أسوان", region: "upper-egypt" },

  { value: "Red Sea", ar: "البحر الأحمر", region: "frontier" },
  { value: "New Valley", ar: "الوادي الجديد", region: "frontier" },
  { value: "Matrouh", ar: "مطروح", region: "frontier" },
];

export const REGION_LABELS: Record<Governorate["region"], { en: string; ar: string }> = {
  "greater-cairo": { en: "Greater Cairo", ar: "القاهرة الكبرى" },
  delta: { en: "Delta & Coast", ar: "الدلتا والساحل" },
  "canal-sinai": { en: "Canal & Sinai", ar: "القناة وسيناء" },
  "upper-egypt": { en: "Upper Egypt", ar: "الصعيد" },
  frontier: { en: "Frontier", ar: "المحافظات الحدودية" },
};

/** The name to show, in the language being read. */
export const governorateLabel = (value: string, arabic: boolean): string => {
  const match = GOVERNORATES.find((g) => g.value === value);
  if (!match) return value; // Something saved before this list existed.
  return arabic ? match.ar : match.value;
};

/**
 * Grouped for an `<optgroup>` list, in the order above.
 *
 * Twenty-seven options in one flat run is a scroll; five headed groups is a
 * glance.
 */
export const groupedGovernorates = (): Array<{
  region: Governorate["region"];
  items: Governorate[];
}> => {
  const order: Governorate["region"][] = [
    "greater-cairo",
    "delta",
    "canal-sinai",
    "upper-egypt",
    "frontier",
  ];
  return order.map((region) => ({
    region,
    items: GOVERNORATES.filter((g) => g.region === region),
  }));
};

/**
 * What a geocoder calls each governorate.
 *
 * Measured, not guessed: every entry below is what Nominatim actually
 * returned for a point inside that governorate. Three of them are the
 * English translation of the Arabic name rather than the name anybody uses —
 * Gharbia comes back as "Western", Sharqia as "Eastern", Beheira as "Lake"
 * — which no amount of string normalising would ever resolve.
 *
 * Keys are already normalised by `normalise` below.
 */
const ALIASES: Record<string, string> = {
  jiza: "Giza",
  gizah: "Giza",
  qalyubiya: "Qalyubia",
  eastern: "Sharqia",
  sharkia: "Sharqia",
  daqahliyya: "Dakahlia",
  lake: "Beheira",
  buhayrah: "Beheira",
  western: "Gharbia",
  minufiyya: "Monufia",
  menoufia: "Monufia",
  ismailiya: "Ismailia",
  "bani sweif": "Beni Suef",
  minya: "Minya",
  suhaj: "Sohag",
  matruh: "Matrouh",
  qahirah: "Cairo",
  "new cairo": "Cairo",
  "6th of october": "Giza",
  "kafr ash shaykh": "Kafr El Sheikh",
  "bur said": "Port Said",
  suways: "Suez",
  dumyat: "Damietta",
  fayyum: "Faiyum",
  uqsur: "Luxor",
};

/**
 * One spelling to compare against.
 *
 * Arabic first: the geocoder's Arabic names match this list exactly bar the
 * letters people write either way — Beni Suef comes back as "بنى سويف" where
 * the list says "بني سويف". Then English, with the articles a transliteration
 * bolts on (Al, El, Ad, Aj) and the word "Governorate" taken off.
 */
const normalise = (value: string): string =>
  String(value)
    .trim()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .replace(/governorate|muhafazat/g, " ")
    // Only as whole words: without the boundaries this would eat the "al"
    // inside "Qalyubia" and the "as" inside "Aswan".
    .replace(/\b(al|el|ad|as|aj|ash|at|az)\b/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Resolve loosely-typed input to a canonical value.
 *
 * Two callers, both of which hand over something nobody typed into a list.
 * The map picker reverse-geocodes a dropped pin, and addresses saved before
 * this list existed hold whatever was typed — "cairo", "القاهرة", "6th of
 * October". Dropping either into a `<select>` unresolved shows an empty box
 * and silently rewrites the address on the next save.
 *
 * Anything still unrecognised comes back null, for the caller to keep as it
 * is rather than replace with a guess.
 */
export const matchGovernorate = (input?: string | null): string | null => {
  const needle = normalise(String(input ?? ""));
  if (!needle) return null;

  const exact = GOVERNORATES.find(
    (g) => normalise(g.value) === needle || normalise(g.ar) === needle,
  );
  if (exact) return exact.value;

  return ALIASES[needle] ?? null;
};
