/**
 * Strip query operators out of anything that arrives from a client.
 *
 * Mongo takes its query language as data, so a value and an instruction look
 * the same on the wire. `{"email": "a@b.com"}` asks for one account;
 * `{"email": {"$ne": null}}` asks for the first account that has an email at
 * all, and a login route that passes the body straight into `findOne` cannot
 * tell those two apart. The same shape reaches `$where`, which runs
 * JavaScript, and `$regex`, which can be made to hang the server on a string
 * the caller chooses.
 *
 * The codebase defends against this in the places somebody remembered to —
 * the login controller checks `typeof email !== "string"` — which is the
 * pattern that eventually misses one. This runs in front of every route
 * instead, so a new endpoint is covered on the day it is written rather than
 * on the day somebody audits it.
 *
 * What it removes: keys beginning with `$`, and keys containing a dot. The
 * first is an operator. The second is a path, which is how a nested field is
 * reached — `{"user.role": "admin"}` in an update body writes somewhere the
 * endpoint never meant to expose.
 *
 * Removed rather than escaped, and the removal is logged. A request carrying
 * `$ne` in a password field is not a customer who typed something unusual; it
 * is somebody probing, and the shop should be able to see that it happened.
 *
 * `req.query` is a getter on Express 5, so it is rebuilt with
 * `Object.defineProperty` rather than assigned to — assigning throws, which
 * would turn this from a guard into an outage.
 */

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isSuspiciousKey = (key) => key.startsWith("$") || key.includes(".");

/**
 * Walks the structure and returns a copy without the dangerous keys, along
 * with the paths that were dropped. Depth-limited, because a deeply nested
 * body is itself a way to burn CPU in the parser.
 */
const scrub = (value, path = "", dropped = [], depth = 0) => {
  if (depth > 12) return { value: undefined, dropped };
  if (Array.isArray(value)) {
    const out = value.map(
      (item, i) => scrub(item, `${path}[${i}]`, dropped, depth + 1).value
    );
    return { value: out, dropped };
  }
  if (!isPlainObject(value)) return { value, dropped };

  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (isSuspiciousKey(key)) {
      dropped.push(path ? `${path}.${key}` : key);
      continue;
    }
    out[key] = scrub(item, path ? `${path}.${key}` : key, dropped, depth + 1).value;
  }
  return { value: out, dropped };
};

export const sanitizeRequest = (req, res, next) => {
  const dropped = [];

  if (req.body && isPlainObject(req.body)) {
    req.body = scrub(req.body, "body", dropped).value;
  }
  if (req.params && isPlainObject(req.params)) {
    req.params = scrub(req.params, "params", dropped).value;
  }
  if (req.query && isPlainObject(req.query)) {
    const cleaned = scrub(req.query, "query", dropped).value;
    // Express 5 exposes `query` as a getter with no setter. Assigning to it
    // throws; redefining the property is the supported way to replace it.
    try {
      Object.defineProperty(req, "query", {
        value: cleaned,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } catch {
      // Older Express, where the plain assignment works.
      req.query = cleaned;
    }
  }

  if (dropped.length) {
    // Left on the request so the audit trail and the security page can see it
    // without this middleware needing to know either of them exists.
    req.sanitizedKeys = dropped;
    console.warn(
      `[sanitize] dropped ${dropped.length} operator key(s) from ${req.method} ${req.path}:`,
      dropped.slice(0, 10).join(", ")
    );
  }

  next();
};

export default sanitizeRequest;
