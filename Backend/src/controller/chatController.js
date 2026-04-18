import { GoogleGenerativeAI } from "@google/generative-ai";

// Khởi tạo AI với API Key bạn vừa lưu trong file .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const askBot = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập tin nhắn!" });
    }

    // Chọn model (gemini-1.5-flash là model nhanh, nhẹ và miễn phí rất tốt hiện tại)
   const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    // SYSTEM PROMPT: Tiêm "nhân cách" và "kiến thức nền" cho Bot ở đây
    const systemPrompt = `
      Bạn là một nhân viên chăm sóc khách hàng nhiệt tình, lịch sự của một website bán hàng.
      Nhiệm vụ của bạn là giải đáp ngắn gọn, thân thiện các thắc mắc của khách hàng.
      Nếu khách hỏi những thứ không liên quan đến mua bán, sản phẩm hoặc cửa hàng, hãy khéo léo từ chối trả lời.
      Câu hỏi của khách hàng là: "${message}"
    `;

    // Gọi API của Google để sinh câu trả lời
    const result = await model.generateContent(systemPrompt);
    const botReply = result.response.text();

    // Trả kết quả về cho Frontend
    return res.status(200).json({
      success: true,
      reply: botReply
    });

  } catch (error) {
    console.error("Lỗi gọi AI:", error);
    return res.status(500).json({ success: false, message: "Bot đang đi ngủ, vui lòng thử lại sau!" });
  }
};