import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import connectDB from "./config/db.js";
import systemRoutes from "./routes/system.route.js";
import { CLIENT_ORIGINS } from "./utils/socket.js";
import { trackVisitor } from "./middleware/analytics.middleware.js";

dotenv.config();

let dbConnectionPromise;
const ensureDB = () => {
  if (!dbConnectionPromise) dbConnectionPromise = connectDB();
  return dbConnectionPromise;
};

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

const extraOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  ...extraOrigins,
  ...CLIENT_ORIGINS,
  "https://*.vercel.app",
].filter(Boolean);

const isOriginAllowed = (origin) => {
  return allowedOrigins.some((allowed) => {
    if (allowed.includes("*")) {
      const regex = new RegExp(
        "^" + allowed.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$",
      );
      return regex.test(origin);
    }
    return allowed === origin;
  });
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (isOriginAllowed(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(async (req, res, next) => {
  try {
    await ensureDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.use(trackVisitor);

app.use("/api", systemRoutes);

app.get("/", (req, res) => {
  res.json({ ok: true, service: "halafawyStore-backend" });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message,
  });
});

export default app;
