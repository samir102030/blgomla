import { v2 as cloudinary } from "cloudinary";
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { logAudit } from "../utils/audit.js";
import { ANY_AUDIENCE } from "../utils/electronicsVisibility.js";

/**
 * Move the shop's product photographs onto its own Cloudinary account.
 *
 * Every picture on the storefront is a link to somebody else's server. They
 * load today. They load until one of those sites reorganises its folders,
 * blocks hotlinking, or closes, and on that day this shop loses its pictures
 * with nothing to be done about it from here.
 *
 * ## Why this is not simply "hand Cloudinary the URL"
 *
 * That was the first implementation and it moved zero of 25,660 images. The
 * general catalogue sits behind Cloudflare, which serves an ordinary home
 * connection without so much as a User-Agent but answers 403 to anything
 * coming from a data centre. Measured three ways: this shop's own machine got
 * 200 from plain curl, Cloudinary's fetcher got 403, and an unrelated image
 * proxy running in a data centre got 403 as well. It is the network the request
 * comes from that is refused, not how the request is dressed — so no header,
 * no retry and no amount of patience on the server will fix it.
 *
 * The electronics section is on a different host entirely, plain nginx with
 * nothing in front of it, and answers a data centre perfectly well.
 *
 * So the hosts are not interchangeable and the code stops pretending they are.
 * Each one is probed, the batch runs only against the hosts this server can
 * actually reach, and the rest are handed to `scripts/imageCourier.mjs`, which
 * runs on an ordinary connection, downloads there, and posts the bytes back to
 * `/migration/push`. That keeps every credential on the server and borrows only
 * the one thing the server does not have, which is an address Cloudflare likes.
 *
 * ## Two other things worth knowing
 *
 * `ANY_AUDIENCE` is not decoration. The product schema hides the electronics
 * section from any query that does not mention `audience`, so a plain
 * `Product.find` here would quietly skip 5,769 of the 25,660 images and then
 * report itself finished.
 *
 * The images are not evenly spread: 3,695 products carry four each and account
 * for 14,780 of the total, while the first picture of a product is the one the
 * shop actually shows — listings, search, cart, home rails. Hence the "primary"
 * scope, which is 46% of the work for nearly everything a shopper sees.
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
*/
const DEADLINE_MS = 7000;

/** What a browser sends. Free, and it costs nothing to look ordinary. */
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
};

const configured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

const useCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
};

const isOurs = (url) => /res\.cloudinary\.com/.test(String(url || ""));
const isRemote = (url) => /^https?:\/\//.test(String(url || ""));
const hostOf = (url) => {
  try {
    return new URL(url).host;
  } catch {
    return "(unreadable)";
  }
};

const SCOPES = new Set(["all", "primary"]);

/** Point whichever record it was at its new address. */
const writeBack = async (item, url) =>
  item.kind === "category"
    ? Category.updateOne({ _id: item.productId }, { $set: { image: url } })
    : Product.updateOne(
        { _id: item.productId },
        { $set: { [`images.${item.index}.url`]: url } }
      );

/**
 * Every image still hosted somewhere else, with the counts for both scopes and
 * one sample address per host for the reachability probe.
 *
 * Read in full rather than paged: the whole list is around 25,000 short strings,
 * and knowing the true remaining count is most of what the progress bar is for.
 */
const survey = async () => {
  const products = await Product.find({
    audience: ANY_AUDIENCE,
    deleted: { $ne: true },
    "images.0": { $exists: true },
  })
    .select("_id images")
    .lean();

  const work = [];
  const byHost = new Map();
  let migratedAll = 0;
  let migratedPrimary = 0;

  for (const product of products) {
    product.images.forEach((image, index) => {
      const url = image?.url;
      if (!url) return;
      if (isOurs(url)) {
        migratedAll += 1;
        if (index === 0) migratedPrimary += 1;
        return;
      }
      if (!isRemote(url)) return;
      const host = hostOf(url);
      const seen = byHost.get(host);
      if (seen) seen.count += 1;
      else byHost.set(host, { host, count: 1, sample: url });
      work.push({ kind: "product", productId: String(product._id), index, url, host });
    });
  }

  /*
    The department pictures are on the same borrowed servers.

    Every one of the eighteen top-level departments illustrates itself with a
    photograph hosted somewhere else — seventeen on egyptlaptop.com and one on
    free-electronic.com, which is the one that was timing out at fifteen
    seconds the day this was written, with the whole category rail waiting on
    it. They were left out of the first version of this because the job was
    described as moving the product images, and nobody counts a department as a
    product until the rail is blank.

    A category holds one picture in a plain string rather than a list, so its
    index is always 0 and it is always "primary" — it is the only picture the
    department has.
  */
  const categories = await Category.find({ image: { $nin: [null, ""] } })
    .select("_id image name")
    .lean();

  for (const category of categories) {
    const url = category.image;
    if (isOurs(url)) {
      migratedAll += 1;
      migratedPrimary += 1;
      continue;
    }
    if (!isRemote(url)) continue;
    const host = hostOf(url);
    const seen = byHost.get(host);
    if (seen) seen.count += 1;
    else byHost.set(host, { host, count: 1, sample: url });
    work.push({ kind: "category", productId: String(category._id), index: 0, url, host });
  }

  const primaryWork = work.filter((item) => item.index === 0);
  return {
    work,
    primaryWork,
    hosts: [...byHost.values()].sort((a, b) => b.count - a.count),
    scopes: {
      all: {
        remaining: work.length,
        migrated: migratedAll,
        total: work.length + migratedAll,
      },
      primary: {
        remaining: primaryWork.length,
        migrated: migratedPrimary,
        total: primaryWork.length + migratedPrimary,
      },
    },
  };
};

/**
 * Can this server fetch from that host at all?
 *
 * One byte is enough to find out, and asking for one byte rather than a whole
 * photograph keeps the probe cheap enough to run on every status call. A host
 * that ignores the Range header sends the file instead, which is still a fine
 * answer to the only question being asked.
 *
 * Cached, because the answer is a property of somebody else's firewall and does
 * not change between two page loads.
 */
// Short, because the answer is a property of somebody else's server and that
// is exactly the kind of fact that goes stale badly: a host that was up five
// minutes ago and is down now reads as "the server can reach these" on a
// screen with a button that then moves nothing.
const PROBE_TTL_MS = 60 * 1000;
const probes = new Map();

/** Forget what we think we know about a host, so the next look is a fresh one. */
const forgetProbe = (host) => (host ? probes.delete(host) : probes.clear());

const probeHost = async ({ host, sample }) => {
  const cached = probes.get(host);
  if (cached && Date.now() - cached.at < PROBE_TTL_MS) return cached.result;

  let result;
  try {
    const response = await fetch(sample, {
      headers: { ...BROWSER_HEADERS, Range: "bytes=0-0" },
      signal: AbortSignal.timeout(6000),
      redirect: "follow",
    });
    result = { reachable: response.ok, status: response.status };
  } catch (error) {
    result = { reachable: false, status: 0, error: error?.message || String(error) };
  }

  probes.set(host, { at: Date.now(), result });
  return result;
};

/** What is left to do, which hosts this server can reach, and whether it has
 *  credentials at all. Reads only. */
export const getImageMigrationStatus = controllerWrapper(
  "getImageMigrationStatus",
  async (req, res) => {
    const { hosts, scopes } = await survey();
    const probed = await Promise.all(
      hosts.map(async (entry) => ({
        host: entry.host,
        count: entry.count,
        ...(await probeHost(entry)),
      }))
    );

    res.status(200).json({
      success: true,
      // A boolean, never the values. Whoever reads this screen does not need
      // the keys and the screen is no place to put them.
      configured: configured(),
      scopes,
      hosts: probed,
      reachable: probed.filter((h) => h.reachable).reduce((sum, h) => sum + h.count, 0),
      unreachable: probed.filter((h) => !h.reachable).reduce((sum, h) => sum + h.count, 0),
    });
  }
);

/**
 * Move one batch, from the hosts this server can actually reach.
 *
 * The unreachable ones are not attempted at all. Trying them produced a batch
 * of 30 failures, a run that stopped on its first round because nothing moved,
 * and a screen of red that said nothing about which half of the catalogue was
 * fine.
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

    const scope = SCOPES.has(req.body?.scope) ? req.body.scope : "all";
    const asked = Number(req.body?.limit) || DEFAULT_BATCH;
    const limit = Math.min(Math.max(asked, 1), MAX_BATCH);

    const state = await survey();
    // Same shape as the status endpoint's, count included. Leaving it out
    // here meant the page merged this list over its own and then tried to
    // print a number that was no longer there.
    const probed = await Promise.all(
      state.hosts.map(async (entry) => ({
        host: entry.host,
        count: entry.count,
        ...(await probeHost(entry)),
      }))
    );
    const reachableHosts = new Set(probed.filter((h) => h.reachable).map((h) => h.host));

    const pool = (scope === "primary" ? state.primaryWork : state.work).filter((item) =>
      reachableHosts.has(item.host)
    );

    if (!pool.length) {
      return res.status(200).json({
        success: true,
        scope,
        attempted: 0,
        moved: 0,
        failed: 0,
        scopes: state.scopes,
        hosts: probed,
        exhausted: true,
        failures: [],
      });
    }

    const api = useCloudinary();
    const batch = pool.slice(0, limit);
    let moved = 0;
    let movedPrimary = 0;
    const failures = [];

    const moveOne = async (item) => {
      try {
        const result = await api.uploader.upload(item.url, {
          folder: FOLDER,
          // Same input, same asset. Re-running after an interruption costs
          // nothing and never leaves a second copy behind.
          // Prefixed by kind: a category and a product are different
          // collections and their ids could in principle coincide.
          public_id:
            item.kind === "category"
              ? `category-${item.productId}`
              : `${item.productId}-${item.index}`,
          overwrite: false,
          resource_type: "image",
        });
        await writeBack(item, result.secure_url);
        moved += 1;
        if (item.index === 0) movedPrimary += 1;
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

    /*
      A batch where nothing moved is evidence about the host, not just about
      these twelve pictures — and better evidence than a probe taken up to a
      minute ago, because it is a dozen real attempts rather than one byte.

      free-electronic.com went from answering in under a second to not
      answering at all, and the cached probe kept the button enabled and the
      row reading "the server can reach these" while every batch failed.
    */
    if (!moved && failures.length) forgetProbe();

    await logAudit(req, "product.images.migrate", "product", null, {
      scope,
      attempted,
      moved,
      failed: failures.length,
    });

    // Counted forward from the survey rather than surveyed again: a second full
    // read of the catalogue per batch would double the cost of every round for
    // numbers already known exactly.
    res.status(200).json({
      success: true,
      scope,
      attempted,
      moved,
      failed: failures.length,
      hosts: probed,
      // Whether this scope has any reachable work left, which is what tells the
      // caller to stop looping — separate from "the scope is finished", because
      // a scope can be out of reachable work and still have thousands waiting
      // on the courier.
      exhausted: pool.length - moved <= 0,
      scopes: {
        all: {
          remaining: state.scopes.all.remaining - moved,
          migrated: state.scopes.all.migrated + moved,
          total: state.scopes.all.total,
        },
        primary: {
          remaining: state.scopes.primary.remaining - movedPrimary,
          migrated: state.scopes.primary.migrated + movedPrimary,
          total: state.scopes.primary.total,
        },
      },
      // Enough to diagnose, not enough to fill a screen.
      failures: failures.slice(0, 5),
    });
  }
);

/* ── The courier's two endpoints ───────────────────────────────────────
   For hosts this server cannot reach. `scripts/imageCourier.mjs` asks what is
   outstanding, downloads it from an ordinary connection, and hands the bytes
   back. Nothing about the Cloudinary account or the database leaves the server.
*/

/** The next images to fetch, for a courier running somewhere with better luck. */
export const getImageMigrationPending = controllerWrapper(
  "getImageMigrationPending",
  async (req, res) => {
    const scope = SCOPES.has(req.query?.scope) ? req.query.scope : "all";
    const limit = Math.min(Math.max(Number(req.query?.limit) || 50, 1), 200);
    const host = req.query?.host ? String(req.query.host) : null;

    const state = await survey();
    let pool = scope === "primary" ? state.primaryWork : state.work;
    if (host) pool = pool.filter((item) => item.host === host);

    res.status(200).json({
      success: true,
      scope,
      host,
      remaining: pool.length,
      items: pool.slice(0, limit).map(({ kind, productId, index, url }) => ({ kind, productId, index, url })),
    });
  }
);

/**
 * Take one image's bytes and file them where the URL used to point.
 *
 * The product and position are checked against what is actually stored before
 * anything is uploaded. Without that, this is an endpoint that lets any admin
 * session replace any product photograph with any file, which is a much larger
 * thing than the job it exists for.
 */
export const pushImageMigration = controllerWrapper(
  "pushImageMigration",
  async (req, res) => {
    if (!configured()) {
      return res
        .status(409)
        .json({ success: false, message: "Image storage is not set up on this server." });
    }
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ success: false, message: "No image was sent." });
    }

    const productId = String(req.body?.productId || "");
    const index = Number(req.body?.index);
    if (!productId || !Number.isInteger(index) || index < 0) {
      return res
        .status(400)
        .json({ success: false, message: "productId and index are both required." });
    }

    const kind = req.body?.kind === "category" ? "category" : "product";
    let current;
    if (kind === "category") {
      const category = await Category.findById(productId).select("image").lean();
      current = category?.image;
    } else {
      const product = await Product.findOne({ _id: productId, audience: ANY_AUDIENCE })
        .select("images")
        .lean();
      current = product?.images?.[index]?.url;
    }
    if (!current) {
      return res.status(404).json({ success: false, message: "No image at that position." });
    }
    if (isOurs(current)) {
      // Already done — a courier resuming over an overlapping range, not an error.
      return res.status(200).json({ success: true, skipped: true, url: current });
    }

    const api = useCloudinary();
    const url = await new Promise((resolve, reject) => {
      const stream = api.uploader.upload_stream(
        {
          folder: FOLDER,
          public_id: kind === "category" ? `category-${productId}` : `${productId}-${index}`,
          overwrite: false,
          resource_type: "image",
        },
        (error, result) => (error ? reject(error) : resolve(result.secure_url))
      );
      stream.end(req.file.buffer);
    });

    await writeBack({ kind, productId, index }, url);

    res.status(200).json({ success: true, url });
  }
);
