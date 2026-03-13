import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Import.css";

const PRODUCT_API = "http://localhost:4001/products";
const IMPORT_API = "http://localhost:4003/imports";

const Import = () => {
  const [products, setProducts] = useState([]); // Danh sách sản phẩm để chọn
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    code: `NH-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`,
    supplier: "",
    notes: "",
    items: [{ productCode: "", quantity: 1, unitPrice: 0 }],
  });

  const [totalAmount, setTotalAmount] = useState(0);

  // Load danh sách sản phẩm
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(PRODUCT_API);
        setProducts(res.data.data || res.data); // hỗ trợ cả format cũ và mới
        setLoadingProducts(false);
      } catch (err) {
        setError("Không tải được danh sách sản phẩm");
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  // Tính tổng tiền mỗi khi items thay đổi
  useEffect(() => {
    const sum = formData.items.reduce((acc, item) => {
      return acc + Number(item.quantity) * Number(item.unitPrice);
    }, 0);
    setTotalAmount(sum);
  }, [formData.items]);

  // Thêm dòng sản phẩm mới
  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { productCode: "", quantity: 1, unitPrice: 0 }],
    }));
  };

  // Xóa dòng
  const removeItemRow = (index) => {
    if (formData.items.length === 1) return; // giữ ít nhất 1 dòng
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Cập nhật giá trị từng trường trong items
  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Nếu chọn sản phẩm → tự điền unitPrice (giá bán mặc định)
    if (field === "productCode" && value) {
      const selected = products.find((p) => p.code === value);
      if (selected) {
        newItems[index].unitPrice = selected.price || 0;
      }
    }

    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate cơ bản
    if (!formData.supplier.trim()) {
      alert("Vui lòng nhập tên nhà cung cấp");
      return;
    }

    const hasValidItems = formData.items.every(
      (item) =>
        item.productCode &&
        Number(item.quantity) > 0 &&
        Number(item.unitPrice) >= 0,
    );

    if (!hasValidItems) {
      alert("Vui lòng kiểm tra thông tin sản phẩm và số lượng");
      return;
    }

    try {
      const payload = {
        code: formData.code,
        supplier: formData.supplier.trim(),
        items: formData.items.map((item) => ({
          productCode: item.productCode,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
        notes: formData.notes.trim(),
      };

      const res = await axios.post(IMPORT_API, payload);

      if (res.data.success) {
        alert(
          "Tạo phiếu nhập kho thành công! Tồn kho đã được cập nhật tự động.",
        );
        // Reset form
        setFormData({
          code: `NH-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`,
          supplier: "",
          notes: "",
          items: [{ productCode: "", quantity: 1, unitPrice: 0 }],
        });
      }
    } catch (err) {
      console.error(err);
      alert(
        "Lỗi khi tạo phiếu nhập: " +
          (err.response?.data?.message || err.message),
      );
    }
  };

  if (loadingProducts)
    return <div className="loading">Đang tải danh sách sản phẩm...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="import-page">
      <h1>Nhập kho - Tạo phiếu nhập mới</h1>

      <form onSubmit={handleSubmit} className="import-form">
        <div className="form-row">
          <div className="form-group">
            <label>Mã phiếu nhập</label>
            <input
              type="text"
              value={formData.code}
              readOnly
              className="readonly"
            />
          </div>
          <div className="form-group">
            <label>
              Nhà cung cấp <span className="required">*</span>
            </label>
            <input
              type="text"
              value={formData.supplier}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, supplier: e.target.value }))
              }
              placeholder="Tên nhà cung cấp"
              required
            />
          </div>
        </div>

        <div className="items-section">
          <h3>Chi tiết sản phẩm nhập</h3>
          <table className="items-table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Số lượng</th>
                <th>Đơn giá</th>
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
                          {p.code} - {p.name} (Tồn: {p.stock})
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

        <div className="form-row total-row">
          <div className="form-group">
            <label>Ghi chú</label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Ghi chú (nếu có)"
              rows={3}
            />
          </div>
          <div className="grand-total">
            <strong>Tổng tiền phiếu:</strong>
            <span className="amount">
              {totalAmount.toLocaleString("vi-VN")} ₫
            </span>
          </div>
        </div>

        <button type="submit" className="btn-submit">
          Tạo phiếu nhập kho
        </button>
      </form>
    </div>
  );
};

export default Import;
