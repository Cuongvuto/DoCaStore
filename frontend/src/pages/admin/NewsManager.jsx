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
    <div className="p-4 md:p-6 bg-[#151419] min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-xl md:text-3xl font-black text-[#5a8c76] uppercase tracking-tighter">Quản lý Tin Tức</h1>
        <button 
          onClick={() => { closeModal(); setIsModalOpen(true); }}
          className="w-full sm:w-auto bg-[#5a8c76] text-white px-5 py-3 rounded-2xl font-bold hover:bg-[#4a7562] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#5a8c76]/20 active:scale-95"
        >
          <Plus size={20} /> Viết bài mới
        </button>
      </div>

      {/* DANH SÁCH BÀI VIẾT */}
      <div className="bg-[#202028] rounded-3xl shadow-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-[#151419] text-gray-500 font-bold text-xs uppercase tracking-widest border-b border-gray-700">
              <tr>
                <th className="p-5 w-24">Ảnh bìa</th>
                <th className="p-5">Tiêu đề bài viết</th>
                <th className="p-5 w-32">Lượt xem</th>
                <th className="p-5 w-32 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {newsList.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-16 text-gray-500 font-medium italic">Chưa có bài viết nào!</td></tr>
              ) : (
                newsList.map((item) => (
                  <tr key={item._id} className="hover:bg-white/5 transition-colors">
                    <td className="p-5">
                      <img src={item.thumbnail} alt={item.title} className="w-20 h-14 object-cover rounded-xl border border-gray-700 shadow-sm" />
                    </td>
                    <td className="p-5">
                      <p className="font-bold text-white text-sm md:text-base leading-snug line-clamp-2">{item.title}</p>
                      <p className="text-[10px] text-gray-500 mt-1.5 font-mono">/{item.slug}</p>
                    </td>
                    <td className="p-5">
                      <span className="bg-[#5a8c76]/10 text-[#5a8c76] px-3 py-1 rounded-lg text-xs font-bold border border-[#5a8c76]/20">
                        👁️ {item.views || 0}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="flex justify-center items-center gap-2">
                        <button 
                          onClick={() => handleEditClick(item)} 
                          className="text-blue-400 hover:bg-blue-400/10 p-2.5 rounded-xl transition-all border border-transparent hover:border-blue-400/20"
                          title="Sửa bài viết"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item._id)} 
                          className="text-red-400 hover:bg-red-400/10 p-2.5 rounded-xl transition-all border border-transparent hover:border-red-400/20"
                          title="Xóa bài viết"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PHÂN TRANG */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-5 border-t border-gray-700 bg-[#151419]/50 gap-4">
            <span className="text-xs md:text-sm text-gray-500">
              Trang <span className="text-white font-bold">{currentPage}</span> / <span className="text-white font-bold">{totalPages}</span> 
              <span className="hidden sm:inline"> (Tổng: {totalCount} bài)</span>
            </span>
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => p - 1)} 
                className="p-2.5 border border-gray-700 rounded-xl bg-[#202028] text-gray-400 disabled:opacity-30 hover:bg-gray-800 transition-all"
              >
                <ChevronLeft size={18}/>
              </button>
              <button 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(p => p + 1)} 
                className="p-2.5 border border-gray-700 rounded-xl bg-[#202028] text-gray-400 disabled:opacity-30 hover:bg-gray-800 transition-all"
              >
                <ChevronRight size={18}/>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL THÊM/SỬA BÀI VIẾT (POPUP) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto custom-scrollbar">
          <div className="bg-[#202028] w-full max-w-5xl rounded-3xl shadow-2xl my-auto overflow-hidden border border-gray-700 transform transition-all">
            
            <div className="flex justify-between items-center p-5 md:p-6 border-b border-gray-700 bg-[#202028]">
              <h2 className="text-lg md:text-xl font-black text-[#5a8c76] uppercase tracking-tight">
                {editingId ? "Cập nhật bài viết" : "Soạn bài viết mới"}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-red-500">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 md:p-8 space-y-6 md:space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
                {/* Cột Trái */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Tiêu đề bài viết <span className="text-red-500">*</span></label>
                    <input type="text" required value={formData.title} onChange={handleTitleChange} 
                      className="w-full bg-[#151419] px-4 py-3 rounded-2xl border border-gray-700 focus:ring-2 focus:ring-[#5a8c76] outline-none text-white transition-all font-bold text-sm md:text-base"
                      placeholder="VD: Kinh nghiệm chọn máy câu..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Đường dẫn SEO (Tự động)</label>
                    <input type="text" required value={formData.slug} readOnly
                      className="w-full bg-[#151419]/50 px-4 py-3 rounded-2xl border border-gray-800 text-gray-500 outline-none font-mono text-[10px] md:text-xs cursor-not-allowed" />
                  </div>
                  
                  {/* UPLOAD FILE SECTION */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                      Ảnh bìa (Thumbnail) {!editingId && <span className="text-red-500">*</span>}
                    </label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      {imagePreview ? (
                        <div className="relative group">
                           <img src={imagePreview} alt="Preview" className="w-40 h-28 object-cover rounded-2xl border border-gray-700 shadow-md transition-all group-hover:brightness-75" />
                           <button type="button" onClick={() => {setImageFile(null); setImagePreview('');}} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                             <X size={14} />
                           </button>
                        </div>
                      ) : (
                        <label className="w-full sm:w-40 h-28 flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-2xl cursor-pointer hover:bg-[#151419] hover:border-[#5a8c76] transition-all group">
                          <ImagePlus className="text-gray-500 group-hover:text-[#5a8c76] mb-1.5 transition-colors" size={28} />
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter group-hover:text-[#5a8c76]">Chọn ảnh bìa</span>
                          <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                        </label>
                      )}
                      <div className="flex-1 space-y-2">
                        <p className="text-[10px] md:text-xs text-gray-500 leading-relaxed font-medium italic">Kích thước khuyến nghị: 800x600px. Ảnh sẽ được tối ưu tự động.</p>
                        {editingId && !imageFile && <p className="text-[10px] text-[#5a8c76] font-bold uppercase tracking-tighter">* Đang sử dụng ảnh cũ</p>}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Mô tả ngắn <span className="text-red-500">*</span></label>
                    <textarea required value={formData.shortDescription} onChange={(e) => setFormData({...formData, shortDescription: e.target.value})}
                      className="w-full bg-[#151419] px-4 py-3 rounded-2xl border border-gray-700 focus:ring-2 focus:ring-[#5a8c76] outline-none text-white transition-all min-h-[120px] text-sm md:text-base leading-relaxed"
                      placeholder="Viết 1-2 câu tóm tắt để thu hút người đọc..." />
                  </div>
                </div>

                {/* Cột Phải - ReactQuill */}
                <div className="flex flex-col min-h-[400px] md:min-h-[500px]">
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Nội dung bài viết <span className="text-red-500">*</span></label>
                  <div className="flex-1 border border-gray-700 rounded-2xl overflow-hidden bg-[#151419] transition-all focus-within:ring-2 focus-within:ring-[#5a8c76]">
                    <ReactQuill 
                      theme="snow" 
                      value={formData.content} 
                      onChange={(content) => setFormData({...formData, content})}
                      className="h-full bg-transparent border-none flex flex-col"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 border-t border-gray-700">
                <button type="button" onClick={closeModal} className="w-full sm:w-auto px-8 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-800 transition-all text-sm uppercase tracking-wider">
                  Hủy bỏ
                </button>
                <button type="submit" disabled={isLoading} className="w-full sm:w-auto bg-[#5a8c76] text-white px-10 py-3 rounded-2xl font-bold hover:bg-[#4a7562] transition-all shadow-lg shadow-[#5a8c76]/20 disabled:opacity-50 active:scale-95 text-sm uppercase tracking-widest">
                  {isLoading ? 'Đang xử lý...' : (editingId ? 'Lưu thay đổi' : 'Xuất bản ngay')}
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