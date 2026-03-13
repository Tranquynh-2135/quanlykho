// src/pages/Products.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Products.css';

const API_URL = 'http://localhost:4001/products';

const EMPTY_FORM = {
  code: '', name: '', price: '', stock: '', minStock: '10',
  maxStock: '', location: '', supplier: '', images: '',
  description: '', status: 'active'
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Search
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      const response = await axios.get(API_URL, { params });
      setProducts(response.data.data || response.data);
      setError(null);
    } catch (err) {
      setError('Không thể tải danh sách sản phẩm. Vui lòng kiểm tra backend.');
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openAdd = () => {
    setFormData(EMPTY_FORM);
    setFormError('');
    setModalMode('add');
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (product) => {
    setFormData({
      code: product.code || '',
      name: product.name || '',
      price: product.price ?? '',
      stock: product.stock ?? '',
      minStock: product.minStock ?? '10',
      maxStock: product.maxStock ?? '',
      location: product.location || '',
      supplier: product.supplier || '',
      images: (product.images || []).join(', '),
      description: product.description || '',
      status: product.status || 'active',
    });
    setFormError('');
    setModalMode('edit');
    setEditingId(product._id);
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.code.trim()) return setFormError('Mã sản phẩm không được trống.');
    if (!formData.name.trim()) return setFormError('Tên sản phẩm không được trống.');
    if (formData.price === '' || isNaN(Number(formData.price))) return setFormError('Giá bán không hợp lệ.');

    const payload = {
      ...formData,
      price: Number(formData.price),
      stock: Number(formData.stock) || 0,
      minStock: Number(formData.minStock) || 10,
      maxStock: formData.maxStock !== '' ? Number(formData.maxStock) : undefined,
      images: formData.images ? formData.images.split(',').map(s => s.trim()).filter(Boolean) : [],
    };

    setSubmitting(true);
    try {
      if (modalMode === 'add') {
        await axios.post(API_URL, payload);
      } else {
        await axios.put(`${API_URL}/${editingId}`, payload);
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (product) => setDeleteTarget(product);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`${API_URL}/${deleteTarget._id}`);
      setDeleteTarget(null);
      fetchProducts();
    } catch {
      alert('Xóa thất bại. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
    }
  };

  const statusLabel = (s) => ({
    active: 'Hoạt động', inactive: 'Ngừng KD', discontinued: 'Ngừng SX'
  })[s] || s;

  return (
    <div className="pp-root">
      {/* Header */}
      <div className="pp-header">
        <div className="pp-title-block">
          <span className="pp-title-icon">📦</span>
          <div>
            <h1 className="pp-title">Quản lý Sản phẩm</h1>
            <p className="pp-subtitle">{products.length} sản phẩm trong kho</p>
          </div>
        </div>
        <button className="pp-btn pp-btn-primary" onClick={openAdd}>
          <span>＋</span> Thêm sản phẩm
        </button>
      </div>

      {/* Filters */}
      <div className="pp-filters">
        <div className="pp-search-wrap">
          <span className="pp-search-icon">🔍</span>
          <input
            className="pp-search"
            placeholder="Tìm theo mã hoặc tên sản phẩm..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="pp-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Ngừng KD</option>
          <option value="discontinued">Ngừng SX</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="pp-state"><div className="pp-spinner" /><span>Đang tải...</span></div>
      ) : error ? (
        <div className="pp-state pp-error-state">⚠️ {error}</div>
      ) : products.length === 0 ? (
        <div className="pp-state pp-empty-state">
          <span style={{ fontSize: 48 }}>🗃️</span>
          <p>Chưa có sản phẩm nào. Hãy thêm sản phẩm đầu tiên!</p>
        </div>
      ) : (
        <div className="pp-table-wrap">
          <table className="pp-table">
            <thead>
              <tr>
                <th>Ảnh</th><th>Mã SP</th><th>Tên sản phẩm</th><th>Giá bán</th>
                <th>Tồn kho</th><th>Tồn tối thiểu</th><th>Vị trí</th>
                <th>Nhà cung cấp</th><th>Trạng thái</th><th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p._id} className="pp-row">
                  <td>
                    {p.images?.length > 0
                      ? <img src={p.images[0]} alt={p.name} className="pp-thumb" />
                      : <div className="pp-no-img">📷</div>}
                  </td>
                  <td><code className="pp-code">{p.code}</code></td>
                  <td className="pp-name">{p.name}</td>
                  <td className="pp-price">{p.price.toLocaleString('vi-VN')} ₫</td>
                  <td>
                    <span className={p.stock <= p.minStock ? 'pp-stock-low' : ''}>{p.stock}</span>
                    {p.stock <= p.minStock && <span className="pp-badge-warn">⚠ Thấp</span>}
                  </td>
                  <td>{p.minStock}</td>
                  <td>{p.location || <span className="pp-muted">—</span>}</td>
                  <td>{p.supplier || <span className="pp-muted">—</span>}</td>
                  <td>
                    <span className={`pp-status pp-status-${p.status}`}>{statusLabel(p.status)}</span>
                  </td>
                  <td>
                    <div className="pp-actions">
                      <button className="pp-btn-icon pp-btn-edit" onClick={() => openEdit(p)} title="Sửa">✏️</button>
                      <button className="pp-btn-icon pp-btn-del" onClick={() => confirmDelete(p)} title="Xóa">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="pp-overlay" onClick={() => setShowModal(false)}>
          <div className="pp-modal" onClick={e => e.stopPropagation()}>
            <div className="pp-modal-header">
              <h2>{modalMode === 'add' ? '➕ Thêm sản phẩm mới' : '✏️ Chỉnh sửa sản phẩm'}</h2>
              <button className="pp-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form className="pp-form" onSubmit={handleSubmit}>
              {formError && <div className="pp-form-error">⚠️ {formError}</div>}
              <div className="pp-form-grid">
                <label>Mã sản phẩm *
                  <input name="code" value={formData.code} onChange={handleFormChange} placeholder="SP001" />
                </label>
                <label>Tên sản phẩm *
                  <input name="name" value={formData.name} onChange={handleFormChange} placeholder="Tên sản phẩm" />
                </label>
                <label>Giá bán (₫) *
                  <input name="price" type="number" min="0" value={formData.price} onChange={handleFormChange} placeholder="0" />
                </label>
                <label>Tồn kho
                  <input name="stock" type="number" min="0" value={formData.stock} onChange={handleFormChange} placeholder="0" />
                </label>
                <label>Tồn tối thiểu
                  <input name="minStock" type="number" min="0" value={formData.minStock} onChange={handleFormChange} placeholder="10" />
                </label>
                <label>Tồn tối đa
                  <input name="maxStock" type="number" min="0" value={formData.maxStock} onChange={handleFormChange} placeholder="Không giới hạn" />
                </label>
                <label>Vị trí
                  <input name="location" value={formData.location} onChange={handleFormChange} placeholder="Kệ A1, Tầng 2..." />
                </label>
                <label>Nhà cung cấp
                  <input name="supplier" value={formData.supplier} onChange={handleFormChange} placeholder="Công ty XYZ" />
                </label>
                <label>Trạng thái
                  <select name="status" value={formData.status} onChange={handleFormChange}>
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Ngừng kinh doanh</option>
                    <option value="discontinued">Ngừng sản xuất</option>
                  </select>
                </label>
                <label>URL Ảnh (cách nhau bởi dấu phẩy)
                  <input name="images" value={formData.images} onChange={handleFormChange} placeholder="https://..." />
                </label>
                <label className="pp-full-col">Mô tả
                  <textarea name="description" value={formData.description} onChange={handleFormChange} rows={3} placeholder="Mô tả sản phẩm..." />
                </label>
              </div>
              <div className="pp-form-footer">
                <button type="button" className="pp-btn pp-btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="pp-btn pp-btn-primary" disabled={submitting}>
                  {submitting ? 'Đang lưu...' : modalMode === 'add' ? 'Thêm sản phẩm' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="pp-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="pp-confirm" onClick={e => e.stopPropagation()}>
            <div className="pp-confirm-icon">🗑️</div>
            <h3>Xác nhận xóa</h3>
            <p>Bạn có chắc muốn xóa sản phẩm<br /><strong>"{deleteTarget.name}"</strong>?</p>
            <p className="pp-confirm-warn">Hành động này không thể hoàn tác.</p>
            <div className="pp-confirm-actions">
              <button className="pp-btn pp-btn-ghost" onClick={() => setDeleteTarget(null)}>Hủy</button>
              <button className="pp-btn pp-btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Đang xóa...' : 'Xóa sản phẩm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;