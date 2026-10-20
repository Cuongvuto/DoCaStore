import Product from '../models/productsModel.js';
import Category from '../models/categoryModel.js';
import mongoose from 'mongoose';
import { productInput, badRequest, enumFilter, queryText, pagination } from '../utils/adminQuery.js';

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildProductSort = (sort) => {
    if (sort === 'price_asc') return { price: 1, createdAt: -1 };
    if (sort === 'price_desc') return { price: -1, createdAt: -1 };
    if (sort === 'name_asc') return { name: 1 };
    return { createdAt: -1 };
};

// 🟢 HÀM THÊM SẢN PHẨM MỚI
export const createProduct = async (req, res) => {
  try {
    const data = productInput(req.body);
    if (!await Category.exists({ _id: data.category_id })) throw badRequest('Danh mục không tồn tại.');
    const images = (req.files || []).map(file => file.path);
    const product = await Product.create({ ...data, images, imageUrl: images[0] || '' });
    return res.status(201).json({ success: true, data: product, message: 'Đã thêm sản phẩm.' });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Không thể tạo sản phẩm.' });
  }
};

export const updateProduct = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw badRequest('Mã sản phẩm không hợp lệ.');
    const data = productInput(req.body, true);
    const filter = { _id: req.params.id };
    if (data.stock !== undefined) {
      // Compare-and-set in the write itself: checkout can change stock after the read.
      const expected = req.body.expectedStock;
      if (expected === undefined) return res.status(409).json({ success: false, message: 'Vui lòng tải lại sản phẩm trước khi thay đổi tồn kho.' });
      const parsed = productInput({ stock: expected }, true);
      filter.stock = parsed.stock;
    }
    if (data.category_id && !await Category.exists({ _id: data.category_id })) throw badRequest('Danh mục không tồn tại.');
    const current = await Product.findById(req.params.id);
    if (!current) return res.status(404).json({ success: false, message: 'Sản phẩm không còn tồn tại.' });
    if (req.body.existingImages !== undefined) {
      let retained;
      try { retained = JSON.parse(req.body.existingImages); } catch { throw badRequest('Danh sách ảnh không hợp lệ.'); }
      const previous = current.images?.length ? current.images : (current.imageUrl ? [current.imageUrl] : []);
      if (!Array.isArray(retained) || retained.some(url => typeof url !== 'string' || !previous.includes(url))) throw badRequest('Ảnh giữ lại phải thuộc sản phẩm này.');
      data.images = [...new Set(retained), ...(req.files || []).map(file => file.path)];
    } else if (req.files?.length) {
      data.images = req.files.map(file => file.path);
    }
    if (data.images) {
      if (data.images.length > 5) throw badRequest('Mỗi sản phẩm có tối đa 5 ảnh.');
      data.imageUrl = data.images[0] || '';
    }
    const product = await Product.findOneAndUpdate(filter, { $set: data }, { new: true, runValidators: true });
    if (!product) return res.status(409).json({ success: false, message: 'Sản phẩm hoặc tồn kho vừa thay đổi. Hãy đóng form, làm mới danh sách và kiểm tra lại trước khi lưu.' });
    return res.json({ success: true, data: product, message: 'Đã cập nhật sản phẩm.' });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Không thể cập nhật sản phẩm.' });
  }
};

export const getAllProduct = async (req, res) => {
    try {
        const { category, page, limit, search, sort } = req.query;
        let filter = {};
        const stockFilter = enumFilter(req.query.stock, ['in', 'low', 'out']);
        if (stockFilter === 'in') filter.stock = { $gt: 0 };
        if (stockFilter === 'low') filter.stock = { $gt: 0, $lte: 5 };
        if (stockFilter === 'out') filter.stock = { $lte: 0 };
        queryText(search);
        const categoryId = queryText(req.query.categoryId, 24);
        if (categoryId) {
            if (!mongoose.Types.ObjectId.isValid(categoryId)) throw badRequest('Danh mục không hợp lệ.');
            filter.category_id = categoryId;
        }

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

        if (search?.trim()) {
            filter.name = { $regex: escapeRegex(search.trim()), $options: 'i' };
        }

        let query = Product.find(filter)
            .populate('category_id', 'name slug')
            .sort(buildProductSort(sort));

        let totalPages = 1;
        let currentPage = 1;

        // Nếu Frontend truyền lên số 'page', ta mới phân trang (Giữ an toàn lùi cho các trang Cũ)
        let totalItems = 0;
        if (page) {
            const paging = pagination({ page, limit });
            currentPage = paging.page;
            const parsedLimit = paging.limit;
            const skip = paging.skip;
            
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
        return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Lỗi Server!' });
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
        const { page, search, sort } = req.query;
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 0, 0), 50);

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

        const productFilter = { category_id: { $in: categoryIds } };
        if (search?.trim()) {
            productFilter.name = { $regex: escapeRegex(search.trim()), $options: 'i' };
        }

        let productQuery = Product.find(productFilter)
            .populate('category_id', 'name slug')
            .sort(buildProductSort(sort));

        let currentPage = 1;
        let totalCount;
        let totalPages = 1;
        if (page) {
            currentPage = Math.max(parseInt(page) || 1, 1);
            const pageSize = Math.min(Math.max(parseInt(limit) || 15, 1), 50);
            totalCount = await Product.countDocuments(productFilter);
            totalPages = Math.ceil(totalCount / pageSize) || 1;
            productQuery = productQuery.skip((currentPage - 1) * pageSize).limit(pageSize);
        } else if (parseInt(limit) > 0) {
            productQuery = productQuery.limit(Math.min(parseInt(limit), 50));
        }

        const products = await productQuery;
        if (totalCount === undefined) totalCount = products.length;

        return res.status(200).json({
            success: true,
            message: 'Lấy sản phẩm thành công!',
            count: products.length,
            totalCount,
            totalPages,
            currentPage,
            category: {
                _id: targetCategory._id,
                name: targetCategory.name,
                slug: targetCategory.slug
            },
            data: products
        });

    } catch (error) {
        console.error("❌ Lỗi getProductsByCategory:", error);
        return res.status(500).json({ success: false, message: 'Lỗi Server!' });
    }
}
