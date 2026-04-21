import Message from '../models/messageModel.js';
import User from '../models/userModel.js';

export const getConversations = async (req, res) => {
    try {
        // Find distinct customerIds who have sent/received messages
        const distinctCustomerIds = await Message.distinct('customerId');
        
        // Fetch user details for these customers
        const customers = await User.find({ _id: { $in: distinctCustomerIds } })
            .select('name email avatar');

        // Fetch the latest message for each customer to show as preview
        const conversations = await Promise.all(customers.map(async (customer) => {
            const lastMessage = await Message.findOne({ customerId: customer._id })
                .sort({ createdAt: -1 });
            
            // Count unread messages from this customer
            const unreadCount = await Message.countDocuments({ 
                customerId: customer._id, 
                sender: 'customer', 
                isRead: false 
            });

            return {
                customer,
                lastMessage,
                unreadCount
            };
        }));

        // Sort by most recent message
        conversations.sort((a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt);

        res.status(200).json({ success: true, conversations });
    } catch (error) {
        console.error("Error fetching conversations:", error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

export const getChatHistory = async (req, res) => {
    try {
        const { customerId } = req.params;
        
        // Mark messages from customer as read when admin opens the chat
        if (req.user && req.user.role !== 'customer') { // assuming admin
            await Message.updateMany(
                { customerId, sender: 'customer', isRead: false },
                { $set: { isRead: true } }
            );
        }

        const messages = await Message.find({ customerId }).sort({ createdAt: 1 });
        
        res.status(200).json({ success: true, messages });
    } catch (error) {
        console.error("Error fetching chat history:", error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};
