import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
import { uploadLimiter } from "../middleware/rateLimit.middleware.js";
import { identifyUpload } from "../utils/fileSignature.js";
import {
  getImageMigrationStatus,
  runImageMigrationBatch,
  getImageMigrationPending,
  pushImageMigration,
} from "../controllers/imageMigration.controller.js";

const router = express.Router();
const storage = multer.memoryStorage();

/*
  Twenty megabytes, down from a hundred.

  A hundred was never a considered number — it is what gets typed when the
  question is "what is definitely big enough". Every file input in this
  application, storefront and dashboard alike, is `accept="image/*"`, and the
  largest thing any of them produces is a photograph straight off a phone,
  which lands around ten. So four fifths of that ceiling existed only for
  requests the product cannot make, and the storage is metered.

  Configurable, because the person who needs it raised one day should not have
  to wait for a deploy to raise it.
*/
const MAX_UPLOAD_MB = Number(process.env.UPLOAD_MAX_MB) || 20;

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_UPLOAD_MB * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // A first pass on the client's claim, so an obviously wrong file is
    // refused before its bytes are read into memory. The claim itself is
    // checked against the bytes further down; this is not the real gate.
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only image and video files are allowed"), false);
    }
  },
});

// Configure Cloudinary once at startup. No hardcoded fallbacks — the
// previous fallback values were a committed secret.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Whether this server can actually store an upload.
 *
 * Missing credentials surfaced as Cloudinary's own "Must supply api_key",
 * which the route reported as a bare "Server error." and the UI showed as
 * "Failed to upload logo" — three layers, none of which named the one thing
 * that was wrong or the one person who could fix it.
 */
const uploadsConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

// Test route to check if the route is working
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Cloudinary route is working",
    configured: uploadsConfigured(),
  });
});

/*
  Moving the catalogue's photographs onto our own account, from the dashboard.

  The equivalent script wants a checkout of this repository and a copy of the
  production database credentials in a file on somebody's laptop, to do a job
  the server is already configured for. These two do it where the credentials
  already live, so the person who owns the shop needs a browser and nothing else.

  Registered before "/upload" and "/delete" only for readability — they share no
  path prefix, so the order does not matter here.
*/
router.get("/migration/status", protectRoute, adminRoute, getImageMigrationStatus);
router.post("/migration/run", protectRoute, adminRoute, runImageMigrationBatch);

/*
  The two the courier uses, for hosts this server cannot reach.

  The general catalogue sits behind Cloudflare, which serves an ordinary home
  connection and refuses a data centre — so the server asks a machine on a
  normal connection to do the fetching and hand back the bytes. Nothing about
  the image account or the database leaves here.
*/
router.get("/migration/pending", protectRoute, adminRoute, getImageMigrationPending);
router.post(
  "/migration/push",
  protectRoute,
  adminRoute,
  upload.single("image"),
  pushImageMigration
);

/*
  Authenticated users only, and no further than that. Every caller in the app
  is already logged in — customers uploading a profile picture, vendors
  uploading store and product media, administrators uploading banners — so an
  admin gate here would break the first two. Leaving it open, as it once was,
  let anyone on the internet burn the Cloudinary quota.

  Being signed in was the whole of the ceiling, though, and signing up is
  free. `uploadLimiter` is the part that was missing: a bound per account
  rather than per address, so a shop's staff working from one office are not
  counted as one uploader.
*/
router.post("/upload", protectRoute, uploadLimiter, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded.",
      });
    }

    // Checked before reaching out, so the answer names the cause instead of
    // relaying a provider error. 503, not 500: nothing is broken, the server
    // is simply not set up for this yet.
    if (!uploadsConfigured()) {
      return res.status(503).json({
        success: false,
        message:
          "Image uploads aren't set up on this server. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to the server settings, then try again.",
        code: "UPLOADS_NOT_CONFIGURED",
      });
    }

    /*
      What was actually sent, as opposed to what the sender called it.

      `req.file.mimetype` is the Content-Type the client wrote on the
      multipart part. Up to here it has been taken at face value, which meant
      the only thing standing between this route and an arbitrary file was
      Cloudinary refusing to decode it — a guard we do not own and do not
      control.
    */
    const { kind, format } = identifyUpload(req.file.buffer);
    if (!kind) {
      return res.status(400).json({
        success: false,
        message: "That file isn't an image or a video we recognise.",
        code: "UNSUPPORTED_FILE_TYPE",
      });
    }

    const claimed = req.file.mimetype.startsWith("video/") ? "video" : "image";
    if (claimed !== kind) {
      // Not a mistake a browser makes. Worth a line in the log with the
      // account attached, because it is somebody posting by hand.
      console.warn(
        `Upload rejected: declared ${req.file.mimetype} but bytes are ${format} (user ${req.user?._id})`
      );
      return res.status(400).json({
        success: false,
        message: "That file doesn't match the type it was sent as.",
        code: "FILE_TYPE_MISMATCH",
      });
    }

    console.log("Starting Cloudinary upload...");

    const resourceType = kind;
    console.log("Resource type determined:", resourceType, `(${format})`);

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ resource_type: resourceType }, (error, result) => {
          if (error) {
            console.log("Cloudinary upload error:", error);
            return reject(error);
          }
          console.log("Cloudinary upload success:", result);
          resolve(result);
        })
        .end(req.file.buffer);
    });

    console.log("Upload completed successfully");
    res.status(200).json({
      success: true,
      message: `${
        resourceType === "video" ? "Video" : "Image"
      } uploaded successfully!`,
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error("Error uploading file:", error);

    // Handle multer errors specifically
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${MAX_UPLOAD_MB}MB.`,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error.",
      error: error.message,
    });
  }
});

export const deleteFromCloudInary = async (
  public_id,
  resourceType = "image"
) => {
  const result = await cloudinary.uploader.destroy(public_id, {
    resource_type: resourceType,
  });
  return result;
};

// Admin-only: this destroys an arbitrary Cloudinary asset by public_id, so an
// open route let anyone wipe the store's media library.
router.delete("/delete", protectRoute, adminRoute, async (req, res) => {
  try {
    const { public_id, resource_type = "image" } = req.body; // or req.query.public_id
    if (!public_id)
      return res.status(400).json({ message: "public_id is required" });

    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: resource_type,
    });
    res.status(200).json({
      message: `${
        resource_type === "video" ? "Video" : "Image"
      } deleted successfully`,
      result,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

export default router;
