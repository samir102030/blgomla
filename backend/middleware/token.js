import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const token = req.cookies.accessToken;
  if (!token)
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized - no token provided" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.userId)
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized - invalid token" });

    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.log("Error in verifyToken ", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const generateToken = (userId, time = "1h") => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "1h", // one hour
  });
  return token;
};

export const generateTokenAndSetCookie = (res, userId) => {
  const token = generateToken(userId, "1h");

  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 1000, // one hour
    path: "/", // Restrict cookie to the application root
  });

  return token;
};
