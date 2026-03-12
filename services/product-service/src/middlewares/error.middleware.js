module.exports = (err, req, res, next) => {
  console.error('Error:', err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  let response = {
    success: false,
    message,
    statusCode
  };

  // Lỗi validation của Mongoose
  if (err.name === 'ValidationError') {
    response.errors = Object.values(err.errors).map(e => e.message);
    response.statusCode = 400;
  }

  // Duplicate key (unique constraint)
  if (err.code === 11000) {
    response.message = 'Giá trị trùng lặp (có thể là code hoặc barcode)';
    response.statusCode = 400;
  }

  res.status(response.statusCode).json(response);
};