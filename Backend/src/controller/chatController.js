import { GoogleGenerativeAI } from "@google/generative-ai";
import Product from "../models/productsModel.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System prompt với nhân cách và kiến thức riêng của DoCaStore
const SYSTEM_PROMPT = `Bạn là "Doca" – trợ lý AI thân thiện và chuyên nghiệp của DoCaStore, một cửa hàng đồ câu trực tuyến hàng đầu Việt Nam chuyên cung cấp cần câu, máy câu, mồi câu, dây câu và phụ kiện đi câu cho các cần thủ.

Nhiệm vụ của bạn:
- Giải đáp thắc mắc về sản phẩm, thông số kỹ thuật (độ cứng, tải cá, gear ratio...), giá cả, khuyến mãi và chính sách của cửa hàng.
- Tư vấn chọn bộ môn câu phù hợp (câu lure, câu đài, câu lục, câu biển, câu lăng xê...).
- Hướng dẫn quy trình đặt hàng, thanh toán, vận chuyển và đổi trả hàng.
- Chia sẻ kinh nghiệm đi câu, cách làm mồi, thắt nút câu và kỹ năng dòng cá một cách nhiệt tình.
- Nếu cần hỗ trợ phức tạp hơn (khiếu nại, đơn hàng cụ thể...), khéo léo đề nghị khách kết nối với nhân viên hỗ trợ thật.

Phong cách:
- Luôn dùng tiếng Việt, thân thiện, vui vẻ, có thể dùng emoji nhẹ nhàng (🎣🐟🚤🌊).
- Câu trả lời ngắn gọn, súc tích, dễ đọc – không quá 150 từ mỗi câu.
- Nếu khách hỏi thứ không liên quan đến cửa hàng đồ câu, cần câu, hay cá, hãy khéo léo từ chối và hướng lại chủ đề.

Thông tin cửa hàng:
- Tên: DoCaStore
- Website: docastore.online
- Giờ làm việc hỗ trợ: 8:00 – 22:00 hàng ngày
- Chính sách: miễn phí vận chuyển cho đơn từ 300.000đ, đổi trả trong 7 ngày nếu lỗi từ nhà sản xuất.`;

export const askBot = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập tin nhắn!" });
    }

    // Fetch top 3 most expensive products dynamically to give the AI real context
    const topExpensive = await Product.find({}).sort({ price: -1 }).limit(3).lean();
    let dynamicContext = "\n\n[Dữ liệu thực tế từ Database hiện tại của Cửa Hàng]\nDanh sách 3 sản phẩm ĐẮT NHẤT hiện tại:\n";
    topExpensive.forEach((p, index) => {
      dynamicContext += `${index + 1}. ${p.name} - Giá: ${p.price.toLocaleString('vi-VN')} VNĐ\n`;
    });

    // Merge system prompt with dynamic context
    const currentInstruction = SYSTEM_PROMPT + dynamicContext;

    // Changed to gemini-2.5-flash-lite to try bypassing the daily limit reached on 2.0-flash
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      systemInstruction: currentInstruction,
    });

    // Xây dựng lịch sử hội thoại từ frontend gửi lên (multi-turn)
    const formattedHistory = history.map((msg) => ({
      role: msg.role === "bot" ? "model" : "user",
      parts: [{ text: msg.text }],
    }));

    // Bắt đầu phiên chat với lịch sử cũ
    const chat = model.startChat({
      history: formattedHistory,
    });

    // Gửi tin nhắn mới nhất của người dùng
    const result = await chat.sendMessage(message.trim());
    const botReply = result.response.text();

    return res.status(200).json({
      success: true,
      reply: botReply,
    });
  } catch (error) {
    console.error("Lỗi gọi Gemini AI:", error);

    // Handle 429 Too Many Requests gracefully
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        message: "Doca đang quá tải do có quá nhiều yêu cầu! Vui lòng chờ khoảng 1 phút rồi thử lại nhé! 🎣",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Doca đang bận xíu, bạn thử lại sau nhé! 🐟",
    });
  }
};