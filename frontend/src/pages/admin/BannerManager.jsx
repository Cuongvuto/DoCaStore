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
  
  // State để chứa File ảnh thực tế và Link xem trước
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
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
      setImagePreview(banner.imageUrl || '');
    } else {
      setEditingId(null);
      setFormData(initialFormState);
      setImagePreview('');
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
    setImageFile(null);
    setImagePreview('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!editingId && !imageFile) {
      toast.error("Sếp chưa chọn ảnh cho Banner kìa!");
      return;
    }

    const submitData = new FormData();
    submitData.append('title', formData.title);
    submitData.append('linkUrl', formData.linkUrl);
    submitData.append('position', formData.position);
    submitData.append('sortOrder', formData.sortOrder);
    submitData.append('isActive', formData.isActive);
    
    if (imageFile) {
      submitData.append('image', imageFile); 
    }

    try {
      if (editingId) {
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
      await axiosClient.put(`/banners/${banner._id}`, { isActive: !banner.isActive });
      toast.success(`Đã ${!banner.isActive ? 'Bật' : 'Tắt'} banner!`);
      fetchBanners();
    } catch (error) {
      toast.error("Lỗi cập nhật trạng thái!");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight uppercase">Quản lý Banner</h1>
        <button 
          onClick={() => openModal()} 
          className="w-full sm:w-auto flex items-center justify-center px-5 py-3 bg-[#5a8c76] text-white rounded-2xl hover:bg-[#4a7562] transition-all shadow-lg shadow-[#5a8c76]/20 font-bold text-sm active:scale-95"
        >
          <Plus className="w-5 h-5 mr-2" /> Thêm Banner
        </button>
      </div>

      <div className="bg-[#202028] rounded-3xl shadow-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#151419] border-b border-gray-700 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">
                <th className="p-5">Hình ảnh</th>
                <th className="p-5">Tiêu đề / Link</th>
                <th className="p-5">Vị trí</th>
                <th className="p-5 text-center">Thứ tự</th>
                <th className="p-5 text-center">Trạng thái</th>
                <th className="p-5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? (
                <tr><td colSpan="6" className="p-16 text-center text-gray-500 font-medium italic">Đang tải dữ liệu...</td></tr>
              ) : banners.length === 0 ? (
                <tr><td colSpan="6" className="p-16 text-center text-gray-500 font-medium">Chưa có banner nào. Cùng thêm mới nhé!</td></tr>
              ) : (
                banners.map((banner) => (
                  <tr key={banner._id} className="hover:bg-white/5 transition-colors">
                    <td className="p-5">
                      <div className="w-40 h-20 bg-[#151419] rounded-2xl overflow-hidden flex items-center justify-center border border-gray-700 shadow-inner group">
                        {banner.imageUrl ? (
                          <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-gray-700" />
                        )}
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="font-bold text-white text-sm md:text-base leading-tight mb-1">{banner.title || 'Không có tiêu đề'}</div>
                      <div className="text-xs text-gray-500 max-w-[250px] truncate font-mono" title={banner.linkUrl}>
                        {banner.linkUrl || 'Không có link'}
                      </div>
                    </td>
                    <td className="p-5">
                      <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] md:text-xs rounded-lg font-bold border border-blue-500/20 uppercase tracking-tighter">{banner.position}</span>
                    </td>
                    <td className="p-5 text-center font-bold text-gray-300">{banner.sortOrder}</td>
                    <td className="p-5 text-center">
                      <button 
                        onClick={() => toggleActiveStatus(banner)}
                        className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-tighter cursor-pointer transition-all border ${
                          banner.isActive 
                            ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500 hover:text-white' 
                            : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white'
                        }`}
                      >
                        {banner.isActive ? <Check className="w-3.5 h-3.5 mr-1" /> : <XCircle className="w-3.5 h-3.5 mr-1" />}
                        {banner.isActive ? 'Bật' : 'Tắt'}
                      </button>
                    </td>
                    <td className="p-5 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => openModal(banner)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all border border-transparent hover:border-blue-400/20"><Edit className="w-5 h-5" /></button>
                        <button onClick={() => handleDelete(banner._id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-xl transition-all border border-transparent hover:border-red-400/20"><Trash2 className="w-5 h-5" /></button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#202028] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-700 transform transition-all my-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-700 bg-[#202028]">
              <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight">{editingId ? 'Cập nhật Banner' : 'Thêm Banner Mới'}</h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Hình ảnh Banner <span className="text-red-500">*</span></label>
                <div className="flex items-center justify-center w-full group">
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-700 border-dashed rounded-3xl cursor-pointer bg-[#151419] hover:bg-gray-800 relative overflow-hidden transition-all hover:border-[#5a8c76]">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-12 h-12 text-gray-600 mb-3 group-hover:text-[#5a8c76] transition-colors" />
                        <p className="mb-2 text-sm text-gray-500"><span className="font-bold text-gray-300">Bấm để tải ảnh lên</span></p>
                        <p className="text-[10px] text-gray-600 uppercase font-bold tracking-tighter">PNG, JPG, WEBP (Tối đa 5MB)</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Tiêu đề chiến dịch</label>
                  <input type="text" name="title" value={formData.title} onChange={handleInputChange} className="w-full bg-[#151419] p-3.5 border border-gray-700 rounded-2xl focus:ring-2 focus:ring-[#5a8c76] outline-none text-white text-sm transition-all" placeholder="VD: Siêu Sale Giữa Tháng" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Đường dẫn khi click</label>
                  <input type="text" name="linkUrl" value={formData.linkUrl} onChange={handleInputChange} className="w-full bg-[#151419] p-3.5 border border-gray-700 rounded-2xl focus:ring-2 focus:ring-[#5a8c76] outline-none text-white text-sm transition-all font-mono" placeholder="/category/ao-thun" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Vị trí hiển thị</label>
                    <select name="position" value={formData.position} onChange={handleInputChange} className="w-full bg-[#151419] p-3.5 border border-gray-700 rounded-2xl focus:ring-2 focus:ring-[#5a8c76] outline-none text-white text-xs font-bold uppercase tracking-tight">
                      <option value="home_main">Banner chính</option>
                      <option value="home_sidebar">Banner cột bên</option>
                      <option value="category_top">Banner danh mục</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Thứ tự ưu tiên</label>
                    <input type="number" name="sortOrder" value={formData.sortOrder} onChange={handleInputChange} className="w-full bg-[#151419] p-3.5 border border-gray-700 rounded-2xl focus:ring-2 focus:ring-[#5a8c76] outline-none text-white text-sm transition-all" />
                  </div>
                </div>
              </div>

              <div className="flex items-center group cursor-pointer">
                <input type="checkbox" name="isActive" id="isActive" checked={formData.isActive} onChange={handleInputChange} className="w-5 h-5 accent-[#5a8c76] border-gray-700 rounded cursor-pointer" />
                <label htmlFor="isActive" className="ml-3 text-sm text-gray-300 font-bold uppercase tracking-tighter group-hover:text-[#5a8c76] transition-colors cursor-pointer select-none">Hiển thị banner này</label>
              </div>

              <div className="pt-6 border-t border-gray-700 flex flex-col sm:flex-row justify-end gap-3">
                <button type="button" onClick={closeModal} className="w-full sm:w-auto px-8 py-3.5 text-gray-400 bg-[#151419] border border-gray-700 hover:bg-gray-800 rounded-2xl transition-all font-bold text-sm uppercase tracking-wider">Hủy bỏ</button>
                <button type="submit" className="w-full sm:w-auto px-10 py-3.5 text-white bg-[#5a8c76] hover:bg-[#4a7562] rounded-2xl transition-all font-bold shadow-lg shadow-[#5a8c76]/20 active:scale-95 text-sm uppercase tracking-widest">{editingId ? 'Lưu thay đổi' : 'Tạo banner'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BannerManager;