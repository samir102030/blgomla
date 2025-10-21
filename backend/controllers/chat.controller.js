import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import Store from "../models/store.model.js";

// Create or get conversation
export const createOrGetConversation = async (req, res) => {
  try {
    const { type, productId } = req.body;
    const userId = req.user._id;

    let conversation;

    if (type === "general") {
      // Find existing general conversation with admin
      conversation = await Conversation.findOne({
        type: "general",
        "participants.user": { $all: [userId] },
        "participants.role": { $in: ["admin"] },
      }).populate("participants.user", "name email role profilePicture");

      if (!conversation) {
        // Try to create new general conversation
        const adminUser = await User.findOne({ role: "admin" });

        if (adminUser) {
          // Create conversation with admin
          conversation = new Conversation({
            type: "general",
            participants: [
              { user: userId, role: "customer" },
              { user: adminUser._id, role: "admin" },
            ],
          });
        } else {
          // No admin available - create conversation without admin for now
          // This allows customers to send messages that will be handled later
          conversation = new Conversation({
            type: "general",
            participants: [{ user: userId, role: "customer" }],
          });
        }

        await conversation.save();
        await conversation.populate(
          "participants.user",
          "name email role profilePicture"
        );
      }
    } else if (type === "product") {
      if (!productId) {
        return res.status(400).json({
          message: "Product ID is required for product conversations",
        });
      }

      // Get product and store info
      const product = await Product.findById(productId).populate("store");
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Find store owner (vendor)
      const store = await Store.findById(product.store);
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      // Check if conversation already exists
      conversation = await Conversation.findOne({
        type: "product",
        product: productId,
        "participants.user": { $all: [userId, store.owner] },
      }).populate("participants.user", "name email role profilePicture");

      if (!conversation) {
        // Create new product conversation
        conversation = new Conversation({
          type: "product",
          product: productId,
          store: store._id,
          participants: [
            { user: userId, role: "customer" },
            { user: store.owner, role: "vendor" },
          ],
        });
        await conversation.save();
        await conversation.populate(
          "participants.user",
          "name email role profilePicture"
        );
      }
    } else {
      return res.status(400).json({ message: "Invalid conversation type" });
    }

    res.status(200).json(conversation);
  } catch (error) {
    console.error("Error creating/getting conversation:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get user conversations
export const getUserConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const { type } = req.query;

    let query;

    if (userRole === "admin") {
      // Admins can see all conversations
      query = { isActive: true };
      if (type) {
        query.type = type;
      }
    } else {
      // Regular users can only see conversations they're participants in
      query = {
        "participants.user": userId,
        isActive: true,
      };
      if (type) {
        query.type = type;
      }
    }

    const conversations = await Conversation.find(query)
      .populate("participants.user", "name email role profilePicture")
      .populate("product", "name images")
      .populate("store", "name")
      .populate("lastMessage")
      .sort({ lastMessageAt: -1 });

    res.status(200).json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get conversation messages
export const getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;
    const { page = 1, limit = 50 } = req.query;

    // Check if user is participant in conversation or is an admin
    let conversation;
    if (userRole === "admin") {
      conversation = await Conversation.findById(conversationId);
    } else {
      conversation = await Conversation.findOne({
        _id: conversationId,
        "participants.user": userId,
      });
    }

    if (!conversation) {
      return res.status(403).json({ message: "Access denied" });
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "name email role profilePicture")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Mark messages as read
    await Message.updateMany(
      { conversation: conversationId, sender: { $ne: userId }, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.status(200).json(messages.reverse()); // Reverse to show oldest first
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Send message
export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, messageType = "text", attachments = [] } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Check if user is participant in conversation or is an admin
    let conversation;
    if (userRole === "admin") {
      // Admins can send messages to any conversation
      conversation = await Conversation.findById(conversationId);
    } else {
      // Regular users can only send to conversations they're participants in
      conversation = await Conversation.findOne({
        _id: conversationId,
        "participants.user": userId,
      });
    }

    if (!conversation) {
      return res.status(403).json({ message: "Access denied" });
    }

    // If admin is sending to a conversation they're not a participant in, add them as a participant
    if (
      userRole === "admin" &&
      !conversation.participants.some((p) => p.user.toString() === userId)
    ) {
      conversation.participants.push({ user: userId, role: "admin" });
      await conversation.save();
    }

    // Create message
    const message = new Message({
      conversation: conversationId,
      sender: userId,
      content,
      messageType,
      attachments,
    });

    await message.save();

    // Update conversation last message
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Populate sender info
    await message.populate("sender", "name email role profilePicture");

    res.status(201).json(message);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Mark messages as read
export const markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Check if user is participant in conversation or is an admin
    let conversation;
    if (userRole === "admin") {
      conversation = await Conversation.findById(conversationId);
    } else {
      conversation = await Conversation.findOne({
        _id: conversationId,
        "participants.user": userId,
      });
    }

    if (!conversation) {
      return res.status(403).json({ message: "Access denied" });
    }

    await Message.updateMany(
      { conversation: conversationId, sender: { $ne: userId }, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get unread message count
export const getUnreadMessageCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      "participants.user": userId,
      isActive: true,
    });

    const conversationIds = conversations.map((conv) => conv._id);

    const unreadCount = await Message.countDocuments({
      conversation: { $in: conversationIds },
      sender: { $ne: userId },
      isRead: false,
    });

    res.status(200).json({ unreadCount });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
