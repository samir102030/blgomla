/**
 * Match a brand or category by name, creating it if it isn't there yet.
 *
 * Both collections carry a unique index on `name`, so a second record with the
 * same name cannot exist — the write simply fails. That is the right guarantee
 * and the wrong behaviour to expose: a bulk upload naming a brand that already
 * exists should use it, and one naming a new brand should register it, exactly
 * as if it had been added by hand. Neither should be an error the operator has
 * to go and resolve a row at a time.
 *
 * Matching is case- and whitespace-insensitive, because "TP-Link", "tp-link "
 * and "TP-LINK" are one brand to everyone except a string comparison.
 */

/** Escape a string so it can sit inside a RegExp as a literal. */
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Case-insensitive exact match on a trimmed name. */
export const findByName = (Model, name) =>
  Model.findOne({
    name: new RegExp(`^${escapeRegex(String(name).trim())}$`, "i"),
    deleted: { $ne: true },
  });

/**
 * @returns {Promise<{doc: object, created: boolean} | null>}
 *   `created` tells the caller whether this run added it, so the result can
 *   report what was brought into existence rather than doing it silently.
 */
export const findOrCreateByName = async (Model, name, extra = {}) => {
  const trimmed = String(name || "").trim();
  if (!trimmed) return null;

  const existing = await findByName(Model, trimmed);
  if (existing) return { doc: existing, created: false };

  try {
    const doc = await Model.create({ name: trimmed, ...extra });
    return { doc, created: true };
  } catch (err) {
    // Two rows of the same upload naming the same new brand race each other.
    // The unique index settles it; the loser reads back the winner rather than
    // failing a row for a brand that now exists.
    if (err?.code === 11000) {
      const raced = await findByName(Model, trimmed);
      if (raced) return { doc: raced, created: false };
    }
    throw err;
  }
};
