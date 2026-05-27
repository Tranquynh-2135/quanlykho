import React, { useState, useEffect, useCallback } from "react";
import { productApi } from "../../services/productApi";
import "./Products.css";

const EMPTY_FORM = {
  code: "",
  name: "",
  categoryId: "",
  description: "",
  status: "active",
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [currentHash, setCurrentHash] = useState("");

  // Load danh mục
  useEffect(() => {
    productApi
      .getAllCategories()
      .then((res) => setCategories(res.data.data || []))
      .catch(console.error);
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await productApi.getAll({
        ...(search && { search }),
        ...(filterStatus && { status: filterStatus }),
        page,
        limit: 24,
      });
      setProducts(res.data.data || []);
      setPagination(res.data.pagination || { totalPages: 1, total: 0 });
      setError(null);
    } catch (err) {
      setError("Không thể tải danh sách sản phẩm.");
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, page]);

  // Reset về trang 1 khi tìm kiếm hoặc lọc
  useEffect(() => {
    setPage(1);
  }, [search, filterStatus]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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
      code: p.code || "",
      name: p.name || "",
      categoryId: p.categoryId?._id || p.categoryId || "",
      description: p.description || "",
      status: p.status || "active",
    });
    setCurrentHash(p.imageHash || "");
    setImagePreview(p.imageHash ? productApi.imageUrl(p.imageHash) : null);
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

    if (!formData.code.trim())
      return setFormError("Mã sản phẩm không được để trống.");
    if (!formData.name.trim())
      return setFormError("Tên sản phẩm không được để trống.");

    setSubmitting(true);
    try {
      let imageHash = currentHash;
      if (imageFile) {
        const up = await productApi.uploadImage(imageFile);
        imageHash = up.data.imageHash;
      }

      const payload = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        categoryId: formData.categoryId || null,
        description: formData.description.trim(),
        status: formData.status,
        imageHash,
      };

      if (modalMode === "add") {
        await productApi.create(payload);
      } else {
        await productApi.update(editingId, payload);
      }

      setShowModal(false);
      fetchProducts();
    } catch (err) {
      setFormError(
        err.response?.data?.message || "Có lỗi xảy ra khi lưu sản phẩm.",
      );
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
      alert("Xóa sản phẩm thất bại.");
    } finally {
      setDeleting(false);
    }
  };

  const statusLabel = (s) =>
    ({ active: "Hoạt động", inactive: "Ngừng KD", discontinued: "Ngừng SX" })[
      s
    ] || s;

  return (
    <div className="pp-root">
      <div className="pp-header">
        <div className="pp-title-block">
          <span className="pp-title-icon">📦</span>
          <div>
            <h1 className="pp-title">Quản lý Sản phẩm</h1>
            <p className="pp-subtitle">
              Tổng cộng: {pagination.total || 0} sản phẩm
            </p>
          </div>
        </div>
        <button className="pp-btn pp-btn-primary" onClick={openAdd}>
          <span>＋</span> Thêm sản phẩm
        </button>
      </div>

      <div className="pp-filters">
        <div className="pp-search-wrap">
          <span className="pp-search-icon">🔍</span>
          <input
            className="pp-search"
            placeholder="Tìm theo mã hoặc tên sản phẩm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="pp-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Ngừng KD</option>
          <option value="discontinued">Ngừng SX</option>
        </select>
      </div>

      {loading ? (
        <div className="pp-state">
          <div className="pp-spinner" />
          <span>Đang tải sản phẩm...</span>
        </div>
      ) : error ? (
        <div className="pp-state pp-error-state">⚠️ {error}</div>
      ) : products.length === 0 ? (
        <div className="pp-state">
          <span style={{ fontSize: 48 }}>📦</span>
          <p>Chưa có sản phẩm nào.</p>
        </div>
      ) : (
        <>
          <div className="pp-card-grid">
            {products.map((p) => (
              <div key={p._id} className="pp-card">
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
                  <span className={`pp-card-status pp-status-${p.status}`}>
                    {statusLabel(p.status)}
                  </span>
                </div>

                <div className="pp-card-body">
                  <code className="pp-code">{p.code}</code>
                  <h3 className="pp-card-name">{p.name}</h3>
                  {p.categoryId && (
                    <div className="pp-card-category">
                      Danh mục: <strong>{p.categoryId.name || "—"}</strong>
                    </div>
                  )}
                  {p.description && (
                    <p className="pp-card-desc">{p.description}</p>
                  )}
                </div>

                <div className="pp-card-footer">
                  <button
                    className="pp-btn-icon pp-btn-edit"
                    onClick={() => openEdit(p)}
                    title="Sửa"
                  >
                    ✏️
                  </button>
                  <button
                    className="pp-btn-icon pp-btn-del"
                    onClick={() => setDeleteTarget(p)}
                    title="Xóa"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Bộ điều khiển phân trang */}
          {pagination.totalPages > 1 && (
            <div
              className="pp-pagination"
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "20px",
                marginTop: "30px",
                padding: "20px",
              }}
            >
              <button
                className="pp-btn pp-btn-ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Trang trước
              </button>
              <span className="pp-page-info" style={{ fontWeight: "600" }}>
                Trang {page} / {pagination.totalPages || 1}
              </span>
              <button
                className="pp-btn pp-btn-ghost"
                disabled={page >= (pagination.totalPages || 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Trang sau
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="pp-overlay" onClick={() => setShowModal(false)}>
          <div className="pp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pp-modal-header">
              <h2>
                {modalMode === "add"
                  ? "➕ Thêm sản phẩm mới"
                  : "✏️ Chỉnh sửa sản phẩm"}
              </h2>
              <button
                className="pp-modal-close"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <form className="pp-form" onSubmit={handleSubmit}>
              {formError && <div className="pp-form-error">⚠️ {formError}</div>}

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
                      📷 Chưa có ảnh
                    </div>
                  )}
                </div>
                <label className="pp-img-upload-btn">
                  {imagePreview ? "Đổi ảnh" : "Tải ảnh lên"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              <div className="pp-form-grid">
                <label>
                  Mã sản phẩm *
                  <input
                    name="code"
                    value={formData.code}
                    onChange={handleFormChange}
                    placeholder="SP001"
                    disabled={modalMode === "edit"}
                    required
                  />
                </label>

                <label>
                  Tên sản phẩm *
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    required
                  />
                </label>

                <label>
                  Danh mục
                  <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleFormChange}
                  >
                    <option value="">— Chọn danh mục —</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Trạng thái
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                  >
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Ngừng kinh doanh</option>
                    <option value="discontinued">Ngừng sản xuất</option>
                  </select>
                </label>

                <label className="pp-full-col">
                  Ghi chú
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    rows={3}
                    placeholder="Mô tả thêm..."
                  />
                </label>
              </div>

              <div className="pp-form-footer">
                <button
                  type="button"
                  className="pp-btn pp-btn-ghost"
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="pp-btn pp-btn-primary"
                  disabled={submitting}
                >
                  {submitting
                    ? "Đang lưu..."
                    : modalMode === "add"
                      ? "Thêm sản phẩm"
                      : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="pp-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="pp-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="pp-confirm-icon">🗑️</div>
            <h3>Xác nhận xóa</h3>
            <p>
              Bạn có chắc muốn xóa sản phẩm
              <br />
              <strong>"{deleteTarget.name}"</strong>?
            </p>
            <p className="pp-confirm-warn">Hành động này không thể hoàn tác.</p>
            <div className="pp-confirm-actions">
              <button
                className="pp-btn pp-btn-ghost"
                onClick={() => setDeleteTarget(null)}
              >
                Hủy
              </button>
              <button
                className="pp-btn pp-btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
