const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: {
      type: String,
      unique: true,
      sparse: true,
    },
    password: { type: String, required: true },
    plainPassword: { type: String },
    phone: { type: String },
    address: { type: String },
    birthday: { type: Date },

    role: {
      type: String,
      enum: ["quan_ly_kho", "nhan_vien_kho"],
      required: true,
    },

    warehouseId: { type: String, default: null },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.plainPassword = this.password; // lưu plain
});

module.exports = mongoose.model("User", userSchema);
