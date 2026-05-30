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
    const {
      page = 1,
      limit = 24,
      search,
      status,
      warehouseId,
      categoryId,
    } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { code: { $regex: search.trim(), $options: "i" } },
        { name: { $regex: search.trim(), $options: "i" } },
      ];
    }
    if (status) query.status = status;
    if (categoryId) query.categoryId = categoryId;

    // Lọc theo kho nếu có warehouseId
    if (warehouseId) {
      query["stocks.warehouseId"] = warehouseId;
      query["stocks.quantity"] = { $gt: 0 };
    }

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
    const {
      quantity,
      manufacturingDate,
      expiryDate,
      warehouseId,
      unit,
      costPrice,
    } = req.body;
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
      `📥 Nhập ${numQuantity} ${req.params.code} vào kho ${warehouseId} | Giá vốn: ${costPrice}`,
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

    // --- XỬ LÝ LÔ HÀNG (BATCHES) ---
    if (!product.batches) product.batches = [];

    // Hàm chuẩn hóa ngày (YYYY-MM-DD) để so sánh chính xác lô hàng
    const normalizeDate = (d) => {
      if (!d) return null;
      const date = new Date(d);
      return isNaN(date.getTime()) ? null : date.toISOString().split("T")[0];
    };

    const mfgKey = normalizeDate(manufacturingDate);
    const expKey = normalizeDate(expiryDate);

    // Tìm index của lô hàng có cùng NSX và HSD
    const batchIndex = product.batches.findIndex((b) => {
      return (
        normalizeDate(b.manufacturingDate) === mfgKey &&
        normalizeDate(b.expiryDate) === expKey
      );
    });

    if (batchIndex === -1) {
      // Nếu không tìm thấy và là nhập kho (quantity > 0) -> Tạo lô mới
      if (numQuantity > 0) {
        const mfgDate = manufacturingDate ? new Date(manufacturingDate) : null;
        const expDate = expiryDate ? new Date(expiryDate) : null;

        const maxBatchNo = product.batches.reduce(
          (max, b) => Math.max(max, b.batchNo || 0),
          0,
        );
        const newBatch = {
          batchNo: maxBatchNo + 1,
          manufacturingDate:
            mfgDate && !isNaN(mfgDate.getTime()) ? mfgDate : null,
          expiryDate: expDate && !isNaN(expDate.getTime()) ? expDate : null,
          costPrice: numQuantity > 0 ? Number(costPrice || 0) : 0,
          stocks: [{ warehouseId, quantity: numQuantity }],
        };
        product.batches.push(newBatch);
      }
    } else {
      // Nếu tìm thấy lô hàng -> Cập nhật số lượng trong lô đó
      const currentBatch = product.batches[batchIndex];

      if (numQuantity > 0 && costPrice != null) {
        currentBatch.costPrice = Number(costPrice);
      }

      const bWhIndex = currentBatch.stocks.findIndex(
        (s) => s.warehouseId.toString() === warehouseId.toString(),
      );
      if (bWhIndex !== -1) {
        currentBatch.stocks[bWhIndex].quantity += numQuantity;
      } else {
        if (numQuantity > 0) {
          currentBatch.stocks.push({ warehouseId, quantity: numQuantity });
        }
      }
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
    if (unit) product.unit = unit;

    // Cập nhật giá vốn chung của sản phẩm là giá vốn nhập gần nhất
    if (numQuantity > 0 && costPrice != null) {
      product.costPrice = Number(costPrice);
    }

    // Quan trọng: Báo cho Mongoose biết các mảng đã thay đổi để thực hiện lưu xuống DB
    product.markModified("batches");
    product.markModified("stocks");

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
