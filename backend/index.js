import dotenv from "dotenv";
import http from "http";
import path from "path";
import express from "express";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import app from "./app.js";
import { initializeSocket } from "./utils/socket.js";

dotenv.config();

const port = process.env.PORT || 5000;
const server = http.createServer(app);

// Optionally serve the built frontend from the same origin for prod-style local
// runs. Off by default so `localhost:5000` shows the API health response instead
// of a stale dist build. Enable with SERVE_FRONTEND=true.
if (process.env.SERVE_FRONTEND === "true") {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const frontendDist = path.join(__dirname, "../frontend/dist");
  if (existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get("*", (req, res) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });
    console.log(`📦 Serving frontend dist from ${frontendDist}`);
  } else {
    console.warn(
      `⚠️  SERVE_FRONTEND=true but ${frontendDist} does not exist — run "npm run build" in /frontend first.`
    );
  }
}

initializeSocket(server);

server.listen(port, () => {
  console.log(`✅ Backend listening on http://localhost:${port}`);
  console.log(`   Health: http://localhost:${port}/api/v1/health`);
});
