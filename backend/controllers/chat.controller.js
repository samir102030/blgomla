import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import Store from "../models/store.model.js";
import { getOrCreateGeneralConversation } from "../utils/supportConversation.js";

// Create or get conversation
export const createOrGetConversation = async (req, res) => {
  try {
    const { type, productId } = req.body;
    const userId = req.user._id;

    let conversation;

    if (type === "general") {
      // Shared with the assistant's hand-off, so a transcript it files and a
      // message the customer types land in the same thread.
      conversation = await getOrCreateGeneralConversation(userId);
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
/*
  Who counts as shop staff in the support inbox.

  Every branch below tested `userRole === "admin"` literally, and the account
  this shop is seeded with — admin@belgomla.com — is `super_admin`. So the
  owner's own support inbox was empty: `getUserConversations` fell through to
  the participant filter and they are a participant in nothing. Opening a
  conversation by id answered "Access denied". Customer messages sat there
  with no error to explain why nobody replied.

  `super_admin` is a superset of `admin` everywhere else in this codebase —
  `adminRoute` is `mixRoute(["admin", "super_admin"])` — and this file was the
  one place that forgot.
*/
const SUPPORT_STAFF_ROLES = ["admin", "super_admin"];
const isSupportStaff = (role) => SUPPORT_STAFF_ROLES.includes(role);

export const getUserConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const { type } = req.query;

    let query;

    if (isSupportStaff(userRole)) {
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

    // Capped. For staff this is every conversation the shop has ever had,
    // with four populates on each, and the inbox renders the newest first
    // anyway.
    const conversations = await Conversation.find(query)
      .populate("participants.user", "name email role profilePicture")
      .populate("product", "name images")
      .populate("store", "name")
      .populate("lastMessage")
      .sort({ lastMessageAt: -1 })
      .limit(Math.min(Number(req.query.limit) || 100, 200));

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
    if (isSupportStaff(userRole)) {
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
    if (isSupportStaff(userRole)) {
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
      isSupportStaff(userRole) &&
      !conversation.participants.some((p) => p.user.toString() === String(userId))
    ) {
      // Stored as "admin" whatever the exact staff role is: the participant
      // role is what marks a thread as having been picked up by the shop, and
      // `getOrCreateGeneralConversation` looks for that mark.
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
    if (isSupportStaff(userRole)) {
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

/*
  The duplicate general threads that already exist.

  `getOrCreateGeneralConversation` used to look for a thread that also had an
  admin participant, and create one without any — so it could never find what
  it had just made, and every visit to the widget started another. That is
  fixed, but fixing it only stops new ones. The inbox still holds whatever
  the old behaviour produced, and the customer's messages are scattered
  across those threads: `findOne` returns one of them, so staff read part of
  the conversation and answer as though it were all of it.

  This merges them. For each customer holding more than one general thread,
  the oldest is kept — it is the one with the earliest history and the one an
  operator is most likely to have open — and every message from the others is
  repointed at it. The emptied threads are deactivated rather than deleted,
  because `isActive` is what the inbox filters on and a hard delete would
  destroy the only record if any of this turns out to be wrong.

  `dryRun` is the same walk with the writes left off, so the number in the
  confirmation is the number that will actually move.
*/
export const mergeDuplicateGeneralConversations = async (req, res) => {
  try {
    const dryRun = req.body?.dryRun === true || req.query?.dryRun === "true";

    /*
      Active threads only, which is what makes this safe to press twice.

      Reading every general thread instead counted the ones a previous run had
      already emptied and closed: the second run moved no messages — there
      were none left — but reported the same two threads closed and the same
      customer affected, and wrote `isActive: false` over rows that already
      had it. An operator pressing the button again would be told work had
      happened when none had. A closed duplicate is no longer a duplicate.
    */
    const generals = await Conversation.find({
      type: "general",
      isActive: { $ne: false },
    })
      .select("_id participants createdAt lastMessageAt isActive")
      .sort({ createdAt: 1 })
      .lean();

    // Grouped by the customer the thread belongs to. A thread with no
    // customer participant is not one of these and is left alone.
    const byCustomer = new Map();
    for (const conversation of generals) {
      const customer = (conversation.participants || []).find(
        (p) => p.role === "customer" && p.user
      );
      if (!customer) continue;
      const key = String(customer.user);
      if (!byCustomer.has(key)) byCustomer.set(key, []);
      byCustomer.get(key).push(conversation);
    }

    const groups = [...byCustomer.entries()].filter(([, list]) => list.length > 1);

    let messagesMoved = 0;
    let threadsClosed = 0;
    const detail = [];

    for (const [customer, list] of groups) {
      // Sorted oldest-first by the query above, so the first is the keeper.
      const [keep, ...rest] = list;
      const duplicateIds = rest.map((c) => c._id);
      const moving = await Message.countDocuments({
        conversation: { $in: duplicateIds },
      });

      detail.push({
        customer,
        keep: String(keep._id),
        duplicates: duplicateIds.length,
        messages: moving,
      });
      messagesMoved += moving;
      threadsClosed += duplicateIds.length;

      if (dryRun) continue;

      await Message.updateMany(
        { conversation: { $in: duplicateIds } },
        { $set: { conversation: keep._id } }
      );
      await Conversation.updateMany(
        { _id: { $in: duplicateIds } },
        { $set: { isActive: false } }
      );

      /*
        The kept thread's own summary fields have to catch up, or the inbox
        sorts it by a timestamp from before the messages it now holds and it
        sinks below threads with less in them.
      */
      const newest = await Message.findOne({ conversation: keep._id })
        .sort({ createdAt: -1 })
        .select("_id createdAt")
        .lean();
      if (newest) {
        await Conversation.updateOne(
          { _id: keep._id },
          { $set: { lastMessage: newest._id, lastMessageAt: newest.createdAt } }
        );
      }
    }

    res.status(200).json({
      success: true,
      dryRun,
      customersAffected: groups.length,
      threadsClosed,
      messagesMoved,
      detail,
    });
  } catch (error) {
    console.error("mergeDuplicateGeneralConversations failed:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
