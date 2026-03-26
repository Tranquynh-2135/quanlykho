import React, { useState, useEffect, useCallback } from 'react';
import { warehouseApi } from '../../services/warehouseApi';
import './Warehouses.css';

const EMPTY_FORM = {
  name: '', location: '', capacity: '', note: '', status: 'active',
};

const Warehouses = () => {
  const [warehouses,   setWarehouses]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [showModal,    setShowModal]    = useState(false);
  const [modalMode,    setModalMode]    = useState('add');
  const [editingId,    setEditingId]    = useState(null);
  const [formData,     setFormData]     = useState(EMPTY_FORM);
  const [formError,    setFormError]    = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchWarehouses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await warehouseApi.getAll({
        ...(search       && { search }),
        ...(filterStatus && { status: filterStatus }),
      });
      setWarehouses(res.data.data || []);
      setError(null);
    } catch {
      setError('Không thể tải danh sách kho.');
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus]);

  useEffect(() => { fetchWarehouses(); }, [fetchWarehouses]);

  const openAdd = () => {
    setFormData(EMPTY_FORM);
    setFormError('');
    setModalMode('add');
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (w) => {
    setFormData({
      name:     w.name     || '',
      location: w.location || '',
      capacity: w.capacity ?? '',
      note:     w.note     || '',
      status:   w.status   || 'active',
    });
    setFormError('');
    setModalMode('edit');
    setEditingId(w._id);
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.name.trim()) return setFormError('Tên kho không được trống.');

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        capacity: formData.capacity !== '' ? Number(formData.capacity) : undefined,
      };
      if (modalMode === 'add') await warehouseApi.create(payload);
      else                     await warehouseApi.update(editingId, payload);
      setShowModal(false);
      fetchWarehouses();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await warehouseApi.remove(deleteTarget._id);
      setDeleteTarget(null);
      fetchWarehouses();
    } catch {
      alert('Xóa thất bại. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="wh-root">
      {/* Header */}
      <div className="wh-header">
        <div className="wh-title-block">
          <span className="wh-title-icon">🏪</span>
          <div>
            <h1 className="wh-title">Quản lý Kho</h1>
            <p className="wh-subtitle">{warehouses.length} kho hàng</p>
          </div>
        </div>
        <button className="wh-btn wh-btn-primary" onClick={openAdd}>
          <span>＋</span> Thêm kho
        </button>
      </div>

      {/* Filters */}
      <div className="wh-filters">
        <div className="wh-search-wrap">
          <span className="wh-search-icon">🔍</span>
          <input className="wh-search"
            placeholder="Tìm theo tên kho..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="wh-select" value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Ngừng hoạt động</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="wh-state"><div className="wh-spinner" /><span>Đang tải...</span></div>
      ) : error ? (
        <div className="wh-state wh-error-state">⚠️ {error}</div>
      ) : warehouses.length === 0 ? (
        <div className="wh-state wh-empty-state">
          <span style={{ fontSize: 48 }}>🏪</span>
          <p>Chưa có kho nào. Hãy thêm kho đầu tiên!</p>
        </div>
      ) : (
        <div className="wh-grid">
          {warehouses.map((w) => (
            <div key={w._id} className="wh-card">
              <div className="wh-card-header">
                <span className="wh-card-icon">🏪</span>
                <span className={`wh-status wh-status-${w.status}`}>
                  {w.status === 'active' ? 'Hoạt động' : 'Ngừng HĐ'}
                </span>
              </div>
              <h3 className="wh-card-name">{w.name}</h3>
              <div className="wh-card-info">
                <div className="wh-card-row">
                  <span className="wh-card-label">📍 Địa điểm</span>
                  <span>{w.location || <span className="wh-muted">—</span>}</span>
                </div>
                <div className="wh-card-row">
                  <span className="wh-card-label">📦 Sức chứa</span>
                  <span>{w.capacity
                    ? `${w.capacity.toLocaleString('vi-VN')} đơn vị`
                    : <span className="wh-muted">Không giới hạn</span>}
                  </span>
                </div>
                {w.note && (
                  <div className="wh-card-row">
                    <span className="wh-card-label">📝 Ghi chú</span>
                    <span className="wh-muted wh-note">{w.note}</span>
                  </div>
                )}
              </div>
              <div className="wh-card-footer">
                <button className="wh-btn wh-btn-ghost wh-btn-sm"
                  onClick={() => openEdit(w)}>✏️ Sửa</button>
                <button className="wh-btn wh-btn-danger-outline wh-btn-sm"
                  onClick={() => setDeleteTarget(w)}>🗑️ Xóa</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="wh-overlay" onClick={() => setShowModal(false)}>
          <div className="wh-modal" onClick={e => e.stopPropagation()}>
            <div className="wh-modal-header">
              <h2>{modalMode === 'add' ? '➕ Thêm kho mới' : '✏️ Chỉnh sửa kho'}</h2>
              <button className="wh-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form className="wh-form" onSubmit={handleSubmit}>
              {formError && <div className="wh-form-error">⚠️ {formError}</div>}
              <div className="wh-form-grid">

                <label className="wh-full-col">Tên kho *
                  <input name="name" value={formData.name}
                    onChange={handleFormChange} placeholder="Kho A1, Kho chính..." />
                </label>

                <label>Địa điểm
                  <input name="location" value={formData.location}
                    onChange={handleFormChange} placeholder="123 Đường ABC, Q.1..." />
                </label>

                <label>Sức chứa (đơn vị)
                  <input name="capacity" type="number" min="0"
                    value={formData.capacity} onChange={handleFormChange}
                    placeholder="Để trống = không giới hạn" />
                </label>

                <label>Trạng thái
                  <select name="status" value={formData.status} onChange={handleFormChange}>
                    <option value="active">Đang hoạt động</option>
                    <option value="inactive">Ngừng hoạt động</option>
                  </select>
                </label>

                <label className="wh-full-col">Ghi chú
                  <textarea name="note" value={formData.note}
                    onChange={handleFormChange} rows={3}
                    placeholder="Ghi chú về kho..." />
                </label>

              </div>
              <div className="wh-form-footer">
                <button type="button" className="wh-btn wh-btn-ghost"
                  onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="wh-btn wh-btn-primary" disabled={submitting}>
                  {submitting ? 'Đang lưu...' : modalMode === 'add' ? 'Thêm kho' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="wh-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="wh-confirm" onClick={e => e.stopPropagation()}>
            <div className="wh-confirm-icon">🗑️</div>
            <h3>Xác nhận xóa</h3>
            <p>Bạn có chắc muốn xóa kho<br />
              <strong>"{deleteTarget.name}"</strong>?</p>
            <p className="wh-confirm-warn">Hành động này không thể hoàn tác.</p>
            <div className="wh-confirm-actions">
              <button className="wh-btn wh-btn-ghost"
                onClick={() => setDeleteTarget(null)}>Hủy</button>
              <button className="wh-btn wh-btn-danger"
                onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Đang xóa...' : 'Xóa kho'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warehouses;