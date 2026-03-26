const Product = require("../models/product.model");

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
  } catch (err) { next(err); }
};

// GET BY ID
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm" });
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
};

// CREATE — strip các field cũ không còn dùng
const createProduct = async (req, res, next) => {
  try {
    const { stock, images, supplier, ...safeData } = req.body;
    const product = await new Product(safeData).save();
    res.status(201).json({ success: true, data: product });
  } catch (err) { next(err); }
};

// UPDATE
const updateProduct = async (req, res, next) => {
  try {
    const { stock, images, supplier, ...safeData } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id, safeData,
      { new: true, runValidators: true }
    );
    if (!product)
      return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm" });
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
};

// DELETE
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product)
      return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm" });
    res.json({ success: true, message: "Xóa sản phẩm thành công", data: { id: req.params.id } });
  } catch (err) { next(err); }
};

// UPLOAD IMAGE
const uploadImage = (req, res) => {
  if (!req.file)
    return res.status(400).json({ success: false, message: "Không có file ảnh" });
  res.json({ success: true, imageHash: req.file.filename });
};

module.exports = { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct, uploadImage };