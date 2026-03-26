const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true },
    phone:   { type: String },
    email:   { type: String },
    address: { type: String },
    taxCode: { type: String },
    status:  { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Supplier", supplierSchema);