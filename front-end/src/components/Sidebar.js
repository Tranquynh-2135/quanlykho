import { Link } from "react-router-dom";
import {
  FaHome,
  FaBox,
  FaSignInAlt,
  FaSignOutAlt,
  FaChartBar,
  FaUsers,
} from "react-icons/fa";

const Sidebar = () => {
  return (
    <div
      className="bg-dark text-white position-fixed top-0 start-0 bottom-0 p-4"
      style={{ width: "260px" }}
    >
      <h3 className="mb-4 text-center">📦 KHO HÀNG</h3>

      <div className="nav flex-column">
        <Link to="/" className="nav-link text-white py-3">
          <FaHome className="me-3" /> Dashboard
        </Link>
        <Link to="/products" className="nav-link text-white py-3">
          <FaBox className="me-3" /> Quản lý Sản phẩm
        </Link>
        <Link to="/import" className="nav-link text-white py-3">
          <FaSignInAlt className="me-3" /> Nhập kho
        </Link>
        <Link to="/export" className="nav-link text-white py-3">
          <FaSignOutAlt className="me-3" /> Xuất kho
        </Link>
        <Link to="/reports" className="nav-link text-white py-3">
          <FaChartBar className="me-3" /> Báo cáo & Thống kê
        </Link>
      </div>

      <div className="mt-auto pt-4 border-top">
        <small className="text-muted">Đồ án tốt nghiệp</small>
      </div>
    </div>
  );
};

export default Sidebar;
