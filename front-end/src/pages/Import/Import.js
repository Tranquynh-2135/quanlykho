import React, { useState, useEffect } from "react";
import Select from "react-select";
import { importApi } from "../../services/importApi";
import { supplierApi } from "../../services/supplierApi";
import { warehouseApi } from "../../services/warehouseApi";
import "./Import.css";

const Import = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [imports, setImports] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailTarget, setDetailTarget] = useState(null);

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newWarehouseName, setNewWarehouseName] = useState("");

  const [totalAmount, setTotalAmount] = useState(0);

  const [formData, setFormData] = useState({
    supplierId: "",
    warehouseId: "",
    notes: "",
    items: [{ productCode: "", quantity: 1, unitPrice: 0, expiryDate: "" }],
  });

  // Load dữ liệu
  useEffect(() => {
    const loadData = async () => {
      try {
        const [supRes, whRes, prodRes, impRes] = await Promise.all([
          supplierApi.getAll({ status: "active" }),
          warehouseApi.getAll({ status: "active" }),
          fetch("http://localhost:4001/products").then((r) => r.json()),
          importApi.getAll(),
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
  }, []);

  // Tính tổng tiền
  useEffect(() => {
    const sum = formData.items.reduce(
      (acc, item) => acc + Number(item.quantity) * Number(item.unitPrice),
      0,
    );
    setTotalAmount(sum);
  }, [formData.items]);

  // Lọc lịch sử phiếu nhập
  const filteredImports = React.useMemo(() => {
    if (!search.trim()) return imports;

    const keyword = search.toLowerCase().trim();
    return imports.filter((imp) => {
      const sName =
        suppliers.find((s) => s._id === imp.supplierId)?.name?.toLowerCase() ||
        "";
      const wName =
        warehouses
          .find((w) => w._id === imp.warehouseId)
          ?.name?.toLowerCase() || "";
      const dateStr = new Date(imp.importDate)
        .toLocaleDateString("vi-VN")
        .toLowerCase();

      return (
        imp.code?.toLowerCase().includes(keyword) ||
        sName.includes(keyword) ||
        wName.includes(keyword) ||
        dateStr.includes(keyword)
      );
    });
  }, [imports, suppliers, warehouses, search]);

  // ====================== XÓA PHIẾU NHẬP ======================
  const handleDeleteImport = async (id, code) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa phiếu nhập kho "${code}"?\n\nHành động này sẽ trừ lại tồn kho.`,
      )
    ) {
      return;
    }

    try {
      const res = await importApi.delete(id);

      if (res.data.success) {
        alert(`✅ Đã xóa phiếu ${code} thành công và đã cập nhật tồn kho!`);

        // Refresh danh sách
        const fresh = await importApi.getAll();
        setImports(fresh.data.data || []);
      }
    } catch (err) {
      alert(
        "❌ Lỗi khi xóa phiếu: " + (err.response?.data?.message || err.message),
      );
    }
  };

  // ====================== CÁC HÀM KHÁC ======================
  const getExpiryInfo = (expiryDate) => {
    if (!expiryDate) return null;
    const days = Math.ceil((new Date(expiryDate) - new Date()) / 86400000);
    if (days <= 0) return { label: "Hết hạn", cls: "expiry-expired" };
    if (days <= 10) return { label: `Còn ${days} ngày`, cls: "expiry-red" };
    if (days <= 30) return { label: `Còn ${days} ngày`, cls: "expiry-yellow" };
    return { label: `Còn ${days} ngày`, cls: "expiry-green" };
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "productCode" && value) {
      const selected = products.find((p) => p.code === value);
      if (selected) {
        newItems[index].unitPrice = selected.costPrice || selected.price || 0;
        if (selected.expiryDays) {
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + selected.expiryDays);
          newItems[index].expiryDate = expiry.toISOString().split("T")[0];
        }
      }
    }
    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { productCode: "", quantity: 1, unitPrice: 0, expiryDate: "" },
      ],
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
        supplierId: formData.supplierId,
        warehouseId: formData.warehouseId,
        notes: formData.notes.trim(),
        items: formData.items.map((item) => ({
          productCode: item.productCode,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          expiryDate: item.expiryDate || undefined,
        })),
      };

      const res = await importApi.create(payload);
      if (res.data.success) {
        const newCode = res.data.code || res.data.data?.code;
        alert(`✅ Tạo phiếu nhập kho thành công!\nMã phiếu: ${newCode}`);

        setFormData({
          supplierId: "",
          warehouseId: "",
          notes: "",
          items: [
            { productCode: "", quantity: 1, unitPrice: 0, expiryDate: "" },
          ],
        });

        const fresh = await importApi.getAll();
        setImports(fresh.data.data || []);
      }
    } catch (err) {
      alert("❌ Lỗi: " + (err.response?.data?.message || err.message));
    }
  };

  const handleAddSupplier = async () => {
    if (!newSupplierName.trim()) return alert("Vui lòng nhập tên nhà cung cấp");
    try {
      const res = await supplierApi.create({
        name: newSupplierName.trim(),
        status: "active",
      });
      setSuppliers([...suppliers, res.data.data]);
      setFormData((prev) => ({ ...prev, supplierId: res.data.data._id }));
      setNewSupplierName("");
      setShowSupplierModal(false);
    } catch {
      alert("Không thể thêm nhà cung cấp");
    }
  };

  const handleAddWarehouse = async () => {
    if (!newWarehouseName.trim()) return alert("Vui lòng nhập tên kho");
    try {
      const res = await warehouseApi.create({
        name: newWarehouseName.trim(),
        status: "active",
      });
      setWarehouses([...warehouses, res.data.data]);
      setFormData((prev) => ({ ...prev, warehouseId: res.data.data._id }));
      setNewWarehouseName("");
      setShowWarehouseModal(false);
    } catch {
      alert("Không thể thêm kho");
    }
  };

  // Options cho react-select
  const supplierOptions = suppliers.map((s) => ({
    value: s._id,
    label: `${s.name}${s.phone ? ` (${s.phone})` : ""}`,
  }));

  const warehouseOptions = warehouses.map((w) => ({
    value: w._id,
    label: w.name,
  }));

  const productOptions = products.map((p) => ({
    value: p.code,
    label: `${p.code} — ${p.name}`,
    expiryDays: p.expiryDays,
  }));

  if (loading) return <div className="loading">Đang tải dữ liệu...</div>;

  return (
    <div className="im-root">
      {/* Header */}
      <div className="im-header">
        <div className="im-title-block">
          <span className="im-title-icon">📥</span>
          <div>
            <h1 className="im-title">Nhập kho</h1>
            <p className="im-subtitle">{imports.length} phiếu nhập</p>
          </div>
        </div>
      </div>

      {/* Form tạo phiếu */}
      <div className="im-form-card">
        <h2>Tạo phiếu nhập kho mới</h2>
        <form onSubmit={handleSubmit}>
          <div className="im-form-row">
            <div className="im-form-group">
              <label>
                Nhà cung cấp <span className="required">*</span>
              </label>
              <div className="select-with-add">
                <Select
                  options={supplierOptions}
                  value={
                    supplierOptions.find(
                      (o) => o.value === formData.supplierId,
                    ) || null
                  }
                  onChange={(sel) =>
                    setFormData((p) => ({ ...p, supplierId: sel?.value || "" }))
                  }
                  placeholder="Tìm theo tên hoặc SĐT..."
                  isSearchable
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
                <button
                  type="button"
                  className="btn-add-inline"
                  onClick={() => setShowSupplierModal(true)}
                >
                  +
                </button>
              </div>
            </div>

            <div className="im-form-group">
              <label>
                Kho <span className="required">*</span>
              </label>
              <div className="select-with-add">
                <Select
                  options={warehouseOptions}
                  value={
                    warehouseOptions.find(
                      (o) => o.value === formData.warehouseId,
                    ) || null
                  }
                  onChange={(sel) =>
                    setFormData((p) => ({
                      ...p,
                      warehouseId: sel?.value || "",
                    }))
                  }
                  placeholder="Tìm kho..."
                  isSearchable
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
                <button
                  type="button"
                  className="btn-add-inline"
                  onClick={() => setShowWarehouseModal(true)}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Chi tiết sản phẩm nhập */}
          <div className="items-section">
            <h3>Chi tiết sản phẩm nhập</h3>
            <div className="items-table-wrap">
              <table className="items-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 240 }}>Sản phẩm</th>
                    <th style={{ minWidth: 90 }}>Số lượng</th>
                    <th style={{ minWidth: 140 }}>Giá vốn (₫)</th>
                    <th style={{ minWidth: 150 }}>Hạn sử dụng</th>
                    <th style={{ minWidth: 120 }}>Thành tiền</th>
                    <th style={{ minWidth: 60 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
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
                          placeholder="Tìm sản phẩm..."
                          isSearchable
                          className="react-select-container"
                          classNamePrefix="react-select"
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                        />
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
                      <td>
                        <input
                          type="date"
                          value={item.expiryDate || ""}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "expiryDate",
                              e.target.value,
                            )
                          }
                        />
                        {item.expiryDate &&
                          (() => {
                            const info = getExpiryInfo(item.expiryDate);
                            return info ? (
                              <span
                                className={`expiry-badge ${info.cls}`}
                                style={{
                                  display: "block",
                                  marginTop: 4,
                                  fontSize: 11,
                                }}
                              >
                                {info.label}
                              </span>
                            ) : null;
                          })()}
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
              value={formData.notes}
              onChange={(e) =>
                setFormData((p) => ({ ...p, notes: e.target.value }))
              }
              placeholder="Ghi chú thêm (nếu có)"
              rows={4}
            />
          </div>

          <button type="submit" className="im-btn-primary">
            Tạo phiếu nhập kho
          </button>
        </form>
      </div>

      {/* Lịch sử phiếu nhập - ĐÃ CÓ NÚT XÓA */}
      <div className="im-history">
        <h2>Lịch sử phiếu nhập kho</h2>
        <input
          className="im-search"
          placeholder="Tìm theo mã phiếu, ngày nhập, nhà cung cấp, kho..."
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
              <th>Chi tiết</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredImports.length === 0 ? (
              <tr>
                <td
                  colSpan="9"
                  style={{
                    textAlign: "center",
                    padding: "60px",
                    color: "#94a3b8",
                  }}
                >
                  Không tìm thấy phiếu nhập nào
                </td>
              </tr>
            ) : (
              filteredImports.map((imp) => (
                <tr key={imp._id}>
                  <td>
                    <strong style={{ color: "#3b6ef8" }}>{imp.code}</strong>
                  </td>
                  <td>
                    {new Date(imp.importDate).toLocaleDateString("vi-VN")}
                  </td>
                  <td>
                    {suppliers.find((s) => s._id === imp.supplierId)?.name ||
                      "—"}
                  </td>
                  <td>
                    {warehouses.find((w) => w._id === imp.warehouseId)?.name ||
                      "—"}
                  </td>
                  <td>{imp.items?.length || 0} mặt hàng</td>
                  <td>
                    <strong>
                      {imp.totalAmount?.toLocaleString("vi-VN")} ₫
                    </strong>
                  </td>
                  <td>
                    {imp.notes || <span style={{ color: "#94a3b8" }}>—</span>}
                  </td>
                  <td>
                    <button
                      className="im-btn-detail"
                      onClick={() => setDetailTarget(imp)}
                    >
                      🔍 Xem
                    </button>
                  </td>
                  <td>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteImport(imp._id, imp.code)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal chi tiết phiếu */}
      {detailTarget && (
        <div className="modal-overlay" onClick={() => setDetailTarget(null)}>
          <div className="modal-detail" onClick={(e) => e.stopPropagation()}>
            <div className="modal-detail-header">
              <h3>📋 Chi tiết phiếu {detailTarget.code}</h3>
              <button onClick={() => setDetailTarget(null)}>✕</button>
            </div>

            <div className="modal-detail-info">
              <div className="detail-row">
                <span>Ngày nhập:</span>
                <strong>
                  {new Date(detailTarget.importDate).toLocaleDateString(
                    "vi-VN",
                  )}
                </strong>
              </div>
              <div className="detail-row">
                <span>Nhà cung cấp:</span>
                <strong>
                  {suppliers.find((s) => s._id === detailTarget.supplierId)
                    ?.name || "—"}
                </strong>
              </div>
              <div className="detail-row">
                <span>Kho:</span>
                <strong>
                  {warehouses.find((w) => w._id === detailTarget.warehouseId)
                    ?.name || "—"}
                </strong>
              </div>
              {detailTarget.notes && (
                <div className="detail-row">
                  <span>Ghi chú:</span>
                  <strong>{detailTarget.notes}</strong>
                </div>
              )}
            </div>

            <table className="detail-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Mã SP</th>
                  <th>Tên sản phẩm</th>
                  <th>Số lượng</th>
                  <th>Giá vốn</th>
                  <th>Hạn sử dụng</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {detailTarget.items?.map((item, i) => {
                  const prod = products.find(
                    (p) => p.code === item.productCode,
                  );
                  const info = getExpiryInfo(item.expiryDate);
                  return (
                    <tr key={i}>
                      <td style={{ color: "#94a3b8" }}>{i + 1}</td>
                      <td>
                        <code className="im-code">{item.productCode}</code>
                      </td>
                      <td>{prod?.name || item.productCode}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unitPrice?.toLocaleString("vi-VN")} ₫</td>
                      <td>
                        {info ? (
                          <div>
                            <span>
                              {new Date(item.expiryDate).toLocaleDateString(
                                "vi-VN",
                              )}
                            </span>
                            <span
                              className={`expiry-badge ${info.cls}`}
                              style={{ display: "block", marginTop: 2 }}
                            >
                              {info.label}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>—</span>
                        )}
                      </td>
                      <td>
                        <strong>
                          {item.totalPrice?.toLocaleString("vi-VN")} ₫
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

      {/* Modal thêm Nhà cung cấp */}
      {showSupplierModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowSupplierModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Thêm nhà cung cấp mới</h3>
            <input
              type="text"
              placeholder="Tên nhà cung cấp"
              value={newSupplierName}
              onChange={(e) => setNewSupplierName(e.target.value)}
            />
            <div className="modal-buttons">
              <button onClick={() => setShowSupplierModal(false)}>Hủy</button>
              <button onClick={handleAddSupplier}>Thêm</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal thêm Kho */}
      {showWarehouseModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowWarehouseModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Thêm kho mới</h3>
            <input
              type="text"
              placeholder="Tên kho"
              value={newWarehouseName}
              onChange={(e) => setNewWarehouseName(e.target.value)}
            />
            <div className="modal-buttons">
              <button onClick={() => setShowWarehouseModal(false)}>Hủy</button>
              <button onClick={handleAddWarehouse}>Thêm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Import;
