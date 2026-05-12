import dotenv from "dotenv";
import http from "http";
import path from "path";
import express from "express";
import { fileURLToPath } from "url";
import app from "./app.js";
import { initializeSocket } from "./utils/socket.js";

dotenv.config();

const port = process.env.PORT || 5000;
const server = http.createServer(app);

// Serve frontend production build (only for local prod-style runs)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDist));
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

initializeSocket(server);

server.listen(port, () => console.log(`Server running on port ${port}`));
