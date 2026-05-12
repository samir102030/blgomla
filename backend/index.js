import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import connectDB from "./config/db.js";
import { rateLimit } from "express-rate-limit";
import systemRoutes from "./routes/system.route.js";
import { CLIENT_ORIGINS, initializeSocket } from "./utils/socket.js";
import { trackVisitor } from "./middleware/analytics.middleware.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const server = http.createServer(app);
connectDB();

// --- Security Middleware ---
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP — frontend build uses inline scripts
    crossOriginEmbedderPolicy: false,
  })
);

// CORS — restrict to known client origins
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  ...CLIENT_ORIGINS,
].filter(Boolean);

const isOriginAllowed = (origin) => {
  return allowedOrigins.some((allowed) => {
    if (allowed.includes("*")) {
      const regex = new RegExp(
        "^" + allowed.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$"
      );
      return regex.test(origin);
    }
    return allowed === origin;
  });
};

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// --- Body Parsing with size limits ---
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// --- Rate Limiting ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per 15-minute window
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});
app.use(limiter);

// --- Visitor Analytics Tracking ---
app.use(trackVisitor);

// --- Routes ---
app.use("/api", systemRoutes);

// --- Serve frontend (production build) ---
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.join(__dirname, "../frontend/dist");

app.use(express.static(frontendDist));

// SPA fallback — serve index.html for all non-API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

// --- Error handling middleware ---
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

initializeSocket(server);

server.listen(port, () => console.log(`Server running on port ${port}`));
