import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { productApi } from "../../services/productApi";
import { warehouseApi } from "../../services/warehouseApi";
import { getExpiryInfo } from "../../utils/expiryHelper";
import "./Inventory.css";

const PRODUCT_SERVICE_URL =
  process.env.REACT_APP_PRODUCT_SERVICE_URL ||
  "https://product-service-production-08db.up.railway.app";

const Inventory = () => {
  const { user, isQuanLyKho, isNhanVienKho } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  // const [showExportWhModal, setShowExportWhModal] = useState(null); // {product, batch} - This variable is not used, can be removed.
  const [selectedWarehouse, setSelectedWarehouse] = useState(""); // Initialize as empty, will be set by useEffects
  const [filterCriteria, setFilterCriteria] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData(search, selectedWarehouse);
  }, [search, selectedWarehouse]);

  // Initialize selectedWarehouse and filterCriteria based on user role or navigation state
  useEffect(() => {
    if (location.state?.filterCriteria) {
      setFilterCriteria(location.state.filterCriteria);
    }
    if (location.state?.selectedWarehouse !== undefined) {
      setSelectedWarehouse(location.state.selectedWarehouse);
    } else if (isNhanVienKho() && user?.warehouseId) {
      setSelectedWarehouse(user.warehouseId);
    }
  }, [user, isNhanVienKho, location.state]);

  const loadData = async (currentSearch, currentWh) => {
    try {
      setLoading(true);
      const [prodRes, whRes] = await Promise.all([
        productApi.getAll({
          status: "active",
          limit: 1000, // Tải tối đa 1000 sản phẩm để hiển thị danh sách đầy đủ
          search: currentSearch,
          warehouseId: currentWh,
        }),
        warehouseApi.getAll(),
      ]);

      const prodData = prodRes.data?.data || prodRes.data || [];
      const whData = whRes.data?.data || whRes.data || [];

      setProducts(prodData);
      setWarehouses(whData);
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

  // Helper xác định trạng thái hạn sử dụng tệ nhất của sản phẩm tại 1 KHO CỤ THỂ
  const getProductExpiryStatus = (product, whId) => {
    if (!product.batches || product.batches.length === 0) return null;
    const activeBatches = product.batches.filter((b) => {
      if (!b.stocks) return false;
      return b.stocks.some((s) => s.warehouseId === whId && s.quantity > 0);
    });

    if (activeBatches.length === 0) return null;

    let worst = null;
    activeBatches.forEach((b) => {
      if (!b.expiryDate) return;
      const info = getExpiryInfo(b.expiryDate);
      if (!info) return;
      if (!worst || info.daysLeft < worst.daysLeft) worst = info;
    });
    return worst;
  };

  // Tạo danh sách hiển thị: Nếu chọn "Tất cả kho", mỗi kho của sản phẩm sẽ là 1 thẻ riêng
  const { filteredList, totalLowStock, totalExpiring } = React.useMemo(() => {
    let results = [];

    products.forEach((p) => {
      if (selectedWarehouse) {
        // Nếu đã chọn 1 kho cụ thể
        const qty = getStockQuantity(p, selectedWarehouse);
        if (qty > 0) {
          results.push({
            ...p,
            currentWhId: selectedWarehouse,
            currentQty: qty,
          });
        }
      } else {
        // Nếu chọn "Tất cả các kho" -> Duyệt qua mảng stocks để tách thẻ
        if (p.stocks && Array.isArray(p.stocks)) {
          p.stocks.forEach((s) => {
            if (s.quantity > 0) {
              results.push({
                ...p,
                currentWhId: s.warehouseId,
                currentQty: s.quantity,
              });
            }
          });
        }
      }
    });

    const matches = results;

    // 2. Tính toán các con số thống kê cho Header dựa trên danh sách đã lấy từ Backend
    const lsc = matches.filter(
      (p) => p.currentQty <= (p.minStock || 10),
    ).length;
    const esc = matches.filter((p) => {
      const exp = getProductExpiryStatus(p, p.currentWhId);
      return exp && exp.daysLeft <= 30;
    }).length;

    // 3. Lọc theo tiêu chí nâng cao (Criteria) để hiển thị lưới
    const filtered = matches
      .filter((p) => {
        if (filterCriteria === "low_stock") {
          return p.currentQty <= 10;
        }
        if (filterCriteria === "expiry_30") {
          const exp = getProductExpiryStatus(p, p.currentWhId);
          return exp && exp.daysLeft <= 30;
        }
        if (filterCriteria === "expiry_10") {
          const exp = getProductExpiryStatus(p, p.currentWhId);
          return exp && exp.daysLeft <= 10;
        }

        return true;
      })
      .sort((a, b) => a.currentQty - b.currentQty);

    return {
      filteredList: filtered,
      totalLowStock: lsc,
      totalExpiring: esc,
    };
  }, [products, selectedWarehouse, search, filterCriteria]);

  const handleDispose = async (product, batch, whId, quantity) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn tiêu hủy ${quantity} ${product.unit || "đơn vị"} đã hết hạn này không?`,
      )
    )
      return;

    const userData = JSON.parse(sessionStorage.getItem("user"));
    const headers = { "Content-Type": "application/json" };
    if (userData?.token) headers["Authorization"] = `Bearer ${userData.token}`;

    try {
      const response = await fetch(
        `${PRODUCT_SERVICE_URL}/products/increase-stock/${product.code}`,
        {
          method: "PATCH",
          headers: headers,
          body: JSON.stringify({
            quantity: -quantity,
            warehouseId: whId,
            manufacturingDate: batch.manufacturingDate,
            expiryDate: batch.expiryDate,
          }),
        },
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Không thể thực hiện tiêu hủy");
      }

      alert("✅ Đã tiêu hủy lô hàng và cập nhật tồn kho!");
      setSelectedProduct(null);
      loadData(search, selectedWarehouse);
    } catch (err) {
      alert("❌ Lỗi khi tiêu hủy: " + err.message);
    }
  };

  const displayProducts = filteredList;
  const lowStockCount = totalLowStock;
  const expiringSoonCount = totalExpiring;

  // Tính toán trạng thái tồn kho của từng kho (dựa trên maxCapacity)
  const warehouseAlerts = React.useMemo(() => {
    return warehouses.map((wh) => {
      // Tính tổng số lượng tất cả sản phẩm trong kho này
      const totalStockInWh = products.reduce((sum, p) => {
        return sum + getStockQuantity(p, wh._id);
      }, 0);

      const capacity = wh.capacity || 1000; // Mặc định 1000 nếu không có dữ liệu
      // Điều kiện: Kho đã đầy khi số lượng hàng >= sức chứa
      const isFull = totalStockInWh >= capacity;

      return {
        id: wh._id,
        name: wh.name,
        totalStock: totalStockInWh,
        capacity: capacity,
        isFull,
      };
    });
  }, [products, warehouses]);

  const fullWarehouses = warehouseAlerts.filter((a) => a.isFull);

  const handleAction = (type, product, batch = {}, whId = null) => {
    const stateData = {
      prefill: {
        productCode: product.code,
        name: product.name,
        unit: product.unit,
        price: product.price,
        costPrice: batch.costPrice || product.costPrice || 0,
        manufacturingDate: batch.manufacturingDate
          ? new Date(batch.manufacturingDate).toISOString().split("T")[0]
          : "",
        expiryDate: batch.expiryDate
          ? new Date(batch.expiryDate).toISOString().split("T")[0]
          : "",
        warehouseId: whId || selectedWarehouse || "",
      },
    };
    navigate(type === "import" ? "/import" : "/export", { state: stateData });
  };

  return (
    <div className="inv-root">
      <div className="inv-header">
        <div className="inv-title-block">
          <span className="inv-title-icon">📦</span>
          <div>
            <h1 className="inv-title">Tồn kho</h1>
            <div
              className="inv-subtitle"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
                marginTop: "4px",
              }}
            >
              {lowStockCount > 0 && (
                <span
                  onClick={() =>
                    setFilterCriteria(
                      filterCriteria === "low_stock" ? "" : "low_stock",
                    )
                  }
                  style={{
                    cursor: "pointer",
                    padding: "4px 12px",
                    borderRadius: "20px",
                    fontSize: "14px",
                    fontWeight: "600",
                    backgroundColor: "#fee2e2",
                    color: "#ef4444",
                    border:
                      filterCriteria === "low_stock"
                        ? "2px solid #ef4444"
                        : "1px solid #fecaca",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s",
                  }}
                  title="Bấm để lọc sản phẩm tồn thấp"
                >
                  ⚠️ {lowStockCount} tồn thấp
                </span>
              )}

              {expiringSoonCount > 0 && (
                <>
                  {lowStockCount > 0 && (
                    <span style={{ color: "#cbd5e1" }}>•</span>
                  )}
                  <span
                    onClick={() =>
                      setFilterCriteria(
                        filterCriteria === "expiry_30" ? "" : "expiry_30",
                      )
                    }
                    style={{
                      cursor: "pointer",
                      padding: "4px 12px",
                      borderRadius: "20px",
                      fontSize: "14px",
                      fontWeight: "600",
                      backgroundColor: "#fefce8",
                      color: "#eab308",
                      border:
                        filterCriteria === "expiry_30"
                          ? "2px solid #eab308"
                          : "1px solid #fef08a",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.2s",
                    }}
                    title="Bấm để lọc sản phẩm sắp hết hạn"
                  >
                    ⏳ {expiringSoonCount} sắp hết hạn
                  </span>
                </>
              )}
            </div>
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

        {isQuanLyKho() && warehouses.length > 0 && (
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

        <select
          className="inv-select"
          value={filterCriteria}
          onChange={(e) => setFilterCriteria(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="low_stock">Tồn kho thấp (≤ 10)</option>
          <option value="expiry_30">HSD dưới 30 ngày</option>
          <option value="expiry_10">HSD dưới 10 ngày</option>
        </select>
      </div>

      {/* Phần hiển thị cảnh báo tồn kho thấp của Kho */}
      {!loading && (
        <div className="inv-wh-alert-container">
          {selectedWarehouse
            ? (() => {
                const alert = warehouseAlerts.find(
                  (a) => a.id === selectedWarehouse,
                );
                return (
                  alert?.isFull && (
                    <div className="inv-alert-box">
                      <span className="alert-icon">⚠️</span>
                      <div className="alert-content">
                        <strong>Kho đã đầy:</strong> Kho{" "}
                        <strong>{alert.name}</strong> hiện đã đạt mức{" "}
                        {alert.totalStock} / {alert.capacity} đơn vị.
                      </div>
                    </div>
                  )
                );
              })()
            : fullWarehouses.length > 0 && (
                <div className="inv-alert-box multi">
                  <span className="alert-icon">⚠️</span>
                  <div className="alert-content">
                    <strong>Các kho đã đầy:</strong>{" "}
                    {fullWarehouses.map((w, idx) => (
                      <span key={w.id}>
                        <strong>{w.name}</strong> ({w.totalStock}/{w.capacity})
                        {idx < fullWarehouses.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
        </div>
      )}

      {loading ? (
        <div
          style={{ textAlign: "center", padding: "100px", color: "#64748b" }}
        >
          Đang tải dữ liệu tồn kho...
        </div>
      ) : (
        <div className="inv-product-grid">
          {displayProducts.length === 0 ? (
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
            displayProducts.map((product) => {
              const currentStock = product.currentQty;
              const whName = warehouses.find(
                (w) => w._id === product.currentWhId,
              )?.name;
              const isLow =
                currentStock > 0 && currentStock <= (product.minStock || 10);
              const percentage = Math.min(
                (currentStock / Math.max((product.minStock || 10) * 3, 30)) *
                  100,
                100,
              );

              return (
                <div
                  key={`${product._id}-${product.currentWhId}`}
                  className="inv-product-card"
                  onClick={() => {
                    setSelectedProduct(product);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <div className="inv-card-header">
                    <div>
                      <div className="inv-code">
                        {product.code}{" "}
                        {whName && (
                          <span
                            style={{ color: "#64748b", fontWeight: "normal" }}
                          >
                            • {whName}
                          </span>
                        )}
                      </div>
                      <div className="inv-product-name">{product.name}</div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {(() => {
                        const exp = getProductExpiryStatus(
                          product,
                          product.currentWhId,
                        );
                        if (exp && exp.daysLeft <= 30) {
                          const badgeColor =
                            exp.color === "expired"
                              ? "#64748b" // Màu xám cho hết hạn
                              : exp.color === "red"
                                ? "#ef4444" // Màu đỏ cho dưới 10 ngày
                                : "#eab308"; // Màu vàng cho dưới 30 ngày
                          return (
                            <span
                              style={{
                                backgroundColor: badgeColor,
                                color: "#fff",
                                padding: "2px 8px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: "bold",
                              }}
                            >
                              {exp.label}
                            </span>
                          );
                        }
                        return null;
                      })()}
                      {isLow && (
                        <span
                          style={{ color: "#ef4444", fontSize: "22px" }}
                          title="Tồn kho thấp"
                        >
                          ⚠️
                        </span>
                      )}
                    </div>
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

      {/* Modal Chi tiết Lô hàng */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div
            className="modal-detail"
            style={{ maxWidth: "900px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-detail-header">
              <h3>
                📦 Chi tiết lô hàng: {selectedProduct.name} (
                {selectedProduct.code})
              </h3>
              <button onClick={() => setSelectedProduct(null)}>✕</button>
            </div>

            <div style={{ padding: "20px" }}>
              <table className="detail-table">
                <thead>
                  <tr>
                    <th>Số Lô</th>
                    <th>NSX</th>
                    <th>HSD</th>
                    <th>Kho</th>
                    <th>Giá vốn</th>
                    <th>Số lượng</th>
                    <th>Đơn vị</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProduct.batches &&
                  selectedProduct.batches.length > 0 ? (
                    selectedProduct.batches.map((batch) => {
                      // Lọc các stock có số lượng > 0 và khớp với kho đang chọn
                      // Nếu selectedWarehouse trống (Tất cả kho), ta dùng kho của chính thẻ vừa bấm (currentWhId)
                      const targetWh =
                        selectedWarehouse || selectedProduct.currentWhId;
                      const visibleStocks = batch.stocks.filter((s) => {
                        const matchWarehouse =
                          !targetWh || s.warehouseId === targetWh;
                        return matchWarehouse && s.quantity > 0;
                      });

                      // Nếu lô này không còn tồn kho thực tế thì không hiển thị
                      if (visibleStocks.length === 0) return null;

                      return visibleStocks.map((s, idx) => {
                        const wh = warehouses.find(
                          (w) => w._id === s.warehouseId,
                        );
                        const expInfo = getExpiryInfo(batch.expiryDate);
                        const isExpired = expInfo && expInfo.daysLeft <= 0;

                        // Xác định màu nền dòng
                        let bgStyle = {};
                        if (expInfo) {
                          if (expInfo.color === "expired")
                            bgStyle = { backgroundColor: "#f1f5f9" }; // Xám nhạt cho hết hạn
                          else if (expInfo.color === "red")
                            bgStyle = { backgroundColor: "#fee2e2" }; // Đỏ nhạt cho dưới 10 ngày
                          else if (expInfo.color === "yellow")
                            bgStyle = { backgroundColor: "#fefce8" }; // Vàng nhạt
                        }

                        return (
                          <tr
                            key={`${batch.batchNo}-${s.warehouseId}`}
                            style={bgStyle}
                          >
                            {idx === 0 && (
                              <td
                                rowSpan={visibleStocks.length}
                                style={{
                                  fontWeight: "bold",
                                  textAlign: "center",
                                }}
                              >
                                {batch.batchNo}
                              </td>
                            )}
                            {idx === 0 && (
                              <td rowSpan={visibleStocks.length}>
                                {batch.manufacturingDate
                                  ? new Date(
                                      batch.manufacturingDate,
                                    ).toLocaleDateString("vi-VN")
                                  : "—"}
                              </td>
                            )}
                            {idx === 0 && (
                              <td rowSpan={visibleStocks.length}>
                                {batch.expiryDate
                                  ? new Date(
                                      batch.expiryDate,
                                    ).toLocaleDateString("vi-VN")
                                  : "—"}
                              </td>
                            )}
                            <td>{wh?.name || "Không xác định"}</td>
                            <td style={{ color: "#64748b" }}>
                              {Number(batch.costPrice || 0).toLocaleString(
                                "vi-VN",
                              )}{" "}
                              ₫
                            </td>
                            <td
                              style={{ fontWeight: "bold", color: "#15803d" }}
                            >
                              {s.quantity}
                            </td>
                            <td>{selectedProduct.unit}</td>
                            <td>
                              <div style={{ display: "flex", gap: "8px" }}>
                                {isExpired ? (
                                  <button
                                    className="im-btn-detail"
                                    style={{
                                      background: "#111827",
                                      color: "#fff",
                                    }}
                                    onClick={() =>
                                      handleDispose(
                                        selectedProduct,
                                        batch,
                                        s.warehouseId,
                                        s.quantity,
                                      )
                                    }
                                  >
                                    Tiêu hủy
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      className="im-btn-detail"
                                      style={{
                                        background: "#3b6ef8",
                                        color: "#fff",
                                      }}
                                      onClick={() =>
                                        handleAction(
                                          "import",
                                          selectedProduct,
                                          batch,
                                          s.warehouseId,
                                        )
                                      }
                                    >
                                      Nhập
                                    </button>
                                    <button
                                      className="im-btn-detail"
                                      style={{
                                        background: "#ef4444",
                                        color: "#fff",
                                      }}
                                      onClick={() =>
                                        handleAction(
                                          "export",
                                          selectedProduct,
                                          batch,
                                          s.warehouseId,
                                        )
                                      }
                                    >
                                      Xuất
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        style={{ textAlign: "center", padding: "20px" }}
                      >
                        Chưa có dữ liệu lô hàng.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
