require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

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

app.get("/health", (req, res) =>
  res.json({ status: "up", service: "user-service" }),
);

app.use("/users", require("./routes/user.routes"));
const errorHandler = require("./middlewares/error.middleware");
app.use(errorHandler);

const PORT = process.env.PORT || 4006;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI || !process.env.JWT_SECRET) {
  console.error("❌ Thiếu cấu hình MONGO_URI hoặc JWT_SECRET");
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
