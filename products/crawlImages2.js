/**
 * Round 2: Crawl missing images with alternative URL patterns
 */
import https from "https";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const imageMap = JSON.parse(readFileSync(join(__dirname, "image_map.json"), "utf-8"));
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

// Missing TP-Link models with alternative URLs to try
const tpAltUrls = {
  "TL-WR1502X": "https://www.tp-link.com/eg/home-networking/wifi-router/tl-wr1502x/",
  "TL-WR3002X": "https://www.tp-link.com/eg/home-networking/wifi-router/tl-wr3002x/",
  "Archer MR402": "https://www.tp-link.com/eg/home-networking/3g-4g-router/archer-mr402/",
  "Archer MR200": "https://www.tp-link.com/eg/home-networking/3g-4g-router/archer-mr200/",
  "TL-MR6400": "https://www.tp-link.com/eg/home-networking/3g-4g-router/tl-mr6400/",
  "M7450": "https://www.tp-link.com/eg/home-networking/mobile-wifi/m7450/",
  "M7350": "https://www.tp-link.com/eg/home-networking/mobile-wifi/m7350/",
  "M7200": "https://www.tp-link.com/eg/home-networking/mobile-wifi/m7200/",
  "Archer TX50U": "https://www.tp-link.com/eg/home-networking/adapter/archer-tx50u/",
  "Archer TX10UB Nano": "https://www.tp-link.com/eg/home-networking/adapter/archer-tx10ub-nano/",
  "Archer TX55E": "https://www.tp-link.com/eg/home-networking/pci-adapter/archer-tx55e/",
  "Archer TX10E": "https://www.tp-link.com/eg/home-networking/pci-adapter/archer-tx10e/",
  "Archer T4E": "https://www.tp-link.com/eg/home-networking/pci-adapter/archer-t4e/",
  "Archer T2E": "https://www.tp-link.com/eg/home-networking/pci-adapter/archer-t2e/",
  "TL-WN881ND": "https://www.tp-link.com/eg/home-networking/pci-adapter/tl-wn881nd/",
  "TL-WN781ND": "https://www.tp-link.com/eg/home-networking/pci-adapter/tl-wn781nd/",
  "TX301": "https://www.tp-link.com/eg/home-networking/pci-adapter/tx301/",
  "TG-3468": "https://www.tp-link.com/eg/home-networking/pci-adapter/tg-3468/",
  "UE330C": "https://www.tp-link.com/eg/home-networking/usb-converter/ue330c/",
  "UE330": "https://www.tp-link.com/eg/home-networking/usb-converter/ue330/",
  "UE300C": "https://www.tp-link.com/eg/home-networking/usb-converter/ue300c/",
  "UE306": "https://www.tp-link.com/eg/home-networking/usb-converter/ue306/",
  "UE300": "https://www.tp-link.com/eg/home-networking/usb-converter/ue300/",
  "UE200": "https://www.tp-link.com/eg/home-networking/usb-converter/ue200/",
  "UB5A": "https://www.tp-link.com/eg/home-networking/adapter/ub5a/",
  "UB4A": "https://www.tp-link.com/eg/home-networking/adapter/ub4a/",
  "UH7020C": "https://www.tp-link.com/eg/home-networking/usb-hub/uh7020c/",
  // LS series - try business networking
  "LS1005": "https://www.tp-link.com/eg/business-networking/unmanaged-switch/ls1005/",
  "LS1008": "https://www.tp-link.com/eg/business-networking/unmanaged-switch/ls1008/",
  "LS1005G": "https://www.tp-link.com/eg/business-networking/unmanaged-switch/ls1005g/",
  "LS1008G": "https://www.tp-link.com/eg/business-networking/unmanaged-switch/ls1008g/",
  "LS1016G": "https://www.tp-link.com/eg/business-networking/unmanaged-switch/ls1016g/",
  "LS1024G": "https://www.tp-link.com/eg/business-networking/unmanaged-switch/ls1024g/",
  "TL-SG116": "https://www.tp-link.com/eg/business-networking/unmanaged-switch/tl-sg116/",
  "TL-SG1428PE": "https://www.tp-link.com/eg/business-networking/smart-switch/tl-sg1428pe/",
  "TL-SG1218MPE": "https://www.tp-link.com/eg/business-networking/smart-switch/tl-sg1218mpe/",
  "TL-SG1016PE": "https://www.tp-link.com/eg/business-networking/smart-switch/tl-sg1016pe/",
  "TL-SG108PE": "https://www.tp-link.com/eg/business-networking/smart-switch/tl-sg108pe/",
  "TL-SG1218MP": "https://www.tp-link.com/eg/business-networking/poe-switch/tl-sg1218mp/",
  "TL-SG116P": "https://www.tp-link.com/eg/business-networking/poe-switch/tl-sg116p/",
  "TL-SG1210PP": "https://www.tp-link.com/eg/business-networking/poe-switch/tl-sg1210pp/",
  "TL-SG1210MP": "https://www.tp-link.com/eg/business-networking/poe-switch/tl-sg1210mp/",
  "TL-SG1006PP": "https://www.tp-link.com/eg/business-networking/poe-switch/tl-sg1006pp/",
  "TL-SG1005P-PD": "https://www.tp-link.com/eg/business-networking/poe-switch/tl-sg1005p-pd/",
  "TL-SL1218P": "https://www.tp-link.com/eg/business-networking/poe-switch/tl-sl1218p/",
  "TL-SL1311MP": "https://www.tp-link.com/eg/business-networking/poe-switch/tl-sl1311mp/",
  "TL-SL1311P": "https://www.tp-link.com/eg/business-networking/poe-switch/tl-sl1311p/",
  "LS1210GP": "https://www.tp-link.com/eg/business-networking/poe-switch/ls1210gp/",
  "LS105GP": "https://www.tp-link.com/eg/business-networking/poe-switch/ls105gp/",
  "LS1210P": "https://www.tp-link.com/eg/business-networking/poe-switch/ls1210p/",
  "LS110P": "https://www.tp-link.com/eg/business-networking/poe-switch/ls110p/",
  "LS109P": "https://www.tp-link.com/eg/business-networking/poe-switch/ls109p/",
  "LS106P": "https://www.tp-link.com/eg/business-networking/poe-switch/ls106p/",
  "LS106LP": "https://www.tp-link.com/eg/business-networking/poe-switch/ls106lp/",
  "LS105LP": "https://www.tp-link.com/eg/business-networking/poe-switch/ls105lp/",
};

async function main() {
  const missing = Object.entries(imageMap).filter(([k, v]) => !v);
  const tpMissing = missing.filter(([k]) => tpAltUrls[k]);
  
  console.log(`📦 Total missing: ${missing.length}, TP-Link to retry: ${tpMissing.length}\n`);
  
  let found = 0;
  
  // Retry TP-Link with alt URLs
  for (const [model] of tpMissing) {
    const url = tpAltUrls[model];
    try {
      process.stdout.write(`  ${model}... `);
      const { status, body } = await fetchPage(url);
      if (status === 200) {
        const img = extractImg(body);
        if (img) { imageMap[model] = img; found++; console.log(`✅`); }
        else console.log(`⚠️ no img`);
      } else console.log(`❌ ${status}`);
      await delay(400);
    } catch (e) { console.log(`❌ ${e.message}`); }
  }

  // For Hikvision - try their product search page
  const hikModels = missing.filter(([k]) => k.startsWith("DS-") || k.startsWith("iDS-"));
  console.log(`\n🔍 Trying Hikvision (${hikModels.length} models)...`);
  
  for (const [model] of hikModels.slice(0, 5)) { // Test with first 5
    const searchUrl = `https://www.hikvision.com/eg-en/search/?q=${encodeURIComponent(model)}`;
    try {
      process.stdout.write(`  ${model}... `);
      const { status, body } = await fetchPage(searchUrl);
      if (status === 200) {
        // Look for product images
        const match = body.match(/src="(https:\/\/[^"]*hikvision[^"]*\/(DS-|iDS-)[^"]*\.(jpg|png|webp))"/i)
          || body.match(/data-src="(https:\/\/[^"]*hikvision[^"]*\.(jpg|png|webp))"/i);
        if (match) { imageMap[model] = match[1]; found++; console.log(`✅`); }
        else console.log(`⚠️ no img in search`);
      } else console.log(`❌ ${status}`);
      await delay(500);
    } catch (e) { console.log(`❌ ${e.message}`); }
  }

  // Save
  writeFileSync(join(__dirname, "image_map.json"), JSON.stringify(imageMap, null, 2));
  
  const total = Object.values(imageMap).filter(v => v).length;
  const stillMissing = Object.values(imageMap).filter(v => !v).length;
  console.log(`\n${"═".repeat(50)}`);
  console.log(`✅ Round 2 found: ${found} more`);
  console.log(`📊 Total with images: ${total}, still missing: ${stillMissing}`);
}

main().catch(e => { console.error("❌", e); process.exit(1); });
