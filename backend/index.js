import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDB from "./config/db.js";
import { rateLimit } from "express-rate-limit";
import systemRoutes from "./routes/system.route.js";


dotenv.config();


const app = express();
const port = process.env.PORT || 5000;
connectDB();

app.use(
  cors({
    origin: [
      "http://localhost:3000",
    ],
    credentials: true, // Allow cookies to be sent
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: "Too many requests from this IP, please try again later",
});
app.use(limiter);
app.use("/api", systemRoutes);

app.listen(port, () => console.log(`Server running on port ${port}`));
