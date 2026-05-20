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
    if (dateError)
      return res.status(400).json({ success: false, message: dateError });

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
    if (dateError)
      return res.status(400).json({ success: false, message: dateError });

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
    const { quantity, manufacturingDate, expiryDate, warehouseId } = req.body;
    const numQuantity = Number(quantity);

    if (!warehouseId) {
      return res
        .status(400)
        .json({ success: false, message: "warehouseId là bắt buộc" });
    }
    if (isNaN(numQuantity)) {
      return res
        .status(400)
        .json({ success: false, message: "Quantity không hợp lệ" });
    }

    console.log(
      `📥 Nhập ${numQuantity} ${req.params.code} vào kho ${warehouseId}`,
    );

    let product = await Product.findOne({ code: req.params.code });

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sản phẩm" });
    }

    // Khởi tạo stocks array nếu chưa có
    if (!product.stocks || !Array.isArray(product.stocks)) {
      product.stocks = [];
    }

    // Tìm kho hiện tại
    const stockIndex = product.stocks.findIndex(
      (s) =>
        s.warehouseId && s.warehouseId.toString() === warehouseId.toString(),
    );

    if (stockIndex !== -1) {
      // Đã tồn tại kho → CỘNG DỒN
      product.stocks[stockIndex].quantity += numQuantity;
      console.log(
        `➕ Cộng dồn kho ${warehouseId}: ${product.stocks[stockIndex].quantity}`,
      );
    } else {
      // Chưa có kho → Thêm mới
      product.stocks.push({
        warehouseId: warehouseId,
        quantity: numQuantity,
        minStock: product.minStock || 10,
      });
      console.log(`🆕 Thêm mới vào kho ${warehouseId}`);
    }

    // Cập nhật các trường khác
    if (manufacturingDate)
      product.manufacturingDate = new Date(manufacturingDate);
    if (expiryDate) product.expiryDate = new Date(expiryDate);

    await product.save();

    console.log(`✅ Hoàn tất. Tổng stocks: ${product.stocks.length} kho`);

    res.json({
      success: true,
      data: product,
      message: "Cập nhật tồn kho thành công",
    });
  } catch (err) {
    console.error("❌ Lỗi increaseStock:", err);
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
