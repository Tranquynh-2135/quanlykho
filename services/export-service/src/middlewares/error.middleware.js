module.exports = (err, req, res, next) => {
  console.error("Error in export-service:", err.stack);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    statusCode,
    service: "export-service",
  });
};
