import { Link, useLocation } from "react-router-dom";
import {
  FaHome, FaBox, FaWarehouse, FaTruck, FaSignInAlt, FaSignOutAlt, FaChartBar, FaUsers,
} from "react-icons/fa";
import "./Sidebar.css";

const menu = [
  { to: "/",         icon: <FaHome />,       label: "Dashboard"           },
  { to: "/products", icon: <FaBox />,        label: "Quản lý Sản phẩm"    },
  { to: "/suppliers",  icon: <FaTruck />,     label: "Nhà cung cấp"       },
  { to: "/warehouses", icon: <FaWarehouse />, label: "Quản lý Kho"        },
  { to: "/import",   icon: <FaSignInAlt />,  label: "Nhập kho"            },
  { to: "/export",   icon: <FaSignOutAlt />, label: "Xuất kho"            },
  { to: "/reports",  icon: <FaChartBar />,   label: "Báo cáo & Thống kê"  },
  { to: "/users",    icon: <FaUsers />,      label: "Người dùng"          },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <span className="sidebar-logo-icon">📦</span>
        <span className="sidebar-logo-text">KHO HÀNG</span>
      </div>

      {/* Menu */}
      <nav className="sidebar-nav">
        {menu.map((item) => (
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