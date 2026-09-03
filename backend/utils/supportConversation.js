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
/** Shop staff, matching the chat controller's own list. */
const STAFF_ROLES = ["admin", "super_admin"];

export const getOrCreateGeneralConversation = async (userId) => {
  /*
    Keyed on the customer alone, which is what "the customer's one thread"
    means.

    It used to also require a participant with role `admin`, and the comment
    above says a shop with no admin yet still gets a conversation — so the
    thread it created could not satisfy the query that was meant to find it
    again. Every call made another one. One customer opening the widget three
    times had three threads, and the assistant's hand-off made a fourth; the
    inbox filled with duplicates that each held part of the conversation.

    That was not hypothetical for this shop: the staff account is
    `super_admin`, and `User.findOne({ role: "admin" })` matches nothing, so
    *no* general conversation ever got an admin participant.

    `$elemMatch` rather than the two dotted paths it replaces: `"participants.user"`
    and `"participants.role"` as separate conditions can be satisfied by two
    different entries in the array — one entry supplying the user and another
    the role — which is not the question being asked.
  */
  let conversation = await Conversation.findOne({
    type: "general",
    participants: { $elemMatch: { user: userId, role: "customer" } },
  }).populate("participants.user", "name email role profilePicture");

  if (conversation) return conversation;

  // `super_admin` counts. This shop is seeded with one and no plain admin.
  const admin = await User.findOne({ role: { $in: STAFF_ROLES } }).select("_id");

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
