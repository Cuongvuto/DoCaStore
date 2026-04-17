import News from '../models/newsModel.js';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';

// Hàm hỗ trợ: Lấy public_id từ URL Cloudinary để xóa ảnh cũ
const extractPublicId = (imageUrl) => {
    if (!imageUrl) return null;
    const parts = imageUrl.split('/');
    const filename = parts[parts.length - 1].split('.')[0];
    const folder = parts[parts.length - 2]; 
    return `${folder}/${filename}`;
};

// 1. LẤY DANH SÁCH BÀI VIẾT
export const getAllNews = async (req, res) => {
    try {
        const { page, limit } = req.query;
        let query = News.find().sort({ createdAt: -1 });

        let totalPages = 1;
        let currentPage = 1;
        let totalItems = 0;

        // Phân trang Backward Compatible
        if (page) {
            currentPage = parseInt(page) || 1;
            const parsedLimit = parseInt(limit) || 10;
            const skip = (currentPage - 1) * parsedLimit;
            
            totalItems = await News.countDocuments();
            totalPages = Math.ceil(totalItems / parsedLimit) || 1;
            
            query = query.skip(skip).limit(parsedLimit);
        }else if (limit) {
            // Dành cho trang chủ: Truyền mỗi limit (không truyền page)
            query = query.limit(parseInt(limit));
        }

        const newsList = await query;
        if (!page) totalItems = newsList.length;

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách tin tức thành công!',
            totalPages,
            currentPage,
            totalCount: totalItems,
            data: newsList
        });
    } catch (error) {
        console.error("❌ Lỗi getAllNews:", error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi Server!',
            error: error.message
        });
    }
};

// 2. LẤY CHI TIẾT 1 BÀI VIẾT
export const getNewsById = async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra ID hợp lệ
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID bài viết không đúng định dạng!'
            });
        }

        const news = await News.findById(id);
        if (!news) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bài viết!'
            });
        }

        // Tăng lượt xem (Tùy chọn: sếp có thể bỏ dòng này nếu không muốn mỗi lần get là tăng view)
        news.views += 1;
        await news.save();

        return res.status(200).json({
            success: true,
            message: 'Lấy chi tiết bài viết thành công!',
            data: news
        });
    } catch (error) {
        console.error("❌ Lỗi getNewsById:", error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi Server!',
            error: error.message
        });
    }
};

// 3. THÊM BÀI VIẾT MỚI
export const createNews = async (req, res) => {
    try {
        const { title, slug, shortDescription, content } = req.body;

        // 1. Xử lý ảnh đại diện (thumbnail) từ Cloudinary
        let thumbnail = '';
        // Model của sếp chỉ lưu 1 ảnh thumbnail, nên ta dùng req.file (upload.single)
        if (req.file) {
            thumbnail = req.file.path; // Đường dẫn an toàn từ Cloudinary
        }

        // 2. Kiểm tra các trường bắt buộc
        if (!title || !slug || !shortDescription || !content || !thumbnail) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập đầy đủ tiêu đề, slug, mô tả ngắn, nội dung và chọn ảnh đại diện!'
            });
        }

        // 3. Kiểm tra Slug có bị trùng trong Database không
        const slugExists = await News.findOne({ slug });
        if (slugExists) {
            return res.status(400).json({
                success: false,
                message: 'Đường dẫn (slug) này đã tồn tại, vui lòng chọn tên khác!'
            });
        }

        // 4. Lưu vào Database
        const newArticle = new News({
            title,
            slug,
            thumbnail,
            shortDescription,
            content
            // views tự động mặc định là 0 theo Model
        });

        const savedArticle = await newArticle.save();

        return res.status(201).json({
            success: true,
            message: 'Thêm bài viết thành công!',
            data: savedArticle
        });
    } catch (error) {
        console.error("❌ Lỗi createNews:", error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi Server!',
            error: error.message
        });
    }
};

// 4. SỬA BÀI VIẾT
export const updateNews = async (req, res) => {
    try {
        const { title, slug, shortDescription, content } = req.body;
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID không hợp lệ!' });
        }

        const existingNews = await News.findById(id);
        if (!existingNews) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết để sửa!' });
        }

        // Kiểm tra trùng slug nếu user đổi slug
        if (slug && slug !== existingNews.slug) {
            const slugExists = await News.findOne({ slug });
            if (slugExists) {
                return res.status(400).json({ success: false, message: 'Slug đã tồn tại, vui lòng chọn tên khác!' });
            }
        }

        let updateData = { title, slug, shortDescription, content };

        // Nếu người dùng tải ảnh thumbnail mới lên
        if (req.file) {
            updateData.thumbnail = req.file.path;

            // Xóa ảnh cũ trên Cloudinary
            if (existingNews.thumbnail) {
                const publicId = extractPublicId(existingNews.thumbnail);
                if (publicId) {
                    await cloudinary.uploader.destroy(publicId);
                }
            }
        }

        const updatedArticle = await News.findByIdAndUpdate(id, updateData, { new: true });

        return res.status(200).json({
            success: true,
            message: 'Cập nhật bài viết thành công!',
            data: updatedArticle
        });
    } catch (error) {
        console.error("❌ Lỗi updateNews:", error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi Server!',
            error: error.message
        });
    }
};

// 5. XÓA BÀI VIẾT
export const deleteNews = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID không hợp lệ!' });
        }

        const existingNews = await News.findById(id);
        if (!existingNews) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết để xóa!' });
        }

        // Xóa ảnh thumbnail trên Cloudinary
        if (existingNews.thumbnail) {
            const publicId = extractPublicId(existingNews.thumbnail);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
            }
        }

        // Xóa data trong DB
        await News.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: 'Đã xóa bài viết và dọn rác ảnh thành công!'
        });
    } catch (error) {
        console.error("❌ Lỗi deleteNews:", error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi Server!',
            error: error.message
        });
    }
};

export const getNewsDetail = async (req, res) => {
  try {
    const { slug } = req.params; 
    
    const news = await News.findOne({ slug: slug });

    if (!news) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết!' });
    }

    
    // Cộng thêm 1 vào số view hiện tại (nếu chưa có view nào thì mặc định là 0 rồi cộng 1)
    news.views = (news.views || 0) + 1;
    
    // Lưu lại vào Database
    await news.save();
    // ---------------------------------------

    res.status(200).json({ success: true, data: news });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};