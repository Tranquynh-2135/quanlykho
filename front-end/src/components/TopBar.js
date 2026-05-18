import React from "react";
import { useAuth } from "../context/AuthContext";
import "./TopBar.css";

const TopBar = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  let roleLabel = "Người dùng";

  if (user.role === "chu_kho") {
    roleLabel = "Chủ Kho";
  } else if (user.role === "quan_ly_kho") {
    const warehouseName =
      user.warehouseName || user.name?.includes("A")
        ? user.name?.replace("Quản lý ", "")
        : "Chưa gán kho";
    roleLabel = `Quản lý kho ${warehouseName}`;
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
