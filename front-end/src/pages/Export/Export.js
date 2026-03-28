import { useEffect, useState } from "react";
import "./Export.css";

export default function Export() {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [history, setHistory] = useState([]);

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

  // ================= LOAD DATA =================
  useEffect(() => {
    loadProducts();
    loadWarehouses();
    loadSuppliers();
    loadHistory();
  }, []);

  // ===== PRODUCTS =====
  const loadProducts = async () => {
    try {
      const res = await fetch("http://localhost:4001/products");
      const data = await res.json();
      setProducts(data?.data || []);
    } catch (err) {
      console.error("Lỗi products:", err);
    }
  };

  // ===== WAREHOUSES =====
  const loadWarehouses = async () => {
    try {
      const res = await fetch("http://localhost:4005/warehouses");
      const data = await res.json();
      setWarehouses(data?.data || []);
    } catch (err) {
      console.error("Lỗi warehouses:", err);
    }
  };

  // ===== SUPPLIERS (FIX KHÔNG CẦN API) =====
  const loadSuppliers = async () => {
    // 👉 TẠM FIX cứng để không lỗi
    setSuppliers([
      { _id: "1", name: "Khách lẻ" },
      { _id: "2", name: "Quỳnh" }
    ]);
  };

  // ===== HISTORY =====
  const loadHistory = async () => {
    try {
      const res = await fetch("http://localhost:4004/exports");
      if (!res.ok) return;
      const data = await res.json();
      setHistory(data?.data || []);
    } catch (err) {
      console.error("Lỗi history:", err);
    }
  };

  // ================= STOCK =================
  const fetchStock = async (productId, warehouseId) => {
    if (!productId || !warehouseId) return;

    try {
      const res = await fetch(
        `http://localhost:4005/warehouses/current-stock?productId=${productId}&warehouseId=${warehouseId}`
      );

      if (!res.ok) return;

      const data = await res.json();

      setStockMap(prev => ({
        ...prev,
        [productId]: data.quantity || 0
      }));
    } catch (err) {
      console.error("Lỗi tồn kho:", err);
    }
  };

  const handleWarehouseChange = (warehouseId) => {
    setForm(prev => ({ ...prev, warehouseId }));

    items.forEach(item => {
      if (item.productId) {
        fetchStock(item.productId, warehouseId);
      }
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

  const addItem = () => {
    setItems([...items, { productId: "", quantity: 1 }]);
  };

  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // ================= SUBMIT =================
  const handleSubmit = async () => {
    if (!form.warehouseId) return setError("Chọn kho!");
    if (!form.supplierId) return setError("Chọn khách!");

    setLoading(true);
    setError("");

    try {
      const exportData = {
        code: "EXP-" + Date.now(),
        customer:
          suppliers.find(s => s._id === form.supplierId)?.name || "Khách lẻ",
        items: items.map(item => {
          const product = products.find(p => p._id === item.productId);

          if (!product) throw new Error("Sản phẩm không hợp lệ!");

          const stock = stockMap[item.productId] || 0;
          if (item.quantity > stock) {
            throw new Error(`Chỉ còn ${stock} sản phẩm trong kho`);
          }

          return {
            productCode: product.code,
            quantity: item.quantity,
            unitPrice: product.price || 0
          };
        }),
        notes: form.note
      };

      const res = await fetch("http://localhost:4004/exports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(exportData)
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Lỗi xuất kho");

      alert("✅ Xuất kho thành công!");

      // reset
      setItems([{ productId: "", quantity: 1 }]);
      setForm({
        warehouseId: "",
        supplierId: "",
        reason: "Bán hàng",
        note: ""
      });
      setStockMap({});
      loadHistory();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ================= UI =================
  return (
    <div className="export-container">
      <h2>📦 Xuất kho</h2>

      {error && <p className="error">{error}</p>}

      <div className="form-row">
        {/* Kho */}
        <select
          value={form.warehouseId}
          onChange={e => handleWarehouseChange(e.target.value)}
        >
          <option value="">-- Chọn kho --</option>
          {warehouses.map(w => (
            <option key={w._id} value={w._id}>
              {w.name}
            </option>
          ))}
        </select>

        {/* Khách */}
        <select
          value={form.supplierId}
          onChange={e =>
            setForm(prev => ({ ...prev, supplierId: e.target.value }))
          }
        >
          <option value="">-- Chọn khách --</option>
          {suppliers.map(s => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>Sản phẩm</th>
            <th>Tồn</th>
            <th>Số lượng</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td>
                <select
                  value={item.productId}
                  onChange={e =>
                    handleItemChange(index, "productId", e.target.value)
                  }
                >
                  <option value="">-- Chọn sản phẩm --</option>
                  {products.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </td>

              <td>{stockMap[item.productId] ?? "-"}</td>

              <td>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={e =>
                    handleItemChange(index, "quantity", Number(e.target.value))
                  }
                />
              </td>

              <td>
                <button onClick={() => removeItem(index)}>Xóa</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={addItem}>+ Thêm</button>

      <textarea
        placeholder="Ghi chú..."
        value={form.note}
        onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))}
      />

      <button onClick={handleSubmit} disabled={loading}>
        {loading ? "Đang xử lý..." : "Xuất kho"}
      </button>
    </div>
  );
}