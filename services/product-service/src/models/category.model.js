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

// Index để tìm kiếm nhanh theo tên
categorySchema.index({ name: 1 });

module.exports = mongoose.model("Category", categorySchema);
