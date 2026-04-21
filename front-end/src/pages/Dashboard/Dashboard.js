import React, { useState, useEffect } from "react";
import { dashboardApi } from "../../services/dashboardApi";
import { productApi } from "../../services/productApi";
import { importApi } from "../../services/importApi";
import "./Dashboard.css";

const getExpiryInfoFromDate = (expiryDate) => {
  if (!expiryDate) return null;
  const days = Math.ceil((new Date(expiryDate) - new Date()) / 86400000);
  if (days <= 0) return { label: "Hết hạn", cls: "expiry-expired", days };
  if (days <= 10) return { label: `Còn ${days} ngày`, cls: "expiry-red", days };
  if (days <= 30)
    return { label: `Còn ${days} ngày`, cls: "expiry-yellow", days };
  return { label: `Còn ${days} ngày`, cls: "expiry-green", days };
};

const getExpiryInfoFromDays = (expiryDays) => {
  if (!expiryDays || expiryDays <= 0) return null;
  if (expiryDays <= 10)
    return { label: `Còn ${expiryDays} ngày`, cls: "expiry-red" };
  if (expiryDays <= 30)
    return { label: `Còn ${expiryDays} ngày`, cls: "expiry-yellow" };
  return { label: `HSD: ${expiryDays} ngày`, cls: "expiry-green" };
};

const getExpiryScore = (expiryDays) => {
  if (!expiryDays) return Infinity;
  if (expiryDays <= 0) return -1;
  return expiryDays;
};

const statusLabel = (s) =>
  ({ active: "Hoạt động", inactive: "Ngừng KD", discontinued: "Ngừng SX" })[
    s
  ] || s;

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    todayImports: 0,
    totalValue: 0,
  });
  const [stockProducts, setStockProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [recentImports, setRecentImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);

        const [statsData, lowStockData, importsRes, productsRes] =
          await Promise.all([
            dashboardApi.getStats(),
            dashboardApi.getLowStockProducts(6),
            importApi.getAll({ limit: 5, sort: "-importDate" }),
            productApi.getAll({ status: "active" }),
          ]);

        setStats(statsData);
        setLowStockProducts(lowStockData);

        const imports = importsRes.data.data || [];
        setRecentImports(imports);

        const allProducts = productsRes.data.data || [];
        const inStock = allProducts
          .filter((p) => (p.stock ?? 0) > 0)
          .sort(
            (a, b) =>
              getExpiryScore(a.expiryDays) - getExpiryScore(b.expiryDays),
          );
        setStockProducts(inStock);

        setError(null);
      } catch (err) {
        console.error(err);
        setError("Không thể tải dữ liệu dashboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);
if (loading)
    return <div className="dashboard-loading">Đang tải dữ liệu...</div>;
  if (error) return <div className="dashboard-error">{error}</div>;

  const nearExpiryCount = stockProducts.filter(
    (p) => p.expiryDays && p.expiryDays <= 30,
  ).length;

  return (
    <div className="dashboard-root">
      <h1 className="dashboard-title">👋 Xin chào, Quản lý kho!</h1>

      {/* ── Stat cards ── */}
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
        <div className="stat-card danger">
          <div className="stat-icon">🕐</div>
          <div className="stat-content">
            <h3>Sắp hết hạn</h3>
            <div className="stat-value">{nearExpiryCount}</div>
            <p className="stat-desc">Trong vòng 30 ngày</p>
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
      </div>

      {/* ── Sản phẩm trong kho ── */}
      <div className="db-section db-full-section">
        <div className="db-section-header">
          <h2 className="db-section-title">🏪 Sản phẩm trong kho</h2>
          {nearExpiryCount > 0 && (
            <span className="db-near-expiry-badge">
              🔴 {nearExpiryCount} sản phẩm sắp hết hạn được đẩy lên đầu
            </span>
          )}
        </div>

        {stockProducts.length === 0 ? (
          <div className="db-empty">📭 Kho hiện không có sản phẩm nào</div>
        ) : (
          <div className="stock-product-grid">
            {stockProducts.map((p) => {
              const expiryInfo = getExpiryInfoFromDays(p.expiryDays);
              const isNearExpiry = p.expiryDays && p.expiryDays <= 30;
              const isLowStock = (p.stock ?? 0) <= (p.minStock || 10);
              const stockPct = Math.min(
                ((p.stock ?? 0) /
                  (p.maxStock || (p.minStock || 10) * 3 || 30)) *
                  100,
                100,
              );

              return (
                <div
                  key={p._id}
className={`stock-product-card${isNearExpiry ? " card-near-expiry" : ""}`}
                >
                  {/* Ảnh */}
                  <div className="stock-card-img-wrap">
                    {p.imageHash ? (
                      <img
                        src={productApi.imageUrl(p.imageHash)}
                        alt={p.name}
                        className="stock-card-img"
                      />
                    ) : (
                      <div className="stock-card-no-img">📷</div>
                    )}
                    <span
                      className={`stock-card-status-badge pp-status-${p.status}`}
                    >
                      {statusLabel(p.status)}
                    </span>
                    {isNearExpiry && (
                      <span className="stock-card-urgent-badge">
                        ⚡ Gần HSD
                      </span>
                    )}
                  </div>

                  {/* Body: tất cả thông tin */}
                  <div className="stock-card-body">
                    <code className="pp-code">{p.code}</code>
                    <h3 className="stock-card-name">{p.name}</h3>

                    {p.description && (
                      <p className="stock-card-desc">{p.description}</p>
                    )}

                    <div className="stock-card-divider" />

                    {/* Hạn sử dụng */}
                    <div className="stock-info-row">
                      <span className="stock-info-label">🕐 Hạn sử dụng</span>
                      {expiryInfo ? (
                        <span className={`expiry-badge ${expiryInfo.cls}`}>
                          {expiryInfo.label}
                        </span>
                      ) : (
                        <span className="stock-info-val muted">Không có</span>
                      )}
                    </div>

                    {/* Tồn kho + progress */}
                    <div className="stock-info-row">
                      <span className="stock-info-label">📦 Tồn kho</span>
                      <span
                        className={`stock-info-val${isLowStock ? " val-danger" : " val-ok"}`}
                      >
                        {p.stock ?? 0}
                        {isLowStock && (
                          <span className="stock-low-pill">Thấp</span>
                        )}
                      </span>
                    </div>
                    <div className="stock-progress">
                      <div
                        className={`stock-progress-fill ${isLowStock ? "danger" : "ok"}`}
                        style={{ width: `${stockPct}%` }}
                      />
                    </div>

                    {/* Tối thiểu / tối đa */}
                    <div className="stock-minmax-row">
                      <span>
                        Tối thiểu: <strong>{p.minStock ?? 10}</strong>
</span>
                      {p.maxStock ? (
                        <span>
                          Tối đa: <strong>{p.maxStock}</strong>
                        </span>
                      ) : null}
                    </div>

                    {/* Vị trí */}
                    {p.location && (
                      <div className="stock-info-row">
                        <span className="stock-info-label">📍 Vị trí</span>
                        <span className="stock-info-val">{p.location}</span>
                      </div>
                    )}

                    {/* Giá */}
                    {p.price && (
                      <div className="stock-info-row">
                        <span className="stock-info-label">💰 Giá bán</span>
                        <span className="stock-info-val val-price">
                          {p.price.toLocaleString("vi-VN")} ₫
                        </span>
                      </div>
                    )}
                    {p.costPrice && (
                      <div className="stock-info-row">
                        <span className="stock-info-label">🏷️ Giá vốn</span>
                        <span className="stock-info-val muted">
                          {p.costPrice.toLocaleString("vi-VN")} ₫
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 2 cột dưới ── */}
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
                      {new Date(imp.importDate).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <div className="recent-item-bot">
                    <span className="recent-meta">
                      {imp.items?.length} mặt hàng
                    </span>
                    <span className="recent-amount">
                      {imp.totalAmount?.toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                  <div className="recent-items-detail">
                    {(imp.items || []).map((item, i) => {
                      const info = getExpiryInfoFromDate(item.expiryDate);
                      return (
                        <div key={i} className="recent-product-row">
<code style={{ fontSize: 11 }}>
                            {item.productCode}
                          </code>
                          <span>SL: {item.quantity}</span>
                          <span>
                            {item.unitPrice?.toLocaleString("vi-VN")} ₫
                          </span>
                          {info && (
                            <span
                              className={`expiry-badge ${info.cls}`}
                              style={{ fontSize: 11 }}
                            >
                              {new Date(item.expiryDate).toLocaleDateString(
                                "vi-VN",
                              )}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tồn kho thấp */}
        {lowStockProducts.length > 0 && (
          <div className="db-section">
            <h2 className="db-section-title">⚠️ Sản phẩm tồn kho thấp</h2>
            <div className="low-stock-list">
              {lowStockProducts.map((product) => (
                <div key={product._id} className="low-stock-row">
                  <div className="low-stock-info">
                    <code className="pp-code">{product.code}</code>
                    <span className="low-stock-name">{product.name}</span>
                  </div>
                  <div className="low-stock-nums">
                    <span className="low-stock-current">{product.stock}</span>
                    <span className="low-stock-sep">/</span>
                    <span className="low-stock-min">
                      {product.minStock || 10}
                    </span>
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
      </div>
    </div>
  );
};

export default Dashboard;