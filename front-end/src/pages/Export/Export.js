import React, { useState, useEffect, useMemo } from "react";
import Select from "react-select";
import { exportApi } from "../../services/exportApi";
import { productApi } from "../../services/productApi";
import "./Export.css";

const Export = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [exports, setExports] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailTarget, setDetailTarget] = useState(null);
  const [filterType, setFilterType] = useState("");

  const [formData, setFormData] = useState({
    recipient: "",
    recipientType: "khach_hang",
    note: "",
    items: [{ productCode: "", quantity: 1, unitPrice: 0 }],
  });

  const [totalAmount, setTotalAmount] = useState(0);

  // Load dữ liệu
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const [prodRes, catRes, expRes] = await Promise.all([
          fetch("http://localhost:4001/products").then((r) => r.json()),
          productApi.getAllCategories(),
          exportApi.getAll(),
        ]);

        const productList = prodRes.data?.data || prodRes.data || prodRes || [];
        const exportList = expRes.data?.data || expRes.data || expRes || [];

        setProducts(productList);
        setCategories(catRes.data.data || []);
        setExports(exportList);
      } catch (err) {
        console.error("Lỗi tải dữ liệu xuất kho:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Tính tổng tiền realtime
  useEffect(() => {
    const sum = formData.items.reduce(
      (acc, item) => acc + Number(item.quantity) * Number(item.unitPrice),
      0,
    );
    setTotalAmount(sum);
  }, [formData.items]);

  // Lọc lịch sử phiếu xuất
  const filteredExports = useMemo(() => {
    return exports.filter((exp) => {
      const keyword = search.toLowerCase().trim();
      const matchSearch =
        !keyword ||
        exp.code?.toLowerCase().includes(keyword) ||
        exp.recipient?.toLowerCase().includes(keyword) ||
        new Date(exp.date || exp.createdAt)
          .toLocaleDateString("vi-VN")
          .toLowerCase()
          .includes(keyword);

      const matchType = !filterType || exp.recipientType === filterType;

      return matchSearch && matchType;
    });
  }, [exports, search, filterType]);

  // Options cho react-select
  const productOptions = useMemo(() => {
    return products.map((p) => ({
      value: p.code,
      label: `${p.code} — ${p.name}`,
      price: p.price || 0,
    }));
  }, [products]);

  // Xử lý thay đổi từng dòng sản phẩm
  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "productCode" && value) {
      const selected = products.find((p) => p.code === value);
      if (selected) {
        newItems[index].unitPrice = selected.price || 0;
      }
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
    if (!formData.recipient.trim()) return alert("Vui lòng nhập người nhận");

    try {
      const payload = {
        recipient: formData.recipient.trim(),
        recipientType: formData.recipientType,
        note: formData.note.trim(),
        items: formData.items.map((item) => ({
          productCode: item.productCode,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      };

      const res = await exportApi.create(payload);
      alert(
        `✅ Tạo phiếu xuất thành công! Mã: ${res.data.data?.code || res.data.code}`,
      );

      setFormData({
        recipient: "",
        recipientType: "khach_hang",
        note: "",
        items: [{ productCode: "", quantity: 1, unitPrice: 0 }],
      });

      const fresh = await exportApi.getAll();
      setExports(fresh.data.data || []);
    } catch (err) {
      alert("❌ Lỗi: " + (err.response?.data?.message || err.message));
    }
  };

  if (loading) return <div className="loading">Đang tải dữ liệu...</div>;

  return (
    <div className="ex-root">
      {/* Header */}
      <div className="im-header">
        <div className="im-title-block">
          <span className="im-title-icon">📤</span>
          <div>
            <h1 className="im-title">Xuất kho</h1>
            <p className="im-subtitle">{exports.length} phiếu xuất</p>
          </div>
        </div>
      </div>

      {/* Form tạo phiếu xuất */}
      <div className="im-form-card">
        <h2>Tạo phiếu xuất kho mới</h2>
        <form onSubmit={handleSubmit}>
          <div className="im-form-row">
            <div className="im-form-group">
              <label>
                Người nhận <span className="required">*</span>
              </label>
              <input
                type="text"
                placeholder="Tên khách hàng / nhà phân phối..."
                value={formData.recipient}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    recipient: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="im-form-group">
              <label>Loại đối tượng</label>
              <select
                value={formData.recipientType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    recipientType: e.target.value,
                  }))
                }
              >
                <option value="khach_hang">Khách hàng</option>
                <option value="nha_phan_phoi">Nhà phân phối</option>
                <option value="khac">Khác</option>
              </select>
            </div>
          </div>

          {/* Chi tiết sản phẩm xuất */}
          <div className="items-section">
            <h3>Chi tiết sản phẩm xuất</h3>
            <div className="items-table-wrap">
              <table className="items-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 260 }}>Sản phẩm</th>
                    <th style={{ minWidth: 160 }}>Danh mục</th>
                    <th style={{ minWidth: 100 }}>Số lượng</th>
                    <th style={{ minWidth: 160 }}>Giá bán (₫)</th>
                    <th style={{ minWidth: 130 }}>Thành tiền</th>
                    <th style={{ minWidth: 60 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => {
                    const selectedProduct = products.find(
                      (p) => p.code === item.productCode,
                    );

                    // Lấy tên danh mục
                    const categoryName =
                      selectedProduct?.categoryId?.name ||
                      categories.find(
                        (c) =>
                          c._id ===
                          (selectedProduct?.categoryId?._id ||
                            selectedProduct?.categoryId),
                      )?.name ||
                      "—";

                    return (
                      <tr key={index}>
                        <td>
                          <Select
                            options={productOptions}
                            value={
                              productOptions.find(
                                (o) => o.value === item.productCode,
                              ) || null
                            }
                            onChange={(sel) =>
                              handleItemChange(
                                index,
                                "productCode",
                                sel ? sel.value : "",
                              )
                            }
                            placeholder="Tìm và chọn sản phẩm..."
                            isSearchable
                            className="react-select-container"
                            classNamePrefix="react-select"
                            menuPortalTarget={document.body}
                            menuPosition="fixed"
                          />
                        </td>

                        <td style={{ fontWeight: 500, color: "#3b6ef8" }}>
                          {categoryName}
                        </td>

                        <td>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "quantity",
                                e.target.value,
                              )
                            }
                            required
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "unitPrice",
                                e.target.value,
                              )
                            }
                            placeholder="Nhập giá bán"
                            required
                          />
                          {selectedProduct && (
                            <small
                              style={{
                                color: "#64748b",
                                display: "block",
                                marginTop: "4px",
                              }}
                            >
                              Giá gốc:{" "}
                              {selectedProduct.price?.toLocaleString("vi-VN")} ₫
                            </small>
                          )}
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
                    );
                  })}
                </tbody>
              </table>
            </div>

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
              value={formData.note}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, note: e.target.value }))
              }
              placeholder="Ghi chú thêm (nếu có)..."
              rows={4}
            />
          </div>

          <button type="submit" className="im-btn-primary">
            Tạo phiếu xuất kho
          </button>
        </form>
      </div>

      {/* Lịch sử phiếu xuất - giữ nguyên như cũ */}
      <div className="im-history">
        <h2>Lịch sử phiếu xuất kho</h2>

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "16px",
            flexWrap: "wrap",
          }}
        >
          <input
            className="im-search"
            placeholder="Tìm theo mã phiếu, ngày xuất, người nhận..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: "300px" }}
          />

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: "10px 14px",
              border: "1.5px solid #e2e8f0",
              borderRadius: "10px",
              fontSize: "14px",
              height: "42px",
              minWidth: "180px",
            }}
          >
            <option value="">Tất cả loại đối tượng</option>
            <option value="khach_hang">Khách hàng</option>
            <option value="nha_phan_phoi">Nhà phân phối</option>
            <option value="khac">Khác</option>
          </select>
        </div>

        <table className="im-table">
          <thead>
            <tr>
              <th>Mã phiếu</th>
              <th>Ngày xuất</th>
              <th>Người nhận</th>
              <th>Loại đối tượng</th>
              <th>Số mặt hàng</th>
              <th>Tổng tiền</th>
              <th>Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {filteredExports.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  style={{
                    textAlign: "center",
                    padding: "60px",
                    color: "#94a3b8",
                  }}
                >
                  Không tìm thấy phiếu xuất nào
                </td>
              </tr>
            ) : (
              filteredExports.map((exp) => (
                <tr key={exp._id}>
                  <td>
                    <strong style={{ color: "#3b6ef8" }}>{exp.code}</strong>
                  </td>
                  <td>
                    {new Date(exp.date || exp.createdAt).toLocaleDateString(
                      "vi-VN",
                    )}
                  </td>
                  <td>{exp.recipient}</td>
                  <td>
                    <span className={`type-badge type-${exp.recipientType}`}>
                      {exp.recipientType === "khach_hang"
                        ? "Khách hàng"
                        : exp.recipientType === "nha_phan_phoi"
                          ? "Nhà phân phối"
                          : "Khác"}
                    </span>
                  </td>
                  <td>{exp.items?.length || 0} mặt hàng</td>
                  <td>
                    <strong>
                      {exp.totalAmount?.toLocaleString("vi-VN")} ₫
                    </strong>
                  </td>
                  <td>
                    <button
                      className="im-btn-detail"
                      onClick={() => setDetailTarget(exp)}
                    >
                      🔍 Xem
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal chi tiết phiếu xuất - ĐÃ THÊM CỘT DANH MỤC */}
      {detailTarget && (
        <div className="modal-overlay" onClick={() => setDetailTarget(null)}>
          <div className="modal-detail" onClick={(e) => e.stopPropagation()}>
            <div className="modal-detail-header">
              <h3>📤 Chi tiết phiếu {detailTarget.code}</h3>
              <button onClick={() => setDetailTarget(null)}>✕</button>
            </div>

            <div className="modal-detail-info">
              <div className="detail-row">
                <span>Ngày xuất:</span>
                <strong>
                  {new Date(
                    detailTarget.date || detailTarget.createdAt,
                  ).toLocaleDateString("vi-VN")}
                </strong>
              </div>
              <div className="detail-row">
                <span>Người nhận:</span>
                <strong>{detailTarget.recipient}</strong>
              </div>
              <div className="detail-row">
                <span>Loại đối tượng:</span>
                <strong>
                  {detailTarget.recipientType === "khach_hang"
                    ? "Khách hàng"
                    : detailTarget.recipientType === "nha_phan_phoi"
                      ? "Nhà phân phối"
                      : "Khác"}
                </strong>
              </div>
              {detailTarget.note && (
                <div className="detail-row">
                  <span>Ghi chú:</span>
                  <strong>{detailTarget.note}</strong>
                </div>
              )}
            </div>

            <table className="detail-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Mã SP</th>
                  <th>Tên sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Số lượng</th>
                  <th>Giá bán</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {detailTarget.items?.map((item, i) => {
                  const prod = products.find(
                    (p) => p.code === item.productCode,
                  );
                  const categoryName =
                    prod?.categoryId?.name ||
                    categories.find(
                      (c) =>
                        c._id === (prod?.categoryId?._id || prod?.categoryId),
                    )?.name ||
                    "—";

                  return (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>
                        <code className="im-code">{item.productCode}</code>
                      </td>
                      <td>{prod?.name || item.productCode}</td>
                      <td style={{ fontWeight: 500 }}>{categoryName}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unitPrice?.toLocaleString("vi-VN")} ₫</td>
                      <td>
                        <strong>
                          {(item.quantity * item.unitPrice).toLocaleString(
                            "vi-VN",
                          )}{" "}
                          ₫
                        </strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colSpan="6"
                    style={{
                      textAlign: "right",
                      fontWeight: 600,
                      padding: "12px 14px",
                    }}
                  >
                    Tổng cộng:
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <strong style={{ color: "#3b6ef8", fontSize: 15 }}>
                      {detailTarget.totalAmount?.toLocaleString("vi-VN")} ₫
                    </strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Export;
