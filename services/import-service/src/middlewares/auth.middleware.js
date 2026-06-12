const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  // Lấy header Authorization
  const authHeader = req.headers.authorization;
  let token;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    // Tách lấy token từ chuỗi 'Bearer <token>'
    token = authHeader.split(" ")[1];
  } else if (req.query.token) {
    // Cho phép lấy token từ query parameter để hỗ trợ xuất Excel
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: No token provided or invalid format",
    });
  }

  try {
    // Xác thực token. Sử dụng JWT_SECRET từ file .env của service này.
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
