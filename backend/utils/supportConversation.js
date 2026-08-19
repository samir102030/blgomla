import Conversation from "../models/conversation.model.js";
import User from "../models/user.model.js";

/**
 * The customer's one support thread with the shop.
 *
 * There is only ever a single general conversation per customer — the widget
 * reopens it rather than starting a new one each visit — so both the chat
 * routes and the assistant's hand-off have to agree on how it is found. They
 * agree by calling this.
 *
 * A shop with no admin account yet still gets a conversation, holding the
 * customer's side of it until somebody is there to read it.
 */
export const getOrCreateGeneralConversation = async (userId) => {
  let conversation = await Conversation.findOne({
    type: "general",
    "participants.user": { $all: [userId] },
    "participants.role": { $in: ["admin"] },
  }).populate("participants.user", "name email role profilePicture");

  if (conversation) return conversation;

  const admin = await User.findOne({ role: "admin" });

  conversation = new Conversation({
    type: "general",
    participants: admin
      ? [
          { user: userId, role: "customer" },
          { user: admin._id, role: "admin" },
        ]
      : [{ user: userId, role: "customer" }],
  });

  await conversation.save();
  await conversation.populate("participants.user", "name email role profilePicture");

  return conversation;
};

export default { getOrCreateGeneralConversation };
