import Product from '../models/productsModel.js';
import Category from '../models/categoryModel.js';
import mongoose from 'mongoose';

// 🟢 HÀM THÊM SẢN PHẨM MỚI
export const createProduct = async (req, res) => {
    try {
        const { name, price, description, category_id, stock, brand, specs, isTrending } = req.body;

        // 1. Xử lý nhiều ảnh từ Cloudinary (Sử dụng req.files thay vì req.file)
        let imageUrl = '';
        let images = [];

        if (req.files && req.files.length > 0) {
            // Lấy tất cả các đường dẫn ảnh trả về từ Cloudinary
            images = req.files.map(file => file.path);
            // Mặc định lấy ảnh đầu tiên làm ảnh đại diện hiển thị ở ngoài danh sách
            imageUrl = images[0];
        }

        // 2. Kiểm tra các trường bắt buộc
        if (!name || !price || !category_id) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập tên, giá và chọn danh mục!'
            });
        }

        // 3. Kiểm tra ký tự đặc biệt trong tên
        const specialChars = /[@#$^&*_+=\[\]{};'|<>?]+/;
        if (specialChars.test(name)) {
            return res.status(400).json({
                success: false,
                message: 'Tên sản phẩm không được chứa ký tự đặc biệt!'
            });
        }

        // 4. Kiểm tra logic giá và tồn kho
        const numPrice = Number(price);
        if (Number.isNaN(numPrice) || numPrice <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Giá tiền phải là số lớn hơn 0!'
            });
        }

        const numStock = Number(stock || 0);
        if (Number.isNaN(numStock) || numStock < 0) {
            return res.status(400).json({
                success: false,
                message: 'Số lượng kho không hợp lệ!'
            });
        }

        // 5. Kiểm tra ID danh mục hợp lệ
        if (!mongoose.Types.ObjectId.isValid(category_id)) {
            return res.status(400).json({
                success: false,
                message: 'ID danh mục không đúng định dạng!'
            });
        }

        const categoryExists = await Category.findById(category_id);
        if (!categoryExists) {
            return res.status(404).json({
                success: false,
                message: 'Danh mục không tồn tại!'
            });
        }

        // 6. Lưu vào Database
        const newProduct = new Product({
            name,
            price: numPrice,
            description,
            specs, // Nhận văn bản từ Textarea (đã sửa ở Model thành String)
            category_id,
            stock: numStock,
            imageUrl,
            images, // Lưu mảng ảnh bổ sung
            brand,
            isTrending: isTrending === 'true' || isTrending === true
        });

        const savedProduct = await newProduct.save();

        return res.status(201).json({
            success: true,
            message: 'Thêm sản phẩm thành công!',
            data: savedProduct
        });
    } catch (error) {
        console.error("❌ Lỗi createProduct:", error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi Server!',
            error: error.message
        });
    }
}

// 🟢 HÀM CẬP NHẬT SẢN PHẨM
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID Sản phẩm không hợp lệ!'
            });
        }

        // 1. Kiểm tra nếu có tải lên bộ ảnh mới
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => file.path);
            updateData.images = newImages; // Thay thế mảng ảnh cũ bằng mảng mới
            updateData.imageUrl = newImages[0]; // Cập nhật ảnh đại diện mới
        }

        // 2. Xử lý logic Trending
        if (updateData.isTrending !== undefined) {
            updateData.isTrending = updateData.isTrending === 'true' || updateData.isTrending === true;
        }

        // 3. Loại bỏ dữ liệu rác
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        // 4. Tiến hành cập nhật
        const updatedProduct = await Product.findByIdAndUpdate(
            id, 
            { $set: updateData }, 
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm để cập nhật!'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật sản phẩm thành công!',
            data: updatedProduct
        });

    } catch (error) {
        console.error('❌ Lỗi updateProduct:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi Server!',
            error: error.message
        });
    }
}


export const getAllProduct = async (req, res) => {
    try {
        const { category, page, limit } = req.query; // Thêm nhận page và limit
        let filter = {};

        if (category) {
            const foundCategory = await Category.findOne({ slug: category });
            
            if (!foundCategory) {
                return res.status(200).json({
                    success: true,
                    message: 'Không tìm thấy danh mục!',
                    totalPages: 1,
                    currentPage: 1,
                    count: 0,
                    data: []
                });
            }
            filter.category_id = foundCategory._id;
        }

        let query = Product.find(filter)
            .populate('category_id', 'name slug')
            .sort({ createdAt: -1 });

        let totalPages = 1;
        let currentPage = 1;

        // Nếu Frontend truyền lên số 'page', ta mới phân trang (Giữ an toàn lùi cho các trang Cũ)
        let totalItems = 0;
        if (page) {
            currentPage = parseInt(page) || 1;
            const parsedLimit = parseInt(limit) || 10;
            const skip = (currentPage - 1) * parsedLimit;
            
            totalItems = await Product.countDocuments(filter);
            totalPages = Math.ceil(totalItems / parsedLimit) || 1;
            
            query = query.skip(skip).limit(parsedLimit);
        }

        const products = await query;
        if (!page) totalItems = products.length;

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách thành công!',
            totalPages,
            currentPage,
            totalCount: totalItems,
            count: products.length,
            data: products
        });
    } catch (error) {
        console.error("Lỗi getAllProduct:", error);
        return res.status(500).json({ success: false, message: 'Lỗi Server!' });
    }
}

export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID không hợp lệ!' });
        }
        const product = await Product.findById(id).populate('category_id', 'name slug');
        if (!product) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm!' });
        }
        return res.status(200).json({ success: true, data: product });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi Server!' });
    }
}

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedProduct = await Product.findByIdAndDelete(id);
        if (!deletedProduct) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm!' });
        }
        return res.status(200).json({ success: true, message: 'Xóa thành công!' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi Server!' });
    }
}

export const getTrendingProducts = async (req, res) => {
    try {
        const manualTrending = await Product.find({ isTrending: true })
            .populate('category_id', 'name slug')
            .sort({ createdAt: -1 });

        const autoTrending = await Product.find({ sold: { $gt: 0 } })
            .populate('category_id', 'name slug')
            .sort({ sold: -1 })
            .limit(10);

        const productMap = new Map();
        manualTrending.forEach(item => productMap.set(item._id.toString(), item));
        autoTrending.forEach(item => {
            if (!productMap.has(item._id.toString())) {
                productMap.set(item._id.toString(), item);
            }
        });

        return res.status(200).json({
            success: true,
            data: Array.from(productMap.values())
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi Server!' });
    }
}

//  LẤY SẢN PHẨM THEO DANH MỤC (BAO GỒM CẢ DANH MỤC CON)
export const getProductsByCategory = async (req, res) => {
    try {
        const { identifier } = req.params; 
        
        // 👉 1. Bắt lấy query limit từ URL (nếu có)
        const limit = parseInt(req.query.limit) || 0;

        let targetCategory;

        // 2. Tìm danh mục đích (có thể là Cha hoặc Con tùy người dùng click)
        if (mongoose.Types.ObjectId.isValid(identifier)) {
            targetCategory = await Category.findById(identifier);
        } else {
            targetCategory = await Category.findOne({ slug: identifier });
        }

        if (!targetCategory) {
            return res.status(200).json({
                success: true,
                message: 'Không tìm thấy danh mục!',
                data: []
            });
        }

        // 3. TUYỆT CHIÊU: Tìm tất cả danh mục con có parentId là danh mục đích này
        const childCategories = await Category.find({ parentId: targetCategory._id });
        
        // 4. Gom ID của danh mục Cha và tất cả ID của danh mục Con vào một mảng
        const categoryIds = [
            targetCategory._id, 
            ...childCategories.map(child => child._id)
        ];

        // 5. Khởi tạo Query tìm sản phẩm
        let productQuery = Product.find({ category_id: { $in: categoryIds } })
            .populate('category_id', 'name slug')
            .sort({ createdAt: -1 });

        // 👉 6. Nếu có limit truyền vào (lớn hơn 0), thì áp dụng giới hạn
        if (limit > 0) {
            productQuery = productQuery.limit(limit);
        }

        // Thực thi Query
        const products = await productQuery;

        return res.status(200).json({
            success: true,
            message: 'Lấy sản phẩm thành công!',
            count: products.length,
            data: products
        });

    } catch (error) {
        console.error("❌ Lỗi getProductsByCategory:", error);
        return res.status(500).json({ success: false, message: 'Lỗi Server!' });
    }
}