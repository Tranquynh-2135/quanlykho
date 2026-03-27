const mongoose = require("mongoose");

const exportSchema = new mongoose.Schema({
  productId: String,
  warehouseId: String,
  quantity: Number,
  reason: String,
  note: String
}, { timestamps: true });

module.exports = mongoose.model("Export", exportSchema);