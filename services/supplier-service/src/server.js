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
  res.json({ status: "up", service: "supplier-service" }),
);

app.use("/suppliers", require("./routes/supplier.routes"));
app.use(require("./middlewares/error.middleware"));

const PORT = process.env.PORT || 4004;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI chưa được định nghĩa");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("🚀 Supplier DB connected");
    app.listen(PORT, () => console.log(`supplier-service :${PORT}`));
  })
  .catch((err) => {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  });
