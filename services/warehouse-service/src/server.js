require("dotenv").config();
const express   = require("express");
const mongoose  = require("mongoose");
const cors      = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "up", service: "warehouse-service" }));
app.use("/warehouses", require("./routes/warehouse.routes"));
app.use((err, req, res, next) => {
  if (err.code === 11000)
    return res.status(400).json({ success: false, message: "Tên kho đã tồn tại" });
  res.status(err.statusCode || 500).json({ success: false, message: err.message });
});

const PORT      = process.env.PORT ;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) { console.error("❌ MONGO_URI chưa được định nghĩa"); process.exit(1); }

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("🚀 Warehouse DB connected");
    app.listen(PORT, () => console.log(`warehouse-service :${PORT}`));
  })
  .catch(err => { console.error("❌ DB connection failed:", err.message); process.exit(1); });
