import mongoose from 'mongoose';
const schema = new mongoose.Schema({ publicId: { type: String, unique: true, required: true }, attempts: { type: Number, default: 0 } }, { timestamps: true });
export default mongoose.model('UploadCleanup', schema);
