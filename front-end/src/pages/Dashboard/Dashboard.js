import React, { useState, useEffect } from "react";
import { dashboardApi } from "../../services/dashboardApi";
import ExpiryBadge from "../../components/ExpiryBadge"; // nếu muốn dùng sau
import "./Dashboard.css";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    todayImports: 0,
    totalValue: 0,
  });

  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsData, lowStockData] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getLowStockProducts(6),
        ]);

        setStats(statsData);
        setLowStockProducts(lowStockData);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Không thể tải dữ liệu dashboard. Vui lòng kiểm tra backend.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Refresh dữ liệu mỗi 30 giây (tùy chọn)
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">Đang tải dữ liệu dashboard...</div>
    );
  }

  if (error) {
    return <div className="dashboard-error">{error}</div>;
  }

  return (
    <div className="dashboard-root">
      <h1 className="dashboard-title">👋 Xin chào, Quản lý kho!</h1>

      {/* Thẻ thống kê */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <h3>Tổng sản phẩm</h3>
            <div className="stat-value">
              {stats.totalProducts.toLocaleString("vi-VN")}
            </div>
            <p className="stat-desc">Trong hệ thống</p>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <h3>Tồn kho thấp</h3>
            <div className="stat-value">{stats.lowStock}</div>
            <p className="stat-desc">Cần nhập bổ sung</p>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">📥</div>
          <div className="stat-content">
            <h3>Nhập hôm nay</h3>
            <div className="stat-value">{stats.todayImports}</div>
            <p className="stat-desc">Phiếu nhập kho</p>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Giá trị tồn kho</h3>
            <div className="stat-value">
              {stats.totalValue.toLocaleString("vi-VN")} ₫
            </div>
            <p className="stat-desc">Theo giá bán</p>
          </div>
        </div>
      </div>

      {/* Cảnh báo tồn thấp */}
      {lowStockProducts.length > 0 && (
        <div className="low-stock-section">
          <h2>⚠️ Sản phẩm tồn kho thấp</h2>
          <div className="low-stock-grid">
            {lowStockProducts.map((product) => (
              <div key={product._id} className="low-stock-card">
                <div className="product-code">{product.code}</div>
                <div className="product-name">{product.name}</div>
                <div className="stock-info">
                  <span>
                    Tồn kho: <strong>{product.stock}</strong>
                  </span>
                  <span>Tối thiểu: {product.minStock || 10}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill danger"
                    style={{
                      width: `${Math.min((product.stock / (product.minStock || 10)) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Có thể thêm phần khác sau: Top sản phẩm nhập nhiều, biểu đồ... */}
    </div>
  );
};

export default Dashboard;
