require("dotenv").config();
const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) =>
  res.json({ status: "up", service: "user-service" })
);

app.use("/users", require("./routes/user.routes"));
const errorHandler = require("./middlewares/error.middleware");
app.use(errorHandler);

const { PORT = 4006, MONGO_URI } = process.env;
if (!MONGO_URI) { console.error("❌ MONGO_URI chưa định nghĩa"); process.exit(1); }

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("🚀 User DB connected");
    app.listen(PORT, () => console.log(`user-service :${PORT}`));
  })
  .catch(err => { console.error("❌ DB lỗi:", err.message); process.exit(1); });
