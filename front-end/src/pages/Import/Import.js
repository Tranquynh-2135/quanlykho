import React, { useState, useEffect } from "react";
import { importApi } from "../../services/importApi";
import { supplierApi } from "../../services/supplierApi";
import { warehouseApi } from "../../services/warehouseApi";
import "./Import.css";

const Import = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [imports, setImports] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Form tạo phiếu
  const [formData, setFormData] = useState({
    code: `NH-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`,
    supplierId: "",
    warehouseId: "",
    notes: "",
    items: [{ productCode: "", quantity: 1, unitPrice: 0 }],
  });

  const [totalAmount, setTotalAmount] = useState(0);

  // Load dữ liệu ban đầu
  useEffect(() => {
    const loadData = async () => {
      try {
        const [supRes, whRes, prodRes, impRes] = await Promise.all([
          supplierApi.getAll({ status: "active" }),
          warehouseApi.getAll({ status: "active" }),
          fetch("http://localhost:4001/products").then((r) => r.json()),
          importApi.getAll({ search }),
        ]);

        setSuppliers(supRes.data.data || []);
        setWarehouses(whRes.data.data || []);
        setProducts(prodRes.data || prodRes);
        setImports(impRes.data.data || []);
      } catch (err) {
        console.error("Lỗi tải dữ liệu:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [search]);

  // Tính tổng tiền
  useEffect(() => {
    const sum = formData.items.reduce(
      (acc, item) => acc + Number(item.quantity) * Number(item.unitPrice),
      0,
    );
    setTotalAmount(sum);
  }, [formData.items]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "productCode" && value) {
      const selected = products.find((p) => p.code === value);
      if (selected) newItems[index].unitPrice = selected.price || 0;
    }

    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { productCode: "", quantity: 1, unitPrice: 0 }],
    }));
  };

  const removeItemRow = (index) => {
    if (formData.items.length === 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplierId || !formData.warehouseId) {
      alert("Vui lòng chọn Nhà cung cấp và Kho");
      return;
    }

    try {
      const payload = {
        code: formData.code,
        supplierId: formData.supplierId,
        warehouseId: formData.warehouseId,
        items: formData.items.map((item) => ({
          productCode: item.productCode,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
        notes: formData.notes.trim(),
      };

      const res = await importApi.create(payload);
      if (res.data.success) {
        alert("✅ Tạo phiếu nhập kho thành công! Tồn kho đã được cập nhật.");

        // Reset form
        setFormData({
          code: `NH-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`,
          supplierId: "",
          warehouseId: "",
          notes: "",
          items: [{ productCode: "", quantity: 1, unitPrice: 0 }],
        });

        // Refresh lịch sử
        const fresh = await importApi.getAll({ search });
        setImports(fresh.data.data || []);
      }
    } catch (err) {
      alert("❌ Lỗi: " + (err.response?.data?.message || err.message));
    }
  };

  if (loading) return <div className="loading">Đang tải dữ liệu...</div>;

  return (
    <div className="im-root">
      <div className="im-header">
        <div className="im-title-block">
          <span className="im-title-icon">📥</span>
          <div>
            <h1 className="im-title">Nhập kho</h1>
            <p className="im-subtitle">{imports.length} phiếu nhập</p>
          </div>
        </div>
      </div>

      {/* Form tạo phiếu mới */}
      <div className="im-form-card">
        <h2>Tạo phiếu nhập kho mới</h2>
        <form onSubmit={handleSubmit}>
          <div className="im-form-row">
            <div className="im-form-group">
              <label>Mã phiếu nhập</label>
              <input type="text" value={formData.code} readOnly />
            </div>
            <div className="im-form-group">
              <label>
                Nhà cung cấp <span className="required">*</span>
              </label>
              <select
                value={formData.supplierId}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    supplierId: e.target.value,
                  }))
                }
                required
              >
                <option value="">-- Chọn nhà cung cấp --</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="im-form-group">
              <label>
                Kho <span className="required">*</span>
              </label>
              <select
                value={formData.warehouseId}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    warehouseId: e.target.value,
                  }))
                }
                required
              >
                <option value="">-- Chọn kho --</option>
                {warehouses.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bảng chi tiết sản phẩm */}
          <div className="items-section">
            <h3>Chi tiết sản phẩm nhập</h3>
            <table className="items-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Số lượng</th>
                  <th>Đơn giá (₫)</th>
                  <th>Thành tiền</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {formData.items.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <select
                        value={item.productCode}
                        onChange={(e) =>
                          handleItemChange(index, "productCode", e.target.value)
                        }
                        required
                      >
                        <option value="">-- Chọn sản phẩm --</option>
                        {products.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.code} - {p.name} (Tồn: {p.stock || 0})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, "quantity", e.target.value)
                        }
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(index, "unitPrice", e.target.value)
                        }
                        required
                      />
                    </td>
                    <td className="total-cell">
                      {(
                        Number(item.quantity) * Number(item.unitPrice)
                      ).toLocaleString("vi-VN")}{" "}
                      ₫
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-remove"
                        onClick={() => removeItemRow(index)}
                        disabled={formData.items.length === 1}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button type="button" className="btn-add" onClick={addItemRow}>
              + Thêm sản phẩm
            </button>
          </div>

          <div className="grand-total">
            <strong>Tổng tiền phiếu:</strong>
            <span className="amount">
              {totalAmount.toLocaleString("vi-VN")} ₫
            </span>
          </div>

          <div className="im-form-group">
            <label>Ghi chú</label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Ghi chú thêm (nếu có)"
              rows={3}
            />
          </div>

          <button type="submit" className="im-btn-primary">
            Tạo phiếu nhập kho
          </button>
        </form>
      </div>

      {/* Lịch sử phiếu nhập */}
      <div className="im-history">
        <h2>Lịch sử phiếu nhập kho</h2>
        <input
          className="im-search"
          placeholder="Tìm theo mã phiếu hoặc nhà cung cấp..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <table className="im-table">
          <thead>
            <tr>
              <th>Mã phiếu</th>
              <th>Ngày nhập</th>
              <th>Nhà cung cấp</th>
              <th>Kho</th>
              <th>Số mặt hàng</th>
              <th>Tổng tiền</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {imports.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  style={{ textAlign: "center", padding: "40px" }}
                >
                  Chưa có phiếu nhập nào
                </td>
              </tr>
            ) : (
              imports.map((imp) => (
                <tr key={imp._id}>
                  <td>
                    <strong>{imp.code}</strong>
                  </td>
                  <td>
                    {new Date(imp.importDate).toLocaleDateString("vi-VN")}
                  </td>
                  <td>
                    {suppliers.find((s) => s._id === imp.supplierId)?.name ||
                      imp.supplierId}
                  </td>
                  <td>
                    {warehouses.find((w) => w._id === imp.warehouseId)?.name ||
                      imp.warehouseId}
                  </td>
                  <td>{imp.items.length} mặt hàng</td>
                  <td>{imp.totalAmount.toLocaleString("vi-VN")} ₫</td>
                  <td>{imp.notes || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Import;
