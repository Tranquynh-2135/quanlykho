import React, { useState, useEffect, useCallback } from "react";
import { productApi } from "../../services/productApi";
import "./Categories.css";

const EMPTY_FORM = {
  name: "",
};

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // Load danh sách
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await productApi.getAllCategories();
      setCategories(res.data.data || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Không thể tải danh sách danh mục.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openAdd = () => {
    setFormData(EMPTY_FORM);
    setFormError("");
    setModalMode("add");
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setFormData({ name: cat.name || "" });
    setModalMode("edit");
    setEditingId(cat._id);
    setFormError("");
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    setFormData((prev) => ({ ...prev, name: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim()) {
      return setFormError("Tên danh mục không được để trống.");
    }

    setSubmitting(true);
    try {
      if (modalMode === "add") {
        await productApi.createCategory({ name: formData.name.trim() });
      } else {
        await productApi.updateCategory(editingId, {
          name: formData.name.trim(),
        });
      }
      setShowModal(false);
      fetchCategories();
    } catch (err) {
      setFormError(
        err.response?.data?.message || "Có lỗi xảy ra khi lưu danh mục.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await productApi.deleteCategory(deleteTarget._id);
      setDeleteTarget(null);
      fetchCategories();
    } catch (err) {
      alert(
        "Xóa danh mục thất bại. Có thể đang có sản phẩm sử dụng danh mục này.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="cat-root">
      {/* Header */}
      <div className="cat-header">
        <div className="cat-title-block">
          <span className="cat-title-icon">📂</span>
          <div>
            <h1 className="cat-title">Quản lý Danh mục</h1>
            <p className="cat-subtitle">{categories.length} danh mục</p>
          </div>
        </div>
        <button className="cat-btn cat-btn-primary" onClick={openAdd}>
          <span>＋</span> Thêm danh mục
        </button>
      </div>

      {/* Search */}
      <div className="cat-filters">
        <div className="cat-search-wrap">
          <span className="cat-search-icon">🔍</span>
          <input
            className="cat-search"
            placeholder="Tìm theo tên danh mục..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="cat-state">
          <div className="cat-spinner" />
          <span>Đang tải...</span>
        </div>
      ) : error ? (
        <div className="cat-state cat-error-state">⚠️ {error}</div>
      ) : filteredCategories.length === 0 ? (
        <div className="cat-state">
          <span style={{ fontSize: 48 }}>📂</span>
          <p>Chưa có danh mục nào.</p>
        </div>
      ) : (
        <div className="cat-table-wrap">
          <table className="cat-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Tên danh mục</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((cat, idx) => (
                <tr key={cat._id} className="cat-row">
                  <td className="cat-muted">{idx + 1}</td>
                  <td className="cat-name">{cat.name}</td>
                  <td>
                    <div className="cat-actions">
                      <button
                        className="cat-btn-icon cat-btn-edit"
                        onClick={() => openEdit(cat)}
                        title="Sửa"
                      >
                        ✏️
                      </button>
                      <button
                        className="cat-btn-icon cat-btn-del"
                        onClick={() => setDeleteTarget(cat)}
                        title="Xóa"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Thêm / Sửa */}
      {showModal && (
        <div className="cat-overlay" onClick={() => setShowModal(false)}>
          <div className="cat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cat-modal-header">
              <h2>
                {modalMode === "add"
                  ? "➕ Thêm danh mục mới"
                  : "✏️ Chỉnh sửa danh mục"}
              </h2>
              <button
                className="cat-modal-close"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <form className="cat-form" onSubmit={handleSubmit}>
              {formError && (
                <div className="cat-form-error">⚠️ {formError}</div>
              )}

              <label className="cat-full-col">
                Tên danh mục *
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="Ví dụ: Nước ngọt, Bia, Đồ ăn..."
                  required
                />
              </label>

              <div className="cat-form-footer">
                <button
                  type="button"
                  className="cat-btn cat-btn-ghost"
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="cat-btn cat-btn-primary"
                  disabled={submitting}
                >
                  {submitting
                    ? "Đang lưu..."
                    : modalMode === "add"
                      ? "Thêm"
                      : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác nhận xóa */}
      {deleteTarget && (
        <div className="cat-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="cat-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="cat-confirm-icon">🗑️</div>
            <h3>Xác nhận xóa</h3>
            <p>
              Bạn có chắc muốn xóa danh mục <br />
              <strong>"{deleteTarget.name}"</strong>?
            </p>
            <p className="cat-confirm-warn">
              Hành động này không thể hoàn tác.
            </p>
            <div className="cat-confirm-actions">
              <button
                className="cat-btn cat-btn-ghost"
                onClick={() => setDeleteTarget(null)}
              >
                Hủy
              </button>
              <button
                className="cat-btn cat-btn-danger"
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

export default Categories;
