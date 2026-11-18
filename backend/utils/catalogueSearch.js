const aliases = [
  ["camera", "cameras", "كاميرا", "كاميرات", "كامره", "كامرة", "كميرا", "كميرات"],
  ["laptop", "laptops", "لابتوب", "لاب توب"],
  ["router", "routers", "راوتر", "راوترات"],
  ["monitor", "monitors", "شاشه", "شاشة", "شاشات"],
  ["cable", "cables", "كابل", "كابلات", "كيبل", "كيبلات"],
  ["printer", "printers", "طابعه", "طابعة", "طابعات"],
  ["switch", "switches", "سويتش", "سويتشات"],
  ["keyboard", "keyboards", "كيبورد", "كيبوردات"],
];

const terms = new Map(aliases.flatMap((group) => group.map((word) => [word, group])));
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const boundary = "[^\\p{L}\\p{N}]";

const fold = (text) => String(text ?? "").trim().slice(0, 160).toLowerCase()
  .replace(/[ً-ْـ]/g, "")
  .replace(/[أإآٱ]/g, "ا")
  .replace(/[٠-٩۰-۹]/g, (digit) => String(digit.charCodeAt(0) & 15))
  .replace(/لاب\s+توب/g, "لابتوب");

const pattern = (term) => {
  const key = term.startsWith("ال") && terms.has(term.slice(2)) ? term.slice(2) : term;
  return (terms.get(key) ?? [term])
    .map((word) => (/[\u0600-\u06ff]/.test(word) ? "(?:ال)?" : "") + escape(word))
    .join("|");
};

export function catalogueSearch(raw, { autocomplete = false } = {}) {
  const text = fold(raw);
  const tokens = [...new Set(text.split(/\s+/).filter(Boolean))].slice(0, 6);
  const patterns = tokens.map(pattern);
  const word = (value) => new RegExp(`(?:^|${boundary})(?:${value})(?=$|${boundary})`, "iu");
  return {
    tokens: patterns.map((value, index) => autocomplete && index === patterns.length - 1
      ? new RegExp(`(?:^|${boundary})(?:${value})`, "iu")
      : word(value)),
    departments: patterns.map((value) => new RegExp(`^(?:${value})$`, "iu")),
    phrase: patterns.length ? word(patterns.join("\\s+")) : null,
    exact: new RegExp(`^${escape(text)}$`, "i"),
    partial: new RegExp(escape(text), "i"),
  };
}

export function productSearchClauses(search, departments = []) {
  return search.tokens.map((token, index) => {
    const categories = departments.filter(({ name, nameAr }) =>
      search.departments[index].test(name ?? "") || search.departments[index].test(nameAr ?? "")
    ).map(({ _id }) => _id);
    const sku = search.tokens.length === 1 ? search.partial : token;
    return { $or: [
      { name: token }, { nameAr: token }, { sku },
      ...(categories.length ? [{ category: { $in: categories } }] : []),
    ] };
  });
}

export function catalogueRank(search) {
  const match = (field, regex) => ({
    $regexMatch: { input: { $ifNull: [`$${field}`, ""] }, regex: regex.source, options: "i" },
  });
  const onTitle = (regex) => ({ $or: [match("name", regex), match("nameAr", regex)] });
  const weight = (condition, score) => ({ $cond: [condition, score, 0] });
  return { $add: [
    weight(match("sku", search.exact), 60),
    weight(onTitle(search.exact), 40),
    weight(onTitle(search.phrase), 20),
    ...search.tokens.map((regex) => weight(onTitle(regex), 3)),
  ] };
}
