import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import axiosClient from "../api/axiosClient";
import { toast } from "sonner";
import { useCart } from "../context/CartContext";
import { useNotification } from "../context/NotificationContext";

const Checkout = () => {
  const navigate = useNavigate();
  const { updateCartCount } = useCart();
  const { fetchUnreadCount } = useNotification();

  // 1. STATE DỮ LIỆU GIỎ HÀNG
  const [cartData, setCartData] = useState({
    items: [],
    subTotal: 0,
    discountAmount: 0,
    finalPrice: 0,
    discountMessages: [],
  });
  const [loading, setLoading] = useState(true);

  // 2. STATE QUẢN LÝ ĐỊA CHỈ
  const [userAddresses, setUserAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  const [formData, setFormData] = useState({
    receiverName: "",
    phone: "",
    street: "",
    note: "",
    provinceCode: "",
    provinceName: "",
    districtCode: "",
    districtName: "",
    wardCode: "",
    wardName: "",
  });
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [errors, setErrors] = useState({});

  // 3. STATE THANH TOÁN & COUPON
  const [paymentType, setPaymentType] = useState("COD");
  const [qrMethod, setQrMethod] = useState("VietQR");

  const [couponCode, setCouponCode] = useState("");
  const [discountInfo, setDiscountInfo] = useState({
    amount: 0,
    message: "",
    isApplied: false,
  });

  // --- BƯỚC 1: LẤY GIỎ HÀNG & SỔ ĐỊA CHỈ ---
  useEffect(() => {
    const initData = async () => {
      try {
        const cartRes = await axiosClient.get("/cart");
        if (cartRes.data?.data) setCartData(cartRes.data.data);

        const addressRes = await axiosClient.get("/address");
        const addresses = addressRes.data?.data || [];
        setUserAddresses(addresses);

        if (addresses.length > 0) {
          const defaultAddress =
            addresses.find((addr) => addr.isDefault) || addresses[0];
          setSelectedAddress(defaultAddress);
          setShowAddressForm(false);
        } else {
          setShowAddressForm(true);
        }
      } catch (error) {
        console.error("Lỗi lấy dữ liệu:", error);
      } finally {
        loading && setLoading(false);
      }
    };
    initData();
  }, []);

  // --- BƯỚC 2: API TỈNH THÀNH ---
  useEffect(() => {
    axios
      .get("https://provinces.open-api.vn/api/p/")
      .then((res) => setProvinces(res.data));
  }, []);

  const handleProvinceChange = (e) => {
    const code = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setFormData({
      ...formData,
      provinceCode: code,
      provinceName: name,
      districtCode: "",
      districtName: "",
      wardCode: "",
      wardName: "",
    });
    if (code)
      axios
        .get(`https://provinces.open-api.vn/api/p/${code}?depth=2`)
        .then((res) => setDistricts(res.data.districts));
  };

  const handleDistrictChange = (e) => {
    const code = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setFormData({
      ...formData,
      districtCode: code,
      districtName: name,
      wardCode: "",
      wardName: "",
    });
    if (code)
      axios
        .get(`https://provinces.open-api.vn/api/d/${code}?depth=2`)
        .then((res) => setWards(res.data.wards));
  };

  // --- BƯỚC 3: XỬ LÝ MÃ GIẢM GIÁ (ĐÃ CHUẨN HOÁ) ---
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return toast.warning("Vui lòng nhập mã giảm giá!");

    try {
      const res = await axiosClient.post("/orders/preview", { couponCode });
      const { finalPrice, totalDiscount, messages } = res.data.data;

      // Áp dụng thành công -> Cập nhật lại giá
      setCartData((prev) => ({
        ...prev,
        finalPrice: finalPrice,
        discountAmount: totalDiscount,
        discountMessages: messages,
      }));

      setDiscountInfo({
        amount: totalDiscount,
        message: "Đã áp dụng mã thành công",
        isApplied: true,
      });
      toast.success("Áp dụng mã thành công!");
    } catch (error) {
      // THẤT BẠI (Mã sai, hết hạn, hoặc user đã dùng) -> Reset lại UI và báo lỗi
      setDiscountInfo({ amount: 0, message: "", isApplied: false });

      setCartData((prev) => ({
        ...prev,
        finalPrice: prev.subTotal, // Trả lại giá bằng đúng tiền tạm tính
        discountAmount: 0, // Xoá tiền giảm
        discountMessages: [], // Xoá tin nhắn giảm giá
      }));

      toast.error(
        error.response?.data?.message || "Mã không hợp lệ hoặc đã hết hạn!",
      );
    }
  };

  // --- BƯỚC 4: VALIDATE & ĐẶT HÀNG ---
  const validateForm = () => {
    let newErrors = {};
    if (!formData.receiverName.trim())
      newErrors.receiverName = "Nhập tên người nhận";
    if (!formData.phone.trim()) newErrors.phone = "Nhập số điện thoại";
    if (!formData.provinceCode) newErrors.provinceCode = "Chọn Tỉnh/Thành";
    if (!formData.districtCode) newErrors.districtCode = "Chọn Quận/Huyện";
    if (!formData.wardCode) newErrors.wardCode = "Chọn Phường/Xã";
    if (!formData.street.trim()) newErrors.street = "Nhập địa chỉ nhà";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePlaceOrder = async () => {
    let shippingAddressToUse = null;

    if (!showAddressForm && selectedAddress) {
      shippingAddressToUse = {
        receiverName: selectedAddress.receiverName,
        phone: selectedAddress.phone,
        street: selectedAddress.street,
        ward: selectedAddress.ward,
        district: selectedAddress.district,
        city: selectedAddress.city,
      };
    } else {
      if (!validateForm()) {
        toast.error("Vui lòng điền đầy đủ thông tin giao hàng!");
        return;
      }
      shippingAddressToUse = {
        receiverName: formData.receiverName,
        phone: formData.phone,
        street: formData.street,
        ward: formData.wardName,
        district: formData.districtName,
        city: formData.provinceName,
      };
    }

    const orderPayload = {
      shippingAddress: shippingAddressToUse,
      note: formData.note,
      paymentMethod: paymentType === "COD" ? "COD" : qrMethod,
      couponCode: discountInfo.isApplied ? couponCode : null,
    };

    try {
      const res = await axiosClient.post("/orders", orderPayload);
      const orderId = res.data?.data?._id || res.data?.data?.id;
      const checkoutUrl = res.data?.payosCheckoutUrl;
      const qrCodeString = res.data?.qrCode;

      toast.success("🎉 Đặt hàng thành công!");

      updateCartCount();
      fetchUnreadCount();

      if (paymentType === "QR" && qrMethod === "VietQR") {
        toast.info("Đang tạo mã QR thanh toán...");
        navigate(`/payment/${orderId}`, {
          state: { qrCode: qrCodeString, amount: cartData.finalPrice },
        });
        return;
      } else if (paymentType === "QR" && checkoutUrl) {
        toast.info("Đang chuyển hướng đến trang thanh toán...");
        setTimeout(() => {
          window.location.href = checkoutUrl;
        }, 1500);
        return;
      }

      navigate(`/order-success/${orderId}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "❌ Lỗi khi đặt hàng!");
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center font-semibold text-gray-600">
        Đang tải dữ liệu...
      </div>
    );

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-6xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CỘT TRÁI: ĐỊA CHỈ + THANH TOÁN */}
        <div className="lg:col-span-2 space-y-6">
          {/* BOX 1: THÔNG TIN GIAO HÀNG */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold flex items-center gap-2 uppercase">
                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                  1
                </span>
                Thông tin giao hàng
              </h2>
            </div>

            {!showAddressForm && selectedAddress ? (
              <div className="border border-blue-200 bg-blue-50/30 p-4 rounded-lg relative">
                <div className="flex items-center gap-4 mb-2">
                  <span className="font-bold text-gray-800 text-lg">
                    {selectedAddress.receiverName}
                  </span>
                  <span className="text-gray-500">|</span>
                  <span className="font-bold text-gray-800">
                    {selectedAddress.phone}
                  </span>
                  {selectedAddress.isDefault && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200">
                      Mặc định
                    </span>
                  )}
                </div>
                <p className="text-gray-600 leading-relaxed">
                  {selectedAddress.street}, {selectedAddress.ward},{" "}
                  {selectedAddress.district}, {selectedAddress.city}
                </p>
                <button
                  onClick={() => setShowAddressForm(true)}
                  className="mt-4 text-blue-600 text-sm font-semibold hover:underline"
                >
                  + Nhập địa chỉ giao hàng khác
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                {userAddresses.length > 0 && (
                  <button
                    onClick={() => setShowAddressForm(false)}
                    className="text-blue-600 text-sm font-semibold mb-2 hover:underline"
                  >
                    ← Quay lại dùng địa chỉ đã lưu
                  </button>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Họ tên người nhận"
                      value={formData.receiverName}
                      className={`w-full border p-2.5 rounded-md outline-none ${errors.receiverName ? "border-red-500" : "focus:border-blue-500"}`}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          receiverName: e.target.value,
                        })
                      }
                    />
                    {errors.receiverName && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.receiverName}
                      </p>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Số điện thoại"
                      value={formData.phone}
                      className={`w-full border p-2.5 rounded-md outline-none ${errors.phone ? "border-red-500" : "focus:border-blue-500"}`}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <select
                      value={formData.provinceCode}
                      onChange={handleProvinceChange}
                      className={`w-full border p-2.5 rounded-md outline-none ${errors.provinceCode ? "border-red-500" : ""}`}
                    >
                      <option value="">Tỉnh/Thành</option>
                      {provinces.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    {errors.provinceCode && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.provinceCode}
                      </p>
                    )}
                  </div>
                  <div>
                    <select
                      value={formData.districtCode}
                      onChange={handleDistrictChange}
                      disabled={!formData.provinceCode}
                      className={`w-full border p-2.5 rounded-md outline-none ${errors.districtCode ? "border-red-500" : ""}`}
                    >
                      <option value="">Quận/Huyện</option>
                      {districts.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    {errors.districtCode && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.districtCode}
                      </p>
                    )}
                  </div>
                  <div>
                    <select
                      value={formData.wardCode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          wardCode: e.target.value,
                          wardName:
                            e.target.options[e.target.selectedIndex].text,
                        })
                      }
                      disabled={!formData.districtCode}
                      className={`w-full border p-2.5 rounded-md outline-none ${errors.wardCode ? "border-red-500" : ""}`}
                    >
                      <option value="">Phường/Xã</option>
                      {wards.map((w) => (
                        <option key={w.code} value={w.code}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                    {errors.wardCode && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.wardCode}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Số nhà, tên đường..."
                    value={formData.street}
                    className={`w-full border p-2.5 rounded-md outline-none ${errors.street ? "border-red-500" : "focus:border-blue-500"}`}
                    onChange={(e) =>
                      setFormData({ ...formData, street: e.target.value })
                    }
                  />
                  {errors.street && (
                    <p className="text-red-500 text-xs mt-1">{errors.street}</p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4">
              <textarea
                rows="2"
                placeholder="Ghi chú đơn hàng (Tùy chọn)"
                value={formData.note}
                className="w-full border border-gray-300 rounded-md p-2.5 focus:border-blue-500 outline-none"
                onChange={(e) =>
                  setFormData({ ...formData, note: e.target.value })
                }
              ></textarea>
            </div>
          </div>

          {/* BOX 2: HÌNH THỨC THANH TOÁN */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2 uppercase">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                2
              </span>
              Phương thức thanh toán
            </h2>
            <div className="flex gap-4">
              <button
                onClick={() => setPaymentType("COD")}
                className={`flex-1 p-4 border rounded-lg flex flex-col items-center justify-center gap-2 transition-all ${paymentType === "COD" ? "border-blue-600 bg-blue-50 shadow-sm" : "hover:border-gray-400"}`}
              >
                <span className="text-2xl">🚚</span>
                <span className="font-semibold text-gray-700">
                  Thanh toán khi nhận hàng
                </span>
              </button>
              <button
                onClick={() => setPaymentType("QR")}
                className={`flex-1 p-4 border rounded-lg flex flex-col items-center justify-center gap-2 transition-all ${paymentType === "QR" ? "border-blue-600 bg-blue-50 shadow-sm" : "hover:border-gray-400"}`}
              >
                <span className="text-2xl">📱</span>
                <span className="font-semibold text-gray-700">
                  Chuyển khoản / QR Pay
                </span>
              </button>
            </div>

            {paymentType === "QR" && (
              <div className="mt-4 p-5 bg-gray-50 border border-gray-200 rounded-xl transition-all duration-300">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Chọn ứng dụng thanh toán:
                </label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div
                    onClick={() => setQrMethod("VietQR")}
                    className={`relative cursor-pointer rounded-xl border-2 p-3 flex flex-col items-center justify-center gap-2 transition-all ${qrMethod === "VietQR" ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300"}`}
                  >
                    {qrMethod === "VietQR" && (
                      <div className="absolute top-2 right-2 text-blue-600">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                    <img
                      src="https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-VietQR.png"
                      alt="VietQR"
                      className="h-8 object-contain"
                    />
                    <span className="text-xs font-semibold text-gray-700 text-center">
                      Chuyển khoản NH
                    </span>
                  </div>

                  <div
                    onClick={() => setQrMethod("Momo")}
                    className={`relative cursor-pointer rounded-xl border-2 p-3 flex flex-col items-center justify-center gap-2 transition-all ${qrMethod === "Momo" ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300"}`}
                  >
                    {qrMethod === "Momo" && (
                      <div className="absolute top-2 right-2 text-blue-600">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                    <img
                      src="https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png"
                      alt="MoMo"
                      className="h-8 object-contain"
                    />
                    <span className="text-xs font-semibold text-gray-700 text-center">
                      Ví MoMo
                    </span>
                  </div>

                  <div
                    onClick={() => setQrMethod("VNPay")}
                    className={`relative cursor-pointer rounded-xl border-2 p-3 flex flex-col items-center justify-center gap-2 transition-all ${qrMethod === "VNPay" ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300"}`}
                  >
                    {qrMethod === "VNPay" && (
                      <div className="absolute top-2 right-2 text-blue-600">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                    <img
                      src="https://vnpay.vn/s1/statics.vnpay.vn/2023/9/06ncktiwd6dc1694418196384.png"
                      alt="VNPay"
                      className="h-8 object-contain"
                    />
                    <span className="text-xs font-semibold text-gray-700 text-center">
                      VNPAY-QR
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-xs text-gray-500 italic flex items-center gap-1.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Mã QR thanh toán sẽ được tạo tự động ngay sau khi bạn bấm đặt
                  hàng.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI: TÓM TẮT ĐƠN HÀNG */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-6">
            <h2 className="text-lg font-bold text-gray-800 mb-6 uppercase border-b pb-4">
              Đơn hàng của bạn
            </h2>

            {cartData.items.length === 0 ? (
              <p className="text-gray-500 text-center my-10">Giỏ hàng trống.</p>
            ) : (
              <div className="space-y-4 mb-4 border-b pb-6 max-h-[300px] overflow-y-auto pr-2">
                {cartData.items.map((item) => (
                  <div
                    key={item._id || item.product_id?._id}
                    className="flex justify-between items-start gap-2"
                  >
                    <div className="flex gap-3">
                      <img
                        src={
                          item.product_id?.imageUrl ||
                          "https://dummyimage.com/60x60"
                        }
                        alt="Product"
                        className="w-14 h-14 object-cover rounded-md border"
                      />
                      <div>
                        <p className="font-medium text-gray-800 text-sm line-clamp-2 leading-tight">
                          {item.product_id?.name || "Sản phẩm"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          SL: {item.quantity}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-800 text-sm whitespace-nowrap">
                      {item.product_id?.price
                        ? (
                            item.product_id.price * item.quantity
                          ).toLocaleString()
                        : 0}
                      đ
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* BOX NHẬP MÃ GIẢM GIÁ */}
            <div className="py-4 border-b mb-4">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Mã giảm giá
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập mã ưu đãi..."
                  className="flex-1 border border-gray-300 p-2.5 rounded-md uppercase outline-none focus:border-blue-500 transition text-sm"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                />
                <button
                  onClick={handleApplyCoupon}
                  className="bg-gray-800 text-white px-4 py-2.5 rounded-md text-sm font-semibold hover:bg-black transition whitespace-nowrap"
                >
                  Áp dụng
                </button>
              </div>
              {discountInfo.isApplied && (
                <p className="text-green-600 text-sm mt-2 font-medium flex items-center gap-1">
                  ✅ {discountInfo.message}
                </p>
              )}
            </div>

            {/* TỔNG TIỀN */}
            <div className="space-y-3 mb-6 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính</span>
                <span className="font-medium">
                  {cartData.subTotal ? cartData.subTotal.toLocaleString() : 0}đ
                </span>
              </div>

              {cartData.discountAmount > 0 && (
                <div className="flex flex-col gap-1 text-green-600">
                  <div className="flex justify-between font-medium">
                    <span>Tổng Khuyến mãi</span>
                    <span>-{cartData.discountAmount.toLocaleString()}đ</span>
                  </div>
                  {cartData.discountMessages?.map((msg, idx) => (
                    <span key={idx} className="text-xs italic pl-2">
                      🎁 {msg}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex justify-between text-gray-600">
                <span>Phí vận chuyển</span>
                <span>Chưa tính</span>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-gray-800 font-bold">Tổng thanh toán</span>
                <span className="text-red-600 text-2xl font-bold">
                  {cartData.finalPrice
                    ? cartData.finalPrice.toLocaleString()
                    : 0}
                  đ
                </span>
              </div>
              <p className="text-right text-xs text-gray-400 mt-1">
                (Đã bao gồm VAT nếu có)
              </p>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={cartData.items.length === 0}
              className={`w-full font-bold py-4 rounded-lg transition-colors text-lg uppercase tracking-wide ${cartData.items.length === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30"}`}
            >
              Xác nhận đặt hàng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
