// middlewares/error.middleware.js
module.exports = (err, req, res, next) => {  // phải có đủ 4 tham số
  if (err.code === 11000)
    return res.status(400).json({ success: false, message: "Email đã tồn tại" });
  if (err.name === "ValidationError")
    return res.status(400).json({
      success: false,
      message: Object.values(err.errors).map(e => e.message).join(", "),
    });
  res.status(err.statusCode || 500).json({ 
    success: false, 
    message: err.message || "Lỗi server" 
  });
};