const mongoose = require("mongoose");

const importSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    supplier: {
      type: String,
      required: true,
    },
    importDate: {
      type: Date,
      default: Date.now,
    },
    items: [
      {
        productCode: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        totalPrice: { type: Number },
      },
    ],
    totalAmount: {
      type: Number,
      default: 0,
    },
    notes: String,
    status: {
      type: String,
      enum: ["completed", "pending"],
      default: "completed",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Import", importSchema);
