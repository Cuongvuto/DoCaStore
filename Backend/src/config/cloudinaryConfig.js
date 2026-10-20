import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import { queueCleanup, validateImage } from '../services/uploadService.js';
import dotenv from 'dotenv';

dotenv.config();

// 1. Cấp đúng "chìa khóa" cho Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Cấu hình kho chứa
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'Shop_Do_Cau', 
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'], 
  },
});

// 3. Giao xe tải cho Multer
const uploader = multer({ storage, limits: { fileSize: 5 * 1024 * 1024, files: 5, fields: 30 }, fileFilter: validateImage });
const wrap = middleware => (req, res, next) => {
  res.once('finish', () => {
    if (res.statusCode >= 400) {
      const files = req.file ? [req.file] : Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat();
      void queueCleanup(files).catch(error => console.error('Upload cleanup queue:', error.message));
    }
  });
  middleware(req, res, error => {
    if (!error) return next();
    return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ success: false, message: error.code === 'LIMIT_FILE_SIZE' ? 'Mỗi ảnh tối đa 5 MB.' : error.code?.startsWith('LIMIT_') ? 'Vượt giới hạn số ảnh hoặc trường dữ liệu.' : 'Upload ảnh thất bại. Chỉ hỗ trợ JPG, PNG, WebP.' });
  });
};
const upload = {
  single: field => wrap(uploader.single(field)),
  array: (field, count) => wrap(uploader.array(field, count)),
  fields: fields => wrap(uploader.fields(fields))
};

export default upload;
