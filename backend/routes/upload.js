import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

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

// Configure Cloudinary once at startup
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dlommecfr",
  api_key: process.env.CLOUDINARY_API_KEY || "249541578961879",
  api_secret:
    process.env.CLOUDINARY_API_SECRET || "lwU-kzA0H1yGvZ1KqPrhILZlRa8",
});

// Test route to check if the route is working
router.get("/test", (req, res) => {
  res.json({ success: true, message: "Cloudinary route is working" });
});

router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    console.log("=== UPLOAD REQUEST STARTED ===");
    console.log("Request body:", req.body);
    console.log(
      "Request file:",
      req.file
        ? {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
          }
        : "No file"
    );

    if (!req.file) {
      console.log("ERROR: No file uploaded");
      return res.status(400).json({
        success: false,
        message: "No file uploaded.",
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

router.delete("/delete", async (req, res) => {
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
