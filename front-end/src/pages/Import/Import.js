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

  // Form
  const [formData, setFormData] = useState({
    code: `NH-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`,
    supplierId: "",
    warehouseId: "",
    notes: "",
    items: [{ productCode: "", quantity: 1, unitPrice: 0 }],
  });

  const [totalAmount, setTotalAmount] = useState(0);

  // Modal thêm nhanh
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newWarehouseName, setNewWarehouseName] = useState("");

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

  // Lọc lịch sử phiếu nhập theo từ khóa tìm kiếm
  const filteredImports = React.useMemo(() => {
    if (!search.trim()) return imports;

    const keyword = search.toLowerCase().trim();

    return imports.filter((imp) => {
      const supplierName =
        suppliers.find((s) => s._id === imp.supplierId)?.name?.toLowerCase() ||
        "";
      const warehouseName =
        warehouses
          .find((w) => w._id === imp.warehouseId)
          ?.name?.toLowerCase() || "";
      const importDateStr = new Date(imp.importDate)
        .toLocaleDateString("vi-VN")
        .toLowerCase();

      return (
        imp.code.toLowerCase().includes(keyword) ||
        supplierName.includes(keyword) ||
        warehouseName.includes(keyword) ||
        importDateStr.includes(keyword)
      );
    });
  }, [imports, suppliers, warehouses, search]);

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
        alert("✅ Tạo phiếu nhập kho thành công!");

        setFormData({
          code: `NH-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`,
          supplierId: "",
          warehouseId: "",
          notes: "",
          items: [{ productCode: "", quantity: 1, unitPrice: 0 }],
        });

        const fresh = await importApi.getAll({ search });
        setImports(fresh.data.data || []);
      }
    } catch (err) {
      alert("❌ Lỗi: " + (err.response?.data?.message || err.message));
    }
  };

  // Thêm nhanh Nhà cung cấp
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
    } catch (err) {
      alert("Không thể thêm nhà cung cấp");
    }
  };

  // Thêm nhanh Kho
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
    } catch (err) {
      alert("Không thể thêm kho");
    }
  };

  // Chuẩn bị options cho react-select
  const supplierOptions = suppliers.map((s) => ({
    value: s._id,
    label: `${s.name} ${s.phone ? `(${s.phone})` : ""}`,
  }));

  const warehouseOptions = warehouses.map((w) => ({
    value: w._id,
    label: w.name,
  }));

  const productOptions = products.map((p) => ({
    value: p.code,
    label: `${p.code} - ${p.name} (Tồn: ${p.stock || 0})`,
  }));

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

      <div className="im-form-card">
        <h2>Tạo phiếu nhập kho mới</h2>
        <form onSubmit={handleSubmit}>
          <div className="im-form-row">
            <div className="im-form-group">
              <label>Mã phiếu nhập</label>
              <input type="text" value={formData.code} readOnly />
            </div>

            {/* Nhà cung cấp với tìm kiếm */}
            <div className="im-form-group">
              <label>
                Nhà cung cấp <span className="required">*</span>
              </label>
              <div className="select-with-add">
                <Select
                  options={supplierOptions}
                  value={supplierOptions.find(
                    (opt) => opt.value === formData.supplierId,
                  )}
                  onChange={(selected) =>
                    setFormData((prev) => ({
                      ...prev,
                      supplierId: selected?.value || "",
                    }))
                  }
                  placeholder="Tìm theo tên hoặc số điện thoại..."
                  isSearchable
                  className="react-select"
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

            {/* Kho với tìm kiếm */}
            <div className="im-form-group">
              <label>
                Kho <span className="required">*</span>
              </label>
              <div className="select-with-add">
                <Select
                  options={warehouseOptions}
                  value={warehouseOptions.find(
                    (opt) => opt.value === formData.warehouseId,
                  )}
                  onChange={(selected) =>
                    setFormData((prev) => ({
                      ...prev,
                      warehouseId: selected?.value || "",
                    }))
                  }
                  placeholder="Tìm kho..."
                  isSearchable
                  className="react-select"
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

          {/* Bảng chi tiết sản phẩm nhập */}
          <div className="items-section">
            <h3>Chi tiết sản phẩm nhập</h3>
            <table className="items-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Số lượng</th>
                  <th>Giá bán (₫)</th>
                  <th>Giá vốn (nhập) (₫)</th>
                  <th>Thành tiền</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {formData.items.map((item, index) => {
                  const selectedProduct = products.find(
                    (p) => p.code === item.productCode,
                  );
                  return (
                    <tr key={index}>
                      <td>
                        <Select
                          options={productOptions}
                          value={
                            productOptions.find(
                              (opt) => opt.value === item.productCode,
                            ) || null
                          }
                          onChange={(selected) =>
                            handleItemChange(
                              index,
                              "productCode",
                              selected ? selected.value : "",
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
                          value={
                            selectedProduct
                              ? selectedProduct.price
                              : item.unitPrice
                          }
                          readOnly
                          className="readonly-input"
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
                          placeholder="Giá nhập thực tế"
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
                  );
                })}
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
            </tr>
          </thead>
          <tbody>
            {filteredImports.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  style={{ textAlign: "center", padding: "60px" }}
                >
                  Không tìm thấy phiếu nhập nào
                </td>
              </tr>
            ) : (
              filteredImports.map((imp) => {
                const supplierName =
                  suppliers.find((s) => s._id === imp.supplierId)?.name || "—";
                const warehouseName =
                  warehouses.find((w) => w._id === imp.warehouseId)?.name ||
                  "—";

                return (
                  <tr key={imp._id}>
                    <td>
                      <strong>{imp.code}</strong>
                    </td>
                    <td>
                      {new Date(imp.importDate).toLocaleDateString("vi-VN")}
                    </td>
                    <td>{supplierName}</td>
                    <td>{warehouseName}</td>
                    <td>{imp.items.length} mặt hàng</td>
                    <td>{imp.totalAmount?.toLocaleString("vi-VN")} ₫</td>
                    <td>{imp.notes || "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

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
