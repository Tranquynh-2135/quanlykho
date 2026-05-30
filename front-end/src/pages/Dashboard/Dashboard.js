import React, { useState, useEffect } from "react";
import { importApi } from "../../services/importApi";
import { exportApi } from "../../services/exportApi";
import { useNavigate } from "react-router-dom";
import { productApi } from "../../services/productApi";
import { warehouseApi } from "../../services/warehouseApi";
import { useAuth } from "../../context/AuthContext";
import { getExpiryInfo } from "../../utils/expiryHelper";
import "./Dashboard.css";

const Dashboard = () => {
  const { user, isQuanLyKho } = useAuth();
  const navigate = useNavigate();
  const warehouseId = user?.warehouseId;

  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");

  const [stats, setStats] = useState({
    totalRevenue: 0,
    todayRevenue: 0,
    thisWeekRevenue: 0,
    thisMonthRevenue: 0,
    todayImports: 0,
    todayExports: 0,
    lowStockCount: 0,
    expiringSoonCount: 0,
    totalProducts: 0,
  });

  const [recentImports, setRecentImports] = useState([]);
  const [recentExports, setRecentExports] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [expiringProducts, setExpiringProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [importRes, exportRes, productRes, warehouseRes] =
        await Promise.all([
          importApi.getAll({ limit: 1000 }), // Tăng limit để thống kê chính xác
          exportApi.getAll({ limit: 1000 }),
          productApi.getAll({ status: "active", limit: 1000 }), // Khớp với Inventory
          warehouseApi.getAll(),
        ]);

      let imports = importRes.data?.data || [];
      let exports = exportRes.data?.data || [];
      const products = productRes.data?.data || productRes.data || [];
      const whList = warehouseRes.data?.data || [];
      setWarehouses(whList);

      // ==================== LỌC THEO KHO ====================
      // Nếu là NV kho -> ép buộc lọc theo kho của họ. Nếu là QL -> lọc theo selectedWarehouse (nếu có chọn)
      const filterId = isQuanLyKho() ? selectedWarehouse : warehouseId;

      if (filterId) {
        imports = imports.filter(
          (imp) => String(imp.warehouseId) === String(filterId),
        );
        exports = exports.filter(
          (exp) => String(exp.warehouseId) === String(filterId),
        );
      }

      // ==================== TÍNH DOANH THU ====================
      let totalRevenue = 0;
      let todayRevenue = 0;
      let thisWeekRevenue = 0;
      let thisMonthRevenue = 0;
      let todayImportsCount = 0;
      let todayExportsCount = 0;

      // Lấy ngày hiện tại theo giờ địa phương (YYYY-MM-DD)
      const now = new Date();
      const todayStr = now.toLocaleDateString("en-CA");

      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const startOfMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1,
      );

      exports.forEach((exp) => {
        const amount = Number(exp.totalAmount || 0);
        totalRevenue += amount;

        const expDate = new Date(exp.createdAt || exp.exportDate);
        const expDateStr = expDate.toLocaleDateString("en-CA");

        if (expDateStr === todayStr) {
          todayRevenue += amount;
          todayExportsCount++;
        }
        if (expDate >= startOfWeek) thisWeekRevenue += amount;
        if (expDate >= startOfMonth) thisMonthRevenue += amount;
      });

      imports.forEach((imp) => {
        const impDate = new Date(imp.importDate || imp.createdAt);
        if (impDate.toLocaleDateString("en-CA") === todayStr)
          todayImportsCount++;
      });

      // ==================== LOGIC LÀM PHẲNG DỮ LIỆU (GIỐNG INVENTORY) ====================
      let flattenedStockItems = [];
      products.forEach((p) => {
        if (filterId) {
          const qty = getStockAtWarehouse(p, filterId);
          if (qty > 0) {
            flattenedStockItems.push({
              ...p,
              currentWhId: filterId,
              currentQty: qty,
            });
          }
        } else {
          if (p.stocks && Array.isArray(p.stocks)) {
            p.stocks.forEach((s) => {
              if (s.quantity > 0) {
                flattenedStockItems.push({
                  ...p,
                  currentWhId: s.warehouseId,
                  currentQty: s.quantity,
                });
              }
            });
          } else if (p.stock > 0) {
            flattenedStockItems.push({
              ...p,
              currentWhId: p.warehouseId,
              currentQty: p.stock,
            });
          }
        }
      });

      // ==================== TÍNH TOÁN DỰA TRÊN DỮ LIỆU ĐÃ LÀM PHẲNG ====================
      // 1. Tồn kho thấp
      const lowStockList = flattenedStockItems.filter(
        (item) => item.currentQty <= (item.minStock || 10),
      );

      // 2. Sắp hết hạn
      const expiringSoonList = [];
      flattenedStockItems.forEach((item) => {
        if (item.batches && Array.isArray(item.batches)) {
          const worstBatch = item.batches.find((b) => {
            const hasStock = b.stocks?.some(
              (s) =>
                String(s.warehouseId) === String(item.currentWhId) &&
                s.quantity > 0,
            );
            if (!hasStock || !b.expiryDate) return false;
            const info = getExpiryInfo(b.expiryDate);
            return info && info.daysLeft <= 30;
          });
          if (worstBatch) {
            expiringSoonList.push({
              ...item,
              earliestExp: worstBatch.expiryDate,
            });
          }
        }
      });

      setStats({
        totalRevenue,
        todayRevenue,
        thisWeekRevenue,
        thisMonthRevenue,
        todayImports: todayImportsCount,
        todayExports: todayExportsCount,
        totalProducts: products.length,
        lowStockCount: lowStockList.length,
        expiringSoonCount: expiringSoonList.length,
      });

      setRecentImports(imports.slice(0, 5));
      setRecentExports(exports.slice(0, 5));
      setLowStockProducts(lowStockList.slice(0, 6));
      setExpiringProducts(expiringSoonList.slice(0, 6));
    } catch (err) {
      console.error("Lỗi tải dashboard:", err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [warehouseId, isQuanLyKho, selectedWarehouse]); // Reload khi đổi user/kho hoặc chọn kho mới

  if (loading) {
    return <div className="dashboard-loading">Đang tải dữ liệu...</div>;
  }

  if (error) {
    return (
      <div className="dashboard-error">
        ❌ Lỗi tải dữ liệu: {error}. Vui lòng kiểm tra kết nối Server và
        JWT_SECRET.
      </div>
    );
  }

  return (
    <div className="dashboard-root">
      <div className="dashboard-header-row">
        <h1 className="dashboard-title">
          {isQuanLyKho()
            ? selectedWarehouse
              ? `Tổng quan ${warehouses.find((w) => w._id === selectedWarehouse)?.name}`
              : "Tổng quan toàn hệ thống"
            : `Tổng quan kho ${user?.warehouseName || ""}`}
        </h1>

        {/* Dropdown chọn kho cho Quản lý */}
        {isQuanLyKho() && (
          <div className="dashboard-filter">
            <label>Xem theo kho: </label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="db-warehouse-select"
            >
              <option value="">Toàn bộ kho</option>
              {warehouses.map((wh) => (
                <option key={wh._id} value={wh._id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Thẻ thống kê */}
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

      {/* 2 cột: Phiếu nhập & Phiếu xuất gần đây */}
      <div className="db-two-col">
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

      {/* Các thẻ cảnh báo có thể nhấp (Đã chuyển xuống dưới) */}
      <div className="stats-grid" style={{ marginTop: "24px" }}>
        <div
          className="stat-card warning clickable"
          onClick={() =>
            navigate("/inventory", {
              state: {
                filterCriteria: "low_stock",
                selectedWarehouse: selectedWarehouse,
              },
            })
          }
        >
          <div className="stat-icon">📉</div>
          <div className="stat-content">
            <h3>Cảnh báo tồn thấp</h3>
            <div className="stat-value">{stats.lowStockCount}</div>
            <p className="stat-desc">sản phẩm</p>
          </div>
        </div>

        <div
          className="stat-card danger clickable"
          onClick={() =>
            navigate("/inventory", {
              state: {
                filterCriteria: "expiry_30",
                selectedWarehouse: selectedWarehouse,
              },
            })
          }
        >
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>Sắp hết hạn (30 ngày)</h3>
            <div className="stat-value">{stats.expiringSoonCount}</div>
            <p className="stat-desc">sản phẩm</p>
          </div>
        </div>
      </div>

      {/* Danh sách chi tiết Cảnh báo tồn kho & HSD */}
      <div className="db-section db-full-section">
        <div className="db-section-header">
          <h2 className="db-section-title">
            ⚠️ Chi tiết các mặt hàng cần lưu ý
          </h2>
        </div>

        <div className="db-two-col">
          <div className="db-section">
            <h3>Tồn kho thấp</h3>
            {lowStockProducts.length === 0 ? (
              <p>Không có sản phẩm tồn thấp</p>
            ) : (
              lowStockProducts.map((p) => (
                <div key={p._id} className="low-stock-row">
                  <strong>{p.code}</strong> - {p.name}
                  <small style={{ color: "#64748b", marginLeft: "5px" }}>
                    ({warehouses.find((w) => w._id === p.currentWhId)?.name})
                  </small>
                  <span style={{ color: "#ef4444", float: "right" }}>
                    {p.currentQty} / {p.minStock || 10}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="db-section">
            <h3>Sản phẩm sắp hết hạn</h3>
            {expiringProducts.length === 0 ? (
              <p>Không có sản phẩm sắp hết hạn</p>
            ) : (
              expiringProducts.map((p) => {
                const expInfo = getExpiryInfo(p.earliestExp);
                return (
                  <div
                    key={p._id}
                    className="low-stock-row"
                    style={{
                      borderLeftColor: "#eab308",
                      background: "#fefce8",
                    }}
                  >
                    <strong>{p.code}</strong> - {p.name}
                    <span
                      style={{
                        color: "#eab308",
                        float: "right",
                        fontWeight: "bold",
                      }}
                    >
                      {expInfo ? expInfo.label : ""}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function
const getStockAtWarehouse = (product, warehouseId) => {
  // 1. Ưu tiên dữ liệu mới (mảng stocks)
  if (
    product.stocks &&
    Array.isArray(product.stocks) &&
    product.stocks.length > 0
  ) {
    if (!warehouseId) {
      // Nếu không lọc kho -> tính tổng tất cả kho
      return product.stocks.reduce((sum, s) => sum + (s.quantity || 0), 0);
    }
    // Tìm tồn của kho cụ thể
    const stockEntry = product.stocks.find(
      (s) => String(s.warehouseId) === String(warehouseId),
    );
    return stockEntry ? stockEntry.quantity : 0;
  }

  // 2. Fallback cho dữ liệu cũ (warehouseId và stock đơn lẻ trên product)
  if (warehouseId && product.warehouseId) {
    return String(product.warehouseId) === String(warehouseId)
      ? product.stock || 0
      : 0;
  }

  return product.stock || 0;
};

export default Dashboard;
