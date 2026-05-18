// src/pages/Inventory/Inventory.js
import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { productApi } from "../../services/productApi";
import { warehouseApi } from "../../services/warehouseApi";
import "./Inventory.css";

const Inventory = () => {
  const { user, isChuKho } = useAuth();

  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(
    user?.warehouseId || "",
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodRes, whRes] = await Promise.all([
        productApi.getAll({ status: "active" }),
        warehouseApi.getAll(),
      ]);

      const prodData = prodRes.data?.data || prodRes.data || [];
      const whData = whRes.data?.data || whRes.data || [];

      setProducts(prodData);
      setWarehouses(whData);

      if (!isChuKho() && user?.warehouseId) {
        setSelectedWarehouse(user.warehouseId);
      }
    } catch (err) {
      console.error("Lỗi tải tồn kho:", err);
    } finally {
      setLoading(false);
    }
  };

  // === HÀM LẤY TỒN KHO - HỖ TRỢ CẢ DỮ LIỆU CŨ VÀ MỚI ===
  const getStockQuantity = (product, warehouseId) => {
    // 1. Ưu tiên dữ liệu mới (stocks array)
    if (
      product.stocks &&
      Array.isArray(product.stocks) &&
      product.stocks.length > 0
    ) {
      if (!warehouseId) {
        return product.stocks.reduce((sum, s) => sum + (s.quantity || 0), 0);
      }
      const found = product.stocks.find((s) => s.warehouseId === warehouseId);
      return found ? found.quantity : 0;
    }

    // 2. Fallback cho dữ liệu cũ (warehouseId đơn lẻ)
    if (warehouseId) {
      return product.warehouseId === warehouseId ? product.stock || 0 : 0;
    }
    return product.stock || 0;
  };

  const filteredProducts = products
    .filter((p) => {
      const matchSearch =
        !search ||
        (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.code || "").toLowerCase().includes(search.toLowerCase());

      const stockQty = getStockQuantity(p, selectedWarehouse);

      if (selectedWarehouse) {
        return matchSearch && stockQty > 0;
      }
      return matchSearch;
    })
    .sort((a, b) => {
      const stockA = getStockQuantity(a, selectedWarehouse);
      const stockB = getStockQuantity(b, selectedWarehouse);
      return stockA - stockB;
    });

  const lowStockCount = filteredProducts.filter((p) => {
    const qty = getStockQuantity(p, selectedWarehouse);
    return qty > 0 && qty <= (p.minStock || 10);
  }).length;

  return (
    <div className="inv-root">
      <div className="inv-header">
        <div className="inv-title-block">
          <span className="inv-title-icon">📦</span>
          <div>
            <h1 className="inv-title">Tồn kho</h1>
            <p className="inv-subtitle">
              {filteredProducts.length} sản phẩm • {lowStockCount} tồn thấp
            </p>
          </div>
        </div>
      </div>

      <div className="inv-filters">
        <input
          className="inv-search"
          placeholder="Tìm theo tên hoặc mã sản phẩm..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {isChuKho() && warehouses.length > 0 && (
          <select
            className="inv-select"
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
          >
            <option value="">Tất cả kho</option>
            {warehouses.map((wh) => (
              <option key={wh._id} value={wh._id}>
                {wh.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div
          style={{ textAlign: "center", padding: "100px", color: "#64748b" }}
        >
          Đang tải dữ liệu tồn kho...
        </div>
      ) : (
        <div className="inv-product-grid">
          {filteredProducts.length === 0 ? (
            <div
              style={{
                gridColumn: "1 / -1",
                textAlign: "center",
                padding: "80px",
                color: "#94a3b8",
              }}
            >
              Không có sản phẩm nào trong kho này.
            </div>
          ) : (
            filteredProducts.map((product) => {
              const currentStock = getStockQuantity(product, selectedWarehouse);
              const isLow =
                currentStock > 0 && currentStock <= (product.minStock || 10);
              const percentage = Math.min(
                (currentStock / Math.max((product.minStock || 10) * 3, 30)) *
                  100,
                100,
              );

              return (
                <div key={product._id} className="inv-product-card">
                  <div className="inv-card-header">
                    <div>
                      <div className="inv-code">{product.code}</div>
                      <div className="inv-product-name">{product.name}</div>
                    </div>
                    {isLow && (
                      <span style={{ color: "#ef4444", fontSize: "22px" }}>
                        ⚠️
                      </span>
                    )}
                  </div>

                  <div className="inv-stock-info">
                    <div className="inv-row">
                      <span className="inv-label">Tồn kho hiện tại</span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: isLow ? "#ef4444" : "#15803d",
                          fontSize: "17px",
                        }}
                      >
                        {currentStock} {product.unit || "đv"}
                      </span>
                    </div>

                    <div className="inv-stock-bar">
                      <div
                        className={`inv-stock-fill ${isLow ? "low" : percentage > 60 ? "good" : "medium"}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div className="inv-row">
                      <span className="inv-label">Tồn tối thiểu</span>
                      <span>{product.minStock || 10}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default Inventory;
