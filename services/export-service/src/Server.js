
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const exportRoutes = require("./routes/export.routes");
const errorHandler = require("./middlewares/error.middleware");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "up", service: "export-service", port: process.env.PORT });
});

app.use("/exports", exportRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 4004;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/export-service";

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