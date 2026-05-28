require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const exportRoutes = require("./routes/export.routes");
const errorHandler = require("./middlewares/error.middleware");
const verifyToken = require("./middlewares/auth.middleware"); // Import middleware

const app = express();

app.use(cors());
app.use(express.json());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);

// Health check route
app.get("/health", (req, res) => {
  res.json({
    status: "up",
    service: "export-service",
    port: process.env.PORT,
  });
});

// Sử dụng routes cho export
app.use("/exports", verifyToken, exportRoutes);

// Error handling middleware (phải để cuối cùng)
app.use(errorHandler);

const PORT = process.env.PORT || 4002;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("🚀 MongoDB connected for export-service");
    app.listen(PORT, () => {
      console.log(`✅ Export Service running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  });
