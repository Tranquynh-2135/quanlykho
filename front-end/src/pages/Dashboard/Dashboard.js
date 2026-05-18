import React, { useState, useEffect } from "react";
import { importApi } from "../../services/importApi";
import { exportApi } from "../../services/exportApi";
import { productApi } from "../../services/productApi";
import { useAuth } from "../../context/AuthContext";
import "./Dashboard.css";

const Dashboard = () => {
  const { user, isChuKho } = useAuth();
  const warehouseId = user?.warehouseId;

  const [stats, setStats] = useState({
    totalRevenue: 0,
    todayRevenue: 0,
    thisWeekRevenue: 0,
    thisMonthRevenue: 0,
    todayImports: 0,
    todayExports: 0,
    totalProducts: 0,
  });

  const [recentImports, setRecentImports] = useState([]);
  const [recentExports, setRecentExports] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [nearExpiryProducts, setNearExpiryProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [warehouseId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [importRes, exportRes, productRes] = await Promise.all([
        importApi.getAll({ limit: 6 }),
        exportApi.getAll(),
        productApi.getAll({ status: "active" }),
      ]);

      const imports = importRes.data?.data || [];
      let exports = exportRes.data?.data || [];
      const products = productRes.data?.data || [];

      // Lọc theo kho cho Quản lý kho
      if (!isChuKho && warehouseId) {
        exports = exports.filter((exp) => exp.warehouseId === warehouseId);
      }

      // Tính doanh thu từ phiếu xuất
      let totalRevenue = 0;
      let todayRevenue = 0;
      let thisWeekRevenue = 0;
      let thisMonthRevenue = 0;

      const today = new Date().toISOString().split("T")[0];
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const startOfMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1,
      );

      exports.forEach((exp) => {
        const amount = Number(exp.totalAmount || 0);
        totalRevenue += amount;

        const expDate = new Date(exp.createdAt);
        const expDateStr = expDate.toISOString().split("T")[0];

        if (expDateStr === today) todayRevenue += amount;

        if (expDate >= startOfWeek) thisWeekRevenue += amount;
        if (expDate >= startOfMonth) thisMonthRevenue += amount;
      });

      setStats({
        totalRevenue,
        todayRevenue,
        thisWeekRevenue,
        thisMonthRevenue,
        todayImports: imports.length,
        todayExports: exports.length,
        totalProducts: products.length,
      });

      setRecentImports(imports.slice(0, 5));
      setRecentExports(exports.slice(0, 5));

      // Sản phẩm tồn thấp
      const lowStock = products
        .filter(
          (p) => (p.stock || 0) > 0 && (p.stock || 0) <= (p.minStock || 15),
        )
        .slice(0, 6);
      setLowStockProducts(lowStock);

      // Sản phẩm gần hết hạn
      const nearExpiry = products
        .filter((p) => p.expiryDays && p.expiryDays <= 45)
        .sort((a, b) => a.expiryDays - b.expiryDays)
        .slice(0, 6);
      setNearExpiryProducts(nearExpiry);
    } catch (err) {
      console.error("Lỗi tải dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return <div className="dashboard-loading">Đang tải dữ liệu...</div>;

  return (
    <div className="dashboard-root">
      <h1 className="dashboard-title">
        {isChuKho
          ? "Tổng quan hệ thống"
          : `Tổng quan kho ${user?.warehouseName || ""}`}
      </h1>

      {/* Thẻ thống kê Doanh thu */}
      <div className="stats-grid">
        <div className="stat-card success">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Doanh thu hôm nay</h3>
            <div className="stat-value">
              {stats.todayRevenue.toLocaleString("vi-VN")}
            </div>
            <p className="stat-desc">đ</p>
          </div>
        </div>

        <div className="stat-card primary">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <h3>Doanh thu tuần này</h3>
            <div className="stat-value">
              {stats.thisWeekRevenue.toLocaleString("vi-VN")}
            </div>
            <p className="stat-desc">đ</p>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">📆</div>
          <div className="stat-content">
            <h3>Doanh thu tháng này</h3>
            <div className="stat-value">
              {stats.thisMonthRevenue.toLocaleString("vi-VN")}
            </div>
            <p className="stat-desc">đ</p>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Tổng doanh thu</h3>
            <div className="stat-value">
              {stats.totalRevenue.toLocaleString("vi-VN")}
            </div>
            <p className="stat-desc">đ</p>
          </div>
        </div>
      </div>

      {/* 2 cột chính */}
      <div className="db-two-col">
        {/* Phiếu nhập gần đây */}
        <div className="db-section">
          <h2 className="db-section-title">📥 Phiếu nhập gần đây</h2>
          {recentImports.length === 0 ? (
            <div className="db-empty">Chưa có phiếu nhập nào</div>
          ) : (
            <div className="recent-list">
              {recentImports.map((imp) => (
                <div key={imp._id} className="recent-item">
                  <div className="recent-item-top">
                    <strong className="recent-code">{imp.code}</strong>
                    <span className="recent-date">
                      {new Date(
                        imp.importDate || imp.createdAt,
                      ).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <div className="recent-amount">
                    {imp.totalAmount?.toLocaleString("vi-VN")} ₫
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Phiếu xuất gần đây */}
        <div className="db-section">
          <h2 className="db-section-title">📤 Phiếu xuất gần đây</h2>
          {recentExports.length === 0 ? (
            <div className="db-empty">Chưa có phiếu xuất nào</div>
          ) : (
            <div className="recent-list">
              {recentExports.map((exp) => (
                <div key={exp._id} className="recent-item">
                  <div className="recent-item-top">
                    <strong
                      className="recent-code"
                      style={{ color: "#3b6ef8" }}
                    >
                      {exp.code}
                    </strong>
                    <span className="recent-date">
                      {new Date(exp.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <div className="recent-amount">
                    {exp.totalAmount?.toLocaleString("vi-VN")} ₫
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sản phẩm tồn thấp & Gần hết hạn */}
      <div className="db-section db-full-section">
        <div className="db-section-header">
          <h2 className="db-section-title">⚠️ Cảnh báo tồn kho</h2>
        </div>

        <div className="db-two-col">
          {/* Tồn thấp */}
          <div className="db-section">
            <h3>Tồn kho thấp</h3>
            {lowStockProducts.length === 0 ? (
              <p>Không có sản phẩm tồn thấp</p>
            ) : (
              lowStockProducts.map((p) => (
                <div key={p._id} className="low-stock-row">
                  <strong>{p.code}</strong> - {p.name}
                  <span style={{ color: "#ef4444", float: "right" }}>
                    {p.stock} / {p.minStock || 10}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Gần hết hạn */}
          <div className="db-section">
            <h3>Gần hết hạn</h3>
            {nearExpiryProducts.length === 0 ? (
              <p>Không có sản phẩm gần hết hạn</p>
            ) : (
              nearExpiryProducts.map((p) => (
                <div key={p._id} className="low-stock-row">
                  <strong>{p.code}</strong> - {p.name}
                  <span style={{ color: "#f59e0b", float: "right" }}>
                    Còn {p.expiryDays} ngày
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
