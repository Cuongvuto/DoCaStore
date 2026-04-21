import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Image as ImageIcon, X, Check, XCircle, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import axiosClient from '../../api/axiosClient';

const initialFormState = {
  title: '',
  linkUrl: '',
  isActive: true,
  position: 'home_main',
  sortOrder: 0,
};

const BannerManager = () => {
  const [banners, setBanners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State cho Modal 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  
  // 🟢 THÊM: State để chứa File ảnh thực tế và Link xem trước
  const [imageFile, setImageFile] = useState(null); 
  const [imagePreview, setImagePreview] = useState(''); 

  const fetchBanners = async () => {
    try {
      setIsLoading(true);
      const res = await axiosClient.get('/banners');
      if (res.data && res.data.success) {
        setBanners(res.data.data);
      }
    } catch (error) {
      toast.error("Không thể tải dữ liệu banner!");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Xử lý nhập text bình thường
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // 🟢 THÊM: Xử lý khi chọn file ảnh từ máy tính
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file); // Lưu file vào state để lát gửi lên server
      setImagePreview(URL.createObjectURL(file)); // Tạo link ảo để hiển thị xem trước luôn
    }
  };

  const openModal = (banner = null) => {
    if (banner) {
      setEditingId(banner._id);
      setFormData({
        title: banner.title || '',
        linkUrl: banner.linkUrl || '',
        isActive: banner.isActive,
        position: banner.position || 'home_main',
        sortOrder: banner.sortOrder || 0,
      });
      // Nếu là sửa, thì hiện ảnh cũ từ database
      setImagePreview(banner.imageUrl || '');
    } else {
      setEditingId(null);
      setFormData(initialFormState);
      setImagePreview('');
    }
    setImageFile(null); // Reset file mới chọn
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
    setImageFile(null);
    setImagePreview('');
  };

  // 🟢 NÂNG CẤP: Gửi dữ liệu bằng FormData thay vì JSON
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Bắt lỗi nếu thêm mới mà không chọn ảnh
    if (!editingId && !imageFile) {
      toast.error("Sếp chưa chọn ảnh cho Banner kìa!");
      return;
    }

    // Đóng gói dữ liệu vào FormData
    const submitData = new FormData();
    submitData.append('title', formData.title);
    submitData.append('linkUrl', formData.linkUrl);
    submitData.append('position', formData.position);
    submitData.append('sortOrder', formData.sortOrder);
    submitData.append('isActive', formData.isActive);
    
    // Chỉ đính kèm file nếu người dùng có chọn file mới
    if (imageFile) {
      submitData.append('image', imageFile); 
    }

    try {
      if (editingId) {
        // Axios tự động set header 'Content-Type': 'multipart/form-data' khi nhận thấy FormData
       await axiosClient.put(`/banners/${editingId}`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success("Cập nhật banner thành công!");
      } else {
        await axiosClient.post('/banners', submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success("Thêm banner thành công!");
      }
      closeModal();
      fetchBanners(); 
    } catch (error) {
      console.error("Lỗi lưu banner:", error);
      toast.error(error.response?.data?.message || "Có lỗi xảy ra khi lưu!");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Sếp có chắc chắn muốn xóa banner này không?")) return;
    try {
      await axiosClient.delete(`/banners/${id}`);
      toast.success("Đã xóa banner!");
      fetchBanners();
    } catch (error) {
      toast.error("Không thể xóa banner này!");
    }
  };

  const toggleActiveStatus = async (banner) => {
    try {
      // Đối với update nhanh, ta vẫn có thể dùng JSON bình thường
      await axiosClient.put(`/banners/${banner._id}`, { isActive: !banner.isActive });
      toast.success(`Đã ${!banner.isActive ? 'Bật' : 'Tắt'} banner!`);
      fetchBanners();
    } catch (error) {
      toast.error("Lỗi cập nhật trạng thái!");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Quản lý Banner</h1>
        <button onClick={() => openModal()} className="flex items-center px-4 py-2 bg-[#5a8c76] text-white rounded-lg hover:bg-[#4a7562] transition-colors shadow-sm">
          <Plus className="w-5 h-5 mr-2" /> Thêm Banner
        </button>
      </div>

      {/* ... (Phần bảng table giữ nguyên y hệt code cũ) ... */}
      <div className="bg-[#202028] rounded-xl shadow-sm border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#151419] border-b border-gray-700 text-sm font-medium text-gray-400 uppercase tracking-wider">
                <th className="p-4">Hình ảnh</th>
                <th className="p-4">Tiêu đề / Link</th>
                <th className="p-4">Vị trí</th>
                <th className="p-4 text-center">Thứ tự</th>
                <th className="p-4 text-center">Trạng thái</th>
                <th className="p-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? (
                <tr><td colSpan="6" className="p-8 text-center text-gray-400">Đang tải dữ liệu...</td></tr>
              ) : banners.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-gray-400">Chưa có banner nào. Cùng thêm mới nhé!</td></tr>
              ) : (
                banners.map((banner) => (
                  <tr key={banner._id} className="hover:bg-[#151419] transition-colors">
                    <td className="p-4">
                      <div className="w-32 h-16 bg-gray-800 rounded overflow-hidden flex items-center justify-center border border-gray-700">
                        {banner.imageUrl ? (
                          <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-white">{banner.title || 'Không có tiêu đề'}</div>
                      <div className="text-sm text-gray-400 max-w-[200px] truncate" title={banner.linkUrl}>
                        {banner.linkUrl || 'Không có link'}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md font-medium">{banner.position}</span>
                    </td>
                    <td className="p-4 text-center font-medium text-gray-300">{banner.sortOrder}</td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => toggleActiveStatus(banner)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          banner.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {banner.isActive ? <Check className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                        {banner.isActive ? 'Đang bật' : 'Đã tắt'}
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-3">
                        <button onClick={() => openModal(banner)} className="text-blue-600 hover:text-blue-800"><Edit className="w-5 h-5" /></button>
                        <button onClick={() => handleDelete(banner._id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[#202028] rounded-xl shadow-lg w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-white">{editingId ? 'Cập nhật Banner' : 'Thêm Banner Mới'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-300"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* 🟢 INPUT CHỌN FILE Ở ĐÂY */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Hình ảnh Banner *</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer bg-[#151419] hover:bg-gray-800 relative overflow-hidden">
                    {imagePreview ? (
                      // Hiện ảnh xem trước
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      // Chưa có ảnh thì hiện icon Upload
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-10 h-10 text-gray-400 mb-3" />
                        <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Bấm vào đây</span> để chọn ảnh</p>
                        <p className="text-xs text-gray-400">PNG, JPG, WEBP (MAX. 5MB)</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Tên chiến dịch (Title)</label>
                <input type="text" name="title" value={formData.title} onChange={handleInputChange} className="w-full p-2 border border-gray-700 rounded-lg focus:ring-2 focus:ring-[#5a8c76] outline-none" placeholder="VD: Siêu Sale Giữa Tháng" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Đường dẫn khi click (Link URL)</label>
                <input type="text" name="linkUrl" value={formData.linkUrl} onChange={handleInputChange} className="w-full p-2 border border-gray-700 rounded-lg focus:ring-2 focus:ring-[#5a8c76] outline-none" placeholder="/category/ao-thun" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Vị trí</label>
                  <select name="position" value={formData.position} onChange={handleInputChange} className="w-full p-2 border border-gray-700 rounded-lg focus:ring-2 focus:ring-[#5a8c76] outline-none">
                    <option value="home_main">Banner chính (home_main)</option>
                    <option value="home_sidebar">Banner cột bên (home_sidebar)</option>
                    <option value="category_top">Banner danh mục (category_top)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Thứ tự ưu tiên</label>
                  <input type="number" name="sortOrder" value={formData.sortOrder} onChange={handleInputChange} className="w-full p-2 border border-gray-700 rounded-lg focus:ring-2 focus:ring-[#5a8c76] outline-none" />
                </div>
              </div>

              <div className="flex items-center mt-2">
                <input type="checkbox" name="isActive" id="isActive" checked={formData.isActive} onChange={handleInputChange} className="w-4 h-4 text-[#5a8c76] border-gray-700 rounded focus:ring-[#5a8c76]" />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-300 font-medium">Bật / Hiển thị banner này</label>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end space-x-3 mt-6">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors font-medium">Hủy</button>
                <button type="submit" className="px-4 py-2 text-white bg-[#5a8c76] hover:bg-[#4a7562] rounded-lg transition-colors font-medium shadow-sm">{editingId ? 'Lưu thay đổi' : 'Thêm mới'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BannerManager;