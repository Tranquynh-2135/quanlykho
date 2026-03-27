import { useEffect, useState } from "react";
import "./Export.css";

export default function Export() {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);

  const [form, setForm] = useState({
    warehouseId: "",
    supplierId: "",
    reason: "Bán hàng",
    note: ""
  });

  const [items, setItems] = useState([{ productId: "", quantity: 1 }]);
  const [stockMap, setStockMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [searchFilters, setSearchFilters] = useState({
    productId: "",
    warehouseId: "",
    reason: "",
    fromDate: "",
    toDate: ""
  });

  // Load dữ liệu khi vào trang
  useEffect(() => {
    loadProducts();
    loadWarehouses();
    loadSuppliers();
    loadHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [history, searchFilters]);

  // ==================== LOAD PRODUCTS ====================
  const loadProducts = async () => {
    try {
      console.log("🔄 Đang gọi API Products...");
      const res = await fetch("http://localhost:4001/products");

      console.log("📡 Products Status:", res.status);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const response = await res.json();
      console.log("📦 Products data:", response);

      const productList = response?.data || (Array.isArray(response) ? response : []);
      setProducts(productList);
      console.log(`✅ Đã load ${productList.length} sản phẩm`);
    } catch (err) {
      console.error("❌ Lỗi load products:", err.message);
    }
  };

  // ==================== LOAD WAREHOUSES (SỬA ROUTE) ====================
  const loadWarehouses = async () => {
    try {
      console.log("🔄 Đang gọi API Warehouses...");
      const res = await fetch("http://localhost:4005/warehouses");   // ← SỬA: bỏ /api

      console.log("📡 Warehouses Status:", res.status);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const response = await res.json();
      console.log("📦 Warehouses data:", response);

      const warehouseList = response?.data || (Array.isArray(response) ? response : []);
      setWarehouses(warehouseList);
      console.log(`✅ Đã load ${warehouseList.length} kho`);
    } catch (err) {
      console.error("❌ Lỗi load warehouses:", err.message);
    }
  };

  // ==================== LOAD SUPPLIERS ====================
  const loadSuppliers = async () => {
    try {
      console.log("🔄 Đang gọi API Suppliers...");
      const res = await fetch("http://localhost:4004/suppliers");   // ← SỬA: bỏ /api (nếu cần)

      console.log("📡 Suppliers Status:", res.status);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const response = await res.json();
      const supplierList = response?.data || (Array.isArray(response) ? response : []);
      setSuppliers(supplierList);
      console.log(`✅ Đã load ${supplierList.length} nhà cung cấp`);
    } catch (err) {
      console.error("❌ Lỗi load suppliers:", err.message);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await fetch("http://localhost:4003/api/exports");
      const data = await res.json();
      const historyData = Array.isArray(data) ? data : data?.data || [];
      setHistory(historyData);
    } catch (err) {
      console.error("Lỗi load history:", err);
    }
  };

  const fetchStock = async (productId, warehouseId) => {
    if (!productId || !warehouseId) return;
    try {
      const res = await fetch(
        `http://localhost:4005/api/warehouses/current-stock?productId=${productId}&warehouseId=${warehouseId}`
      );
      const data = await res.json();
      setStockMap(prev => ({ ...prev, [productId]: data.quantity || 0 }));
    } catch (err) {
      console.error("Lỗi lấy tồn kho:", err);
    }
  };

  const applyFilters = () => {
    let result = [...history];
    if (searchFilters.productId) result = result.filter(i => i.productId === searchFilters.productId);
    if (searchFilters.warehouseId) result = result.filter(i => i.warehouseId === searchFilters.warehouseId);
    if (searchFilters.reason) result = result.filter(i => i.reason === searchFilters.reason);
    if (searchFilters.fromDate) result = result.filter(i => new Date(i.createdAt) >= new Date(searchFilters.fromDate));
    if (searchFilters.toDate) {
      const to = new Date(searchFilters.toDate);
      to.setHours(23, 59, 59);
      result = result.filter(i => new Date(i.createdAt) <= to);
    }
    setFilteredHistory(result);
  };

  const handleFilterChange = (field, value) => {
    setSearchFilters(prev => ({ ...prev, [field]: value }));
  };

  const resetFilters = () => {
    setSearchFilters({ productId: "", warehouseId: "", reason: "", fromDate: "", toDate: "" });
  };

  const handleWarehouseChange = (warehouseId) => {
    setForm(prev => ({ ...prev, warehouseId }));
    items.forEach(item => {
      if (item.productId) fetchStock(item.productId, warehouseId);
    });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);

    if (field === "productId" && form.warehouseId) {
      fetchStock(value, form.warehouseId);
    }
  };

  const addItem = () => setItems([...items, { productId: "", quantity: 1 }]);

  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!form.warehouseId) return setError("Vui lòng chọn kho!");
    if (!form.supplierId) return setError("Vui lòng chọn nhà phân phối!");

    setLoading(true);
    setError("");

    try {
      for (const item of items) {
        if (!item.productId) throw new Error("Vui lòng chọn sản phẩm cho tất cả dòng!");
        if (item.quantity < 1) throw new Error("Số lượng phải lớn hơn 0!");

        const currentStock = stockMap[item.productId] || 0;
        if (item.quantity > currentStock) {
          throw new Error(`Vượt tồn kho! Hiện chỉ còn ${currentStock}`);
        }

        const res = await fetch("http://localhost:4003/api/exports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: item.productId,
            warehouseId: form.warehouseId,
            quantity: item.quantity,
            reason: form.reason,
            note: form.note,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Lỗi khi xuất kho");
        }
      }

      alert("✅ Xuất kho thành công!");
      setItems([{ productId: "", quantity: 1 }]);
      setForm(prev => ({ ...prev, note: "" }));
      setStockMap({});
      loadHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="export-container">
      <h2>📦 Xuất kho</h2>
      {error && <p className="error">{error}</p>}

      <div className="form-row">
        {/* Chọn kho */}
        <select 
          value={form.warehouseId} 
          onChange={e => handleWarehouseChange(e.target.value)}
          style={{ width: "100%", padding: "10px", fontSize: "14px" }}
        >
          <option value="">-- Chọn kho --</option>
          {warehouses.length === 0 ? (
            <option disabled>Đang tải danh sách kho...</option>
          ) : (
            warehouses.map(w => (
              <option key={w._id} value={w._id}>
                {w.name} {w.location ? `(${w.location})` : ''}
              </option>
            ))
          )}
        </select>

        {/* Chọn nhà phân phối */}
        <select 
          value={form.supplierId} 
          onChange={e => setForm(prev => ({ ...prev, supplierId: e.target.value }))}
          style={{ width: "100%", padding: "10px", fontSize: "14px" }}
        >
          <option value="">-- Chọn nhà phân phối --</option>
          {suppliers.length === 0 ? (
            <option disabled>Đang tải nhà cung cấp...</option>
          ) : (
            suppliers.map(s => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))
          )}
        </select>

        {/* Lý do */}
        <select 
          value={form.reason} 
          onChange={e => setForm(prev => ({ ...prev, reason: e.target.value }))}
        >
          <option>Bán hàng</option>
          <option>Chuyển kho</option>
          <option>Hàng hỏng</option>
          <option>Khác</option>
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>Sản phẩm</th>
            <th>Tồn kho</th>
            <th>Số lượng xuất</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td>
                <select
                  value={item.productId}
                  onChange={e => handleItemChange(index, "productId", e.target.value)}
                  style={{ width: "100%", padding: "10px", fontSize: "14px" }}
                >
                  <option value="">-- Chọn sản phẩm --</option>
                  {products.length === 0 ? (
                    <option disabled>Đang tải sản phẩm...</option>
                  ) : (
                    products.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.name} {p.code ? `(${p.code})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </td>
              <td className="stock">{stockMap[item.productId] ?? "—"}</td>
              <td>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={e => handleItemChange(index, "quantity", Number(e.target.value))}
                />
              </td>
              <td>
                <button className="remove-btn" onClick={() => removeItem(index)}>Xóa</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button className="add-btn" onClick={addItem}>+ Thêm dòng sản phẩm</button>

      <textarea
        placeholder="Ghi chú..."
        value={form.note}
        onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))}
      />

      <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
        {loading ? "Đang xử lý..." : "✅ Tạo phiếu xuất kho"}
      </button>

      <h3>📜 Lịch sử xuất kho</h3>
      {/* Bạn có thể bổ sung phần lịch sử sau nếu cần */}
    </div>
  );
}