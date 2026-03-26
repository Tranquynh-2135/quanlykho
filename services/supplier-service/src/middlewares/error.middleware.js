module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message    = err.message    || "Internal Server Error";
  if (err.name === "ValidationError")
    return res.status(400).json({ success: false, message, errors: Object.values(err.errors).map(e => e.message) });
  if (err.code === 11000)
    return res.status(400).json({ success: false, message: "Tên nhà cung cấp đã tồn tại" });
  res.status(statusCode).json({ success: false, message });
};