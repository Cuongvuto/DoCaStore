import React, { useState, useEffect } from 'react';
import { FolderTree, Plus, Edit, Trash2, ChevronDown, ChevronRight, Package, X, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { toast } from 'sonner';
import axiosClient from '../../api/axiosClient.js';

const CategoryManager = () => {
  const [categoriesTree, setCategoriesTree] = useState([]);
  const [flatCategories, setFlatCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    parentId: '',
    description: '',
    isActive: true,
    sortOrder: 0
  });
  
  // State quản lý UI
  const [expandedCategoryId, setExpandedCategoryId] = useState(null); // Quản lý đóng/mở Bảng Sản Phẩm
  const [expandedTreeIds, setExpandedTreeIds] = useState([]); // 🟢 Quản lý đóng/mở Cây Danh Mục Con
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([fetchCategories(), fetchProducts()]);
    setIsLoading(false);
  };

  const fetchCategories = async () => {
    try {
      const res = await axiosClient.get('/category');
      setCategoriesTree(res.data?.data || []);
      setFlatCategories(res.data?.flatData || res.data?.data || []);
    } catch (error) {
      console.error('Lỗi lấy danh mục:', error);
      toast.error('Không thể tải danh sách danh mục!');
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axiosClient.get('/product');
      setProducts(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Lỗi lấy sản phẩm:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };

  const openModal = (category = null) => {
    if (category) {
      setEditingId(category._id);
      setFormData({ 
        name: category.name, 
        parentId: category.parentId?._id || category.parentId || '',
        description: category.description || '',
        isActive: category.isActive !== false,
        sortOrder: category.sortOrder || 0
      });
    } else {
      setEditingId(null);
      setFormData({ 
        name: '', 
        parentId: '',
        description: '',
        isActive: true,
        sortOrder: 0
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Tên danh mục không được để trống!");
      return;
    }

    try {
      const payload = {
        name: formData.name,
        parentId: formData.parentId || null,
        description: formData.description,
        isActive: formData.isActive,
        sortOrder: Number(formData.sortOrder)
      };

      if (editingId) {
        await axiosClient.put(`/category/${editingId}`, payload);
        toast.success('Cập nhật danh mục thành công!');
      } else {
        await axiosClient.post('/category', payload);
        toast.success('Thêm danh mục thành công!');
      }
      closeModal();
      fetchCategories(); 
    } catch (error) {
      toast.error('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm('Sếp có chắc chắn muốn xóa danh mục này?')) {
      try {
        await axiosClient.delete(`/category/${id}`);
        toast.success('Đã xóa danh mục!');
        fetchCategories();
      } catch (error) {
        toast.error('Lỗi khi xóa: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Xóa sản phẩm này ra khỏi hệ thống? Dữ liệu không thể khôi phục!')) {
      try {
        await axiosClient.delete(`/product/${productId}`);
        toast.success('Đã xóa sản phẩm!');
        setProducts(products.filter(p => p._id !== productId));
      } catch (error) {
        toast.error('Lỗi khi xóa sản phẩm: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const toggleExpandProducts = (categoryId) => {
    if (expandedCategoryId === categoryId) {
      setExpandedCategoryId(null);
    } else {
      setExpandedCategoryId(categoryId);
      setCurrentPage(1); 
    }
  };

  // 🟢 1. Hàm đóng mở Cây Danh Mục (Drop down)
  const toggleTreeExpand = (categoryId) => {
    setExpandedTreeIds(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId) 
        : [...prev, categoryId]
    );
  };

  // 🟢 2. Hàm đệ quy lấy ID của danh mục này VÀ TẤT CẢ các danh mục con của nó
  const getCategoryIdsAndChildren = (category) => {
    let ids = [String(category._id)];
    if (category.children && category.children.length > 0) {
      category.children.forEach(child => {
        ids = [...ids, ...getCategoryIdsAndChildren(child)];
      });
    }
    return ids;
  };

  // Hàm phụ trợ để lấy tên danh mục cho bảng sản phẩm
  const getCategoryName = (catId) => {
    const idStr = typeof catId === 'object' ? catId?._id : catId;
    const found = flatCategories.find(c => String(c._id) === String(idStr));
    return found ? found.name : 'Không rõ';
  };

  const renderCategories = (categories, level = 0) => {
    return categories.map((cat) => {
      
      // Lấy toàn bộ ID (Cha + Con)
      const allRelevantCatIds = getCategoryIdsAndChildren(cat);
      
      // Lọc Sản phẩm dựa trên mảng ID vừa lấy (Tổng sản phẩm)
      const categoryProducts = products.filter(p => {
        if (!p) return false;
        const pCatId = p.category_id?._id || p.category_id;
        return allRelevantCatIds.includes(String(pCatId));
      });

      const hasChildren = cat.children && cat.children.length > 0;
      const isTreeExpanded = expandedTreeIds.includes(cat._id);
      const isProductExpanded = expandedCategoryId === cat._id;
      
      const totalPages = Math.ceil(categoryProducts.length / itemsPerPage);
      const currentProducts = categoryProducts.slice(
        (currentPage - 1) * itemsPerPage, 
        currentPage * itemsPerPage
      );

      return (
        <React.Fragment key={cat._id}>
          <div 
            className={`bg-white rounded-xl shadow-sm border ${!cat.isActive ? 'border-dashed border-gray-300 opacity-70' : 'border-gray-200'} overflow-hidden transition-all duration-200 hover:shadow-md mb-3`}
            style={{ marginLeft: `${level * 2}rem` }}
          >
            <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 transition-colors ${isTreeExpanded || isProductExpanded ? 'bg-slate-50 border-b border-gray-200' : 'hover:bg-gray-50'}`}>
              
              <div 
                className={`flex items-center gap-3 select-none flex-1 mb-3 sm:mb-0 ${hasChildren ? 'cursor-pointer' : ''}`}
                onClick={() => hasChildren ? toggleTreeExpand(cat._id) : toggleExpandProducts(cat._id)}
              >
                {/* 🟢 Nút mũi tên drop down (Chỉ hiện nếu có danh mục con) */}
                <div className={`p-1.5 rounded-md transition-colors ${hasChildren ? (isTreeExpanded ? 'bg-[#5a8c76] text-white' : 'bg-gray-200 text-gray-600') : 'bg-transparent text-transparent'}`}>
                  {hasChildren ? (
                    isTreeExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />
                  ) : (
                    <div className="w-5 h-5" /> // Spacer giữ form
                  )}
                </div>

                <div className="flex flex-col">
                  <h3 className="text-lg font-bold text-gray-800 m-0 flex items-center gap-2">
                    {level > 0 && <span className="text-gray-400 font-normal">|_</span>} 
                    {cat.name}
                    {!cat.isActive && <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded uppercase font-semibold">Đang Ẩn</span>}
                  </h3>
                  {cat.description && (
                     <span className="text-xs text-gray-500 mt-1 line-clamp-1">{cat.description}</span>
                  )}
                </div>
                
                {/* Badge hiển thị TỔNG SỐ LƯỢNG SP */}
                <span className="flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full border border-blue-100 ml-2">
                  <Package className="w-3.5 h-3.5" />
                  {categoryProducts.length} SP
                </span>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button 
                  onClick={() => toggleExpandProducts(cat._id)} 
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border ${isProductExpanded ? 'bg-slate-200 text-slate-800 border-slate-300' : 'text-slate-600 bg-slate-100 hover:bg-slate-200 border-transparent'}`}
                >
                  {isProductExpanded ? 'Đóng DS Sản phẩm' : 'Xem Sản phẩm'}
                </button>
                <button 
                  onClick={() => openModal(cat)} 
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200/50"
                >
                  <Edit className="w-4 h-4 mr-1" /> Sửa
                </button>
                <button 
                  onClick={() => handleDeleteCategory(cat._id)} 
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200/50"
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Xóa
                </button>
              </div>
            </div>

            {/* BẢNG SẢN PHẨM (Mở khi bấm "Xem Sản Phẩm") */}
            {isProductExpanded && (
              <div className="p-4 bg-slate-50/50 animate-in fade-in slide-in-from-top-2 duration-200">
                {categoryProducts.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 font-medium text-gray-500">
                          <th className="p-3 w-16">Ảnh</th>
                          <th className="p-3">Tên Sản Phẩm</th>
                          <th className="p-3 text-right">Giá bán</th>
                          <th className="p-3 text-center">Tồn kho</th>
                          <th className="p-3 text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {currentProducts.map(prod => (
                          <tr key={prod._id} className="hover:bg-gray-50/80">
                            <td className="p-3">
                              <img 
                                src={(Array.isArray(prod.images) && prod.images.length > 0) ? prod.images[0] : (prod.imageUrl || 'https://picsum.photos/40')}
                                alt={prod?.name || 'Sản phẩm'} 
                                className="w-10 h-10 object-cover rounded shadow-sm border border-gray-100" 
                              />
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-gray-800 line-clamp-2">{prod?.name || 'Chưa có tên'}</div>
                              {/* 🟢 Bổ sung hiển thị tên danh mục thật của SP để phân biệt nếu ở mục Cha */}
                              {hasChildren && (
                                <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                                  <FolderTree className="w-3 h-3"/> {getCategoryName(prod.category_id)}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-right font-semibold text-red-600">
                              {prod?.price ? Number(prod.price).toLocaleString('vi-VN') : '0'} đ
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-1 rounded-md text-xs font-medium ${prod.stock > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {prod?.stock || '0'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => handleDeleteProduct(prod._id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-md transition-colors"
                                title="Xóa sản phẩm này"
                              >
                                <Trash2 className="w-4 h-4 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                        <span className="text-sm text-gray-600">
                          Đang xem <span className="font-semibold">{currentProducts.length}</span> sp / Tổng số <span className="font-semibold">{categoryProducts.length}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="p-1.5 rounded border border-gray-300 bg-white text-gray-600 disabled:opacity-50 hover:bg-gray-100"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-medium text-gray-700">
                            Trang {currentPage} / {totalPages}
                          </span>
                          <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="p-1.5 rounded border border-gray-300 bg-white text-gray-600 disabled:opacity-50 hover:bg-gray-100"
                          >
                            <ChevronRightIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                    <Package className="w-8 h-8 text-gray-300 mb-2" />
                    <p className="text-sm">Chưa có sản phẩm nào thuộc khu vực này.</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* 🟢 HIỂN THỊ CÁC DANH MỤC CON (Khi bấm mũi tên Dropdown) */}
          {hasChildren && isTreeExpanded && (
             <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                {renderCategories(cat.children, level + 1)}
             </div>
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FolderTree className="w-6 h-6 text-[#5a8c76]" />
          Quản lý Danh Mục
        </h1>
        <button 
          onClick={() => openModal()}
          className="flex items-center px-4 py-2 bg-[#5a8c76] text-white rounded-lg hover:bg-[#4a7562] transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" /> Thêm Danh Mục
        </button>
      </div>

      <div className="">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-200">
            Đang tải dữ liệu...
          </div>
        ) : categoriesTree.length === 0 ? (
          <div className="p-8 text-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-200">
            Chưa có danh mục nào. Hãy thêm mới nhé!
          </div>
        ) : (
          renderCategories(categoriesTree, 0) 
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col transform transition-all">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">
                {editingId ? 'Cập Nhật Danh Mục' : 'Thêm Danh Mục Mới'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 max-h-[80vh] overflow-y-auto">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên danh mục <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleInputChange} 
                    required 
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5a8c76] outline-none transition-all" 
                    placeholder="VD: Phụ Kiện Câu" 
                    autoFocus
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thuộc danh mục (Cha)</label>
                  <select
                    name="parentId"
                    value={formData.parentId}
                    onChange={handleInputChange}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5a8c76] outline-none transition-all bg-white"
                  >
                    <option value="">-- Không có (Làm danh mục gốc) --</option>
                    {flatCategories
                      .filter(cat => cat._id !== editingId)
                      .map(cat => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name}
                        </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả ngắn</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="2"
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5a8c76] outline-none transition-all resize-none"
                    placeholder="Mô tả công dụng hoặc thông tin phụ..."
                  ></textarea>
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thứ tự hiển thị (Sort Order)</label>
                  <input 
                    type="number" 
                    name="sortOrder" 
                    value={formData.sortOrder} 
                    onChange={handleInputChange} 
                    min="0"
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5a8c76] outline-none transition-all" 
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Số nhỏ xếp trước (0, 1, 2...)</p>
                </div>

                <div className="col-span-1 flex items-center pt-6">
                  <label className="flex items-center cursor-pointer gap-2">
                    <input 
                      type="checkbox" 
                      name="isActive" 
                      checked={formData.isActive} 
                      onChange={handleInputChange} 
                      className="w-5 h-5 text-[#5a8c76] border-gray-300 rounded focus:ring-[#5a8c76] cursor-pointer"
                    />
                    <span className="text-sm font-medium text-gray-700 select-none">
                      Hiển thị danh mục này
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors font-medium">
                  Hủy bỏ
                </button>
                <button type="submit" className="px-5 py-2 text-white bg-[#5a8c76] hover:bg-[#4a7562] rounded-lg transition-colors font-medium shadow-sm">
                  {editingId ? 'Lưu thay đổi' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManager;