/**
 * Crawl real product images from manufacturer websites.
 * Saves results to products/image_map.json — no DB needed.
 */
import https from "https";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const products = JSON.parse(readFileSync(join(__dirname, "products_data.json"), "utf-8"));

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120" },
      timeout: 10000,
    };
    const req = https.get(url, opts, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location.startsWith("http") ? res.headers.location : `https://www.tp-link.com${res.headers.location}`;
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
  // TP-Link product page images
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

// Build TP-Link URL
function tpUrl(model, category) {
  const base = model.split("(")[0].trim().toLowerCase().replace(/\s+/g, "-");
  const catSlug = {
    "Wi-Fi 6 Mesh System": "deco", "Wi-Fi 5 Mesh System": "deco", "Mesh System with BBA": "deco",
    "Wi-Fi 6 Router": "wifi-router", "Wi-Fi 5 Router": "wifi-router", "Wi-Fi 4 Router": "wifi-router",
    "Desktop AP": "access-point", "xDSL Modem Router": "dsl-modem-router",
    "3G/4G Wireless Router": "3g-4g-router", "LTE/5G Gateway": "4g-lte-router",
    "Mobile Wi-Fi": "mobile-wifi", "Portable Router": "portable-router",
    "Wi-Fi 6 Range Extender": "range-extender", "Wi-Fi 5 Range Extender": "range-extender",
    "Wi-Fi 4 Range Extender": "range-extender",
  };
  if (catSlug[category]) return `https://www.tp-link.com/eg/home-networking/${catSlug[category]}/${base}/`;
  if (category?.includes("Switch")) return `https://www.tp-link.com/eg/business-networking/unmanaged-switch/${base}/`;
  if (category?.includes("PoE")) return `https://www.tp-link.com/eg/business-networking/poe-switch/${base}/`;
  if (category?.includes("USB Adapter") || category?.includes("Bluetooth")) return `https://www.tp-link.com/eg/home-networking/adapter/${base}/`;
  if (category?.includes("PCI-E")) return `https://www.tp-link.com/eg/home-networking/pci-adapter/${base}/`;
  if (category?.includes("USB Hub") || category?.includes("USB Type-C")) return `https://www.tp-link.com/eg/home-networking/usb-hub/${base}/`;
  if (category?.includes("Ethernet")) return `https://www.tp-link.com/eg/home-networking/usb-converter/${base}/`;
  if (category?.includes("Powerline")) return `https://www.tp-link.com/eg/home-networking/powerline/${base}/`;
  return null;
}

const delay = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  // Get unique base models
  const seen = new Map();
  for (const p of products) {
    const base = p.model.split("(")[0].trim();
    if (!seen.has(base)) seen.set(base, p);
  }
  console.log(`📦 ${products.length} products, ${seen.size} unique base models\n`);

  const imageMap = {};
  let found = 0, missed = 0;

  for (const [base, p] of seen) {
    if (p.brand === "TP-Link") {
      const url = tpUrl(p.model, p.category);
      if (!url) { missed++; imageMap[base] = null; continue; }
      
      try {
        process.stdout.write(`  [${found+missed+1}/${seen.size}] ${base}... `);
        const { status, body } = await fetchPage(url);
        if (status === 200) {
          const img = extractImg(body);
          if (img) {
            imageMap[base] = img;
            found++;
            console.log(`✅ ${img.substring(0, 60)}...`);
          } else {
            imageMap[base] = null;
            missed++;
            console.log(`⚠️ no image found on page`);
          }
        } else {
          imageMap[base] = null;
          missed++;
          console.log(`❌ HTTP ${status}`);
        }
        await delay(400);
      } catch (e) {
        imageMap[base] = null;
        missed++;
        console.log(`❌ ${e.message}`);
      }
    } else {
      // Hikvision & Megatop — skip for now, handle separately
      imageMap[base] = null;
      missed++;
    }
  }

  // Save results
  writeFileSync(join(__dirname, "image_map.json"), JSON.stringify(imageMap, null, 2));
  console.log(`\n${"═".repeat(50)}`);
  console.log(`✅ Saved image_map.json`);
  console.log(`  🎯 Found: ${found}`);
  console.log(`  ❌ Missing: ${missed}`);
}

main().catch(e => { console.error("❌", e); process.exit(1); });
