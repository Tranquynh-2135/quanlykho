const User = require("../models/user.model");

// GET ALL
const getAll = async (req, res, next) => {
  try {
    const { search, status, role } = req.query;
    const query = {};
    if (status) query.status = status;
    if (role)   query.role   = role;
    if (search) query.$or = [
      { name:  { $regex: search.trim(), $options: "i" } },
      { email: { $regex: search.trim(), $options: "i" } },
      { phone: { $regex: search.trim(), $options: "i" } },
    ];
    const users = await User.find(query)
      .select("-password")   // KHÔNG trả về password
      .sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
};

// GET BY ID
const getById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user)
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// CREATE
const create = async (req, res, next) => {
  try {
    console.log("📥 Body nhận được:", req.body);
    const user = await new User(req.body).save();
    const { password, ...result } = user.toObject();
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error("❌ Lỗi create:", err.message);
    next(err); }
};

// UPDATE — không cho đổi password qua đây
const update = async (req, res, next) => {
  try {
    const { password, ...safeData } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id, safeData,
      { new: true, runValidators: true }
    ).select("-password");
    if (!user)
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// CHANGE PASSWORD — route riêng
const changePassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ success: false, message: "Mật khẩu tối thiểu 6 ký tự" });
    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    user.password = newPassword; // pre-save hook tự hash
    await user.save();
    res.json({ success: true, message: "Đổi mật khẩu thành công" });
  } catch (err) { next(err); }
};

// DELETE
const remove = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    res.json({ success: true, message: "Đã xóa người dùng" });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, changePassword, remove };