import express from 'express';
import multer from 'multer';
import { protectRoute, requirePermission } from '../middleware/auth.middleware.js';
import { downloadTemplate, bulkUploadProducts, exportProducts } from '../controllers/bulkProduct.controller.js';

const router = express.Router();

// Configure multer for file upload (memory storage)
const storage = multer.memoryStorage();

// Sized against what /export produces, not against a hand-made sheet. The whole
// point of the export is that it can be edited and uploaded back, and a
// catalogue of twelve thousand products exports to about 64MB — under the old
// 10MB ceiling the round trip the export exists for was impossible, and the
// only sign of it was a 500.
const MAX_UPLOAD_BYTES = 150 * 1024 * 1024;

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
  },
  fileFilter: (req, file, cb) => {
    // Accept only Excel files
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  }
});

/**
 * Turn multer's rejections into an answer the uploader can act on.
 *
 * Without this they surface as a bare 500 "File too large" from the app's
 * catch-all, which tells someone staring at a failed import neither what was
 * wrong nor what would work.
 */
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: `That file is larger than the ${Math.round(
        MAX_UPLOAD_BYTES / 1024 / 1024
      )}MB limit. Split it into smaller sheets and upload them one at a time.`,
    });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

// Download template
router.get('/template', protectRoute, requirePermission("products.bulk"), downloadTemplate);

// Export the current catalogue in the template's shape
router.get('/export', protectRoute, requirePermission("products.bulk"), exportProducts);

// Upload and process bulk products
router.post('/upload', protectRoute, requirePermission("products.bulk"), upload.single('file'), handleUploadErrors, bulkUploadProducts);

export default router;

