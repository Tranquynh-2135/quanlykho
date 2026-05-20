import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, pageKey }) => {
  const { user, loading, canAccess } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "18px",
          color: "#64748b",
        }}
      >
        Đang kiểm tra quyền truy cập...
      </div>
    );
  }

  // Chưa đăng nhập
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Không có quyền truy cập trang này
  if (pageKey && !canAccess(pageKey)) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: "#ef4444",
        }}
      >
        <h2>⛔️ Access Denied</h2>
        <p>Bạn không có quyền truy cập trang này.</p>
        <p>Chỉ Chủ Kho mới được xem trang "{pageKey}".</p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
