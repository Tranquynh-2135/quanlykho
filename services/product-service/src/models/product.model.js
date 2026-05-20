const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      min: 0,
      default: 0,
    },
    costPrice: {
      type: Number,
      min: 0,
      default: 0,
    },

    // === TỒN KHO THEO TỪNG KHO (Multi-Warehouse) ===
    stocks: [
      {
        warehouseId: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          default: 0,
          min: 0,
        },
        minStock: {
          type: Number,
          default: 10,
        },
      },
    ],

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    warehouseId: {
      type: String,
      default: null,
    },
    minStock: {
      type: Number,
      default: 10,
      min: 0,
    },
    maxStock: {
      type: Number,
      min: 0,
    },

    manufacturingDate: {
      type: Date,
      default: null,
    },
    expiryDate: {
      type: Date,
      default: null,
    },

    location: { type: String },
    supplierId: { type: String },
    imageHash: { type: String },
    description: { type: String },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    unit: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "discontinued"],
      default: "active",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Product", productSchema);
