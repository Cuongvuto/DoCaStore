import mongoose from 'mongoose';
import Address from '../models/addressModel.js';

// 1. Lấy danh sách địa chỉ của User đang đăng nhập
export const getUserAddresses = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    // Lấy danh sách và sắp xếp sao cho địa chỉ mặc định (isDefault: true) lên đầu
    const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách địa chỉ thành công!',
      data: addresses
    });
  } catch (error) {
    console.error("❌ Lỗi getUserAddresses:", error);
    return res.status(500).json({ success: false, message: 'Lỗi Server!', error: error.message });
  }
};

// 2. Thêm địa chỉ mới
export const addAddress = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { receiverName, phone, street, ward, district, city, isDefault } = req.body;

    // Kiểm tra xem User này đã có địa chỉ nào chưa
    const existingAddressesCount = await Address.countDocuments({ userId });

    // Nếu đây là địa chỉ đầu tiên, tự động ép nó thành Mặc định
    let setAsDefault = isDefault || false;
    if (existingAddressesCount === 0) {
      setAsDefault = true;
    }

    // Nếu người dùng muốn set địa chỉ này làm mặc định, ta phải gỡ mặc định của các địa chỉ cũ
    if (setAsDefault) {
      await Address.updateMany({ userId }, { isDefault: false });
    }

    const newAddress = new Address({
      userId,
      receiverName,
      phone,
      street,
      ward,
      district,
      city,
      isDefault: setAsDefault
    });

    await newAddress.save();

    return res.status(201).json({
      success: true,
      message: 'Thêm địa chỉ mới thành công!',
      data: newAddress
    });
  } catch (error) {
    console.error("❌ Lỗi addAddress:", error);
    return res.status(500).json({ success: false, message: 'Lỗi Server!', error: error.message });
  }
};

// 3. Cập nhật thông tin địa chỉ
export const updateAddress = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID địa chỉ không hợp lệ!' });
    }

    // Nếu update địa chỉ này thành mặc định, gỡ mặc định các địa chỉ khác
    if (updateData.isDefault === true) {
      await Address.updateMany({ userId }, { isDefault: false });
    }

    // Dùng findOneAndUpdate để đảm bảo User chỉ sửa được địa chỉ của chính họ
    const updatedAddress = await Address.findOneAndUpdate(
      { _id: id, userId: userId },
      updateData,
      { new: true } // Trả về data mới sau khi update
    );

    if (!updatedAddress) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy địa chỉ!' });
    }

    return res.status(200).json({
      success: true,
      message: 'Cập nhật địa chỉ thành công!',
      data: updatedAddress
    });
  } catch (error) {
    console.error("❌ Lỗi updateAddress:", error);
    return res.status(500).json({ success: false, message: 'Lỗi Server!', error: error.message });
  }
};

// 4. Xóa địa chỉ
export const deleteAddress = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID địa chỉ không hợp lệ!' });
    }

    const deletedAddress = await Address.findOneAndDelete({ _id: id, userId: userId });

    if (!deletedAddress) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy địa chỉ để xóa!' });
    }

    // Logic phụ: Nếu xóa trúng địa chỉ Mặc định, hãy tự động set địa chỉ cũ nhất còn lại làm mặc định
    if (deletedAddress.isDefault) {
      const remainingAddress = await Address.findOne({ userId }).sort({ createdAt: 1 });
      if (remainingAddress) {
        remainingAddress.isDefault = true;
        await remainingAddress.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Đã xóa địa chỉ!'
    });
  } catch (error) {
    console.error("❌ Lỗi deleteAddress:", error);
    return res.status(500).json({ success: false, message: 'Lỗi Server!', error: error.message });
  }
};