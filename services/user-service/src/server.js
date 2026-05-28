require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());

app.get("/health", (req, res) =>
  res.json({ status: "up", service: "user-service" }),
);

app.use("/users", require("./routes/user.routes"));
const errorHandler = require("./middlewares/error.middleware");
app.use(errorHandler);

const PORT = process.env.PORT || 4006;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI không được định nghĩa trong file .env");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("🚀 User DB connected");
    app.listen(PORT, () => console.log(`user-service :${PORT}`));
  })
  .catch((err) => {
    console.error("❌ DB lỗi:", err.message);
    process.exit(1);
  });
