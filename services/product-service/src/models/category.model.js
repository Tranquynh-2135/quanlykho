const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true, // Không cho phép tên danh mục trùng nhau
    },
  },
  {
    timestamps: true, // Tự động tạo createdAt và updatedAt
  },
);



module.exports = mongoose.model("Category", categorySchema);
