import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import postsRoutes from "./routes/postsRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "CollabX Backend API",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/posts", postsRoutes);
app.use("/api/admin", adminRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("[CollabX Server Error]:", err);
  res.status(500).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 CollabX Backend Server running on port ${PORT}`);
});

export default app;
