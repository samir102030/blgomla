import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

/**
 * Attach the signed-in user when there is one, and carry on when there isn't.
 *
 * The support assistant takes two kinds of question at the same door: what the
 * shop sells and what its policies are, which anyone may ask, and what
 * happened to my order, which only the person who placed it may ask.
 * `protectRoute` would turn the first kind away before it was asked, so
 * identity is resolved here and the decision about what may be answered is
 * left to the handler — which never reads a user id out of the message.
 */
export const optionalAuth = async (req, _res, next) => {
  const token = req.cookies?.accessToken;
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    if (user && user.active !== false && !user.deleted) req.user = user;
  } catch {
    // An expired or forged token means the same thing here as no token at
    // all: the visitor simply does not get the answers that need an account.
  }

  next();
};

export default optionalAuth;
