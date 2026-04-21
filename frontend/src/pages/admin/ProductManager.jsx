import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Package, Image as ImageIcon, X, UploadCloud, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import axiosClient from '../../api/axiosClient.js';

const initialFormState = {
  name: '', 
  price: '', 
  stock: '', 
  description: '', 
  specs: '', // 🟢 Thêm trường thông số
  parentCategoryId: '',
  childCategoryId: '',
  isTrending: false
};

const ProductManager = () => {
  const [products, setProducts] = useState([]);
  const [categoriesTree, setCategoriesTree] = useState([]);
  const [flatCategories, setFlatCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  
  // 🟢 QUẢN LÝ NHIỀU ẢNH
  const [imageFiles, setImageFiles] = useState([]); // File thực tế để gửi lên server
  const [imagePreviews, setImagePreviews] = useState([]); // Link blob hoặc url để hiển thị

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [totalPages, setTotalPages] = useState(1); // Mới: Lấy Server trả về

  const fetchProducts = async (page = 1) => {
    try {
      setIsLoading(true);
      const res = await axiosClient.get(`/product?page=${page}&limit=${itemsPerPage}`);
      setProducts(res.data?.data || res.data || []);
      if (res.data?.totalPages) setTotalPages(res.data.totalPages);
    } catch (error) {
      toast.error('Không thể tải danh sách sản phẩm!');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axiosClient.get('/category');
      setCategoriesTree(res.data?.data || []);
      setFlatCategories(res.data?.flatData || []);
    } catch (error) {
      toast.error('Không thể tải danh mục!');
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts(currentPage);
  }, [currentPage]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'parentCategoryId') {
      setFormData({ ...formData, parentCategoryId: value, childCategoryId: '' });
    } else {
      setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    }
  };

  // 🟢 XỬ LÝ CHỌN NHIỀU ẢNH (Tối đa 5)
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    if (imageFiles.length + selectedFiles.length > 5) {
      toast.error("Sếp chỉ được chọn tối đa 5 ảnh thôi!");
      return;
    }

    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    setImageFiles(prev => [...prev, ...selectedFiles]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  // 🟢 XÓA ẢNH TRONG DANH SÁCH CHỜ
  const removeImage = (index) => {
    const newFiles = [...imageFiles];
    const newPreviews = [...imagePreviews];
    
    // Thu hồi URL để tránh rò rỉ bộ nhớ
    if (newPreviews[index].startsWith('blob:')) {
      URL.revokeObjectURL(newPreviews[index]);
    }

    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
  };

  const openModal = (product = null) => {
    if (product) {
      setEditingId(product._id);
      const catId = typeof product.category_id === 'object' ? product.category_id?._id : product.category_id;
      const selectedCat = flatCategories.find(c => c._id === catId);
      
      let pId = '', cId = '';
      if (selectedCat && selectedCat.parentId) {
        pId = typeof selectedCat.parentId === 'object' ? selectedCat.parentId._id : selectedCat.parentId;
        cId = catId;
      } else if (selectedCat) {
        pId = catId;
      }

      setFormData({
        name: product.name || '',
        price: product.price || '',
        stock: product.stock || '',
        description: product.description || '',
        specs: product.specs || '', // Load thông số
        parentCategoryId: pId,
        childCategoryId: cId,
        isTrending: product.isTrending || false
      });
      // Ưu tiên lấy mảng images, nếu không có thì lấy imageUrl
      setImagePreviews(product.images?.length > 0 ? product.images : (product.imageUrl ? [product.imageUrl] : []));
    } else {
      setEditingId(null);
      setFormData(initialFormState);
      setImagePreviews([]);
    }
    setImageFiles([]);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalCategoryId = formData.childCategoryId || formData.parentCategoryId;

    if (!finalCategoryId) {
      toast.error("Vui lòng chọn danh mục!");
      return;
    }

    const data = new FormData();
    data.append('name', formData.name);
    data.append('price', formData.price);
    data.append('stock', formData.stock);
    data.append('description', formData.description);
    data.append('specs', formData.specs); // 🟢 Gửi thông số lên
    data.append('category_id', finalCategoryId);
    data.append('isTrending', formData.isTrending);
    
    // 🟢 Gửi mảng ảnh với key 'images' (khớp với upload.array('images', 5) ở backend)
    imageFiles.forEach(file => {
      data.append('images', file);
    });

    try {
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (editingId) {
        await axiosClient.put(`/product/${editingId}`, data, config);
        toast.success('Cập nhật thành công!');
      } else {
        await axiosClient.post('/product', data, config);
        toast.success('Thêm mới thành công!');
        setCurrentPage(1);
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi xử lý!');
    }
  };

  const selectedParent = categoriesTree.find(c => c._id === formData.parentCategoryId);
  const currentProducts = products; // Đã cắt slice từ backend gửi về

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Package className="w-6 h-6 text-[#5a8c76]" /> Quản lý Sản phẩm
        </h1>
        <button onClick={() => openModal()} className="flex items-center px-4 py-2 bg-[#5a8c76] text-white rounded-lg hover:bg-[#4a7562] shadow-sm transition-all">
          <Plus className="w-5 h-5 mr-2" /> Thêm Sản Phẩm
        </button>
      </div>

      {/* Bảng danh sách */}
      <div className="bg-[#202028] rounded-xl shadow-sm border border-gray-700 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#151419] border-b border-gray-700 text-sm font-medium text-gray-400 uppercase">
              <tr>
                <th className="p-4 w-24">Hình ảnh</th>
                <th className="p-4">Thông tin</th>
                <th className="p-4 text-right">Giá</th>
                <th className="p-4 text-center">Kho</th>
                <th className="p-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? (
                <tr><td colSpan="5" className="p-8 text-center">Đang tải...</td></tr>
              ) : currentProducts.map(item => (
                <tr key={item._id} className="hover:bg-[#151419]">
                  <td className="p-4">
                    <img src={item.imageUrl || (item.images && item.images[0])} className="w-14 h-14 object-cover rounded border" alt="" />
                  </td>
                  <td className="p-4">
                    <div className="font-bold flex items-center gap-2">
                      {item.name}
                      {item.isTrending && <span className="bg-orange-100 text-orange-600 text-[10px] px-1.5 py-0.5 rounded">HOT</span>}
                    </div>
                    <div className="text-xs text-gray-400">Danh mục: {item.category_id?.name}</div>
                  </td>
                  <td className="p-4 text-right font-semibold text-red-600">{Number(item.price).toLocaleString()}đ</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${item.stock > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {item.stock > 0 ? item.stock : 'Hết hàng'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => openModal(item)} className="text-blue-600 hover:scale-110 transition-transform"><Edit className="w-5 h-5" /></button>
                      <button onClick={() => {if(window.confirm('Xóa nhé sếp?')) axiosClient.delete(`/product/${item._id}`).then(()=>fetchProducts())}} className="text-red-500 hover:scale-110 transition-transform"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-[#151419]/50">
            <span className="text-sm text-gray-300">Trang {currentPage} / {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 border rounded bg-[#202028] disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 border rounded bg-[#202028] disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Modal chính */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[#202028] rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-[#202028] shrink-0">
              <h2 className="text-xl font-bold">{editingId ? 'Sửa Sản Phẩm' : 'Thêm Sản Phẩm'}</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="w-6 h-6 text-gray-400" /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
              {/* Khu vực Up nhiều ảnh */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Ảnh sản phẩm (Tối đa 5 ảnh)</label>
                <div className="grid grid-cols-5 gap-3">
                  {imagePreviews.map((src, index) => (
                    <div key={index} className="relative group aspect-square border rounded-lg overflow-hidden bg-[#151419] border-[#5a8c76]/30">
                      <img src={src} className="w-full h-full object-cover" alt="" />
                      <button 
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      {index === 0 && <div className="absolute bottom-0 left-0 right-0 bg-[#5a8c76]/80 text-white text-[10px] py-0.5 text-center font-bold">ẢNH CHÍNH</div>}
                    </div>
                  ))}
                  {imagePreviews.length < 5 && (
                    <label className="aspect-square border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-[#151419] hover:border-[#5a8c76] transition-all">
                      <UploadCloud className="w-7 h-7 text-gray-400" />
                      <span className="text-[10px] text-gray-400 mt-1">Thêm ảnh</span>
                      <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-2 italic">* Ảnh đầu tiên sẽ được dùng làm ảnh đại diện ngoài danh sách.</p>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Tên sản phẩm</label>
                  <input name="name" value={formData.name} onChange={handleInputChange} className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#5a8c76]/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Giá bán</label>
                  <input name="price" type="number" value={formData.price} onChange={handleInputChange} className="w-full border p-2.5 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Số lượng kho</label>
                  <input name="stock" type="number" value={formData.stock} onChange={handleInputChange} className="w-full border p-2.5 rounded-lg outline-none" />
                </div>

                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Danh mục gốc</label>
                    <select name="parentCategoryId" value={formData.parentCategoryId} onChange={handleInputChange} className="w-full border p-2.5 rounded-lg bg-[#202028]">
                      <option value="">Chọn danh mục</option>
                      {categoriesTree.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  {selectedParent?.children?.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Danh mục con</label>
                      <select name="childCategoryId" value={formData.childCategoryId} onChange={handleInputChange} className="w-full border p-2.5 rounded-lg bg-[#202028] border-l-4 border-l-[#5a8c76]">
                        <option value="">Tất cả</option>
                        {selectedParent.children.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Mô tả sản phẩm</label>
                  <textarea name="description" value={formData.description} onChange={handleInputChange} rows="3" className="w-full border p-2.5 rounded-lg resize-none outline-none" />
                </div>

                {/* 🟢 PHẦN MỚI: THÔNG SỐ KỸ THUẬT */}
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-[#5a8c76] mb-1 uppercase tracking-wider">Thông số kỹ thuật</label>
                  <textarea 
                    name="specs" 
                    value={formData.specs} 
                    onChange={handleInputChange} 
                    rows="4" 
                    placeholder="Nhập thông số (ví dụ):&#10;- Độ cứng: BX&#10;- Chiều dài: 3m6&#10;- Trọng lượng: 250g"
                    className="w-full border-2 border-[#5a8c76]/20 p-2.5 rounded-lg outline-none focus:border-[#5a8c76] transition-colors" 
                  />
                </div>

                <div className="col-span-2 flex items-center gap-2 bg-orange-50 p-3 rounded-lg">
                  <input type="checkbox" id="isTrending" name="isTrending" checked={formData.isTrending} onChange={handleInputChange} className="w-5 h-5 accent-[#5a8c76]" />
                  <label htmlFor="isTrending" className="text-sm font-bold text-orange-700 cursor-pointer">🔥 Đánh dấu sản phẩm nổi bật (Trending)</label>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-[#151419] flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 border rounded-lg bg-[#202028] hover:bg-gray-800 font-medium">Hủy</button>
              <button onClick={handleSubmit} className="px-6 py-2.5 bg-[#5a8c76] text-white rounded-lg hover:bg-[#4a7562] font-bold shadow-md transition-all">LƯU SẢN PHẨM</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManager;