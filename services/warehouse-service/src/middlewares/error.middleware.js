module.exports = (err, req, res, next) => {
  console.error("❌ Warehouse Service Error:", err.stack);

  // Xử lý lỗi trùng lặp (ví dụ: trùng tên kho)
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: "Tên kho hoặc mã kho đã tồn tại",
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};