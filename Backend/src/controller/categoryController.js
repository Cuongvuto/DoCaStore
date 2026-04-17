import Category from '../models/categoryModel.js';
import mongoose from 'mongoose';

// Hàm hỗ trợ: Biến đổi tiếng Việt có dấu thành chuỗi không dấu
const generateSlug = (text) => {
  return text.toString().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '').replace(/-+$/, '');
};

// Hàm hỗ trợ: Xây dựng cấu trúc cây (Tree) cho danh mục
const buildCategoryTree = (categories, parentId = null) => {
  const categoryList = [];
  for (let cat of categories) {
    // So sánh parentId, nếu là null thì nó là danh mục gốc
    if (String(cat.parentId) === String(parentId)) {
      categoryList.push({
        ...cat.toObject(),
        children: buildCategoryTree(categories, cat._id) // Gọi đệ quy tìm con của nó
      });
    }
  }
  return categoryList;
};

// 1. Hàm tạo danh mục mới
export const createCategory = async (req, res) => {
  try {
    // Lấy thêm các trường mới từ req.body
    const { name, parentId, image, description, isActive, sortOrder } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tên danh mục!'
      });
    }
    
    const slug = generateSlug(name);

    const exitingCategory = await Category.findOne({ slug });
    if (exitingCategory) {
      return res.status(400).json({ // Đã sửa lỗi res.status.json của bản cũ
        success: false, 
        message: 'Danh mục này đã tồn tại!'
      });
    }

    // Nếu parentId truyền lên là rỗng, set về null
    const validParentId = parentId ? parentId : null;

    const newCategory = new Category({ 
      name, 
      slug, 
      parentId: validParentId,
      image, 
      description, 
      isActive, 
      sortOrder 
    });
    
    const savedCategory = await newCategory.save();

    return res.status(201).json({
      success: true,
      message: "Đã thêm danh mục thành công!",
      data: savedCategory
    });

  } catch (error) {
    console.error("❌ Lỗi khi tạo danh mục:", error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
}

// 2. Hàm lấy tất cả danh mục (TRẢ VỀ DẠNG CÂY)
export const getAllCategory = async (req, res) => {
  try {
    // Lấy tất cả và sắp xếp theo sortOrder
    const categories = await Category.find().sort({ sortOrder: 1 });
    
    // Tự động gom nhóm Cha - Con
    const categoryTree = buildCategoryTree(categories, null);

    return res.status(200).json({
      success: true,
      count: categories.length,
      data: categoryTree, // Trả về dạng Cây để Frontend vẽ menu
      flatData: categories // Trả thêm mảng phẳng (phòng khi Admin cần dùng select box)
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy danh mục:", error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
}

// 3. Hàm cập nhật danh mục
export const updateCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { name, parentId, image, description, isActive, sortOrder } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
       return res.status(400).json({ success: false, message: 'ID danh mục không hợp lệ!' });
    }
    if (!name) {
       return res.status(400).json({ success: false, message: 'Vui lòng nhập tên mới cho danh mục!' });
    }

    // Chặn lỗi: Không được chọn Cha là chính nó
    if (parentId && String(parentId) === String(categoryId)) {
      return res.status(400).json({ success: false, message: 'Danh mục không thể làm cha của chính nó!' });
    }

    const newSlug = generateSlug(name);
    const validParentId = parentId ? parentId : null;

    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId, 
      { 
        name, 
        slug: newSlug,
        parentId: validParentId,
        image,
        description,
        isActive,
        sortOrder
      }, 
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục để sửa!' });
    }

    return res.status(200).json({
      success: true,
      message: 'Cập nhật danh mục thành công!',
      data: updatedCategory
    });
  } catch (error) {
    console.error("❌ Lỗi khi sửa danh mục:", error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
}

// 4. Hàm xóa danh mục
export const deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ success: false, message: 'ID danh mục không hợp lệ!' });
    }

    // BẢO VỆ DỮ LIỆU: Kiểm tra xem nó có danh mục con không
    const hasChildren = await Category.findOne({ parentId: categoryId });
    if (hasChildren) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không thể xóa! Vui lòng xóa hoặc di chuyển các danh mục con trước.' 
      });
    }

    const deletedCategory = await Category.findByIdAndDelete(categoryId);

    if (!deletedCategory) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục để xóa!' });
    }

    return res.status(200).json({
      success: true,
      message: 'Đã xóa danh mục thành công!'
    });

  } catch (error) {
    console.error("❌ Lỗi khi xóa danh mục:", error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// 5. Hàm tìm theo ID
export const getCategoryById = async (req, res) => {
  try {
    // Populate thêm thông tin của danh mục Cha để Frontend tiện hiển thị
    const category = await Category.findById(req.params.id).populate('parentId', 'name slug');
    
    if (!category) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục!' });
    }
    return res.status(200).json({ success: true, data: category });
  } catch (error) {
    console.error("❌ Lỗi khi lấy ID danh mục:", error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};