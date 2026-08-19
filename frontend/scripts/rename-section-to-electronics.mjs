/**
 * Copy for the Electronics section.
 *
 * The section was framed as a student programme; it is a shop anyone can buy
 * from, with a student discount inside it. Keys that already exist are
 * rewritten rather than appended, because the old wording is now wrong rather
 * than merely missing.
 */
import { readFile, writeFile } from "node:fs/promises";

/** key → [arabic, english]. English is the key itself unless given. */
const STRINGS = {
  Electronics: ["إلكترونيات"],
  "admin.electronics": ["إلكترونيات", "Electronics"],
  "Boards · sensors · lab tools": ["بوردات · حساسات · أدوات معمل"],
  "Boards, sensors, lab tools and components — open to everyone, with a standing discount for engineering and computer science students.":
    ["بوردات وحساسات وأدوات معمل ومكونات — مفتوح للجميع، وفيه خصم دائم لطلاب الهندسة وعلوم الحاسب."],
  "The parts a project actually needs, in one place — anyone can buy. Students at an engineering or computer science faculty confirm a faculty email once and carry a standing discount on all of it.":
    ["القطع اللي أي مشروع محتاجها فعلًا، في مكان واحد — أي حد يقدر يشتري. وطلاب كليات الهندسة وعلوم الحاسب بيأكدوا بريد الكلية مرة واحدة ويمشوا بخصم دايم على كل ده."],
  "Student discount": ["خصم الطلاب"],
  "The shelf": ["الرف"],
  "Everything in the section": ["كل اللي في القسم"],
  "Studying? The same shelf, cheaper.": ["طالب؟ نفس الرف بسعر أقل."],
  "admin.studentOffer": ["خصم الطلاب", "Student discount"],
  "admin.studentMembers": ["الطلاب", "Students"],
  "admin.studentProgram": ["إلكترونيات", "Electronics"],
};

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

for (const [file, useArabic] of [
  ["src/locales/ar.json", true],
  ["src/locales/en.json", false],
]) {
  const raw = await readFile(file, "utf8");
  const existing = JSON.parse(raw);

  let updated = raw;
  const additions = [];
  let rewritten = 0;

  for (const [key, [arabic, english]] of Object.entries(STRINGS)) {
    const value = useArabic ? arabic : english ?? key;
    if (key in existing) {
      const pattern = new RegExp(`(${escape(JSON.stringify(key))}:\\s*)"(?:[^"\\\\]|\\\\.)*"`);
      updated = updated.replace(pattern, `$1${JSON.stringify(value)}`);
      rewritten += 1;
    } else {
      additions.push(`  ${JSON.stringify(key)}: ${JSON.stringify(value)}`);
    }
  }

  if (additions.length) {
    const close = updated.lastIndexOf("}");
    updated = `${updated.slice(0, close).replace(/,?\s*$/, "")},\n${additions.join(",\n")}\n}\n`;
  }

  JSON.parse(updated); // fail here rather than at runtime
  await writeFile(file, updated, "utf8");
  console.log(`${file}: ${additions.length} added, ${rewritten} rewritten`);
}
