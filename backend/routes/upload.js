import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
import {
  getImageMigrationStatus,
  runImageMigrationBatch,
} from "../controllers/imageMigration.controller.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and videos
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

// Authenticated users only. Every caller in the app is already logged in —
// customers uploading a profile picture, vendors uploading store/product
// media, admins uploading banners. Leaving this open let anyone on the
// internet burn the Cloudinary quota with 100MB uploads.
router.post("/upload", protectRoute, upload.single("image"), async (req, res) => {
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

    console.log("Starting Cloudinary upload...");

    // Determine resource type based on file MIME type
    const resourceType = req.file.mimetype.startsWith("video/")
      ? "video"
      : "image";
    console.log("Resource type determined:", resourceType);

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
        message: "File too large. Maximum size is 100MB.",
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
