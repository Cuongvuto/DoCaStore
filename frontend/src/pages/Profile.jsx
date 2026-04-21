import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  User, MapPin, ShoppingBag, 
  ChevronDown, ChevronUp, Package, 
  Trash2, Edit, Plus, X, CheckCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext'; 
import axiosClient from '../api/axiosClient';
import TierBadge from '../components/TierBadge'; 

const Profile = () => {
  const { user, token,refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('info'); 

  // ================= STATE ĐỊA CHỈ =================
  const [addresses, setAddresses] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    receiverName: '', phone: '', street: '',
    provinceCode: '', provinceName: '',
    districtCode: '', districtName: '',
    wardCode: '', wardName: '',
    isDefault: false
  });

  // ================= STATE ĐƠN HÀNG =================
  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [loading, setLoading] = useState(false);

  // === STATE PHÂN TRANG ĐƠN HÀNG ===
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 6; // Hiện tối đa 6 đơn mỗi trang

  // 1. Khởi tạo dữ liệu
  useEffect(() => {
    if (user && token) {
      refreshUser();
      fetchAddresses();
      fetchOrders();
      axios.get("https://provinces.open-api.vn/api/p/").then((res) => setProvinces(res.data));
    }
  }, [user, token,refreshUser]);

  const fetchAddresses = async () => {
    try {
      const res = await axiosClient.get('/address');
      if (res.data.success) setAddresses(res.data.data);
    } catch (err) { console.error("Lỗi lấy địa chỉ:", err); }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get("/orders/my-orders"); 
      
      if (res.data && res.data.success) {
        setOrders(res.data.data);
      } else {
        toast.error("Không thể lấy danh sách đơn hàng!");
      }
    } catch (error) {
      console.error("Lỗi lấy thông tin đơn hàng:", error);
      toast.error("Lỗi kết nối server!");
    } finally {
      setLoading(false);
    }
  };

  // ================= LOGIC PHÂN TRANG =================
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = orders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(orders.length / ordersPerPage);

  // Đảm bảo không bị lỗi trang trống nếu đang ở trang cuối mà hủy hết đơn
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [orders.length, totalPages, currentPage]);


  // ================= LOGIC HỦY ĐƠN HÀNG =================
  const handleCancelOrder = (orderId) => {
    toast.warning("Xác nhận hủy đơn hàng", {
      description: "Bạn có chắc chắn muốn hủy đơn hàng này không? Thao tác này không thể hoàn tác.",
      duration: 6000,
      action: {
        label: "Xác nhận hủy",
        onClick: async () => {
          try {
            await axiosClient.put(`/orders/${orderId}/cancel`);
            toast.success("Đã hủy đơn hàng thành công!");
            fetchOrders(); 
          } catch (error) {
            console.error("Lỗi hủy đơn:", error);
            toast.error(error.response?.data?.message || "Không thể hủy đơn hàng lúc này.");
          }
        }
      },
      cancel: {
        label: "Đóng",
      }
    });
  };

  // 2. Logic chọn Tỉnh/Huyện/Xã
  const handleProvinceChange = (e) => {
    const code = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setAddressForm({ ...addressForm, provinceCode: code, provinceName: name, districtCode: "", districtName: "", wardCode: "", wardName: "" });
    if (code) axios.get(`https://provinces.open-api.vn/api/p/${code}?depth=2`).then((res) => setDistricts(res.data.districts));
    else setDistricts([]);
  };

  const handleDistrictChange = (e) => {
    const code = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setAddressForm({ ...addressForm, districtCode: code, districtName: name, wardCode: "", wardName: "" });
    if (code) axios.get(`https://provinces.open-api.vn/api/d/${code}?depth=2`).then((res) => setWards(res.data.wards));
    else setWards([]);
  };

  // 3. Xử lý Thêm/Sửa địa chỉ
  const saveAddress = async (e) => {
    e.preventDefault();
    const payload = {
      receiverName: addressForm.receiverName,
      phone: addressForm.phone,
      street: addressForm.street,
      ward: addressForm.wardName,
      district: addressForm.districtName,
      city: addressForm.provinceName,
      isDefault: addressForm.isDefault
    };

    try {
      if (editingId) {
        await axiosClient.put(`/address/${editingId}`, payload);
        toast.success("Cập nhật địa chỉ thành công!");
      } else {
        await axiosClient.post('/address', payload);
        toast.success("Thêm địa chỉ mới thành công!");
      }
      setShowAddressForm(false);
      setEditingId(null);
      fetchAddresses();
    } catch (err) { toast.error("Lỗi thao tác địa chỉ!"); }
  };

  const deleteAddress = async (id) => {
    if (!window.confirm("Xóa địa chỉ này?")) return;
    try {
      await axiosClient.delete(`/address/${id}`);
      toast.success("Đã xóa!");
      fetchAddresses();
    } catch (err) { toast.error("Không thể xóa!"); }
  };

  // 4. HÀM RENDER TRẠNG THÁI
  const renderStatus = (status) => {
    switch (status) {
      case 'pending': return <span className="text-yellow-600 bg-yellow-50 border border-yellow-200 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Chờ xử lý</span>;
      case 'processing': return <span className="text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Đang chuẩn bị</span>;
      case 'shipped': return <span className="text-purple-600 bg-purple-50 border border-purple-200 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Đang giao</span>;
      case 'completed': return <span className="text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Hoàn thành</span>;
      case 'cancelled': return <span className="text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Đã hủy</span>;
      default: return <span className="text-gray-600 bg-gray-50 border px-2 py-1 rounded-md text-[10px] font-bold uppercase">{status}</span>;
    }
  };

  if (!user) return <div className="text-center py-20 font-bold">Vui lòng đăng nhập...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 md:px-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* SIDEBAR */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-3">
              <User className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="font-bold text-gray-800">{user.name}</h2>
            <p className="text-xs text-gray-500 mb-4">{user.email}</p>
            
            {/* TÍCH HỢP TIER BADGE TẠI ĐÂY */}
            <TierBadge points={user?.points || 0} tier={user?.tier || 'normal'} />

          </div>

          <nav className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button 
              onClick={() => setActiveTab('info')} 
              className={`w-full flex items-center gap-3 p-4 transition-colors ${activeTab === 'info' ? 'bg-red-50 text-red-600 border-l-4 border-red-600' : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'}`}
            >
              <User size={18} /> <span className="font-medium">Hồ sơ cá nhân</span>
            </button>
            <button 
              onClick={() => { setActiveTab('orders'); setCurrentPage(1); }} // Reset về trang 1 khi chuyển tab
              className={`w-full flex items-center gap-3 p-4 transition-colors ${activeTab === 'orders' ? 'bg-red-50 text-red-600 border-l-4 border-red-600' : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'}`}
            >
              <ShoppingBag size={18} /> <span className="font-medium">Đơn hàng đã đặt</span>
            </button>
          </nav>
        </div>

        {/* CONTENT */}
        <div className="md:col-span-3">
          {activeTab === 'info' ? (
            <div className="space-y-6">
              {/* THÔNG TIN CƠ BẢN */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 italic">
                    <CheckCircle className="text-green-500" size={20}/> Thông tin tài khoản
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 font-bold uppercase">Họ và tên</label>
                    <div className="p-3 bg-gray-50 rounded-lg border mt-1 font-medium">{user.name}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-bold uppercase">Email</label>
                    <div className="p-3 bg-gray-50 rounded-lg border mt-1 font-medium italic text-gray-400">{user.email}</div>
                  </div>
                </div>
              </div>

              {/* QUẢN LÝ ĐỊA CHỈ */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold flex items-center gap-2 italic">
                    <MapPin className="text-red-500" size={20}/> Sổ địa chỉ
                  </h3>
                  <button 
                    onClick={() => { setShowAddressForm(true); setEditingId(null); }}
                    className="text-sm bg-red-600 text-white px-4 py-2 rounded-full flex items-center gap-1 hover:bg-red-700 transition"
                  >
                    <Plus size={16}/> Thêm địa chỉ
                  </button>
                </div>

                <div className="space-y-4">
                  {addresses.map((addr) => (
                    <div key={addr._id} className={`p-4 rounded-xl border relative ${addr.isDefault ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}>
                      {addr.isDefault && <span className="absolute top-4 right-4 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-tighter">Mặc định</span>}
                      <p className="font-bold text-gray-800">{addr.receiverName} <span className="font-normal text-gray-400 ml-2">| {addr.phone}</span></p>
                      <p className="text-sm text-gray-600 mt-1">{addr.street}, {addr.ward}, {addr.district}, {addr.city}</p>
                      <div className="mt-3 flex gap-4">
                        <button onClick={() => deleteAddress(addr._id)} className="text-xs text-gray-400 hover:text-red-600 flex items-center gap-1"><Trash2 size={14}/> Xóa</button>
                        <button className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1"><Edit size={14}/> Sửa</button>
                      </div>
                    </div>
                  ))}
                  {addresses.length === 0 && <p className="text-center text-gray-400 py-4 italic">Bạn chưa lưu địa chỉ nào.</p>}
                </div>
              </div>
            </div>
          ) : (
            /* LỊCH SỬ ĐƠN HÀNG */
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2 italic">
                <Package className="text-orange-500" size={20}/> Lịch sử mua hàng
              </h3>
              
              {loading ? (
                <div className="text-center py-10 text-gray-500">Đang tải danh sách đơn hàng...</div>
              ) : (
                <>
                  <div className="space-y-3">
                    {/* ĐÃ SỬA THÀNH currentOrders THAY VÌ orders */}
                    {currentOrders.map((order) => (
                      <div key={order._id} className="border border-gray-100 rounded-xl overflow-hidden">
                        <div 
                          onClick={() => setExpandedOrderId(expandedOrderId === order._id ? null : order._id)}
                          className="p-4 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition"
                        >
                          <div>
                            <p className="font-bold text-sm">Đơn hàng: #{order._id.slice(-6).toUpperCase()}</p>
                            <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString('vi-VN')} - {new Date(order.createdAt).toLocaleTimeString('vi-VN')}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-bold text-red-600 text-sm mb-1">{order.totalPrice?.toLocaleString()}đ</p>
                              {renderStatus(order.status)}
                            </div>
                            {expandedOrderId === order._id ? <ChevronUp size={18} className="text-gray-400"/> : <ChevronDown size={18} className="text-gray-400"/>}
                          </div>
                        </div>

                        {expandedOrderId === order._id && (
                          <div className="p-4 border-t border-gray-100 bg-white space-y-3">
                            {order.products.map((item, idx) => {
                              const productInfo = item.productId || item.product_id || {};
                              
                              return (
                                <div key={idx} className="flex gap-3 items-center">
                                  <img src={productInfo.imageUrl || 'https://via.placeholder.com/50'} className="w-12 h-12 object-cover rounded border" alt="product" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium line-clamp-1">{productInfo.name || 'Sản phẩm không xác định'}</p>
                                    <p className="text-xs text-gray-400">SL: {item.quantity} x {item.priceAtPurchase?.toLocaleString()}đ</p>
                                  </div>
                                </div>
                              )
                            })}
                            
                            {order.shippingAddress && (
                              <div className="pt-3 border-t text-xs text-gray-500">
                                <p>📍 <strong>Giao đến:</strong> {order.shippingAddress.receiverName} - {order.shippingAddress.phone}</p>
                                <p className="mt-1">{order.shippingAddress.street}, {order.shippingAddress.ward}, {order.shippingAddress.district}, {order.shippingAddress.city}</p>
                              </div>
                            )}

                            {(order.status === 'pending' || order.status === 'processing') && (
                              <div className="pt-4 border-t flex justify-end">
                                <button 
                                  onClick={() => handleCancelOrder(order._id)}
                                  className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
                                >
                                  Hủy đơn hàng
                                </button>
                              </div>
                            )}

                          </div>
                        )}
                      </div>
                    ))}
                    {orders.length === 0 && <p className="text-center text-gray-400 py-10 italic">Chưa có đơn hàng nào được đặt.</p>}
                  </div>

                  {/* ===== HIỂN THỊ DÃY NÚT PHÂN TRANG ===== */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-8">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm border rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        Trước
                      </button>
                      
                      {[...Array(totalPages)].map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentPage(index + 1)}
                          className={`w-8 h-8 flex justify-center items-center text-sm rounded-md transition ${
                            currentPage === index + 1 
                              ? 'bg-red-600 text-white font-bold border-red-600' 
                              : 'border hover:bg-gray-100 text-gray-600'
                          }`}
                        >
                          {index + 1}
                        </button>
                      ))}

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm border rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        Sau
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL THÊM ĐỊA CHỈ */}
      {showAddressForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => setShowAddressForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black"><X/></button>
            <h2 className="text-xl font-bold mb-6">Thêm địa chỉ mới</h2>
            <form onSubmit={saveAddress} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input required type="text" placeholder="Người nhận" className="border p-2.5 rounded-lg w-full outline-none focus:border-red-500" 
                  onChange={(e) => setAddressForm({...addressForm, receiverName: e.target.value})} />
                <input required type="text" placeholder="Số điện thoại" className="border p-2.5 rounded-lg w-full outline-none focus:border-red-500"
                  onChange={(e) => setAddressForm({...addressForm, phone: e.target.value})} />
              </div>
              
              <select required className="border p-2.5 rounded-lg w-full outline-none" onChange={handleProvinceChange}>
                <option value="">Chọn Tỉnh/Thành</option>
                {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
              </select>

              <div className="grid grid-cols-2 gap-4">
                <select required className="border p-2.5 rounded-lg w-full outline-none" disabled={!addressForm.provinceCode} onChange={handleDistrictChange}>
                  <option value="">Quận/Huyện</option>
                  {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                </select>
                <select required className="border p-2.5 rounded-lg w-full outline-none" disabled={!addressForm.districtCode} 
                  onChange={(e) => setAddressForm({...addressForm, wardCode: e.target.value, wardName: e.target.options[e.target.selectedIndex].text})}>
                  <option value="">Phường/Xã</option>
                  {wards.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                </select>
              </div>

              <input required type="text" placeholder="Số nhà, tên đường..." className="border p-2.5 rounded-lg w-full outline-none focus:border-red-500"
                onChange={(e) => setAddressForm({...addressForm, street: e.target.value})} />

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={addressForm.isDefault} onChange={(e) => setAddressForm({...addressForm, isDefault: e.target.checked})} />
                <span className="text-sm font-medium">Đặt làm mặc định</span>
              </label>

              <button type="submit" className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition">LƯU ĐỊA CHỈ</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;