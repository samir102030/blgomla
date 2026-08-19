// Channel count is a property of a recorder, not a place in the catalogue.
// "4 Channel", "8 Channel", "16 Channel" were being created as top-level
// categories, which split one product family across the storefront and put
// spec values in the navigation. They belong on the product as an attribute,
// where the products page can filter on them.
//
// Shared by the migration script and the bulk importer so a re-upload of the
// same sheet cannot recreate what the migration just removed.

export const CHANNEL_ATTRIBUTE = "Channels";

// "8 Channel", "8 channels", "8-ch", "8ch", "32 CH" — but not "8 Channel NVR",
// which names a product family rather than a bare spec value.
const CHANNEL_CATEGORY_RE = /^\s*(\d{1,3})\s*[-\s]?(?:ch|chs|channel|channels)\s*$/i;

/**
 * The channel count a category name stands for, or null if it isn't one.
 * Returned as a string because that is what `attributes.value` stores.
 */
export const channelCountFromName = (name) => {
  if (!name) return null;
  const match = CHANNEL_CATEGORY_RE.exec(String(name));
  if (!match) return null;
  const count = parseInt(match[1], 10);
  return Number.isFinite(count) && count > 0 ? String(count) : null;
};

/**
 * Set (or replace) the Channels attribute on a plain attributes array.
 * Returns a new array — existing attributes of other names are kept, and a
 * second Channels entry is never appended.
 */
export const withChannelAttribute = (attributes, channels) => {
  const rest = (attributes || []).filter(
    (a) => String(a?.name || "").toLowerCase() !== CHANNEL_ATTRIBUTE.toLowerCase()
  );
  return [...rest, { name: CHANNEL_ATTRIBUTE, value: String(channels) }];
};
