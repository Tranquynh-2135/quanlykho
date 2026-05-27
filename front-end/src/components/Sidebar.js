import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FaHome,
  FaBox,
  FaWarehouse,
  FaTruck,
  FaSignInAlt,
  FaSignOutAlt,
  FaTags,
  FaUsers,
} from "react-icons/fa";
import "./Sidebar.css";

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();

  const menu = [
    {
      to: "/",
      icon: <FaHome />,
      label: "Dashboard",
      roles: ["quan_ly_kho", "nhan_vien_kho"],
    },
    {
      to: "/products",
      icon: <FaBox />,
      label: "Quản lý Sản phẩm",
      roles: ["quan_ly_kho"],
    },
    {
      to: "/inventory",
      icon: <FaWarehouse />,
      label: "Tồn kho",
      roles: ["quan_ly_kho", "nhan_vien_kho"],
    },
    {
      to: "/suppliers",
      icon: <FaTruck />,
      label: "Nhà cung cấp",
      roles: ["quan_ly_kho"],
    },
    {
      to: "/warehouses",
      icon: <FaWarehouse />,
      label: "Quản lý Kho",
      roles: ["quan_ly_kho"],
    },
    {
      to: "/import",
      icon: <FaSignInAlt />,
      label: "Nhập kho",
      roles: ["quan_ly_kho", "nhan_vien_kho"],
    },
    {
      to: "/export",
      icon: <FaSignOutAlt />,
      label: "Xuất kho",
      roles: ["quan_ly_kho", "nhan_vien_kho"],
    },
    {
      to: "/categories",
      icon: <FaTags />,
      label: "Quản lý Danh mục",
      roles: ["quan_ly_kho"],
    },
    {
      to: "/users",
      icon: <FaUsers />,
      label: "Người dùng",
      roles: ["quan_ly_kho"],
    },
  ];

  // Lọc menu theo role của user
  const filteredMenu = menu.filter((item) => item.roles.includes(user?.role));

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <span className="sidebar-logo-icon">📦</span>
        <span className="sidebar-logo-text">KHO HÀNG</span>
      </div>

      {/* Menu */}
      <nav className="sidebar-nav">
        {filteredMenu.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`sidebar-link ${location.pathname === item.to ? "active" : ""}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <span className="sidebar-icon">🎓</span>
        <span className="sidebar-label">Đồ án tốt nghiệp</span>
      </div>
    </div>
  );
};

export default Sidebar;
