const User = require("../models/user.model");

// GET ALL
const getAll = async (req, res, next) => {
  try {
    const { search, status, role } = req.query;
    const query = {};
    if (status) query.status = status;
    if (role) query.role = role;
    if (search)
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
        { phone: { $regex: search.trim(), $options: "i" } },
      ];
    const users = await User.find(query)
      // .select("-password") // KHÔNG trả về password
      .sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

// GET BY ID
const getById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy người dùng" });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// CREATE
const create = async (req, res, next) => {
  try {
    console.log("📥 Body nhận được:", req.body);

    // Nếu là quản lý kho mà không có email → tạo email giả
    if (req.body.role === "quan_ly_kho" && !req.body.email) {
      req.body.email = `${req.body.username || "user"}@kho.com`;
    }

    const user = await new User(req.body).save();

    const { password, ...result } = user.toObject();
    res.status(201).json({
      success: true,
      data: result,
      message: "Tạo tài khoản thành công",
    });
  } catch (err) {
    console.error("❌ Lỗi create:", err.message);
    next(err);
  }
};

// UPDATE — không cho đổi password qua đây
// UPDATE
const update = async (req, res, next) => {
  try {
    const { password, ...safeData } = req.body;

    let updateData = { ...safeData };

    // Nếu có nhập mật khẩu mới → cập nhật cả password và plainPassword
    if (password && password.trim() !== "") {
      updateData.password = password.trim();
      updateData.plainPassword = password.trim();
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy người dùng" });
    }

    const { password: hashed, ...result } = user.toObject();

    res.json({
      success: true,
      data: result,
      message: "Cập nhật thông tin thành công!",
    });
  } catch (err) {
    next(err);
  }
};

// CHANGE PASSWORD — route riêng
const changePassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res
        .status(400)
        .json({ success: false, message: "Mật khẩu tối thiểu 6 ký tự" });
    const user = await User.findById(req.params.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy người dùng" });
    user.password = newPassword; // pre-save hook tự hash
    await user.save();
    res.json({ success: true, message: "Đổi mật khẩu thành công" });
  } catch (err) {
    next(err);
  }
};

// DELETE
const remove = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy người dùng" });
    res.json({ success: true, message: "Đã xóa người dùng" });
  } catch (err) {
    next(err);
  }
};

// ====================== LOGIN ======================
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập tên tài khoản và mật khẩu",
      });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Tên tài khoản hoặc mật khẩu không đúng",
      });
    }

    // So sánh mật khẩu
    if (user.password !== password && user.plainPassword !== password) {
      return res.status(400).json({
        success: false,
        message: "Tên tài khoản hoặc mật khẩu không đúng",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị khóa",
      });
    }

    const { password: hashed, plainPassword, ...userData } = user.toObject();

    res.json({
      success: true,
      data: userData,
      message: "Đăng nhập thành công",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  changePassword,
  remove,
  login,
};
