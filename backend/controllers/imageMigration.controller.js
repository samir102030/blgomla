import { v2 as cloudinary } from "cloudinary";
import Product from "../models/product.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { logAudit } from "../utils/audit.js";
import { ANY_AUDIENCE } from "../utils/electronicsVisibility.js";

/**
 * Move the shop's product photographs onto its own Cloudinary account, from the
 * dashboard, a few at a time.
 *
 * Every picture on the storefront is a link to somebody else's server —
 * egyptlaptop.com for the general catalogue, free-electronic.com for the
 * electronics section. They load today. They load until one of those sites
 * reorganises its folders, blocks hotlinking, or closes, and on that day this
 * shop loses its pictures with nothing to be done about it from here.
 *
 * There is already a script that does this (scripts/migrateImagesToCloudinary.mjs),
 * and it is the better tool when somebody is at a terminal. It is the wrong tool
 * for the person who owns the shop: it wants a checkout of the repository and a
 * copy of the production database credentials sitting in a file on a laptop, to
 * perform an operation the server is already configured for. This endpoint runs
 * the same work where the credentials already live.
 *
 * Deliberately batched rather than run-to-completion. A serverless function has
 * a wall-clock limit and 25,000 uploads is not going to fit inside it, so the
 * unit of work here is a few dozen images and the caller comes back for more.
 * That also makes it safe to close the tab: the next call picks up whatever is
 * still pointing at somebody else's server.
 *
 * `ANY_AUDIENCE` is not decoration. The product schema hides the electronics
 * section from any query that does not mention `audience`, so a plain
 * `Product.find` here would have quietly skipped 5,769 of the 25,660 images and
 * reported itself finished.
 */

const FOLDER = "belgomla/products";
const CONCURRENCY = 4;
const DEFAULT_BATCH = 12;
const MAX_BATCH = 30;

/*
  Stop starting new uploads after this long and answer with what was done.

  A serverless function is killed at its wall-clock limit with no chance to
  reply, and a killed batch is the worst outcome available: the images it did
  upload are paid for and stored, but the caller is told nothing, so it cannot
  say what is left. Returning early is always recoverable — the next call sees
  the same list minus whatever moved.

  Deliberately well under the platform's own limit rather than tuned to it. The
  limit differs by plan and can change under us; the batch does not need to be
  the largest one that fits.
*/
const DEADLINE_MS = 7000;

const configured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

const isOurs = (url) => /res\.cloudinary\.com/.test(String(url || ""));
const isRemote = (url) => /^https?:\/\//.test(String(url || ""));

/**
 * Every image still hosted somewhere else, newest products first.
 *
 * Read in full rather than paged: the whole list is around 25,000 short strings,
 * and knowing the true remaining count is most of what the progress bar is for.
 */
const outstanding = async () => {
  const products = await Product.find({
    audience: ANY_AUDIENCE,
    deleted: { $ne: true },
    "images.0": { $exists: true },
  })
    .select("_id images")
    .lean();

  const work = [];
  let mine = 0;
  const byHost = {};

  for (const product of products) {
    product.images.forEach((image, index) => {
      const url = image?.url;
      if (!url) return;
      if (isOurs(url)) {
        mine += 1;
        return;
      }
      if (!isRemote(url)) return;
      let host = "(unreadable)";
      try {
        host = new URL(url).host;
      } catch {
        /* keep the placeholder */
      }
      byHost[host] = (byHost[host] || 0) + 1;
      work.push({ productId: product._id, index, url });
    });
  }

  return { work, mine, byHost };
};

/** What is left to do, and whether this server could do it. Reads only. */
export const getImageMigrationStatus = controllerWrapper(
  "getImageMigrationStatus",
  async (req, res) => {
    const { work, mine, byHost } = await outstanding();
    res.status(200).json({
      success: true,
      // A boolean, never the values. Whoever reads this screen does not need
      // the keys and the screen is no place to put them.
      configured: configured(),
      remaining: work.length,
      migrated: mine,
      total: work.length + mine,
      byHost,
    });
  }
);

/**
 * Move one batch.
 *
 * Cloudinary fetches the remote address itself, so no image travels through
 * this server: each one is handed over by URL and comes back as a URL we own.
 */
export const runImageMigrationBatch = controllerWrapper(
  "runImageMigrationBatch",
  async (req, res) => {
    if (!configured()) {
      return res.status(409).json({
        success: false,
        message:
          "Image storage is not set up on this server. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to the server settings and redeploy, then try again.",
      });
    }

    const asked = Number(req.body?.limit) || DEFAULT_BATCH;
    const limit = Math.min(Math.max(asked, 1), MAX_BATCH);

    const { work, mine } = await outstanding();
    if (!work.length) {
      return res
        .status(200)
        .json({ success: true, moved: 0, failed: 0, remaining: 0, migrated: mine, failures: [] });
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    const batch = work.slice(0, limit);
    let moved = 0;
    const failures = [];

    const moveOne = async (item) => {
      try {
        const result = await cloudinary.uploader.upload(item.url, {
          folder: FOLDER,
          // Same input, same asset. Re-running after an interruption costs
          // nothing and never leaves a second copy behind.
          public_id: `${item.productId}-${item.index}`,
          overwrite: false,
          resource_type: "image",
        });
        await Product.updateOne(
          { _id: item.productId },
          { $set: { [`images.${item.index}.url`]: result.secure_url } }
        );
        moved += 1;
      } catch (error) {
        failures.push({
          url: item.url,
          message: error?.message || error?.error?.message || String(error),
        });
      }
    };

    // A small fixed pool. Cloudinary rate-limits, and the point of this is that
    // it finishes, not that it finishes fast.
    const startedAt = Date.now();
    const queue = [...batch];
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        while (queue.length && Date.now() - startedAt < DEADLINE_MS) {
          const item = queue.shift();
          if (item) await moveOne(item);
        }
      })
    );
    const attempted = batch.length - queue.length;

    await logAudit(req, "product.images.migrate", "product", null, {
      attempted,
      moved,
      failed: failures.length,
      remainingAfter: work.length - moved,
    });

    res.status(200).json({
      success: true,
      attempted,
      moved,
      failed: failures.length,
      remaining: work.length - moved,
      migrated: mine + moved,
      // Enough to diagnose, not enough to fill a screen.
      failures: failures.slice(0, 5),
    });
  }
);
