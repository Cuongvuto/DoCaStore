import Message from '../models/messageModel.js';
import Conversation from '../models/conversationModel.js';
import User from '../models/userModel.js';

// 1. DÀNH CHO ADMIN: Lấy danh sách tất cả các Phiên hỗ trợ (Tickets)
export const getConversations = async (req, res) => {
    try {
        // Lấy tất cả các phiên, kèm thông tin user và admin
        const conversations = await Conversation.find()
            .populate('customerId', 'name email avatar')
            .populate('assignedAdminId', 'name')
            .sort({ updatedAt: -1 }); // Nổi ticket mới cập nhật lên đầu

        // Lấy thêm "Tin nhắn cuối cùng" và "Số tin chưa đọc" cho mỗi Ticket (Giống ý tưởng cũ của bạn)
        const formattedConversations = await Promise.all(conversations.map(async (conv) => {
            const lastMessage = await Message.findOne({ conversationId: conv._id })
                .sort({ createdAt: -1 });
            
            const unreadCount = await Message.countDocuments({ 
                conversationId: conv._id, 
                sender: 'customer', 
                isRead: false 
            });

            return {
                ...conv.toObject(), // Biến đổi Mongoose Document thành Object thường
                customer: conv.customerId, // Giữ lại cấu trúc cũ cho Frontend dễ map
                lastMessage,
                unreadCount
            };
        }));

        res.status(200).json({ success: true, conversations: formattedConversations });
    } catch (error) {
        console.error("Error fetching conversations:", error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// 2. DÀNH CHO ADMIN & KHÁCH: Xem tin nhắn của 1 Ticket cụ thể
export const getChatHistory = async (req, res) => {
    try {
        // LƯU Ý: Giờ mình dùng conversationId thay vì customerId nhé
        const { conversationId } = req.params; 
        
        // Kiểm tra xem người gọi API có phải admin không
        const isAdmin = req.user && req.user.role !== 'customer';

        // Đánh dấu đã đọc nếu admin mở Ticket này
        if (isAdmin) {
            await Message.updateMany(
                { conversationId, sender: 'customer', isRead: false },
                { $set: { isRead: true } }
            );
        }

        // Không cần check hiddenFromCustomer nữa vì mô hình Ticket đã sạch sẽ rồi
        const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
        
        res.status(200).json({ success: true, messages });
    } catch (error) {
        console.error("Error fetching chat history:", error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// 3. (MỚI) DÀNH CHO KHÁCH: Lấy Ticket đang mở hiện tại của khách
export const getCustomerTicket = async (req, res) => {
    try {
        const { customerId } = req.params;
        
        // 1. Tìm xem khách có phiên nào đang mở không (pending hoặc active)
        let conversation = await Conversation.findOne({
            customerId,
            status: { $ne: 'resolved' }
        });

        // 2. Nếu không có phiên nào mở, lấy phiên cũ nhất để khách xem lại lịch sử
        if (!conversation) {
            conversation = await Conversation.findOne({ customerId }).sort({ createdAt: -1 });
        }

        // 3. Nếu khách chưa từng chat bao giờ
        if (!conversation) {
            return res.status(200).json({ success: true, messages: [], conversation: null });
        }

        // Lấy tin nhắn của phiên đó
        const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });
        
        // Nếu khách hàng là người mở chat, đánh dấu tin nhắn Admin là đã đọc
        await Message.updateMany(
            { conversationId: conversation._id, sender: { $ne: 'customer' }, isRead: false },
            { $set: { isRead: true } }
        );

        res.status(200).json({ success: true, messages, conversation });
    } catch (error) {
        console.error("Error fetching customer ticket:", error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// 4. (MỚI) DÀNH CHO KHÁCH: Lấy danh sách TẤT CẢ Tickets của khách hàng
export const getCustomerAllTickets = async (req, res) => {
    try {
        const { customerId } = req.params;
        const conversations = await Conversation.find({ customerId }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, conversations });
    } catch (error) {
        console.error("Error fetching customer tickets:", error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};