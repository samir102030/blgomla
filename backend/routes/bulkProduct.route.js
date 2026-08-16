import express from 'express';
import multer from 'multer';
import { protectRoute, requirePermission } from '../middleware/auth.middleware.js';
import { downloadTemplate, bulkUploadProducts, exportProducts } from '../controllers/bulkProduct.controller.js';

const router = express.Router();

// Configure multer for file upload (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
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

// Download template
router.get('/template', protectRoute, requirePermission("products.bulk"), downloadTemplate);

// Export the current catalogue in the template's shape
router.get('/export', protectRoute, requirePermission("products.bulk"), exportProducts);

// Upload and process bulk products
router.post('/upload', protectRoute, requirePermission("products.bulk"), upload.single('file'), bulkUploadProducts);

export default router;

