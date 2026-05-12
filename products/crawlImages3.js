/**
 * Round 3: Try alternative sources for remaining products
 * - TP-Link global site instead of Egypt
 * - Hikvision direct product image URLs
 */
import https from "https";
import http from "http";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const imageMap = JSON.parse(readFileSync(join(__dirname, "image_map.json"), "utf-8"));

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const opts = {
      headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120" },
      timeout: 8000,
    };
    const req = mod.get(url, opts, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location.startsWith("http") ? res.headers.location : new URL(res.headers.location, url).href;
        return fetchPage(loc).then(resolve).catch(reject);
      }
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
  });
}

function extractImg(html) {
  const patterns = [
    /data-original="(https:\/\/static\.tp-link\.com\/[^"]+\.(jpg|png|webp))"/gi,
    /src="(https:\/\/static\.tp-link\.com\/upload\/[^"]+\.(jpg|png|webp))"/gi,
    /src="(https:\/\/static\.tp-link\.com\/[^"]+\.(jpg|png|webp))"/gi,
  ];
  for (const pat of patterns) {
    const matches = [...html.matchAll(pat)];
    const good = matches.map(m => m[1]).filter(u => !u.includes("icon") && !u.includes("logo") && !u.includes("svg") && u.length < 300);
    if (good.length) return good[0];
  }
  return null;
}

const delay = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const missing = Object.entries(imageMap).filter(([k, v]) => !v);
  const tpMissing = missing.filter(([k]) => !k.startsWith("DS-") && !k.startsWith("iDS-") && !k.startsWith("OM-"));
  const hikMissing = missing.filter(([k]) => k.startsWith("DS-") || k.startsWith("iDS-"));
  const megaMissing = missing.filter(([k]) => k.startsWith("OM-"));

  console.log(`Still missing: ${missing.length} (TP: ${tpMissing.length}, HIK: ${hikMissing.length}, MEGA: ${megaMissing.length})\n`);

  let found = 0;

  // TP-Link: try global site
  for (const [model] of tpMissing) {
    const slug = model.toLowerCase().replace(/\s+/g, "-");
    const urls = [
      `https://www.tp-link.com/en/home-networking/adapter/${slug}/`,
      `https://www.tp-link.com/en/home-networking/usb-hub/${slug}/`,
      `https://www.tp-link.com/en/home-networking/usb-converter/${slug}/`,
      `https://www.tp-link.com/en/home-networking/pci-adapter/${slug}/`,
      `https://www.tp-link.com/en/home-networking/mobile-wifi/${slug}/`,
      `https://www.tp-link.com/en/home-networking/wifi-router/${slug}/`,
      `https://www.tp-link.com/en/business-networking/unmanaged-switch/${slug}/`,
      `https://www.tp-link.com/en/business-networking/poe-switch/${slug}/`,
      `https://www.tp-link.com/en/business-networking/smart-switch/${slug}/`,
    ];
    process.stdout.write(`  ${model}... `);
    let gotIt = false;
    for (const url of urls) {
      try {
        const { status, body } = await fetchPage(url);
        if (status === 200) {
          const img = extractImg(body);
          if (img) { imageMap[model] = img; found++; gotIt = true; console.log(`✅`); break; }
        }
      } catch {}
      await delay(200);
    }
    if (!gotIt) console.log(`❌`);
  }

  // Hikvision: use their CDN pattern
  console.log(`\n🔍 Hikvision direct CDN...`);
  for (const [model] of hikMissing) {
    const base = model.split("(")[0].trim();
    const urls = [
      `https://www.hikvision.com/content/dam/hikvision/products/${base}/${base}_product.png`,
      `https://www.hikvision.com/content/dam/hikvision/products/${base}.png`,
    ];
    process.stdout.write(`  ${base}... `);
    let gotIt = false;
    for (const url of urls) {
      try {
        const mod = https;
        const ok = await new Promise((resolve) => {
          mod.get(url, { timeout: 5000, headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
            resolve(res.statusCode === 200 && res.headers["content-type"]?.includes("image"));
            res.resume();
          }).on("error", () => resolve(false)).on("timeout", function() { this.destroy(); resolve(false); });
        });
        if (ok) { imageMap[model] = url; found++; gotIt = true; console.log(`✅`); break; }
      } catch {}
    }
    if (!gotIt) console.log(`❌`);
  }

  // Save
  writeFileSync(join(__dirname, "image_map.json"), JSON.stringify(imageMap, null, 2));
  const total = Object.values(imageMap).filter(v => v).length;
  const still = Object.values(imageMap).filter(v => !v).length;
  console.log(`\n${"═".repeat(50)}`);
  console.log(`✅ Round 3 found: ${found} more`);
  console.log(`📊 Total with images: ${total}, still missing: ${still}`);
}

main().catch(e => { console.error("❌", e); process.exit(1); });
