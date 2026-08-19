/**
 * Reports any `t("…")` key on the redesigned surfaces that has no Arabic
 * translation.
 *
 * A missing key does not throw — i18next falls back to the English source
 * string — so an untranslated label shows up as English text sitting in an
 * Arabic page, which is easy to miss by eye and easy to catch here.
 */
import { readdirSync, readFileSync } from "node:fs";

const ar = JSON.parse(readFileSync("src/locales/ar.json", "utf8"));

const files = [
  ...readdirSync("src/components/manus").map((f) => `src/components/manus/${f}`),
  "src/components/AnnouncementBar.tsx",
  "src/components/Footer.tsx",
  "src/components/Header.tsx",
];

const keys = new Set();
// Only bare `t("key")` calls. `t("brand.wordmark", "belgomla")` carries its own
// fallback, which is the repo's existing pattern for namespaced brand strings.
const pattern = /\bt\(\s*"([^"]+)"\s*\)/g;

for (const file of files) {
  for (const match of readFileSync(file, "utf8").matchAll(pattern)) {
    keys.add(match[1]);
  }
}

const missing = [...keys].filter((key) => ar[key] === undefined);

console.log(`keys used: ${keys.size} | untranslated: ${missing.length}`);
for (const key of missing) console.log(`  MISSING: ${key}`);

process.exitCode = missing.length ? 1 : 0;
