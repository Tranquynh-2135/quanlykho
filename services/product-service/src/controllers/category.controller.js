const Category = require("../models/category.model");

// GET ALL
const getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 }); // Sắp xếp theo tên A-Z

    res.json({
      success: true,
      data: categories,
    });
  } catch (err) {
    next(err);
  }
};

// CREATE
const createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tên danh mục không được để trống",
      });
    }

    const category = await new Category({
      name: name.trim(),
    }).save();

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (err) {
    // Xử lý lỗi trùng tên
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Tên danh mục này đã tồn tại",
      });
    }
    next(err);
  }
};

// UPDATE
const updateCategory = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tên danh mục không được để trống",
      });
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name: name.trim() },
      { new: true, runValidators: true },
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục",
      });
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Tên danh mục này đã tồn tại",
      });
    }
    next(err);
  }
};

// DELETE
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục",
      });
    }

    res.json({
      success: true,
      message: "Đã xóa danh mục thành công",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
