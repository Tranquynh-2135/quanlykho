const Supplier = require("../models/supplier.model");

const getAll = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) query.name = { $regex: search.trim(), $options: "i" };
    const suppliers = await Supplier.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: suppliers });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier)
      return res.status(404).json({ success: false, message: "Không tìm thấy nhà cung cấp" });
    res.json({ success: true, data: supplier });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const supplier = await new Supplier(req.body).save();
    res.status(201).json({ success: true, data: supplier });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!supplier)
      return res.status(404).json({ success: false, message: "Không tìm thấy nhà cung cấp" });
    res.json({ success: true, data: supplier });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier)
      return res.status(404).json({ success: false, message: "Không tìm thấy nhà cung cấp" });
    res.json({ success: true, message: "Đã xóa nhà cung cấp" });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove };