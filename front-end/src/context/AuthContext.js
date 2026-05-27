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
    const storedUser = sessionStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    let processedUser = { ...userData };

    if (userData.role === "quan_ly_kho") {
      processedUser.warehouseName = userData.warehouseName || "Chưa gán";
      processedUser.fullName =
        userData.name || userData.fullName || "Quản lý kho";
    } else if (userData.role === "nhan_vien_kho") {
      processedUser.warehouseName =
        userData.warehouseName ||
        userData.name?.replace("Nhân viên ", "") ||
        "Chưa gán";

      processedUser.fullName =
        userData.name || userData.fullName || "Nhân viên kho";
    }

    sessionStorage.setItem("user", JSON.stringify(processedUser));
    setUser(processedUser);
  };

  const logout = () => {
    sessionStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  // === Helper functions ===
  const isQuanLyKho = () => user?.role === "quan_ly_kho";
  const isNhanVienKho = () => user?.role === "nhan_vien_kho";

  // Kiểm tra quyền truy cập trang
  const canAccess = (pageKey) => {
    if (!user) return false;
    if (isQuanLyKho()) return true; // Quản lý kho có full quyền

    // Nhân viên kho chỉ xem được một số trang
    const allowedForNhanVien = ["dashboard", "import", "export", "inventory"];

    return allowedForNhanVien.includes(pageKey);
  };

  // Kiểm tra có được xem kho này không
  const canAccessWarehouse = (warehouseId) => {
    if (!user) return false;
    if (isQuanLyKho()) return true; // Quản lý kho xem tất cả kho
    if (isNhanVienKho()) {
      return user.warehouseId === warehouseId || !warehouseId;
    }
    return false;
  };

  const value = {
    user,
    login,
    logout,
    isQuanLyKho,
    isNhanVienKho,
    canAccess,
    canAccessWarehouse,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
