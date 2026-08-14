import PageLayout from "../models/pageLayout.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { clearCache } from "../middleware/cache.js";
import { logAudit } from "../utils/audit.js";
import {
  SECTIONS,
  SLOTS,
  PAGES,
  PAGE_KEYS,
  SECTION_KEYS,
  SLOT_KEYS,
  DEFAULT_HOME_LAYOUT,
  getSection,
  sectionFitsSlot,
} from "../config/sections.js";

const DEFAULTS = { home: DEFAULT_HOME_LAYOUT };

/**
 * Read a page's arrangement, creating it from the shipped default the first
 * time. Seeding lazily rather than in a migration means an existing
 * deployment keeps rendering exactly what it rendered before until someone
 * opens the editor.
 */
const loadOrSeed = async (page) => {
  const existing = await PageLayout.findOne({ page });
  if (existing) return existing;
  return PageLayout.create({ page, sections: DEFAULTS[page] || [], version: 1 });
};

// GET /api/layouts/registry — the catalogue the editor renders itself from.
export const getRegistry = controllerWrapper("getRegistry", async (req, res) => {
  res.status(200).json({ success: true, pages: PAGES, slots: SLOTS, sections: SECTIONS });
});

// GET /api/layouts/:page — used by the storefront and by the editor.
export const getLayout = controllerWrapper("getLayout", async (req, res) => {
  const { page } = req.params;
  if (!PAGE_KEYS.includes(page)) {
    return res.status(404).json({ success: false, message: "Unknown page" });
  }

  const layout = await loadOrSeed(page);

  // Drop anything the registry no longer knows about, and anything switched
  // off, before it reaches the storefront. The client skips unknown keys too —
  // this just avoids sending them.
  const sections = layout.sections
    .filter((s) => s.enabled && SECTION_KEYS.includes(s.key))
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ key: s.key, slot: s.slot, config: s.config || {} }));

  res.status(200).json({
    success: true,
    page,
    version: layout.version,
    sections,
  });
});

// GET /api/layouts/:page/edit — the full arrangement, disabled rows included.
export const getLayoutForEditor = controllerWrapper(
  "getLayoutForEditor",
  async (req, res) => {
    const { page } = req.params;
    if (!PAGE_KEYS.includes(page)) {
      return res.status(404).json({ success: false, message: "Unknown page" });
    }
    const layout = await loadOrSeed(page);
    res.status(200).json({
      success: true,
      page,
      version: layout.version,
      sections: layout.sections
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((s) => ({
          key: s.key,
          slot: s.slot,
          order: s.order,
          enabled: s.enabled,
          config: s.config || {},
        })),
    });
  }
);

/**
 * Reject an arrangement the storefront couldn't render, before it is stored.
 * Every rule here corresponds to a way the page could otherwise break.
 */
const validateSections = (sections) => {
  if (!Array.isArray(sections)) return "sections must be a list";

  const seen = new Set();
  for (const s of sections) {
    if (!s || typeof s !== "object") return "malformed section";
    if (!SECTION_KEYS.includes(s.key)) return `Unknown section "${s.key}"`;
    if (!SLOT_KEYS.includes(s.slot)) return `Unknown slot "${s.slot}"`;
    if (!sectionFitsSlot(s.key, s.slot)) {
      const label = getSection(s.key)?.label?.en || s.key;
      return `"${label}" can't be placed in ${s.slot}`;
    }
    // One instance per section — two "all products" grids on one page is
    // never intended, and duplicate keys break React's reconciliation.
    if (seen.has(s.key)) return `"${s.key}" appears more than once`;
    seen.add(s.key);
  }

  // Locked sections carry navigation and legal content. They may be reordered
  // but not dropped or switched off.
  for (const locked of SECTIONS.filter((s) => s.locked)) {
    const row = sections.find((s) => s.key === locked.key);
    if (!row) return `"${locked.label.en}" can't be removed`;
    if (row.enabled === false) return `"${locked.label.en}" can't be switched off`;
  }

  return null;
};

/**
 * Renumber the whole page, walking slots in the order they appear on screen.
 *
 * `order` is a single sequence across the page, not one per slot. Numbering
 * each slot from scratch looked tidier and was wrong: two sections in
 * different slots both ended up at 1000, and every consumer sorting on
 * `order` alone interleaved the regions — the first save scrambled the home
 * page. One sequence makes `order` a total ordering, so nothing downstream
 * has to know about slots to render the page correctly.
 *
 * Gaps of 1000 leave room for a dragged section to land between neighbours
 * and rewrite one row; a full save like this resets them.
 */
const renumber = (sections) => {
  const bySlot = new Map();
  for (const s of sections) {
    if (!bySlot.has(s.slot)) bySlot.set(s.slot, []);
    bySlot.get(s.slot).push(s);
  }

  const out = [];
  let n = 0;
  for (const slot of SLOT_KEYS) {
    for (const s of bySlot.get(slot) || []) {
      n += 1;
      out.push({
        key: s.key,
        slot,
        order: n * 1000,
        enabled: s.enabled !== false,
        config: s.config || {},
      });
    }
  }
  return out;
};

// PUT /api/layouts/:page — save an arrangement.
export const saveLayout = controllerWrapper("saveLayout", async (req, res) => {
  const { page } = req.params;
  const { sections, version } = req.body;

  if (!PAGE_KEYS.includes(page)) {
    return res.status(404).json({ success: false, message: "Unknown page" });
  }

  const problem = validateSections(sections);
  if (problem) {
    return res.status(400).json({ success: false, message: problem });
  }

  const current = await loadOrSeed(page);

  // Optimistic concurrency: two admins with the page open would otherwise
  // overwrite each other, last write silently winning.
  if (typeof version === "number" && version !== current.version) {
    return res.status(409).json({
      success: false,
      message:
        "Someone else changed this layout while you were editing. Reload to see their version.",
      currentVersion: current.version,
    });
  }

  const before = current.sections.map((s) => `${s.slot}:${s.key}:${s.enabled}`).join(",");

  current.sections = renumber(sections);
  current.version = current.version + 1;
  current.updatedBy = req.user?._id;
  await current.save();

  const after = current.sections.map((s) => `${s.slot}:${s.key}:${s.enabled}`).join(",");

  // The storefront feed is cached in-process and at the CDN. Without this the
  // admin publishes, reloads, sees no change, and concludes it's broken.
  clearCache("home-feed");
  clearCache("page-layout");

  if (before !== after) {
    logAudit(req, "layout.updated", "layout", current._id, { page }, {
      severity: "warning",
      category: "admin",
    });
  }

  res.status(200).json({
    success: true,
    page,
    version: current.version,
    sections: current.sections,
  });
});

// POST /api/layouts/:page/reset — back to what the storefront shipped with.
export const resetLayout = controllerWrapper("resetLayout", async (req, res) => {
  const { page } = req.params;
  if (!PAGE_KEYS.includes(page)) {
    return res.status(404).json({ success: false, message: "Unknown page" });
  }

  const current = await loadOrSeed(page);
  current.sections = renumber(DEFAULTS[page] || []);
  current.version = current.version + 1;
  current.updatedBy = req.user?._id;
  await current.save();

  clearCache("home-feed");
  clearCache("page-layout");

  logAudit(req, "layout.reset", "layout", current._id, { page }, {
    severity: "warning",
    category: "admin",
  });

  res.status(200).json({ success: true, page, version: current.version, sections: current.sections });
});
