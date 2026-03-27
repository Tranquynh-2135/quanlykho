import React, { useState, useEffect, useCallback } from 'react';
import { userApi } from '../../services/userApi';
import './Users.css';

const EMPTY_FORM = {
  name: '', email: '', password: '', phone: '',
  address: '', birthday: '', role: 'staff', status: 'active',
};

const ROLE_LABEL = { admin: 'Admin', manager: 'Quản lý', staff: 'Nhân viên' };
const ROLE_COLOR = { admin: 'role-admin', manager: 'role-manager', staff: 'role-staff' };

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('vi-VN');
};

const toInputDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().split('T')[0];
};

const Users = () => {
  const [users,        setUsers]        = useState([]);
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
  const [filterRole,   setFilterRole]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Đổi mật khẩu
  const [showPwModal,  setShowPwModal]  = useState(false);
  const [pwTarget,     setPwTarget]     = useState(null);
  const [newPw,        setNewPw]        = useState('');
  const [pwError,      setPwError]      = useState('');
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [showPw,       setShowPw]       = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await userApi.getAll({
        ...(search       && { search }),
        ...(filterRole   && { role: filterRole }),
        ...(filterStatus && { status: filterStatus }),
      });
      setUsers(res.data.data || []);
      setError(null);
    } catch {
      setError('Không thể tải danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  }, [search, filterRole, filterStatus]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openAdd = () => {
    setFormData(EMPTY_FORM);
    setFormError('');
    setModalMode('add');
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (u) => {
    setFormData({
      name:     u.name     || '',
      email:    u.email    || '',
      password: '',           // không điền sẵn
      phone:    u.phone    || '',
      address:  u.address  || '',
      birthday: toInputDate(u.birthday),
      role:     u.role     || 'staff',
      status:   u.status   || 'active',
    });
    setFormError('');
    setModalMode('edit');
    setEditingId(u._id);
    setShowModal(true);
  };

  const openChangePw = (u) => {
    setPwTarget(u);
    setNewPw('');
    setPwError('');
    setShowPw(false);
    setShowPwModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.name.trim())  return setFormError('Tên không được trống.');
    if (!formData.email.trim()) return setFormError('Email không được trống.');
    if (modalMode === 'add' && !formData.password.trim())
      return setFormError('Mật khẩu không được trống.');
    if (modalMode === 'add' && formData.password.length < 6)
      return setFormError('Mật khẩu tối thiểu 6 ký tự.');

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        birthday: formData.birthday || undefined,
      };
      // Khi edit không gửi password (có route riêng)
      if (modalMode === 'edit') delete payload.password;

      if (modalMode === 'add') await userApi.create(payload);
      else                     await userApi.update(editingId, payload);
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePw = async () => {
    setPwError('');
    if (!newPw || newPw.length < 6)
      return setPwError('Mật khẩu tối thiểu 6 ký tự.');
    setPwSubmitting(true);
    try {
      await userApi.changePassword(pwTarget._id, newPw);
      setShowPwModal(false);
    } catch (err) {
      setPwError(err.response?.data?.message || 'Đổi mật khẩu thất bại.');
    } finally {
      setPwSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await userApi.remove(deleteTarget._id);
      setDeleteTarget(null);
      fetchUsers();
    } catch {
      alert('Xóa thất bại. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
    }
  };

  const getAvatar = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
  };

  return (
    <div className="us-root">
      {/* Header */}
      <div className="us-header">
        <div className="us-title-block">
          <span className="us-title-icon">👥</span>
          <div>
            <h1 className="us-title">Quản lý Người dùng</h1>
            <p className="us-subtitle">{users.length} người dùng</p>
          </div>
        </div>
        <button className="us-btn us-btn-primary" onClick={openAdd}>
          <span>＋</span> Thêm người dùng
        </button>
      </div>

      {/* Filters */}
      <div className="us-filters">
        <div className="us-search-wrap">
          <span className="us-search-icon">🔍</span>
          <input className="us-search"
            placeholder="Tìm theo tên, email, số điện thoại..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="us-select" value={filterRole}
          onChange={e => setFilterRole(e.target.value)}>
          <option value="">Tất cả vai trò</option>
          <option value="admin">Admin</option>
          <option value="manager">Quản lý</option>
          <option value="staff">Nhân viên</option>
        </select>
        <select className="us-select" value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Ngừng HĐ</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="us-state"><div className="us-spinner" /><span>Đang tải...</span></div>
      ) : error ? (
        <div className="us-state us-error-state">⚠️ {error}</div>
      ) : users.length === 0 ? (
        <div className="us-state us-empty-state">
          <span style={{ fontSize: 48 }}>👤</span>
          <p>Chưa có người dùng nào.</p>
        </div>
      ) : (
        <div className="us-table-wrap">
          <table className="us-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Ngày sinh</th>
                <th>Địa chỉ</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} className="us-row">
                  {/* Avatar + Tên */}
                  <td>
                    <div className="us-user-cell">
                      <div className={`us-avatar us-avatar-${u.role}`}>
                        {getAvatar(u.name)}
                      </div>
                      <span className="us-name">{u.name}</span>
                    </div>
                  </td>
                  <td className="us-email">{u.email}</td>
                  <td>{u.phone || <span className="us-muted">—</span>}</td>
                  <td>{formatDate(u.birthday)}</td>
                  <td className="us-address">
                    {u.address || <span className="us-muted">—</span>}
                  </td>
                  <td>
                    <span className={`us-role ${ROLE_COLOR[u.role]}`}>
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td>
                    <span className={`us-status us-status-${u.status}`}>
                      {u.status === 'active' ? 'Hoạt động' : 'Ngừng HĐ'}
                    </span>
                  </td>
                  <td>
                    <div className="us-actions">
                      <button className="us-btn-icon us-btn-edit"
                        onClick={() => openEdit(u)} title="Sửa">✏️</button>
                      <button className="us-btn-icon us-btn-pw"
                        onClick={() => openChangePw(u)} title="Đổi mật khẩu">🔑</button>
                      <button className="us-btn-icon us-btn-del"
                        onClick={() => setDeleteTarget(u)} title="Xóa">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Thêm/Sửa */}
      {showModal && (
        <div className="us-overlay" onClick={() => setShowModal(false)}>
          <div className="us-modal" onClick={e => e.stopPropagation()}>
            <div className="us-modal-header">
              <h2>{modalMode === 'add' ? '➕ Thêm người dùng' : '✏️ Chỉnh sửa người dùng'}</h2>
              <button className="us-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form className="us-form" onSubmit={handleSubmit}>
              {formError && <div className="us-form-error">⚠️ {formError}</div>}
              <div className="us-form-grid">

                <label className="us-full-col">Họ và tên *
                  <input name="name" value={formData.name}
                    onChange={handleFormChange} placeholder="Nguyễn Văn A" />
                </label>

                <label>Email *
                  <input name="email" type="email" value={formData.email}
                    onChange={handleFormChange} placeholder="user@example.com"
                    disabled={modalMode === 'edit'} />
                </label>

                <label>Số điện thoại
                  <input name="phone" value={formData.phone}
                    onChange={handleFormChange} placeholder="0901234567" />
                </label>

                {/* Password chỉ hiện khi thêm mới */}
                {modalMode === 'add' && (
                  <label className="us-full-col">Mật khẩu *
                    <input name="password" type="password"
                      value={formData.password} onChange={handleFormChange}
                      placeholder="Tối thiểu 6 ký tự" />
                  </label>
                )}

                <label>Ngày sinh
                  <input name="birthday" type="date"
                    value={formData.birthday} onChange={handleFormChange} />
                </label>

                <label>Vai trò
                  <select name="role" value={formData.role} onChange={handleFormChange}>
                    <option value="staff">Nhân viên</option>
                    <option value="manager">Quản lý</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>

                <label>Trạng thái
                  <select name="status" value={formData.status} onChange={handleFormChange}>
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Ngừng hoạt động</option>
                  </select>
                </label>

                <label className="us-full-col">Địa chỉ
                  <input name="address" value={formData.address}
                    onChange={handleFormChange}
                    placeholder="123 Đường ABC, Quận 1, TP.HCM" />
                </label>

              </div>

              {modalMode === 'edit' && (
                <p className="us-pw-hint">
                  🔑 Để đổi mật khẩu, dùng nút <strong>🔑</strong> trên bảng danh sách.
                </p>
              )}

              <div className="us-form-footer">
                <button type="button" className="us-btn us-btn-ghost"
                  onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="us-btn us-btn-primary" disabled={submitting}>
                  {submitting ? 'Đang lưu...' : modalMode === 'add' ? 'Thêm' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Đổi mật khẩu */}
      {showPwModal && (
        <div className="us-overlay" onClick={() => setShowPwModal(false)}>
          <div className="us-confirm" onClick={e => e.stopPropagation()}>
            <div className="us-confirm-icon">🔑</div>
            <h3>Đổi mật khẩu</h3>
            <p>Tài khoản: <strong>{pwTarget?.name}</strong></p>
            <div className="us-pw-input-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                className="us-pw-input"
                placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
              />
              <button type="button" className="us-pw-toggle"
                onClick={() => setShowPw(p => !p)}>
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
            {pwError && <p className="us-pw-error">{pwError}</p>}
            <div className="us-confirm-actions">
              <button className="us-btn us-btn-ghost"
                onClick={() => setShowPwModal(false)}>Hủy</button>
              <button className="us-btn us-btn-primary"
                onClick={handleChangePw} disabled={pwSubmitting}>
                {pwSubmitting ? 'Đang lưu...' : 'Cập nhật'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="us-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="us-confirm" onClick={e => e.stopPropagation()}>
            <div className="us-confirm-icon">🗑️</div>
            <h3>Xác nhận xóa</h3>
            <p>Bạn có chắc muốn xóa người dùng<br />
              <strong>"{deleteTarget.name}"</strong>?</p>
            <p className="us-confirm-warn">Hành động này không thể hoàn tác.</p>
            <div className="us-confirm-actions">
              <button className="us-btn us-btn-ghost"
                onClick={() => setDeleteTarget(null)}>Hủy</button>
              <button className="us-btn us-btn-danger"
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

export default Users;