require("dotenv").config();
const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "up", service: "supplier-service" }));

app.use("/suppliers", require("./routes/supplier.routes"));
app.use(require("./middlewares/error.middleware"));

const PORT     = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) { console.error("❌ MONGO_URI chưa được định nghĩa"); process.exit(1); }

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("🚀 Supplier DB connected");
    app.listen(PORT, () => console.log(`supplier-service :${PORT}`));
  })
  .catch(err => { console.error("❌ DB connection failed:", err.message); process.exit(1); });
