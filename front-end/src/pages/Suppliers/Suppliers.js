import React, { useState, useEffect, useCallback } from 'react';
import { supplierApi } from '../../services/supplierApi';
import './Suppliers.css';

const EMPTY_FORM = {
  name: '', phone: '', email: '',
  address: '', taxCode: '', note: '', status: 'active',
};

const Suppliers = () => {
  const [suppliers,    setSuppliers]    = useState([]);
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

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await supplierApi.getAll({
        ...(search       && { search }),
        ...(filterStatus && { status: filterStatus }),
      });
      setSuppliers(res.data.data || []);
      setError(null);
    } catch {
      setError('Không thể tải danh sách nhà cung cấp.');
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const openAdd = () => {
    setFormData(EMPTY_FORM);
    setFormError('');
    setModalMode('add');
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (s) => {
    setFormData({
      name:    s.name    || '',
      phone:   s.phone   || '',
      email:   s.email   || '',
      address: s.address || '',
      taxCode: s.taxCode || '',
      note:    s.note    || '',
      status:  s.status  || 'active',
    });
    setFormError('');
    setModalMode('edit');
    setEditingId(s._id);
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.name.trim()) return setFormError('Tên nhà cung cấp không được trống.');

    setSubmitting(true);
    try {
      if (modalMode === 'add') await supplierApi.create(formData);
      else                     await supplierApi.update(editingId, formData);
      setShowModal(false);
      fetchSuppliers();
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
      await supplierApi.remove(deleteTarget._id);
      setDeleteTarget(null);
      fetchSuppliers();
    } catch {
      alert('Xóa thất bại. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="sp-root">
      {/* Header */}
      <div className="sp-header">
        <div className="sp-title-block">
          <span className="sp-title-icon">🏭</span>
          <div>
            <h1 className="sp-title">Quản lý Nhà cung cấp</h1>
            <p className="sp-subtitle">{suppliers.length} nhà cung cấp</p>
          </div>
        </div>
        <button className="sp-btn sp-btn-primary" onClick={openAdd}>
          <span>＋</span> Thêm nhà cung cấp
        </button>
      </div>

      {/* Filters */}
      <div className="sp-filters">
        <div className="sp-search-wrap">
          <span className="sp-search-icon">🔍</span>
          <input className="sp-search"
            placeholder="Tìm theo tên nhà cung cấp..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="sp-select" value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Ngừng hợp tác</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="sp-state"><div className="sp-spinner" /><span>Đang tải...</span></div>
      ) : error ? (
        <div className="sp-state sp-error-state">⚠️ {error}</div>
      ) : suppliers.length === 0 ? (
        <div className="sp-state sp-empty-state">
          <span style={{ fontSize: 48 }}>🏭</span>
          <p>Chưa có nhà cung cấp nào.</p>
        </div>
      ) : (
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Tên nhà cung cấp</th>
                <th>Số điện thoại</th>
                <th>Email</th>
                <th>Địa chỉ</th>
                <th>Mã số thuế</th>
                <th>Ghi chú</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s, idx) => (
                <tr key={s._id} className="sp-row">
                  <td className="sp-muted">{idx + 1}</td>
                  <td className="sp-name">{s.name}</td>
                  <td>{s.phone || <span className="sp-muted">—</span>}</td>
                  <td>{s.email || <span className="sp-muted">—</span>}</td>
                  <td className="sp-address">{s.address || <span className="sp-muted">—</span>}</td>
                  <td>
                    {s.taxCode
                      ? <code className="sp-code">{s.taxCode}</code>
                      : <span className="sp-muted">—</span>}
                  </td>
                  <td className="sp-note">{s.note || <span className="sp-muted">—</span>}</td>
                  <td>
                    <span className={`sp-status sp-status-${s.status}`}>
                      {s.status === 'active' ? 'Hoạt động' : 'Ngừng HT'}
                    </span>
                  </td>
                  <td>
                    <div className="sp-actions">
                      <button className="sp-btn-icon sp-btn-edit"
                        onClick={() => openEdit(s)} title="Sửa">✏️</button>
                      <button className="sp-btn-icon sp-btn-del"
                        onClick={() => setDeleteTarget(s)} title="Xóa">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="sp-overlay" onClick={() => setShowModal(false)}>
          <div className="sp-modal" onClick={e => e.stopPropagation()}>
            <div className="sp-modal-header">
              <h2>{modalMode === 'add' ? '➕ Thêm nhà cung cấp' : '✏️ Chỉnh sửa nhà cung cấp'}</h2>
              <button className="sp-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form className="sp-form" onSubmit={handleSubmit}>
              {formError && <div className="sp-form-error">⚠️ {formError}</div>}
              <div className="sp-form-grid">

                <label className="sp-full-col">Tên nhà cung cấp *
                  <input name="name" value={formData.name}
                    onChange={handleFormChange} placeholder="Công ty TNHH ABC" />
                </label>

                <label>Số điện thoại
                  <input name="phone" value={formData.phone}
                    onChange={handleFormChange} placeholder="0901234567" />
                </label>

                <label>Email
                  <input name="email" type="email" value={formData.email}
                    onChange={handleFormChange} placeholder="contact@abc.com" />
                </label>

                <label>Mã số thuế
                  <input name="taxCode" value={formData.taxCode}
                    onChange={handleFormChange} placeholder="0123456789" />
                </label>

                <label>Trạng thái
                  <select name="status" value={formData.status} onChange={handleFormChange}>
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Ngừng hợp tác</option>
                  </select>
                </label>

                <label className="sp-full-col">Địa chỉ
                  <input name="address" value={formData.address}
                    onChange={handleFormChange} placeholder="123 Nguyễn Văn A, Q.1, TP.HCM" />
                </label>

                <label className="sp-full-col">Ghi chú
                  <textarea name="note" value={formData.note}
                    onChange={handleFormChange} rows={3}
                    placeholder="Ghi chú thêm về nhà cung cấp..." />
                </label>

              </div>
              <div className="sp-form-footer">
                <button type="button" className="sp-btn sp-btn-ghost"
                  onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="sp-btn sp-btn-primary" disabled={submitting}>
                  {submitting ? 'Đang lưu...' : modalMode === 'add' ? 'Thêm' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="sp-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="sp-confirm" onClick={e => e.stopPropagation()}>
            <div className="sp-confirm-icon">🗑️</div>
            <h3>Xác nhận xóa</h3>
            <p>Bạn có chắc muốn xóa nhà cung cấp<br />
              <strong>"{deleteTarget.name}"</strong>?</p>
            <p className="sp-confirm-warn">Hành động này không thể hoàn tác.</p>
            <div className="sp-confirm-actions">
              <button className="sp-btn sp-btn-ghost"
                onClick={() => setDeleteTarget(null)}>Hủy</button>
              <button className="sp-btn sp-btn-danger"
                onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;