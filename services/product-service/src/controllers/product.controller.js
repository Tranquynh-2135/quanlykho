const Product = require("../models/product.model"); // điều chỉnh đường dẫn nếu cần

// lấy tất cả sản phẩm
const getAllProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, minStock, status } = req.query;

    const query = {};

    // tìm kiếm theo mã hoặc tên (không phân biệt hoa thường)
    if (search) {
      query.$or = [
        { code: { $regex: search.trim(), $options: "i" } },
        { name: { $regex: search.trim(), $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }

    if (minStock !== undefined) {
      query.stock = { $lte: Number(minStock) }; // cảnh báo tồn kho thấp
    }

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// lấy 1 sản phẩm theo id
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (err) {
    next(err);
  }
};

// tạo sản phẩm
const createProduct = async (req, res, next) => {
  try {
    const product = new Product(req.body);
    const savedProduct = await product.save();

    res.status(201).json({
      success: true,
      data: savedProduct,
    });
  } catch (err) {
    next(err);
  }
};

// cập nhật sản phẩm
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // trả về document sau khi update
      runValidators: true, // chạy validation của schema
      timestamps: true, // tự động cập nhật updatedAt
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm để cập nhật",
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (err) {
    next(err);
  }
};

// xóa sản phẩm theo id
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm để xóa",
      });
    }

    res.status(200).json({
      success: true,
      message: "Xóa sản phẩm thành công",
      data: { id: req.params.id },
    });
  } catch (err) {
    next(err);
  }
};

// Tăng stock khi nhập kho
const increaseStock = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const product = await Product.findOneAndUpdate(
      { code: req.params.code },
      { $inc: { stock: quantity } },
      { new: true },
    );

    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sản phẩm" });

    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  increaseStock,
  deleteProduct,
};
