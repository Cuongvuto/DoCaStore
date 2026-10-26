// controllers/userController.js
import User from '../models/userModel.js';
import bcrypt from 'bcryptjs'; 
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { pagination, queryText, escapeRegex, enumFilter } from '../utils/adminQuery.js';
import crypto from 'crypto'; 
import { sendEmail } from '../utils/sendEmail.js';
import { sendVerificationOTP } from '../utils/sendEmail.js';
import { ALL_ROLES, canGrantRole, canManageAccount } from '../config/roles.js';
import socketUtil from '../utils/socket.js';

export const createUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (typeof name !== 'string' || !name.trim() || !normalizedEmail || typeof password !== 'string' || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin!' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 8 ký tự.' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).json({ success: false, message: 'Email đã tồn tại!' });
      }

      // Cập nhật thông tin cho tài khoản chưa xác thực và gửi lại OTP
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const otp = crypto.randomInt(100000, 1000000).toString();
      // Google/OTP verification may win while bcrypt is running. Never replace
      // credentials on an account that has become verified in the meantime.
      const savedUser = await User.findOneAndUpdate(
        { _id: existingUser._id, isVerified: false },
        { $set: { name: name.trim(), password: hashedPassword, role: 'customer', verifyOtp: otp, otpExpires: new Date(Date.now() + 10 * 60 * 1000) } },
        { new: true, runValidators: true }
      );
      if (!savedUser) return res.status(409).json({ success: false, message: 'Tài khoản đã được xác thực. Vui lòng đăng nhập.' });
      console.log("✅ Đã cập nhật User chưa xác thực. Đang chuẩn bị gửi mail...");

      try {
        await sendVerificationOTP(savedUser.email, savedUser.name, otp);
        console.log("🚀 Mail đã gửi thành công tới:", savedUser.email);

        return res.status(200).json({
          success: true,
          message: 'Đăng ký thành công! Vui lòng check mail lấy mã OTP mới.',
          data: { id: savedUser._id, email: savedUser.email }
        });
      } catch (mailError) {
        console.error("❌ LỖI GỬI MAIL CHI TIẾT:", mailError);
        return res.status(500).json({ 
          success: false, 
          message: 'Không thể gửi email lúc này: ' + mailError.message 
        });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const otp = crypto.randomInt(100000, 1000000).toString();

    // TẠO USER VỚI isVerified: false (BẮT BUỘC)
    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: 'customer',
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
      await User.deleteOne({ _id: savedUser._id, isVerified: false, verifyOtp: otp });
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
    if (typeof email !== 'string' || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: 'Email hoặc mã OTP không hợp lệ.' });
    }

    // 1. Tìm người dùng theo email
    const user = await User.findOne({ email: email.trim().toLowerCase() });
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
    const verified = await User.findOneAndUpdate(
      { _id: user._id, isVerified: false, verifyOtp: otp, otpExpires: { $gt: new Date() } },
      { $set: { isVerified: true }, $unset: { verifyOtp: 1, otpExpires: 1 } },
      { new: true }
    );
    if (!verified) return res.status(409).json({ success: false, message: 'Mã xác thực đã thay đổi hoặc hết hạn. Vui lòng thử lại.' });

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

// GỬI LẠI MÃ OTP XÁC THỰC
// ==========================================
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email!' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại!' });
    }

    if (user.isVerified) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tài khoản này đã được xác thực trước đó!' 
      });
    }

    // Tạo mã OTP mới
    const otp = crypto.randomInt(100000, 1000000).toString();
    const pendingUser = await User.findOneAndUpdate(
      { _id: user._id, isVerified: false },
      { $set: { verifyOtp: otp, otpExpires: new Date(Date.now() + 10 * 60 * 1000) } },
      { new: true }
    );
    if (!pendingUser) return res.status(409).json({ success: false, message: 'Tài khoản đã được xác thực. Vui lòng đăng nhập.' });

    await sendVerificationOTP(user.email, user.name, otp);

    return res.status(200).json({
      success: true,
      message: 'Mã OTP mới đã được gửi đến email của bạn.'
    });
  } catch (error) {
    console.error("❌ Lỗi gửi lại OTP:", error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};
// 2. Hàm lấy danh sách người dùng (Hàm kiểm tra dữ liệu đã lưu)
export const getAllUsers = async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const search = queryText(req.query.search);
    const role = enumFilter(req.query.role, ALL_ROLES);
    const verified = enumFilter(req.query.verified, ['true', 'false']);
    const filter = {};
    if (search) filter.$or = ['name', 'email'].map(field => ({ [field]: { $regex: escapeRegex(search), $options: 'i' } }));
    if (role) filter.role = role;
    if (verified) filter.isVerified = verified === 'true';
    const [users, totalCount] = await Promise.all([
      User.find(filter).select('name email role isVerified tier totalSpent totalOrders createdAt').sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter)
    ]);
    return res.json({ success: true, data: users, count: users.length, totalCount, currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / limit)) });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Không thể tải danh sách người dùng.' });
  }
};

//Lay thông tin cá nhân
export const getMe = async (req, res) => {
  try {
    // req.user.id này có được sau khi đi qua middleware verifyToken
    const user = await User.findById(req.user.id).select('-password -verifyOtp -otpExpires -resetPasswordToken -resetPasswordExpire');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng"
      });
    }

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy thông tin cá nhân:", error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// hàm đăng nhập
export const logIn = async(req,res)=>{
  try {
    //ktra xem dien du chua
    const {email, password} = req.body;

    if(typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password){
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin !'
      });
    }

    //Tìm user trong Database theo email
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    //Nếu không tìm thấy user
    if(!user){
      return res.status(400).json({
        success: false,
        message: "Email hoặc mật khẩu không chính xác! "
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản chưa xác thực email. Vui lòng nhập mã OTP để tiếp tục.'
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
      {id: user._id, role: user.role, tokenVersion: user.tokenVersion ?? 0},
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
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
    const targetUser = await User.findById(userId);

    if(!targetUser){
      return res.status(404).json(
        {
          success: false,
          message: "Không tìm thấy người dùng này để xóa!"
        }
      );
    }

    if (targetUser._id.toString() === req.user.id) {
      return res.status(400).json({ success: false, message: 'Bạn không thể tự xóa tài khoản đang đăng nhập.' });
    }

    if (!canManageAccount(req.user.role, targetUser.role)) {
      return res.status(403).json({ success: false, message: 'Chỉ Super Admin mới có thể xóa Super Admin.' });
    }

    await targetUser.deleteOne();
    socketUtil.revokeUser(userId);

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
    const user = await User.findById(userId).select('-password -verifyOtp -otpExpires -resetPasswordToken -resetPasswordExpire');
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
    }).select('-password -verifyOtp -otpExpires -resetPasswordToken -resetPasswordExpire');
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
    if (typeof req.body.email !== 'string' || !req.body.email.trim()) return res.status(400).json({ success: false, message: 'Email không hợp lệ.' });
    // Tìm người dùng theo email khách nhập
    const user = await User.findOne({ email: req.body.email.trim().toLowerCase(), isVerified: true });
    
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
      await User.updateOne(
        { _id: user._id, resetPasswordToken: crypto.createHash('sha256').update(resetToken).digest('hex') },
        { $unset: { resetPasswordToken: 1, resetPasswordExpire: 1 } }
      );

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
    if (typeof req.params.token !== 'string' || !/^[a-f\d]{40}$/i.test(req.params.token) || typeof req.body.password !== 'string' || req.body.password.length < 8) {
      return res.status(400).json({ success: false, message: 'Mã đặt lại không hợp lệ hoặc mật khẩu chưa đủ 8 ký tự.' });
    }
    // 1. Lấy mã Token từ URL và băm ra để so sánh với DB
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    // 2. Tìm user có mã này và mã chưa hết hạn
    const user = await User.findOne({
      isVerified: true,
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() } // $gt: greater than (còn hạn)
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Mã xác thực không hợp lệ hoặc đã hết hạn!' });
    }

    // 3. Đổi mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash(req.body.password, salt);
    // Consume exactly this still-valid token in the same write as the password.
    const updated = await User.findOneAndUpdate(
      { _id: user._id, isVerified: true, resetPasswordToken, resetPasswordExpire: { $gt: new Date() } },
      { $set: { password }, $inc: { tokenVersion: 1 }, $unset: { resetPasswordToken: 1, resetPasswordExpire: 1 } },
      { new: true }
    );
    if (!updated) return res.status(409).json({ success: false, message: 'Mã đặt lại đã được sử dụng, thay đổi hoặc hết hạn.' });
    socketUtil.revokeUser(user._id);

    res.status(200).json({ success: true, message: 'Đổi mật khẩu thành công! Bạn có thể đăng nhập ngay.' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// Change only the authenticated account; never accept a target user ID from the body.
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || !currentPassword || currentPassword.length > 1024
      || typeof newPassword !== 'string' || newPassword.length < 8 || typeof confirmPassword !== 'string') {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu hiện tại, mật khẩu mới từ 8 ký tự và xác nhận mật khẩu.' });
    }
    if (Buffer.byteLength(newPassword, 'utf8') > 72) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới quá dài. Vui lòng rút ngắn mật khẩu.' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Xác nhận mật khẩu mới chưa khớp.' });
    }
    const user = await User.findById(req.user.id);
    if (!user?.isVerified || (user.tokenVersion ?? 0) !== req.user.tokenVersion) {
      return res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.' });
    }
    if (!await bcrypt.compare(currentPassword, user.password)) {
      return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không chính xác.' });
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải khác mật khẩu hiện tại.' });
    }
    const password = await bcrypt.hash(newPassword, 10);
    const updated = await User.findOneAndUpdate({
      _id: user._id, isVerified: true, password: user.password,
      $expr: { $eq: [{ $ifNull: ['$tokenVersion', 0] }, req.user.tokenVersion] },
    }, {
      $set: { password }, $inc: { tokenVersion: 1 },
      $unset: { resetPasswordToken: 1, resetPasswordExpire: 1 },
    }, { returnDocument: 'after' });
    if (!updated) return res.status(409).json({ success: false, message: 'Thông tin bảo mật vừa thay đổi. Vui lòng đăng nhập lại trước khi thử tiếp.' });
    socketUtil.revokeUser(user._id);
    return res.json({ success: true, message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.' });
  } catch {
    return res.status(500).json({ success: false, message: 'Chưa thể đổi mật khẩu. Vui lòng thử lại sau.' });
  }
};

// Thay đổi quyền người dùng (chỉ admin hoặc superadmin)
export const changeUserRole = async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    // Kiểm tra quyền của người gửi request
    const currentUserRole = req.user.role;
    if (currentUserRole !== 'admin' && currentUserRole !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thay đổi vai trò người dùng!'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "ID không hợp lệ!"
      });
    }

    if (!ALL_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Vai trò không hợp lệ!"
      });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng!" });
    }

    if (
      !canGrantRole(currentUserRole, role)
      || !canManageAccount(currentUserRole, targetUser.role)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ Super Admin mới có thể cấp hoặc thay đổi quyền Super Admin.'
      });
    }

    if (targetUser._id.toString() === req.user.id && role !== targetUser.role) {
      return res.status(400).json({
        success: false,
        message: 'Bạn không thể tự thay đổi vai trò của chính mình.'
      });
    }

    let savedUser = targetUser;
    if (targetUser.role !== role) {
      savedUser = await User.findOneAndUpdate(
        { _id: userId, role: targetUser.role },
        { $set: { role }, $inc: { tokenVersion: 1 } },
        { returnDocument: 'after', runValidators: true }
      );
      if (!savedUser) return res.status(409).json({ success: false, message: 'Quyền tài khoản vừa thay đổi. Vui lòng tải lại danh sách.' });
      socketUtil.revokeUser(userId);
    }
    const updatedUser = savedUser.toObject();
    for (const field of ['password', 'verifyOtp', 'otpExpires', 'resetPasswordToken', 'resetPasswordExpire', 'tokenVersion']) delete updatedUser[field];

    return res.status(200).json({
      success: true,
      message: 'Cập nhật vai trò thành công!',
      data: updatedUser
    });

  } catch (error) {
    console.error("❌ Lỗi khi đổi role người dùng:", error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi đổi vai trò',
      error: error.message
    });
  }
};

export const createStaffUser = async (req, res) => {
  try {
    const { name, email, password, role = 'customer' } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    if (!name?.trim() || !normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 8 ký tự.' });
    }
    if (!canGrantRole(req.user.role, role)) {
      return res.status(403).json({ success: false, message: 'Bạn không được phép cấp vai trò này.' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email đã tồn tại.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: passwordHash,
      role,
      isVerified: true
    });

    const result = user.toObject();
    delete result.password;
    return res.status(201).json({
      success: true,
      message: 'Tạo tài khoản thành công.',
      data: result
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Không thể tạo tài khoản lúc này.' });
  }
};

// ĐĂNG NHẬP BẰNG GOOGLE
// ==========================================
export const googleLogin = async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (typeof accessToken !== 'string' || !accessToken.trim() || accessToken.length > 4096) {
      return res.status(400).json({ success: false, message: 'Thiếu accessToken Google!' });
    }

    // Gọi API của Google để lấy thông tin user
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      return res.status(400).json({ success: false, message: 'Google AccessToken không hợp lệ!' });
    }

    const googleUser = await response.json();
    const { email, email_verified: emailVerified, name } = googleUser;

    if (typeof email !== 'string' || !email.trim() || emailVerified !== true) {
      return res.status(400).json({ success: false, message: 'Không thể lấy email từ tài khoản Google này!' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Tìm user theo email
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      // Nếu user chưa tồn tại, tạo mới tài khoản
      const salt = await bcrypt.genSalt(10);
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, salt);

      user = new User({
        name: name || 'Google User',
        email: normalizedEmail,
        password: hashedPassword,
        isVerified: true, // Tài khoản Google mặc định là đã xác thực
        role: 'customer'
      });

      await user.save();
      console.log(`✅ Đã tạo tài khoản mới bằng Google cho: ${normalizedEmail}`);
    } else {
      // A pre-registered email can contain a password chosen by someone else.
      // Verified Google ownership must invalidate every pending credential.
      if (!user.isVerified) {
        const password = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
        const verified = await User.findOneAndUpdate(
          { _id: user._id, isVerified: false },
          {
            $set: { isVerified: true, password, role: 'customer', name: name || 'Google User' },
            $unset: { verifyOtp: 1, otpExpires: 1, resetPasswordToken: 1, resetPasswordExpire: 1 }
          },
          { new: true, runValidators: true }
        );
        // Do not undo credentials if another verification finished first.
        user = verified || await User.findById(user._id);
        if (!user?.isVerified) return res.status(409).json({ success: false, message: 'Tài khoản vừa thay đổi. Vui lòng đăng nhập lại.' });
        console.log(`✅ Đã xác thực tài khoản qua Google cho: ${normalizedEmail}`);
      }
    }

    // Tạo JWT Token
    const token = jwt.sign(
      { id: user._id, role: user.role, tokenVersion: user.tokenVersion ?? 0 },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("❌ Lỗi đăng nhập Google:", error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

