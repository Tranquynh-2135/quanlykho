const mongoose = require("mongoose");

const warehouseSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true },
    location:  { type: String },
    managerId: { type: String },  // ref sang user-service sau
    capacity:  { type: Number, min: 0 },
    status:    { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Warehouse", warehouseSchema);