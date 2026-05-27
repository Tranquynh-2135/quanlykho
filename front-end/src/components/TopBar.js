import React from "react";
import { useAuth } from "../context/AuthContext";
import "./TopBar.css";

const TopBar = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  let roleLabel = "Nhân viên kho";

  if (user.role === "quan_ly_kho") {
    roleLabel = "Quản lý kho";
  } else if (user.role === "nhan_vien_kho") {
    const warehouseName = user.warehouseName || "Chưa gán";
    roleLabel = `Nhân viên kho ${warehouseName}`;
  }

  return (
    <div className="topbar">
      <div className="topbar-user">
        <div className="user-info">
          <span className="user-name">
            {user.fullName || user.name || "Người dùng"}
          </span>
          <span className="user-role">{roleLabel}</span>
        </div>

        <button className="logout-btn" onClick={logout}>
          Đăng xuất
        </button>
      </div>
    </div>
  );
};

export default TopBar;
