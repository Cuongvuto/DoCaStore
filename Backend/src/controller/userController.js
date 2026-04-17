// controllers/userController.js
import User from '../models/userModel.js';
import bcrypt from 'bcryptjs'; 
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto'; 
import { sendEmail } from '../utils/sendEmail.js';
import { sendVerificationOTP } from '../utils/sendEmail.js';

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email đã tồn tại!' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // TẠO USER VỚI isVerified: false (BẮT BUỘC)
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'customer',
      isVerified: false, 
      verifyOtp: otp,
      otpExpires: Date.now() + 10 * 60 * 1000 
    });

    const savedUser = await newUser.save();
    console.log("✅ Đã lưu User tạm thời. Đang chuẩn bị gửi mail...");

    try {
      // GỌI HÀM GỬI MAIL VÀ ĐỢI NÓ CHẠY XONG
      await sendVerificationOTP(savedUser.email, savedUser.name, otp);
      console.log("🚀 Mail đã gửi thành công tới:", savedUser.email);

      return res.status(201).json({
        success: true,
        message: 'Đăng ký thành công! Vui lòng check mail lấy mã OTP.',
        data: { id: savedUser._id, email: savedUser.email }
      });
    } catch (mailError) {
      // NẾU GỬI MAIL LỖI -> XÓA USER VỪA TẠO ĐỂ KHÔNG BỊ RÁC DB
      console.error("❌ LỖI GỬI MAIL CHI TIẾT:", mailError);
      await User.findByIdAndDelete(savedUser._id);
      return res.status(500).json({ 
        success: false, 
        message: 'Không thể gửi email lúc này: ' + mailError.message 
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi Server', error: error.message });
  }
};
//KIỂM TRA MÃ OTP VÀ KÍCH HOẠT TÀI KHOẢN
// ==========================================
export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // 1. Tìm người dùng theo email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Người dùng không tồn tại!' 
      });
    }

    // 2. Kiểm tra xem tài khoản đã xác thực trước đó chưa
    if (user.isVerified) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tài khoản này đã được xác thực rồi, bạn có thể đăng nhập ngay!' 
      });
    }

    // 3. Kiểm tra mã OTP và thời gian hết hạn
    if (user.verifyOtp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mã OTP không hợp lệ hoặc đã hết hạn!' 
      });
    }

    // 4. Nếu OTP đúng -> Cập nhật trạng thái và xóa OTP cũ đi
    user.isVerified = true;
    user.verifyOtp = undefined;
    user.otpExpires = undefined;
    await user.save();

    console.log(`✅ User ${user.email} đã xác thực thành công.`);

    // 5. Trả về kết quả
    res.status(200).json({ 
      success: true, 
      message: 'Xác thực Email thành công! Tài khoản của bạn đã được kích hoạt.' 
    });

  } catch (error) {
    console.error("❌ Lỗi khi xác thực OTP:", error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server', 
      error: error.message 
    });
  }
};
// 2. Hàm lấy danh sách người dùng (Hàm kiểm tra dữ liệu đã lưu)
export const getAllUsers = async (req, res) => {
  try {
    // Lấy tất cả user từ DB, loại bỏ trường password
    const users = await User.find().select('-password');

    res.status(200).json({
      success: true,
      count: users.length, 
      data: users
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi lấy dữ liệu', 
      error: error.message 
    });
  }
};

// hàm đăng nhập
export const logIn = async(req,res)=>{
  try {
    //ktra xem dien du chua
    const {email, password} = req.body;

    if(!email || !password){
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin !'
      });
    }

    //Tìm user trong Database theo email
    const user = await User.findOne({email});
    //Nếu không tìm thấy user
    if(!user){
      return res.status(400).json({
        success: false,
        message: "Email hoặc mật khẩu không chính xác! "
      });
    }

    //So sánh mật khẩu người dùng nhập với mật khẩu đã băm trong DB
    const isPassWordMatch = await bcrypt.compare(password, user.password);
    if(!isPassWordMatch){
      return res.status(400).json({
        success: false,
        message: "Email hoặc mật khẩu không chính xác"
      });
    }

    //Mật khẩu đúng -> Tạo Thẻ thông hành (JWT)
    const token = jwt.sign(
      {id: user._id, role: user.role},
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }  /// thoi han token
    );

    //Trả về kết quả cho Client
    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      token: token,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error("❌ Lỗi đăng nhập:", error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server', 
      error: error.message 
    });
  }
}

/// hàm xóa người dùng theo id
export const deleteUser = async (req,res) =>{
  try {
    const userId = req.params.id;

    const deletedUser = await User.findByIdAndDelete(userId);

    if(!deletedUser){
      return res.status(404).json(
        {
          success: false,
          message: "Không tìm thấy người dùng này để xóa!"
        }
      );
    }
   console.log("Da xoa nguoi dung: ", deletedUser.email);
   return res.status(200).json({
      success: true,
      message: 'Thao tác thành công!'
    });

  } catch (error) {
    console.error("❌ Lỗi khi xóa dữ liệu:", error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa người dùng',
      error: error.message
    });
  }

}
// Tim nguoi dung bang id
export const getUserById = async (req,res)=>{
  try {
    const userId = req.params.id;

    if(!mongoose.Types.ObjectId.isValid(userId)){
      return res.status(400).json({
        success: false,
        message: "ID khong hop le vui long nhap lai! "
      });
    }

    //Tìm user trong DB và loại bỏ trường password
    const user = await User.findById(userid).select('-password');
    ///Nếu không tìm thấy
    if(!user){
      return res.status(404).json({
        success: false,
        message: "Khong tim thay nguoi dung"
      });
    }
    //Nếu thành công, trả về dữ liệu
    return res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error("❌ Lỗi khi tìm user:", error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi tìm người dùng',
      error: error.message
    });
  }
}

// tim nguoi dung bang ten
export const getUserByName = async (req,res)=>{
  try {
    const keyword = req.query.name;
    //neu admin de trong o tim
    if(!keyword){
      return res.status(400).json({
        success: false,
        message: "Vui long dien ten User"
      });
    }
    
    const users = await User.find({
      name: { $regex: keyword, $options: 'i' } 
    }).select('-password');
    return res.status(200).json({
      success: true,
      count: users.length,
      message: users.length > 0 ? 'Đã tìm thấy người dùng.' : 'Không có ai tên này.',
      data: users
    })

  } catch (error) {
    console.error("❌ Lỗi khi tìm kiếm:", error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi tìm kiếm người dùng',
      error: error.message
    });
  }
}

// QUÊN MẬT KHẨU: KHÁCH HÀNG BÁO QUÊN MẬT KHẨU (GỬI MAIL)
export const forgotPassword = async (req, res) => {
  try {
    // Tìm người dùng theo email khách nhập
    const user = await User.findOne({ email: req.body.email });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "Không tìm thấy người dùng với email này!" 
      });
    }

    // 1. Tạo ra một mã Token ngẫu nhiên (chưa mã hóa) để gửi qua email
    const resetToken = crypto.randomBytes(20).toString('hex');

    // 2. Mã hóa Token lại để lưu vào Database (đảm bảo an toàn nếu DB bị lộ)
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // Hết hạn sau 10 phút

    // Lưu token vào DB, validateBeforeSave: false để bỏ qua kiểm tra các trường bắt buộc khác
    await user.save({ validateBeforeSave: false });

    // 3. Tạo đường link gửi cho khách (Token trong link là mã chưa mã hóa)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    // 4. Nội dung email dạng HTML (Giúp tránh bị lọc là thư rác/lừa đảo)
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #1a73e8; margin: 0;">DoCaStore</h1>
          <p style="color: #5f6368; font-size: 16px;">Yêu cầu đặt lại mật khẩu</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; color: #3c4043;">
          <p>Chào bạn,</p>
          <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
          <p>Để đặt lại mật khẩu mới, vui lòng nhấn vào nút bên dưới:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #1a73e8; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
               Đặt lại mật khẩu
            </a>
          </div>
          
          <p style="font-size: 13px; color: #70757a;">
            Link này sẽ hết hạn trong vòng <strong>10 phút</strong>.
          </p>
        </div>

        <div style="margin-top: 20px; border-top: 1px solid #e4e4e4; pt: 20px; font-size: 12px; color: #70757a; text-align: center;">
          <p>Nếu nút trên không hoạt động, bạn có thể copy link này vào trình duyệt:</p>
          <p style="word-break: break-all; color: #1a73e8;">${resetUrl}</p>
        </div>
      </div>
    `;

    // 5. Bắn mail thực tế
    try {
      await sendEmail({
        email: user.email,
        subject: 'DocaStore - Hướng dẫn đặt lại mật khẩu',
        html: emailHtml, // Sử dụng html thay vì message thô
      });

      console.log(`🚀 Đã gửi email reset password tới: ${user.email}`);
      res.status(200).json({ 
        success: true, 
        message: 'Đã gửi email khôi phục mật khẩu! Vui lòng kiểm tra hộp thư (và cả hòm thư rác).' 
      });

    } catch (error) {
      // Nếu lỗi gửi mail (vd: sai cấu hình SMTP), xóa token trong DB đi để bảo mật
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      console.error("❌ Lỗi gửi mail thực tế:", error);
      return res.status(500).json({ 
        success: false, 
        message: 'Hệ thống không thể gửi email lúc này. Vui lòng thử lại sau!' 
      });
    }

  } catch (error) {
    console.error("❌ Lỗi server tại hàm forgotPassword:", error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server', 
      error: error.message 
    });
  }
};

//  KHÁCH HÀNG NHẬP PASS MỚI
export const resetPassword = async (req, res) => {
  try {
    // 1. Lấy mã Token từ URL và băm ra để so sánh với DB
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    // 2. Tìm user có mã này và mã chưa hết hạn
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() } // $gt: greater than (còn hạn)
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Mã xác thực không hợp lệ hoặc đã hết hạn!' });
    }

    // 3. Đổi mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);

    // 4. Xóa mã token cũ đi (để không dùng lại được nữa)
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ success: true, message: 'Đổi mật khẩu thành công! Bạn có thể đăng nhập ngay.' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

