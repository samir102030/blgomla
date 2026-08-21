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
 * Resolve loosely-typed input to a canonical value.
 *
 * Addresses saved before this list existed hold whatever was typed — "cairo",
 * "القاهرة", "6th of October" — and dropping them into a `<select>` would show
 * an empty box and silently rewrite the address on the next save. Anything
 * that cannot be resolved is handed back unchanged, for the caller to keep as
 * an extra option.
 */
export const matchGovernorate = (input?: string | null): string | null => {
  const needle = String(input ?? "").trim().toLowerCase();
  if (!needle) return null;
  const hit = GOVERNORATES.find(
    (g) => g.value.toLowerCase() === needle || g.ar === String(input).trim(),
  );
  return hit ? hit.value : null;
};
