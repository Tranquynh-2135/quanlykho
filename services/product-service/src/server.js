require("dotenv").config(); // hỗ trợ đọc .env

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const productRoutes = require("./routes/product.routes");
const errorHandler = require("./middlewares/error.middleware");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/health", (req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.status(200).json({
    status: "up",
    service: "product-service",
    uptime: process.uptime(),
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.send("Product Service Running 🚀");
});

app.use("/products", productRoutes);

// Global error handler
app.use(errorHandler);

// Kết nối DB
const PORT = process.env.PORT || 4001;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/product-service";

mongoose
  .connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
  })
  .then(() => {
    console.log("🚀 MongoDB connected successfully");
    startServer();
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1); // thoát nếu không connect được DB
  });

// Hàm khởi động server riêng
function startServer() {
  const server = app.listen(PORT, () => {
    console.log(
      `Product Service running on port ${PORT} | Environment: ${process.env.NODE_ENV || "development"}`,
    );
  });

  // Graceful shutdown
  const gracefulShutdown = () => {
    console.log("Received shutdown signal. Closing server...");
    server.close(() => {
      console.log("HTTP server closed.");
      mongoose.connection.close(false, () => {
        console.log("MongoDB connection closed.");
        process.exit(0);
      });
    });
  };

  // Xử lý các signal dừng server
  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
}
