import React, { useState, useEffect, useCallback } from 'react';
import { productApi }  from '../../services/productApi';
import { supplierApi } from '../../services/supplierApi';
import { warehouseApi } from '../../services/warehouseApi';
import ExpiryBadge from '../../components/ExpiryBadge';
import './Products.css';

const EMPTY_FORM = {
  code: '', name: '', price: '', costPrice: '',
  minStock: '10', maxStock: '', location: '',
  supplierId: '', warehouseId: '',
  expiryDays: '',
  description: '', status: 'active',
};

const Products = () => {
  const [products,     setProducts]     = useState([]);
  const [suppliers,    setSuppliers]    = useState([]);   // dropdown
  const [warehouses,   setWarehouses]   = useState([]);   // dropdown
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
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [currentHash,  setCurrentHash]  = useState('');

  // Load suppliers + warehouses cho dropdown
  useEffect(() => {
    supplierApi.getAll({ status: 'active' })
      .then(r => setSuppliers(r.data.data || []))
      .catch(() => {});
    warehouseApi.getAll({ status: 'active' })
      .then(r => setWarehouses(r.data.data || []))
      .catch(() => {});
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
      setError('Không thể tải danh sách vật tư. Vui lòng kiểm tra backend.');
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Helper: lấy tên supplier/warehouse từ id
  const supplierName  = (id) => suppliers.find(s => s._id === id)?.name  || '—';
  const warehouseName = (id) => warehouses.find(w => w._id === id)?.name || '—';

  const openAdd = () => {
    setFormData(EMPTY_FORM);
    setFormError('');
    setImageFile(null);
    setImagePreview(null);
    setCurrentHash('');
    setModalMode('add');
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (p) => {
    setFormData({
      code:        p.code        || '',
      name:        p.name        || '',
      price:       p.price       ?? '',
      costPrice:   p.costPrice   ?? '',
      minStock:    p.minStock    ?? 10,
      maxStock:    p.maxStock    ?? '',
      location:    p.location    || '',
      supplierId:  p.supplierId  || '',
      warehouseId: p.warehouseId || '',
      expiryDays:  p.expiryDays  ?? '',
      description: p.description || '',
      status:      p.status      || 'active',
    });
    setCurrentHash(p.imageHash || '');
    setImagePreview(productApi.imageUrl(p.imageHash));
    setImageFile(null);
    setFormError('');
    setModalMode('edit');
    setEditingId(p._id);
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.code.trim())             return setFormError('Mã vật tư không được trống.');
    if (!formData.name.trim())             return setFormError('Tên vật tư không được trống.');
    if (isNaN(Number(formData.price)))     return setFormError('Giá bán không hợp lệ.');
    if (isNaN(Number(formData.costPrice))) return setFormError('Giá vốn không hợp lệ.');

    setSubmitting(true);
    try {
      let imageHash = currentHash;
      if (imageFile) {
        const up  = await productApi.uploadImage(imageFile);
        imageHash = up.data.imageHash;
      }

      const payload = {
        ...formData,
        price:      Number(formData.price),
        costPrice:  Number(formData.costPrice),
        minStock:   Number(formData.minStock) || 10,
        maxStock:   formData.maxStock    !== '' ? Number(formData.maxStock)    : undefined,
        expiryDays: formData.expiryDays  !== '' ? Number(formData.expiryDays)  : undefined,
        imageHash,
      };

      if (modalMode === 'add') await productApi.create(payload);
      else                     await productApi.update(editingId, payload);

      setShowModal(false);
      fetchProducts();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
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
      alert('Xóa thất bại. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
    }
  };

  const statusLabel = (s) =>
    ({ active: 'Hoạt động', inactive: 'Ngừng KD', discontinued: 'Ngừng SX' })[s] || s;

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
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="pp-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Ngừng KD</option>
          <option value="discontinued">Ngừng SX</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="pp-state"><div className="pp-spinner" /><span>Đang tải...</span></div>
      ) : error ? (
        <div className="pp-state pp-error-state">⚠️ {error}</div>
      ) : products.length === 0 ? (
        <div className="pp-state pp-empty-state">
          <span style={{ fontSize: 48 }}>🗃️</span>
          <p>Chưa có vật tư nào. Hãy thêm vật tư đầu tiên!</p>
        </div>
      ) : (
        <div className="pp-table-wrap">
          <table className="pp-table">
            <thead>
              <tr>
                <th>Ảnh</th>
                <th>Mã SP</th>
                <th>Tên vật tư</th>
                <th>Giá bán</th>
                <th>Giá vốn</th>
                <th>HSD (ngày)</th>
                <th>Tồn kho</th>
                <th>Tồn tối thiểu</th>
                <th>Vị trí</th>
                <th>Nhà cung cấp</th>
                <th>Kho</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p._id} className="pp-row">
                  <td>
                    {p.imageHash
                      ? <img src={productApi.imageUrl(p.imageHash)} alt={p.name} className="pp-thumb" />
                      : <div className="pp-no-img">📷</div>}
                  </td>
                  <td><code className="pp-code">{p.code}</code></td>
                  <td className="pp-name">
                    {p.name}
                    {p.description && (
                      <div className="pp-desc">{p.description}</div>
                    )}
                  </td>
                  <td className="pp-price">{p.price.toLocaleString('vi-VN')} ₫</td>
                  <td className="pp-cost">{p.costPrice?.toLocaleString('vi-VN')} ₫</td>
                  <td>
                    {p.expiryDays
                      ? <span className="pp-expiry-days">{p.expiryDays} ngày</span>
                      : <span className="pp-muted">—</span>}
                  </td>
                  <td>
                    {/* sẽ load từ stock-service */}
                    <span className="pp-muted">—</span>
                  </td>
                  <td>{p.minStock}</td>
                  <td>{p.location || <span className="pp-muted">—</span>}</td>
                  <td>{supplierName(p.supplierId)}</td>
                  <td>{warehouseName(p.warehouseId)}</td>
                  <td>
                    <span className={`pp-status pp-status-${p.status}`}>
                      {statusLabel(p.status)}
                    </span>
                  </td>
                  <td>
                    <div className="pp-actions">
                      <button className="pp-btn-icon pp-btn-edit" onClick={() => openEdit(p)} title="Sửa">✏️</button>
                      <button className="pp-btn-icon pp-btn-del" onClick={() => setDeleteTarget(p)} title="Xóa">🗑️</button>
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
        <div className="pp-overlay" onClick={() => setShowModal(false)}>
          <div className="pp-modal" onClick={e => e.stopPropagation()}>
            <div className="pp-modal-header">
              <h2>{modalMode === 'add' ? '➕ Thêm vật tư mới' : '✏️ Chỉnh sửa vật tư'}</h2>
              <button className="pp-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form className="pp-form" onSubmit={handleSubmit}>
              {formError && <div className="pp-form-error">⚠️ {formError}</div>}
              <div className="pp-form-grid">

                <label>Mã vật tư *
                  <input name="code" value={formData.code} onChange={handleFormChange}
                    placeholder="SP001" disabled={modalMode === 'edit'} />
                </label>

                <label>Tên vật tư *
                  <input name="name" value={formData.name} onChange={handleFormChange}
                    placeholder="Tên vật tư" />
                </label>

                <label>Giá bán (₫) *
                  <input name="price" type="number" min="0"
                    value={formData.price} onChange={handleFormChange} placeholder="0" />
                </label>

                <label>Giá vốn (₫) *
                  <input name="costPrice" type="number" min="0"
                    value={formData.costPrice} onChange={handleFormChange} placeholder="0" />
                </label>

                <label>Tồn tối thiểu
                  <input name="minStock" type="number" min="0"
                    value={formData.minStock} onChange={handleFormChange} placeholder="10" />
                </label>

                <label>Tồn tối đa
                  <input name="maxStock" type="number" min="0"
                    value={formData.maxStock} onChange={handleFormChange}
                    placeholder="Không giới hạn" />
                </label>

                <label>Hạn sử dụng (số ngày)
                  <input name="expiryDays" type="number" min="1"
                    value={formData.expiryDays} onChange={handleFormChange}
                    placeholder="VD: 180 (để trống nếu không có HSD)" />
                </label>

                <label>Vị trí
                  <input name="location" value={formData.location}
                    onChange={handleFormChange} placeholder="Kệ A1, Tầng 2..." />
                </label>

                {/* Dropdown nhà cung cấp */}
                <label>Nhà cung cấp
                  <select name="supplierId" value={formData.supplierId} onChange={handleFormChange}>
                    <option value="">— Chọn nhà cung cấp —</option>
                    {suppliers.map(s => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </label>

                {/* Dropdown kho */}
                <label>Kho
                  <select name="warehouseId" value={formData.warehouseId} onChange={handleFormChange}>
                    <option value="">— Chọn kho —</option>
                    {warehouses.map(w => (
                      <option key={w._id} value={w._id}>{w.name}</option>
                    ))}
                  </select>
                </label>

                <label>Trạng thái
                  <select name="status" value={formData.status} onChange={handleFormChange}>
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Ngừng kinh doanh</option>
                    <option value="discontinued">Ngừng sản xuất</option>
                  </select>
                </label>

                <label className="pp-full-col">Ảnh vật tư
                  <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageChange} style={{ padding: '6px 12px' }} />
                  {imagePreview && (
                    <img src={imagePreview} alt="preview"
                      style={{ width: 80, height: 80, objectFit: 'cover',
                               borderRadius: 8, border: '1px solid var(--border)', marginTop: 8 }} />
                  )}
                </label>

                <label className="pp-full-col">Mô tả
                  <textarea name="description" value={formData.description}
                    onChange={handleFormChange} rows={3} placeholder="Mô tả vật tư..." />
                </label>

              </div>
              <div className="pp-form-footer">
                <button type="button" className="pp-btn pp-btn-ghost"
                  onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="pp-btn pp-btn-primary" disabled={submitting}>
                  {submitting ? 'Đang lưu...' : modalMode === 'add' ? 'Thêm vật tư' : 'Lưu thay đổi'}
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
            <p>Bạn có chắc muốn xóa vật tư<br /><strong>"{deleteTarget.name}"</strong>?</p>
            <p className="pp-confirm-warn">Hành động này không thể hoàn tác.</p>
            <div className="pp-confirm-actions">
              <button className="pp-btn pp-btn-ghost" onClick={() => setDeleteTarget(null)}>Hủy</button>
              <button className="pp-btn pp-btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Đang xóa...' : 'Xóa vật tư'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;