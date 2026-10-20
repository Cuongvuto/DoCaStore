import { v2 as cloudinary } from 'cloudinary';
import UploadCleanup from '../models/uploadCleanupModel.js';

export async function queueCleanup(files) {
  for (const file of files.filter(file => typeof file.filename === 'string' && file.filename.startsWith('Shop_Do_Cau/'))) {
    await UploadCleanup.updateOne({ publicId: file.filename }, { $setOnInsert: { publicId: file.filename } }, { upsert: true });
  }
}
export async function retryUploadCleanup() {
  const jobs = await UploadCleanup.find().sort({ updatedAt: 1 }).limit(50);
  for (const job of jobs) {
    try {
      const result = await cloudinary.uploader.destroy(job.publicId);
      if (!['ok', 'not found'].includes(result.result)) throw new Error('Cloudinary cleanup failed');
      await UploadCleanup.deleteOne({ _id: job._id });
    } catch { await UploadCleanup.updateOne({ _id: job._id }, { $inc: { attempts: 1 } }); }
  }
}
export function validateImage(_req, file, callback) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return callback(Object.assign(new Error('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.'), { status: 400 }));
  callback(null, true);
}
