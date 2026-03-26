const Warehouse = require("../models/warehouse.model");

const getAll = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) query.name = { $regex: search.trim(), $options: "i" };
    const warehouses = await Warehouse.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: warehouses });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse)
      return res.status(404).json({ success: false, message: "Không tìm thấy kho" });
    res.json({ success: true, data: warehouse });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const warehouse = await new Warehouse(req.body).save();
    res.status(201).json({ success: true, data: warehouse });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const warehouse = await Warehouse.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!warehouse)
      return res.status(404).json({ success: false, message: "Không tìm thấy kho" });
    res.json({ success: true, data: warehouse });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const warehouse = await Warehouse.findByIdAndDelete(req.params.id);
    if (!warehouse)
      return res.status(404).json({ success: false, message: "Không tìm thấy kho" });
    res.json({ success: true, message: "Đã xóa kho" });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove };