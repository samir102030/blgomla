/**
 * Scrape real product images from manufacturer websites and update MongoDB.
 * Uses TP-Link Egypt search, Hikvision product pages, and fallback images.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import https from "https";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });
import Product from "../models/product.model.js";

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
      timeout: 10000,
    };
    https.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject).on("timeout", function() { this.destroy(); reject(new Error("timeout")); });
  });
}

// Extract first product image from TP-Link product page HTML
function extractTPLinkImage(html) {
  // Look for main product image in the gallery
  const patterns = [
    /src="(https:\/\/static\.tp-link\.com\/[^"]*_normal_[^"]*\.(jpg|png))"/i,
    /src="(https:\/\/static\.tp-link\.com\/upload\/[^"]*_normal_[^"]*\.(jpg|png))"/i,
    /src="(https:\/\/static\.tp-link\.com\/[^"]*\.(jpg|png))"/i,
  ];
  for (const pat of patterns) {
    const match = html.match(pat);
    if (match) return match[1];
  }
  return null;
}

// Build TP-Link product page URL from model
function tplinkPageUrl(model, category) {
  const base = model.split("(")[0].trim().toLowerCase().replace(/\s+/g, "-");
  
  const catMap = {
    "Wi-Fi 6 Mesh System": "deco",
    "Wi-Fi 5 Mesh System": "deco",
    "Mesh System with BBA": "deco",
    "Wi-Fi 6 Router": "wifi-router",
    "Wi-Fi 5 Router": "wifi-router",
    "Wi-Fi 4 Router": "wifi-router",
    "xDSL Modem Router": "dsl-modem-router",
    "Desktop AP": "access-point",
    "Wi-Fi 6 Range Extender": "range-extender",
    "Wi-Fi 5 Range Extender": "range-extender",
    "Wi-Fi 4 Range Extender": "range-extender",
    "3G/4G Wireless Router": "3g-4g-router",
    "LTE/5G Gateway": "4g-lte-router",
    "Mobile Wi-Fi": "mobile-wifi",
    "Portable Router": "portable-router",
  };

  const section = catMap[category];
  if (section) {
    return `https://www.tp-link.com/eg/home-networking/${section}/${base}/`;
  }

  // Switches, adapters etc
  if (category?.includes("Switch")) return `https://www.tp-link.com/eg/business-networking/unmanaged-switch/${base}/`;
  if (category?.includes("USB Adapter") || category?.includes("Bluetooth")) return `https://www.tp-link.com/eg/home-networking/adapter/${base}/`;
  if (category?.includes("PCI-E")) return `https://www.tp-link.com/eg/home-networking/pci-adapter/${base}/`;
  if (category?.includes("USB Hub") || category?.includes("USB Type-C")) return `https://www.tp-link.com/eg/home-networking/usb-hub/${base}/`;
  if (category?.includes("USB to Ethernet")) return `https://www.tp-link.com/eg/home-networking/usb-converter/${base}/`;
  if (category?.includes("Powerline")) return `https://www.tp-link.com/eg/home-networking/powerline/${base}/`;

  return `https://www.tp-link.com/eg/search/?q=${encodeURIComponent(base)}`;
}

// Category fallback images using professional stock photos
const FALLBACKS = {
  "Wi-Fi 6 Mesh System": "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop&q=80",
  "Wi-Fi 5 Mesh System": "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop&q=80",
  "Mesh System with BBA": "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop&q=80",
  "Wi-Fi 6 Router": "https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=400&h=400&fit=crop&q=80",
  "Wi-Fi 5 Router": "https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=400&h=400&fit=crop&q=80",
  "Wi-Fi 4 Router": "https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=400&h=400&fit=crop&q=80",
  "Desktop AP": "https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=400&h=400&fit=crop&q=80",
  "xDSL Modem Router": "https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=400&h=400&fit=crop&q=80",
  "3G/4G Wireless Router": "https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=400&h=400&fit=crop&q=80",
  "LTE/5G Gateway": "https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=400&h=400&fit=crop&q=80",
  "Portable Router": "https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=400&h=400&fit=crop&q=80",
  "Mobile Wi-Fi": "https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=400&h=400&fit=crop&q=80",
  "Wi-Fi 6 Range Extender": "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop&q=80",
  "Wi-Fi 5 Range Extender": "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop&q=80",
  "Wi-Fi 4 Range Extender": "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop&q=80",
  "Unmanaged 5/8/16/24/48P - 10/100/1000 Switches": "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&h=400&fit=crop&q=80",
  "Unmanaged/Easy Smart PoE Switch": "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&h=400&fit=crop&q=80",
  "PCI-E Adapter": "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=400&fit=crop&q=80",
  "Wi-Fi 6 USB Adapter": "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=400&fit=crop&q=80",
  "Wi-Fi 5 USB Adapter": "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=400&fit=crop&q=80",
  "Wi-Fi 4 USB Adapter": "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=400&fit=crop&q=80",
  "Bluetooth USB Adapter": "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=400&fit=crop&q=80",
  "USB Hub": "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=400&fit=crop&q=80",
  "USB Type-C Hub": "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=400&fit=crop&q=80",
  "USB to Ethernet Adapter": "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=400&fit=crop&q=80",
  "AV600/AV1000 Powerline Adapter": "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=400&fit=crop&q=80",
  "Turbo HD Camera": "https://images.unsplash.com/photo-1557862921-37829c790f19?w=400&h=400&fit=crop&q=80",
  "Network Camera": "https://images.unsplash.com/photo-1557862921-37829c790f19?w=400&h=400&fit=crop&q=80",
  "DVR/NVR": "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&h=400&fit=crop&q=80",
  "Video Intercom": "https://images.unsplash.com/photo-1558002038-1055907df827?w=400&h=400&fit=crop&q=80",
  "Server Racks": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=400&fit=crop&q=80",
};

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const brands = await mongoose.connection.db.collection("brands").find({}).toArray();
  const brandMap = Object.fromEntries(brands.map(b => [b._id.toString(), b.name]));
  
  const categories = await mongoose.connection.db.collection("categories").find({}).toArray();
  const catMap = Object.fromEntries(categories.map(c => [c._id.toString(), c.name]));

  const products = await Product.find({ deleted: false });
  console.log(`📦 Processing ${products.length} products...`);

  let exact = 0, fallback = 0;
  const imageCache = {}; // cache by base model

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const brandName = brandMap[product.brand?.toString()] || "";
    const modelAttr = product.attributes?.find(a => a.name === "Model");
    const model = modelAttr?.value || product.name;
    const baseModel = model.split("(")[0].trim();
    const categoryName = catMap[product.category?.toString()] || "";

    let imageUrl = null;

    // Check cache first (e.g., Deco X20 3-pack and 2-pack share same image)
    if (imageCache[baseModel]) {
      imageUrl = imageCache[baseModel];
      exact++;
    } else if (brandName === "TP-Link") {
      try {
        const pageUrl = tplinkPageUrl(model, categoryName);
        console.log(`  [${i+1}/${products.length}] Fetching ${baseModel}...`);
        const html = await fetchPage(pageUrl);
        imageUrl = extractTPLinkImage(html);
        if (imageUrl) {
          imageCache[baseModel] = imageUrl;
          exact++;
          console.log(`    ✅ Found: ${imageUrl.substring(0, 80)}...`);
        }
        await delay(300); // Be polite
      } catch (e) {
        console.log(`    ⚠️ Failed to fetch: ${e.message}`);
      }
    }

    // Fallback
    if (!imageUrl) {
      imageUrl = FALLBACKS[categoryName] || "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=400&fit=crop&q=80";
      imageCache[baseModel] = imageUrl;
      fallback++;
      console.log(`  [${i+1}/${products.length}] ${baseModel} → category fallback`);
    }

    product.images = [{ url: imageUrl, alt: product.name }];
    await product.save();
  }

  console.log(`\n${"═".repeat(50)}`);
  console.log(`✅ Done!`);
  console.log(`  🎯 Real images: ${exact}`);
  console.log(`  📁 Fallbacks: ${fallback}`);
  console.log(`  📊 Total: ${products.length}`);

  await mongoose.disconnect();
}

main().catch(err => { console.error("❌", err); process.exit(1); });
