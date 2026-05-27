const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  // Lấy header Authorization
  const authHeader = req.headers.authorization;

  // Kiểm tra xem header có tồn tại và bắt đầu bằng 'Bearer ' không
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: No token provided or invalid format",
    });
  }

  // Tách lấy token từ chuỗi 'Bearer <token>'
  const token = authHeader.split(" ")[1];

  try {
    // Xác thực token. Sử dụng JWT_SECRET từ file .env của service này.
    // Đảm bảo JWT_SECRET giống hệt với mã ở user-service.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Gắn thông tin người dùng đã giải mã vào đối tượng request
    next(); // Chuyển quyền điều khiển sang middleware hoặc route tiếp theo
  } catch (err) {
    // Xử lý các lỗi khi xác thực token
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: Token has expired" });
    }
    return res
      .status(403)
      .json({ success: false, message: "Forbidden: Invalid token" });
  }
};

module.exports = verifyToken;
