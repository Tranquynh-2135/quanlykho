const mongoose = require("mongoose");

const exportSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      default: () => `EXP-${Date.now()}`,
    },
    recipient: { type: String, required: true },
    recipientType: {
      type: String,
      enum: ["khach_hang", "nha_phan_phoi", "khac"],
      default: "khach_hang",
    },
    items: [
      {
        productCode: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        totalPrice: { type: Number },
      },
    ],
    totalAmount: { type: Number, default: 0 },
    note: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Export", exportSchema);
