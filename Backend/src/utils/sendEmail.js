import nodemailer from 'nodemailer';

export const sendEmail = async (options) => {
  // Ép kiểu các biến môi trường để chắc chắn không bị sai định dạng
  const smtpHost = process.env.SMTP_HOST || 'smtp.resend.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465');
  const smtpUser = process.env.SMTP_USER || 'resend';
  const smtpPass = process.env.SMTP_PASS;
  console.log("--- DEBUG MAIL ---");
  console.log("FROM_NAME:", process.env.FROM_NAME);
  console.log("FROM_EMAIL:", process.env.FROM_EMAIL);
  console.log("------------------");


  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465 || smtpPort === 2465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: false // Giúp chạy được trên localhost
    }
  });

  const message = {
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  // Trả về kết quả gửi mail để Backend biết là thành công hay thất bại
  return await transporter.sendMail(message);
};

export const sendVerificationOTP = async (email, name, otp) => {
  return await sendEmail({
    email: email,
    subject: 'Mã xác thực tài khoản (OTP) - DoCaStore',
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
        <h2>Chào ${name},</h2>
        <p>Mã OTP của bạn là: <b style="font-size: 24px; color: #f43f5e;">${otp}</b></p>
        <p>Mã có hiệu lực trong 10 phút.</p>
      </div>
    `,
  });
};