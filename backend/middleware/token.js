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

export const verifyRefreshToken = (req, res, next) => {
  const token = req.cookies.refreshToken;
  if (!token)
    return res.status(401).json({
      success: false,
      message: "Unauthorized - no refresh token provided",
    });
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    if (!decoded || !decoded.userId)
      return res.status(401).json({
        success: false,
        message: "Unauthorized - invalid refresh token",
      });

    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.log("Error in verifyRefreshToken ", error);
    return res
      .status(403)
      .json({ success: false, message: "Forbidden - invalid refresh token" });
  }
};

export const generateToken = (userId, time = "5h") => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: time,
  });
  return token;
};

export const generateRefreshToken = (userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d", // 7 days
  });
  return token;
};

// Single definition of the cookie attributes. `res.clearCookie` only clears a
// cookie when the attributes match the ones it was set with, so set and clear
// must read from the same place — otherwise logout silently leaves the session
// cookie in the browser in production (secure + sameSite=none).
export const authCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  path: "/",
});

export const ACCESS_TOKEN_MAX_AGE = 5 * 60 * 60 * 1000; // five hours
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export const clearAuthCookies = (res) => {
  res.clearCookie("accessToken", authCookieOptions());
  res.clearCookie("refreshToken", authCookieOptions());
};

export const generateTokenAndSetCookie = (res, userId) => {
  const token = generateToken(userId, "5h");

  res.cookie("accessToken", token, {
    ...authCookieOptions(),
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  return token;
};

export const generateTokensAndSetCookies = (res, userId) => {
  const accessToken = generateToken(userId, "5h");
  const refreshToken = generateRefreshToken(userId);

  res.cookie("accessToken", accessToken, {
    ...authCookieOptions(),
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  res.cookie("refreshToken", refreshToken, {
    ...authCookieOptions(),
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  return { accessToken, refreshToken };
};
