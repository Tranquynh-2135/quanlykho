const Product = require("../models/product.model");

// Helper kiểm tra ngày tháng
const validateProductDates = (manufacturingDate, expiryDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (manufacturingDate) {
    const mfg = new Date(manufacturingDate);
    if (mfg > today) return "Ngày sản xuất không được là ngày trong tương lai";
  }

  if (expiryDate) {
    const exp = new Date(expiryDate);
    if (exp <= today) return "Hạn sử dụng phải là ngày trong tương lai";
    
    if (!manufacturingDate) return "Phải nhập ngày sản xuất khi có hạn sử dụng";
    
    const mfg = new Date(manufacturingDate);
    const expDate = new Date(expiryDate);
    if (mfg >= expDate) return "Ngày sản xuất phải trước hạn sử dụng";
  }
  return null;
};

// GET ALL
const getAllProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { code: { $regex: search.trim(), $options: "i" } },
        { name: { $regex: search.trim(), $options: "i" } },
      ];
    }
    if (status) query.status = status;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("categoryId", "name defaultUnit")
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit)),
      Product.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET BY ID
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "categoryId",
      "name defaultUnit",
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

// CREATE
const createProduct = async (req, res, next) => {
  try {
    const { manufacturingDate, expiryDate } = req.body;

    const dateError = validateProductDates(manufacturingDate, expiryDate);
    if (dateError) return res.status(400).json({ success: false, message: dateError });

    const product = await new Product(req.body).save();
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

// UPDATE
const updateProduct = async (req, res, next) => {
  try {
    const { manufacturingDate, expiryDate } = req.body;

    const dateError = validateProductDates(manufacturingDate, expiryDate);
    if (dateError) return res.status(400).json({ success: false, message: dateError });

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sản phẩm" });

    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

// DELETE
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sản phẩm" });
    res.json({
      success: true,
      message: "Xóa sản phẩm thành công",
      data: { id: req.params.id },
    });
  } catch (err) {
    next(err);
  }
};

// UPLOAD IMAGE
const uploadImage = (req, res) => {
  if (!req.file)
    return res
      .status(400)
      .json({ success: false, message: "Không có file ảnh" });
  res.json({ success: true, imageHash: req.file.filename });
};

// ====================== INCREASE / DECREASE STOCK ======================
const increaseStock = async (req, res, next) => {
  try {
    let { quantity, manufacturingDate, expiryDate } = req.body;

    if (quantity === undefined || quantity === null) {
      return res.status(400).json({
        success: false,
        message: "Quantity là bắt buộc",
      });
    }

    const dateError = validateProductDates(manufacturingDate, expiryDate);
    if (dateError) return res.status(400).json({ success: false, message: dateError });

    const updateData = { 
      $inc: { stock: Number(quantity) },
      $set: {}
    };
    
    if (manufacturingDate) updateData.$set.manufacturingDate = new Date(manufacturingDate);
    if (expiryDate) updateData.$set.expiryDate = new Date(expiryDate);
    if (Object.keys(updateData.$set).length === 0) delete updateData.$set;

    const product = await Product.findOneAndUpdate(
      { code: req.params.code },
      updateData,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy sản phẩm có code: ${req.params.code}`,
      });
    }

    res.json({
      success: true,
      data: product,
      message:
        quantity > 0 ? "Tăng tồn kho thành công" : "Giảm tồn kho thành công",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadImage,
  increaseStock,
};
