/**
 * Round 4: Comprehensive image crawl
 * - TP-Link: Fix placeholder images + remaining nulls via product search & alternative categories
 * - Hikvision: Crawl actual product pages on hikvision.com/eg-en/
 * - Megatop: Use generic rack images from manufacturer
 */
import https from "https";
import http from "http";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const imageMap = JSON.parse(readFileSync(join(__dirname, "image_map.json"), "utf-8"));
const products = JSON.parse(readFileSync(join(__dirname, "products_data.json"), "utf-8"));

const PLACEHOLDER_URLS = [
  "tp-link_20231205034128d",
  "What_is_Festa_20240329032745k",
  "GPON_20241107130939z",
];

function isPlaceholder(url) {
  return !url || PLACEHOLDER_URLS.some(p => url.includes(p));
}

function fetchPage(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error("too many redirects"));
    const mod = url.startsWith("https") ? https : http;
    const opts = {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      timeout: 12000,
    };
    const req = mod.get(url, opts, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location.startsWith("http")
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        res.resume();
        return fetchPage(loc, maxRedirects - 1).then(resolve).catch(reject);
      }
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
  });
}

function headCheck(url) {
  return new Promise((resolve) => {
    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(url, {
      timeout: 8000,
      headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64)" },
    }, (res) => {
      const ok = res.statusCode === 200 && (
        res.headers["content-type"]?.includes("image") ||
        res.headers["content-type"]?.includes("octet-stream")
      );
      res.resume();
      resolve(ok ? url : null);
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
  });
}

function extractTpImg(html) {
  const patterns = [
    // High priority: product hero images (data-original is lazy-load src)
    /data-original="(https:\/\/static\.tp-link\.com\/upload\/image-line\/[^"]+\.(jpg|png|webp))"/gi,
    /data-original="(https:\/\/static\.tp-link\.com\/upload\/image-header\/[^"]+\.(jpg|png|webp))"/gi,
    /data-original="(https:\/\/static\.tp-link\.com\/[^"]+\.(jpg|png|webp))"/gi,
    // Fallback: regular src
    /src="(https:\/\/static\.tp-link\.com\/upload\/image-line\/[^"]+\.(jpg|png|webp))"/gi,
    /src="(https:\/\/static\.tp-link\.com\/upload\/image-header\/[^"]+\.(jpg|png|webp))"/gi,
    /src="(https:\/\/static\.tp-link\.com\/upload\/[^"]+\.(jpg|png|webp))"/gi,
    /src="(https:\/\/static\.tp-link\.com\/[^"]+\.(jpg|png|webp))"/gi,
  ];
  for (const pat of patterns) {
    const matches = [...html.matchAll(pat)];
    const good = matches
      .map(m => m[1])
      .filter(u =>
        !u.includes("icon") &&
        !u.includes("logo") &&
        !u.includes("svg") &&
        !u.includes("menu/") &&
        !u.includes("footer") &&
        !u.includes("banner") &&
        !PLACEHOLDER_URLS.some(p => u.includes(p)) &&
        u.length < 300
      );
    if (good.length) return good[0];
  }
  return null;
}

function extractHikImg(html) {
  const patterns = [
    // Hikvision product images on their website
    /src="(https?:\/\/[^"]*hikvision[^"]*\/products\/[^"]*\.(jpg|png|webp))"/gi,
    /data-src="(https?:\/\/[^"]*hikvision[^"]*\/products\/[^"]*\.(jpg|png|webp))"/gi,
    /src="(https?:\/\/www\.hikvision\.com\/content\/dam\/[^"]+\.(jpg|png|webp))"/gi,
    /data-src="(https?:\/\/www\.hikvision\.com\/content\/dam\/[^"]+\.(jpg|png|webp))"/gi,
    // Product listing images
    /src="(https?:\/\/[^"]*hikvision[^"]*\.(jpg|png|webp))"/gi,
  ];
  for (const pat of patterns) {
    const matches = [...html.matchAll(pat)];
    const good = matches
      .map(m => m[1])
      .filter(u =>
        !u.includes("icon") &&
        !u.includes("logo") &&
        !u.includes("svg") &&
        !u.includes("banner") &&
        !u.includes("footer") &&
        u.length < 400
      );
    if (good.length) return good[0];
  }
  return null;
}

const delay = ms => new Promise(r => setTimeout(r, ms));

// TP-Link category mappings (comprehensive)
const TP_CATEGORIES = [
  "wifi-router", "deco", "range-extender", "access-point",
  "dsl-modem-router", "3g-4g-router", "mobile-wifi",
  "adapter", "pci-adapter", "usb-hub", "usb-converter",
  "powerline", "unmanaged-switch", "poe-switch", "smart-switch",
  "managed-switch", "easy-smart-switch",
];

async function crawlTpLink(model) {
  const slug = model.toLowerCase().replace(/\s+/g, "-").replace(/\//g, "-");

  // Try Egypt site first, then global
  const domains = ["eg", "en"];
  const networks = ["home-networking", "business-networking"];

  for (const domain of domains) {
    for (const network of networks) {
      for (const cat of TP_CATEGORIES) {
        const url = `https://www.tp-link.com/${domain}/${network}/${cat}/${slug}/`;
        try {
          const { status, body } = await fetchPage(url);
          if (status === 200 && body.length > 5000) {
            const img = extractTpImg(body);
            if (img) return img;
          }
        } catch {}
        await delay(150);
      }
    }
  }

  // Try TP-Link search as last resort
  try {
    const searchUrl = `https://www.tp-link.com/eg/search/?q=${encodeURIComponent(model)}`;
    const { status, body } = await fetchPage(searchUrl);
    if (status === 200) {
      // Look for product card images in search results
      const cardPattern = new RegExp(
        `<a[^>]*href="[^"]*${slug}[^"]*"[^>]*>[\\s\\S]*?<img[^>]*src="(https://static\\.tp-link\\.com/[^"]+\\.(jpg|png|webp))"`,
        "i"
      );
      const match = body.match(cardPattern);
      if (match && !PLACEHOLDER_URLS.some(p => match[1].includes(p))) {
        return match[1];
      }
    }
  } catch {}

  return null;
}

// Hikvision URL patterns per product category
function getHikUrl(model, category) {
  const cleanModel = model.replace(/\//g, "-").replace(/\s+/g, "");

  if (category === "Turbo HD Camera" || model.startsWith("DS-2CE")) {
    return [
      `https://www.hikvision.com/eg-en/products/Turbo-HD-Products/Turbo-HD-Cameras/Value-Series/${model}/`,
      `https://www.hikvision.com/eg-en/products/Turbo-HD-Products/Turbo-HD-Cameras/Pro-Series/${model}/`,
      `https://www.hikvision.com/eg-en/products/Turbo-HD-Products/Turbo-HD-Cameras/Ultra-Series/${model}/`,
    ];
  }
  if (category === "Network Camera" || model.startsWith("DS-2CD")) {
    return [
      `https://www.hikvision.com/eg-en/products/IP-Products/Network-Cameras/Value-Series/${model}/`,
      `https://www.hikvision.com/eg-en/products/IP-Products/Network-Cameras/Pro-Series-EasyIP-/${model}/`,
      `https://www.hikvision.com/eg-en/products/IP-Products/Network-Cameras/Ultra-Series/${model}/`,
    ];
  }
  if (model.startsWith("DS-71") || model.startsWith("iDS-71") || model.startsWith("DS-76")) {
    return [
      `https://www.hikvision.com/eg-en/products/Turbo-HD-Products/Turbo-HD-DVR/Value-Series/${model}/`,
      `https://www.hikvision.com/eg-en/products/Turbo-HD-Products/Turbo-HD-DVR/Pro-Series/${model}/`,
      `https://www.hikvision.com/eg-en/products/Turbo-HD-Products/Turbo-HD-DVR/Ultra-Series/${model}/`,
    ];
  }
  if (model.includes("NI-") || model.includes("NXI-")) {
    return [
      `https://www.hikvision.com/eg-en/products/IP-Products/Network-Video-Recorders/Value-Series/${model}/`,
      `https://www.hikvision.com/eg-en/products/IP-Products/Network-Video-Recorders/Pro-Series/${model}/`,
      `https://www.hikvision.com/eg-en/products/IP-Products/Network-Video-Recorders/Ultra-Series/${model}/`,
    ];
  }
  if (model.startsWith("DS-KIS") || model.startsWith("DS-KH")) {
    return [
      `https://www.hikvision.com/eg-en/products/Video-Intercom-Products/Video-Intercom-Systems/IP-Series/${model}/`,
      `https://www.hikvision.com/eg-en/products/Video-Intercom-Products/Video-Intercom-Systems/Analog-Series/${model}/`,
      `https://www.hikvision.com/eg-en/products/Video-Intercom-Products/Indoor-Stations/${model}/`,
    ];
  }
  return [];
}

async function crawlHikvision(model, category) {
  const urls = getHikUrl(model, category);

  for (const url of urls) {
    try {
      const { status, body } = await fetchPage(url);
      if (status === 200 && body.length > 3000) {
        const img = extractHikImg(body);
        if (img) return img;
      }
    } catch {}
    await delay(200);
  }

  // Fallback: try Hikvision search
  try {
    const searchUrl = `https://www.hikvision.com/eg-en/search/?q=${encodeURIComponent(model)}`;
    const { status, body } = await fetchPage(searchUrl);
    if (status === 200) {
      const img = extractHikImg(body);
      if (img) return img;
    }
  } catch {}

  // Fallback: try CDN direct patterns
  const cdnPatterns = [
    `https://www.hikvision.com/content/dam/hikvision/products-img/${model.replace(/\//g, "-")}/${model.replace(/\//g, "-")}.png`,
    `https://www.hikvision.com/content/dam/hikvision/products/${model.replace(/\//g, "-")}.png`,
  ];
  for (const cdnUrl of cdnPatterns) {
    const result = await headCheck(cdnUrl);
    if (result) return result;
  }

  return null;
}

async function main() {
  // Categorize what needs work
  const tpPlaceholder = Object.entries(imageMap).filter(([k, v]) =>
    v && PLACEHOLDER_URLS.some(p => v.includes(p))
  );
  const tpNull = Object.entries(imageMap).filter(([k, v]) =>
    !v && !k.startsWith("DS-") && !k.startsWith("iDS-") && !k.startsWith("OM-")
  );
  const hikNull = Object.entries(imageMap).filter(([k, v]) =>
    !v && (k.startsWith("DS-") || k.startsWith("iDS-"))
  );
  const megaNull = Object.entries(imageMap).filter(([k, v]) =>
    !v && k.startsWith("OM-")
  );

  console.log("═".repeat(60));
  console.log("🔄 ROUND 4 — COMPREHENSIVE IMAGE CRAWL");
  console.log("═".repeat(60));
  console.log(`  TP-Link placeholders to fix: ${tpPlaceholder.length}`);
  console.log(`  TP-Link nulls to fix:        ${tpNull.length}`);
  console.log(`  Hikvision to crawl:          ${hikNull.length}`);
  console.log(`  Megatop to crawl:            ${megaNull.length}`);
  console.log(`  TOTAL to process:            ${tpPlaceholder.length + tpNull.length + hikNull.length + megaNull.length}`);
  console.log("═".repeat(60));

  let found = 0;
  let processed = 0;
  const totalWork = tpPlaceholder.length + tpNull.length + hikNull.length + megaNull.length;

  // === 1. Fix TP-Link placeholders ===
  console.log("\n📡 [1/4] TP-Link — Fixing placeholder images...\n");
  for (const [model] of tpPlaceholder) {
    processed++;
    process.stdout.write(`  [${processed}/${totalWork}] ${model}... `);
    const img = await crawlTpLink(model);
    if (img) {
      imageMap[model] = img;
      found++;
      console.log("✅");
    } else {
      console.log("❌");
    }
    // Save periodically
    if (processed % 10 === 0) {
      writeFileSync(join(__dirname, "image_map.json"), JSON.stringify(imageMap, null, 2));
    }
  }

  // === 2. Fix TP-Link nulls ===
  console.log("\n📡 [2/4] TP-Link — Fixing null images...\n");
  for (const [model] of tpNull) {
    processed++;
    process.stdout.write(`  [${processed}/${totalWork}] ${model}... `);
    const img = await crawlTpLink(model);
    if (img) {
      imageMap[model] = img;
      found++;
      console.log("✅");
    } else {
      console.log("❌");
    }
    if (processed % 10 === 0) {
      writeFileSync(join(__dirname, "image_map.json"), JSON.stringify(imageMap, null, 2));
    }
  }

  // === 3. Hikvision crawl ===
  console.log("\n📹 [3/4] Hikvision — Crawling product pages...\n");
  for (const [model] of hikNull) {
    processed++;
    // Find category from products_data
    const prod = products.find(p => p.model.startsWith(model) || p.model.includes(model));
    const category = prod?.category || "";
    process.stdout.write(`  [${processed}/${totalWork}] ${model} (${category})... `);
    const img = await crawlHikvision(model, category);
    if (img) {
      imageMap[model] = img;
      found++;
      console.log("✅");
    } else {
      console.log("❌");
    }
    if (processed % 10 === 0) {
      writeFileSync(join(__dirname, "image_map.json"), JSON.stringify(imageMap, null, 2));
    }
  }

  // === 4. Megatop Racks ===
  console.log("\n🔲 [4/4] Megatop — Server Rack images...\n");
  // Try megatop website
  for (const [model] of megaNull) {
    processed++;
    process.stdout.write(`  [${processed}/${totalWork}] ${model}... `);

    // Try common rack image search patterns
    const slug = model.toLowerCase().replace(/[-]/g, "");
    let img = null;

    // Try Megatop website
    const megatopUrls = [
      `https://www.megatop.com.eg/products/${model.toLowerCase()}/`,
      `https://www.megatop.com.eg/product/${model.toLowerCase()}/`,
    ];
    for (const url of megatopUrls) {
      try {
        const { status, body } = await fetchPage(url);
        if (status === 200) {
          const match = body.match(/src="(https?:\/\/[^"]+megatop[^"]+\.(jpg|png|webp))"/i);
          if (match) { img = match[1]; break; }
        }
      } catch {}
      await delay(200);
    }

    if (img) {
      imageMap[model] = img;
      found++;
      console.log("✅");
    } else {
      console.log("❌");
    }
  }

  // Final save
  writeFileSync(join(__dirname, "image_map.json"), JSON.stringify(imageMap, null, 2));

  const totalWithImages = Object.values(imageMap).filter(v => v && !PLACEHOLDER_URLS.some(p => v.includes(p))).length;
  const totalNull = Object.values(imageMap).filter(v => !v).length;
  const totalPlaceholder = Object.values(imageMap).filter(v => v && PLACEHOLDER_URLS.some(p => v.includes(p))).length;

  console.log(`\n${"═".repeat(60)}`);
  console.log(`✅ Round 4 COMPLETE`);
  console.log(`  New images found:    ${found}`);
  console.log(`  Real images total:   ${totalWithImages}`);
  console.log(`  Still placeholder:   ${totalPlaceholder}`);
  console.log(`  Still null:          ${totalNull}`);
  console.log(`  Grand total entries: ${Object.keys(imageMap).length}`);
  console.log(`${"═".repeat(60)}`);
}

main().catch(e => { console.error("❌ FATAL:", e); process.exit(1); });
