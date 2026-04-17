import React, { useState, useEffect, useCallback } from "react";
import { productApi } from "../../services/productApi";
import { supplierApi } from "../../services/supplierApi";
import { warehouseApi } from "../../services/warehouseApi";
import "./Products.css";

const EMPTY_FORM = {
  code: "", name: "", minStock: "10", maxStock: "",
  location: "", expiryDays: "", description: "", status: "active",
};

// Tính thông tin hạn sử dụng từ số ngày
const getExpiryInfo = (expiryDays) => {
  if (!expiryDays || expiryDays <= 0) return null;
  if (expiryDays <= 10) return { label: `HSD: ${expiryDays} ngày`, cls: "expiry-red" };
  if (expiryDays <= 30) return { label: `HSD: ${expiryDays} ngày`, cls: "expiry-yellow" };
  return { label: `HSD: ${expiryDays} ngày`, cls: "expiry-green" };
};

// Tính thông tin hạn sử dụng từ số ngày
const getExpiryInfo = (expiryDays) => {
  if (!expiryDays || expiryDays <= 0) return null;
  if (expiryDays <= 10)
    return { label: `HSD: ${expiryDays} ngày`, cls: "expiry-red" };
  if (expiryDays <= 30)
    return { label: `HSD: ${expiryDays} ngày`, cls: "expiry-yellow" };
  return { label: `HSD: ${expiryDays} ngày`, cls: "expiry-green" };
};

const Products = () => {
  const [products,     setProducts]     = useState([]);
  const [suppliers,    setSuppliers]    = useState([]);
  const [warehouses,   setWarehouses]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [showModal,    setShowModal]    = useState(false);
  const [modalMode,    setModalMode]    = useState("add");
  const [editingId,    setEditingId]    = useState(null);
  const [formData,     setFormData]     = useState(EMPTY_FORM);
  const [formError,    setFormError]    = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [currentHash,  setCurrentHash]  = useState("");

  useEffect(() => {
    supplierApi.getAll({ status: "active" }).then((r) => setSuppliers(r.data.data || []));
    warehouseApi.getAll({ status: "active" }).then((r) => setWarehouses(r.data.data || []));
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await productApi.getAll({
        ...(search       && { search }),
        ...(filterStatus && { status: filterStatus }),
      });
      setProducts(res.data.data || []);
      setError(null);
    } catch {
      setError("Không thể tải danh sách vật tư.");
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openAdd = () => {
    setFormData(EMPTY_FORM);
    setFormError("");
    setImageFile(null);
    setImagePreview(null);
    setCurrentHash("");
    setModalMode("add");
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (p) => {
    setFormData({
      code:        p.code        || "",
      name:        p.name        || "",
      minStock:    p.minStock    ?? 10,
      maxStock:    p.maxStock    ?? "",
      location:    p.location    || "",
      expiryDays:  p.expiryDays  ?? "",
      description: p.description || "",
      status:      p.status      || "active",
    });
    setCurrentHash(p.imageHash || "");
    setImagePreview(productApi.imageUrl(p.imageHash));
    setImageFile(null);
    setFormError("");
    setModalMode("edit");
    setEditingId(p._id);
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!formData.code.trim()) return setFormError("Mã vật tư không được trống.");
    if (!formData.name.trim()) return setFormError("Tên vật tư không được trống.");

    setSubmitting(true);
    try {
      let imageHash = currentHash;
      if (imageFile) {
        const up = await productApi.uploadImage(imageFile);
        imageHash = up.data.imageHash;
      }
      const payload = {
        ...formData,
        minStock:   Number(formData.minStock) || 10,
        maxStock:   formData.maxStock   !== "" ? Number(formData.maxStock)   : undefined,
        expiryDays: formData.expiryDays !== "" ? Number(formData.expiryDays) : undefined,
        imageHash,
      };
      if (modalMode === "add") await productApi.create(payload);
      else await productApi.update(editingId, payload);
      else                     await productApi.update(editingId, payload);
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      setFormError(err.response?.data?.message || "Có lỗi xảy ra.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await productApi.remove(deleteTarget._id);
      setDeleteTarget(null);
      fetchProducts();
    } catch {
      alert("Xóa thất bại.");
    } finally {
      setDeleting(false);
    }
  };

  const statusLabel = (s) =>
    ({ active: "Hoạt động", inactive: "Ngừng KD", discontinued: "Ngừng SX" })[s] || s;

  return (
    <div className="pp-root">
      {/* Header */}
      <div className="pp-header">
        <div className="pp-title-block">
          <span className="pp-title-icon">📦</span>
          <div>
            <h1 className="pp-title">Quản lý vật tư</h1>
            <p className="pp-subtitle">{products.length} vật tư trong kho</p>
          </div>
        </div>
        <button className="pp-btn pp-btn-primary" onClick={openAdd}>
          <span>＋</span> Thêm vật tư
        </button>
      </div>

      {/* Filters */}
      <div className="pp-filters">
        <div className="pp-search-wrap">
          <span className="pp-search-icon">🔍</span>
          <input className="pp-search"
            placeholder="Tìm theo mã hoặc tên vật tư..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="pp-select" value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Ngừng KD</option>
          <option value="discontinued">Ngừng SX</option>
        </select>
      </div>

      {/* CARD GRID */}
      {loading ? (
        <div className="pp-state"><div className="pp-spinner" /><span>Đang tải...</span></div>
      ) : error ? (
        <div className="pp-state pp-error-state">⚠️ {error}</div>
      ) : products.length === 0 ? (
        <div className="pp-state pp-empty-state">
          <span style={{ fontSize: 48 }}>🗃️</span>
          <p>Chưa có vật tư nào.</p>
        </div>
      ) : (
        <div className="pp-card-grid">
          {products.map((p) => {
            const expiryInfo = getExpiryInfo(p.expiryDays);
            return (
              <div key={p._id} className="pp-card">
                {/* Ảnh */}
                <div className="pp-card-img-wrap">
                  {p.imageHash ? (
                    <img
                      src={productApi.imageUrl(p.imageHash)}
                      alt={p.name}
                      className="pp-card-img"
                    />
                  ) : (
                    <div className="pp-card-no-img">📷</div>
                  )}
                  {p.imageHash
                    ? <img src={productApi.imageUrl(p.imageHash)} alt={p.name} className="pp-card-img" />
                    : <div className="pp-card-no-img">📷</div>}
                  {/* Badge trạng thái góc trên phải */}
                  <span className={`pp-card-status pp-status-${p.status}`}>
                    {statusLabel(p.status)}
                  </span>
                </div>

                {/* Thông tin chính */}
                <div className="pp-card-body">
                  <code className="pp-code">{p.code}</code>
                  <h3 className="pp-card-name">{p.name}</h3>

                  {/* Hạn sử dụng */}
                  {expiryInfo ? (
                    <span
                      className={`pp-card-expiry expiry-badge ${expiryInfo.cls}`}
                    >
                    <span className={`pp-card-expiry expiry-badge ${expiryInfo.cls}`}>
                      🕐 {expiryInfo.label}
                    </span>
                  ) : (
                    <span className="pp-card-expiry-none">Không có HSD</span>
                  )}

                  {p.description && (
                    <p className="pp-card-desc">{p.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="pp-card-footer">
                  <button
                    className="pp-btn-icon pp-btn-edit"
                    onClick={() => openEdit(p)}
                    title="Sửa"
                  >
                    ✏️ Sửa
                  </button>
                  <button
                    className="pp-btn-icon pp-btn-del"
                    onClick={() => setDeleteTarget(p)}
                    title="Xóa"
                  >
                    🗑️
                  </button>
                  <button className="pp-btn-icon pp-btn-edit"
                    onClick={() => openEdit(p)} title="Sửa">✏️ Sửa</button>
                  <button className="pp-btn-icon pp-btn-del"
                    onClick={() => setDeleteTarget(p)} title="Xóa">🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Thêm/Sửa */}
      {showModal && (
        <div className="pp-overlay" onClick={() => setShowModal(false)}>
          <div className="pp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pp-modal-header">
              <h2>{modalMode === "add" ? "➕ Thêm vật tư mới" : "✏️ Chỉnh sửa vật tư"}</h2>
              <button className="pp-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form className="pp-form" onSubmit={handleSubmit}>
              {formError && <div className="pp-form-error">⚠️ {formError}</div>}

              {/* Ảnh preview lớn ở đầu modal */}
              <div className="pp-modal-img-section">
                <div className="pp-modal-img-wrap">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="pp-modal-img-preview"
                    />
                  ) : (
                    <div className="pp-modal-img-placeholder">
                      📷<span>Chưa có ảnh</span>
                    </div>
                  )}
                </div>
                <label className="pp-img-upload-btn">
                  🖼️ {imagePreview ? "Đổi ảnh" : "Tải ảnh lên"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: "none" }}
                  />
                  {imagePreview
                    ? <img src={imagePreview} alt="preview" className="pp-modal-img-preview" />
                    : <div className="pp-modal-img-placeholder">📷<span>Chưa có ảnh</span></div>
                  }
                </div>
                <label className="pp-img-upload-btn">
                  🖼️ {imagePreview ? "Đổi ảnh" : "Tải ảnh lên"}
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
                </label>
              </div>

              <div className="pp-form-grid">
                <label>
                  Mã vật tư *
                  <input
                    name="code"
                    value={formData.code}
                    onChange={handleFormChange}
                    placeholder="SP001"
                    disabled={modalMode === "edit"}
                  />
                </label>
                <label>
                  Tên vật tư *
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                  />
                <label>Mã vật tư *
                  <input name="code" value={formData.code}
                    onChange={handleFormChange} placeholder="SP001"
                    disabled={modalMode === "edit"} />
                </label>
                <label>Tên vật tư *
                  <input name="name" value={formData.name}
                    onChange={handleFormChange} />
                </label>

                {/* Hạn sử dụng nổi bật */}
                <label className="pp-expiry-label">
                  <span>🕐 Hạn sử dụng (số ngày)</span>
                  <input
                    name="expiryDays"
                    type="number"
                    min="0"
                    value={formData.expiryDays}
                    onChange={handleFormChange}
                    placeholder="VD: 180 ngày"
                  />
                  {formData.expiryDays && (
                    <span
                      className={`expiry-badge ${getExpiryInfo(Number(formData.expiryDays))?.cls || "expiry-green"}`}
                      style={{ marginTop: 4, display: "inline-block" }}
                    >
                      {getExpiryInfo(Number(formData.expiryDays))?.label ||
                        `HSD: ${formData.expiryDays} ngày`}
                    </span>
                  )}
                </label>

                <label>
                  Trạng thái
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                  >
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Ngừng KD</option>
                    <option value="discontinued">Ngừng SX</option>
                  </select>
                </label>

                <label>
                  Tồn tối thiểu
                  <input
                    name="minStock"
                    type="number"
                    value={formData.minStock}
                    onChange={handleFormChange}
                  />
                </label>
                <label>
                  Tồn tối đa
                  <input
                    name="maxStock"
                    type="number"
                    value={formData.maxStock}
                    onChange={handleFormChange}
                  />
                </label>
                <label>
                  Vị trí
                  <input
                    name="location"
                    value={formData.location}
                    onChange={handleFormChange}
                    placeholder="Kệ A1..."
                  />
                </label>

                <label className="pp-full-col">
                  Mô tả
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    rows={3}
                  />
                  <input name="expiryDays" type="number" min="0"
                    value={formData.expiryDays} onChange={handleFormChange}
                    placeholder="VD: 180 ngày" />
                  {formData.expiryDays && (
                    <span className={`expiry-badge ${getExpiryInfo(Number(formData.expiryDays))?.cls || "expiry-green"}`}
                      style={{ marginTop: 4, display: "inline-block" }}>
                      {getExpiryInfo(Number(formData.expiryDays))?.label || `HSD: ${formData.expiryDays} ngày`}
                    </span>
                  )}
                </label>

                <label>Trạng thái
                  <select name="status" value={formData.status} onChange={handleFormChange}>
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Ngừng KD</option>
                    <option value="discontinued">Ngừng SX</option>
                  </select>
                </label>

                <label>Tồn tối thiểu
                  <input name="minStock" type="number"
                    value={formData.minStock} onChange={handleFormChange} />
                </label>
                <label>Tồn tối đa
                  <input name="maxStock" type="number"
                    value={formData.maxStock} onChange={handleFormChange} />
                </label>
                <label>Vị trí
                  <input name="location" value={formData.location}
                    onChange={handleFormChange} placeholder="Kệ A1..." />
                </label>

                <label className="pp-full-col">Mô tả
                  <textarea name="description" value={formData.description}
                    onChange={handleFormChange} rows={3} />
                </label>
              </div>
              <div className="pp-form-footer">
                <button type="button" className="pp-btn pp-btn-ghost"
                  onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="pp-btn pp-btn-primary" disabled={submitting}>
                  {submitting ? "Đang lưu..." : modalMode === "add" ? "Thêm vật tư" : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="pp-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="pp-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="pp-confirm-icon">🗑️</div>
            <h3>Xác nhận xóa</h3>
            <p>
              Bạn có chắc muốn xóa vật tư
              <br />
              <strong>"{deleteTarget.name}"</strong>?
            </p>
            <p>Bạn có chắc muốn xóa vật tư<br />
              <strong>"{deleteTarget.name}"</strong>?</p>
            <p className="pp-confirm-warn">Hành động này không thể hoàn tác.</p>
            <div className="pp-confirm-actions">
              <button className="pp-btn pp-btn-ghost"
                onClick={() => setDeleteTarget(null)}>Hủy</button>
              <button className="pp-btn pp-btn-danger"
                onClick={handleDelete} disabled={deleting}>
                {deleting ? "Đang xóa..." : "Xóa vật tư"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;