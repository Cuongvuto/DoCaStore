import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { toast } from 'sonner';
import { Plus, Trash2, X, ImagePlus, Edit, ChevronLeft, ChevronRight } from 'lucide-react'; 

const NewsManager = () => {
  const [newsList, setNewsList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // State Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // State quản lý xem đang ở chế độ "Sửa" hay "Thêm mới" (Lưu ID của bài viết đang sửa)
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    shortDescription: '',
    content: ''
  });
  
  // State xử lý File Ảnh
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  // 1. Hàm lấy danh sách bài viết
  const fetchNews = async (page = 1) => {
    try {
      const response = await axiosClient.get(`/news?page=${page}&limit=${itemsPerPage}`);
      setNewsList(response.data.data || []); 
      if (response.data.totalPages) setTotalPages(response.data.totalPages);
      if (response.data.totalCount !== undefined) setTotalCount(response.data.totalCount);
    } catch (error) {
      console.error("Lỗi khi tải danh sách tin tức:", error);
    }
  };

  useEffect(() => {
    fetchNews(currentPage);
  }, [currentPage]);

  // 2. Hàm tự động tạo Slug
  const generateSlug = (text) => {
    return text.toString().toLowerCase()
      .replace(/á|à|ả|ạ|ã|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ/gi, 'a')
      .replace(/é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ/gi, 'e')
      .replace(/i|í|ì|ỉ|ĩ|ị/gi, 'i')
      .replace(/ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ/gi, 'o')
      .replace(/ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự/gi, 'u')
      .replace(/ý|ỳ|ỷ|ỹ|ỵ/gi, 'y')
      .replace(/đ/gi, 'd')
      .replace(/\s+/g, '-') 
      .replace(/[^\w\-]+/g, '') 
      .replace(/\-\-+/g, '-') 
      .replace(/^-+/, '') 
      .replace(/-+$/, ''); 
  };

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setFormData({
      ...formData,
      title: newTitle,
      slug: generateSlug(newTitle)
    });
  };

  // Hàm xử lý khi chọn ảnh từ máy tính
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file)); // Tạo link ảo để preview ảnh
    }
  };

  // 3. Hàm xử lý Thêm/Sửa bài viết
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Nếu là thêm mới thì bắt buộc phải có ảnh. (Nếu sửa thì không bắt buộc chọn ảnh mới)
    if (!imageFile && !editingId) {
      alert("⚠️ Sếp quên chọn ảnh bìa (thumbnail) rồi!");
      return;
    }

    setIsLoading(true);
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('slug', formData.slug);
      data.append('shortDescription', formData.shortDescription);
      data.append('content', formData.content);
      
      // Chỉ gửi file ảnh nếu sếp có chọn ảnh mới
      if (imageFile) {
        data.append('thumbnail', imageFile); 
      }

      if (editingId) {
        // GỌI API CẬP NHẬT (Sếp kiểm tra xem Backend dùng method PUT, PATCH hay POST nhé, mặc định em để PUT)
        await axiosClient.put(`/news/${editingId}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("🎉 Cập nhật bài viết thành công!");
      } else {
        // GỌI API THÊM MỚI
        await axiosClient.post('/news/create', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("🎉 Thêm bài viết thành công!");
      }
      
      closeModal();
      fetchNews(currentPage); 
    } catch (error) {
      console.error("Lỗi khi lưu bài viết:", error);
      alert(error.response?.data?.message || "❌ Có lỗi xảy ra, vui lòng thử lại!");
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Hàm mở Modal Sửa và đổ dữ liệu cũ vào form
  const handleEditClick = (item) => {
    setFormData({
      title: item.title,
      slug: item.slug,
      shortDescription: item.shortDescription,
      content: item.content
    });
    setImagePreview(item.thumbnail); // Hiển thị ảnh cũ
    setEditingId(item._id); // Đánh dấu là đang ở chế độ Sửa
    setIsModalOpen(true);
  };

  // 5. Hàm xóa bài viết
  const handleDelete = async (id) => {
    if (window.confirm("Sếp có chắc chắn muốn xóa bài viết này không? Ảnh trên mây cũng sẽ bị xóa!")) {
      try {
        await axiosClient.delete(`/news/${id}`);
        fetchNews(currentPage);
      } catch (error) {
        console.error("Lỗi xóa bài viết:", error);
        alert("❌ Lỗi xóa bài viết!");
      }
    }
  };

  // Hàm đóng Modal và Reset form
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null); // Reset lại trạng thái sửa
    setFormData({ title: '', slug: '', shortDescription: '', content: '' });
    setImageFile(null);
    setImagePreview('');
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black text-[#5a8c76] uppercase">Quản lý Tin Tức</h1>
        <button 
          onClick={() => { closeModal(); setIsModalOpen(true); }}
          className="bg-[#5a8c76] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#4a7562] transition-colors flex items-center gap-2 shadow-md"
        >
          <Plus size={20} /> Viết bài mới
        </button>
      </div>

      {/* DANH SÁCH BÀI VIẾT */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 font-bold text-sm uppercase">
            <tr>
              <th className="p-4 w-24">Ảnh bìa</th>
              <th className="p-4">Tiêu đề bài viết</th>
              <th className="p-4 w-32">Lượt xem</th>
              <th className="p-4 w-32 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {newsList.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-10 text-gray-500">Chưa có bài viết nào!</td></tr>
            ) : (
              newsList.map((item) => (
                <tr key={item._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <img src={item.thumbnail} alt={item.title} className="w-20 h-14 object-cover rounded-lg border border-gray-200" />
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-gray-800 text-base">{item.title}</p>
                    <p className="text-xs text-gray-400 mt-1">/{item.slug}</p>
                  </td>
                  <td className="p-4">
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">👁️ {item.views || 0}</span>
                  </td>
                  <td className="p-4 flex justify-center items-center gap-3 mt-3">
                    {/* Nút SỬA */}
                    <button 
                      onClick={() => handleEditClick(item)} 
                      className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                      title="Sửa bài viết"
                    >
                      <Edit size={18} />
                    </button>
                    {/* Nút XÓA */}
                    <button 
                      onClick={() => handleDelete(item._id)} 
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      title="Xóa bài viết"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* PHÂN TRANG */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50/50">
            <span className="text-sm text-gray-600">Trang <span className="font-bold">{currentPage}</span> / <span className="font-bold">{totalPages}</span> (Tổng: {totalCount} bài)</span>
            <div className="flex gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 border rounded bg-white disabled:opacity-50 hover:bg-gray-100 transition"><ChevronLeft size={16}/></button>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 border rounded bg-white disabled:opacity-50 hover:bg-gray-100 transition"><ChevronRight size={16}/></button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL THÊM/SỬA BÀI VIẾT (POPUP) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl mt-20 mb-10 overflow-hidden">
            
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xl font-black text-[#5a8c76] uppercase">
                {editingId ? "Cập nhật bài viết" : "Soạn bài viết mới"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Cột Trái */}
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Tiêu đề bài viết <span className="text-red-500">*</span></label>
                    <input type="text" required value={formData.title} onChange={handleTitleChange} 
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#5a8c76] focus:ring-2 focus:ring-[#5a8c76]/20 outline-none transition-all font-medium"
                      placeholder="VD: Kinh nghiệm chọn máy câu..." />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Đường dẫn SEO (Slug tự động)</label>
                    <input type="text" required value={formData.slug} readOnly
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 outline-none font-mono text-sm cursor-not-allowed" />
                  </div>
                  
                  {/* UPLOAD FILE SECTION */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Ảnh bìa (Thumbnail) {!editingId && <span className="text-red-500">*</span>}
                    </label>
                    <div className="flex items-center gap-4">
                      {imagePreview ? (
                        <div className="relative">
                           <img src={imagePreview} alt="Preview" className="w-32 h-24 object-cover rounded-xl border border-gray-200 shadow-sm" />
                           <button type="button" onClick={() => {setImageFile(null); setImagePreview('');}} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                             <X size={14} />
                           </button>
                        </div>
                      ) : (
                        <label className="w-32 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-[#5a8c76] transition-colors">
                          <ImagePlus className="text-gray-400 mb-1" size={24} />
                          <span className="text-xs text-gray-500 font-medium">Chọn ảnh</span>
                          <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                        </label>
                      )}
                      <div className="flex-1">
                        <p className="text-xs text-gray-400">Ảnh sẽ được lưu tự động lên hệ thống Cloudinary với chất lượng cao nhất.</p>
                        {editingId && !imageFile && <p className="text-xs text-blue-500 mt-1 italic">*Bỏ qua nếu sếp muốn giữ nguyên ảnh cũ.</p>}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Mô tả ngắn <span className="text-red-500">*</span></label>
                    <textarea required value={formData.shortDescription} onChange={(e) => setFormData({...formData, shortDescription: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#5a8c76] focus:ring-2 focus:ring-[#5a8c76]/20 outline-none transition-all min-h-[100px]"
                      placeholder="Viết 1-2 câu tóm tắt để thu hút người đọc..." />
                  </div>
                </div>

                {/* Cột Phải - ReactQuill */}
                <div className="flex flex-col">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nội dung bài viết <span className="text-red-500">*</span></label>
                  <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden bg-white">
                    <ReactQuill 
                      theme="snow" 
                      value={formData.content} 
                      onChange={(content) => setFormData({...formData, content})}
                      className="h-[430px] bg-white border-none pb-[42px]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-gray-100 mt-10">
                <button type="button" onClick={closeModal} className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">
                  Hủy bỏ
                </button>
                <button type="submit" disabled={isLoading} className="bg-[#5a8c76] text-white px-8 py-2.5 rounded-xl font-bold hover:bg-[#4a7562] transition-colors shadow-md disabled:opacity-50">
                  {isLoading ? 'Đang xử lý...' : (editingId ? 'Cập nhật bài viết' : 'Xuất bản bài viết')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .ql-container.ql-snow { border: none !important; }
        .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #e5e7eb !important; background: #f9fafb; }
        .ql-editor { font-size: 15px; line-height: 1.6; }
      `}</style>
    </div>
  );
};

export default NewsManager;