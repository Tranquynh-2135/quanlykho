import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth phải được dùng trong AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Kiểm tra user đã đăng nhập chưa khi reload trang
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    let processedUser = { ...userData };

    // Xử lý hiển thị tên kho cho Quản lý kho
    if (userData.role === "quan_ly_kho") {
      processedUser.warehouseName = userData.warehouseName || "Chưa gán";
      processedUser.fullName = userData.name || userData.fullName;
    } else if (userData.role === "chu_kho") {
      processedUser.fullName = userData.name || "Chủ Kho";
    }

    localStorage.setItem("user", JSON.stringify(processedUser));
    setUser(processedUser);
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  // === Helper functions ===
  const isChuKho = () => user?.role === "chu_kho";
  const isQuanLyKho = () => user?.role === "quan_ly_kho";
  const isNhanVien = () => user?.role === "nhan_vien";

  // Kiểm tra quyền truy cập trang
  const canAccess = (pageKey) => {
    if (!user) return false;
    if (isChuKho()) return true;

    // Quản lý kho chỉ xem được một số trang
    const allowedForManager = ["dashboard", "import", "export", "inventory"];

    return allowedForManager.includes(pageKey);
  };

  // Kiểm tra có được xem kho này không
  const canAccessWarehouse = (warehouseId) => {
    if (!user) return false;
    if (isChuKho()) return true;
    if (isQuanLyKho()) {
      return user.warehouseId === warehouseId || !warehouseId;
    }
    return false;
  };

  const value = {
    user,
    login,
    logout,
    isChuKho,
    isQuanLyKho,
    isNhanVien,
    canAccess,
    canAccessWarehouse,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
