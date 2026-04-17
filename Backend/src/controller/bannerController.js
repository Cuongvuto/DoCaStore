import mongoose from 'mongoose';
import Banner from '../models/bannerModel.js';

// Khách hàng: Lấy danh sách Banner đang bật để hiện lên trang chủ
export const getActiveBanners = async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 });
    return res.status(200).json({ success: true, data: banners });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi Server!', error: error.message });
  }
};

// Admin: Lấy TẤT CẢ banner (cả bật và tắt) để quản lý
export const getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ sortOrder: 1, createdAt: -1 });
    return res.status(200).json({ success: true, data: banners });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi Server!' });
  }
};

// Admin: Tạo banner mới
export const createBanner = async (req, res) => {
  try {
    const bannerData = { ...req.body };
    if (req.file) {
      bannerData.imageUrl = req.file.path; 
    }

    const newBanner = new Banner(bannerData);
    await newBanner.save();
    return res.status(201).json({ success: true, message: 'Tạo Banner thành công!', data: newBanner });
  } catch (error) {
    console.error("Lỗi tạo banner:", error); // Bật còi báo động ra Terminal
    return res.status(500).json({ success: false, message: 'Lỗi Server!', error: error.message });
  }
};

// Admin: Cập nhật banner (đổi ảnh, đổi link, bật/tắt)
export const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // 🟢 Nếu sếp có upload ảnh mới khi sửa banner
    if (req.file) {
      updateData.imageUrl = req.file.path;
    }

    const updatedBanner = await Banner.findByIdAndUpdate(id, updateData, { new: true });
    return res.status(200).json({ success: true, message: 'Cập nhật thành công!', data: updatedBanner });
  } catch (error) {
    console.error("Lỗi cập nhật banner:", error);
    return res.status(500).json({ success: false, message: 'Lỗi Server!' });
  }
};

// Admin: Xóa banner
export const deleteBanner = async (req, res) => {
  try {
    await Banner.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: 'Đã xóa Banner!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi Server!' });
  }
};