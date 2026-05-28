require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");

const productRoutes = require("./routes/product.routes");
const errorHandler = require("./middlewares/error.middleware");

const app = express();

app.use(
  cors({
    origin: function (origin, callback) {
      const allowed = [
        process.env.FRONTEND_URL?.replace(/\/$/, ""),
        "http://localhost:3000",
      ];
      if (!origin || allowed.indexOf(origin.replace(/\/$/, "")) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(express.json());

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
app.use("/uploads", express.static("uploads"));

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

// Global error handler — phải là function (err, req, res, next)
app.use(
  typeof errorHandler === "function"
    ? errorHandler
    : (err, req, res, next) => {
        console.error(err.stack);
        res.status(err.status || 500).json({
          success: false,
          message: err.message || "Internal Server Error",
        });
      },
);

const PORT = process.env.PORT || 4001;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI không được định nghĩa trong file .env");
  process.exit(1);
}

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
    process.exit(1);
  });

function startServer() {
  const server = app.listen(PORT, () => {
    console.log(
      `Product Service running on port ${PORT} | Environment: ${process.env.NODE_ENV || "development"}`,
    );
  });

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

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
}
