import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { userApi } from "../../services/userApi";
import { warehouseApi } from "../../services/warehouseApi";
import "./Users.css";

const Users = () => {
  const { isChuKho } = useAuth();
  const [activeTab, setActiveTab] = useState("users");

  const [admins, setAdmins] = useState([]); // Chủ kho / Admin
  const [managers, setManagers] = useState([]); // Quản lý kho
  const [warehouses, setWarehouses] = useState([]);
  const [warehousesNoManager, setWarehousesNoManager] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    status: "active",
    warehouseId: "",
  });

  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [userRes, whRes] = await Promise.all([
        userApi.getAll(),
        warehouseApi.getAll(),
      ]);

      const allUsers = userRes.data.data || [];

      setAdmins(allUsers.filter((u) => u.role === "chu_kho"));
      setManagers(allUsers.filter((u) => u.role === "quan_ly_kho"));
      setWarehouses(whRes.data.data || []);

      // Kho chưa có quản lý
      const noManager = whRes.data.data.filter(
        (wh) =>
          !allUsers.some(
            (u) => u.role === "quan_ly_kho" && u.warehouseId === wh._id,
          ),
      );
      setWarehousesNoManager(noManager);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isChuKho()) fetchData();
  }, [isChuKho, fetchData]);

  const openAddManager = () => {
    setFormData({
      name: "",
      username: "",
      email: "",
      password: "",
      status: "active",
      warehouseId: "",
    });
    setEditingUser(null);
    setModalMode("add");
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (user) => {
    setFormData({
      name: user.name || "",
      username: user.username || "",
      email: user.email || "",
      password: "",
      status: user.status || "active",
      warehouseId: user.warehouseId || "",
    });
    setEditingUser(user);
    setModalMode("edit");
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim() || !formData.username.trim()) {
      return setFormError("Tên và Tên tài khoản không được để trống");
    }

    setSubmitting(true);
    try {
      let payload = {
        name: formData.name.trim(),
        username: formData.username.trim(),
        email: formData.email?.trim() || "",
        status: formData.status || "active",
      };

      // Xử lý mật khẩu
      if (formData.password && formData.password.trim() !== "") {
        payload.password = formData.password.trim();
        payload.plainPassword = formData.password.trim(); // quan trọng để hiển thị
      }

      // Quan trọng: Giữ nguyên role của user đang sửa
      if (modalMode === "edit" && editingUser) {
        payload.role = editingUser.role; // ← Giữ role Admin hoặc Quản lý
        if (editingUser.role === "quan_ly_kho") {
          payload.warehouseId = formData.warehouseId;
        }
      } else {
        // Khi thêm mới (chỉ thêm Quản lý kho)
        payload.role = "quan_ly_kho";
        payload.warehouseId = formData.warehouseId;
      }

      if (modalMode === "add") {
        await userApi.create(payload);
      } else {
        await userApi.update(editingUser._id, payload);
      }

      setShowModal(false);
      fetchData(); // Reload lại danh sách
      alert(modalMode === "add" ? "Thêm thành công!" : "Cập nhật thành công!");
    } catch (err) {
      setFormError(err.response?.data?.message || "Có lỗi xảy ra khi lưu");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Xác nhận xóa người dùng này?")) return;
    try {
      await userApi.remove(id);
      fetchData();
    } catch (err) {
      alert("Xóa thất bại");
    }
  };

  if (!isChuKho()) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "red" }}>
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  return (
    <div className="users-root">
      <div className="users-header">
        <div className="users-title-block">
          <span className="users-title-icon">👥</span>
          <div>
            <h1 className="users-title">Quản lý Người dùng</h1>
            <p className="users-subtitle">
              {admins.length + managers.length} tài khoản
            </p>
          </div>
        </div>
      </div>

      <div className="tab-container">
        <div
          className={`tab ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          Danh sách Người dùng
        </div>
        <div
          className={`tab ${activeTab === "no-manager" ? "active" : ""}`}
          onClick={() => setActiveTab("no-manager")}
        >
          Kho chưa có Quản lý ({warehousesNoManager.length})
        </div>
      </div>

      {activeTab === "users" && (
        <>
          {/* ==================== BẢNG CHỦ KHO ==================== */}
          <div className="users-table-wrap" style={{ marginBottom: "40px" }}>
            <h2>👑 Tài khoản Admin / Chủ kho</h2>
            <table className="us-table">
              <thead>
                <tr>
                  <th>Tài khoản</th>
                  <th>Mật khẩu</th>
                  <th>Vai trò</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <strong>{u.username}</strong>
                    </td>
                    <td style={{ fontFamily: "monospace", color: "#ef4444" }}>
                      {u.password || "••••••"}
                    </td>
                    <td>Chủ kho</td>
                    <td>
                      <button onClick={() => openEdit(u)}>Sửa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ==================== BẢNG QUẢN LÝ KHO ==================== */}
          <div className="users-table-wrap">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h2>📋 Tài khoản Quản lý kho</h2>
              <button
                onClick={openAddManager}
                className="us-btn us-btn-primary"
              >
                + Thêm quản lý kho
              </button>
            </div>

            <table className="us-table">
              <thead>
                <tr>
                  <th>Tài khoản</th>
                  <th>Mật khẩu</th>
                  <th>Kho quản lý</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {managers.map((u) => {
                  const whName =
                    warehouses.find((w) => w._id === u.warehouseId)?.name ||
                    "—";
                  return (
                    <tr key={u._id}>
                      <td>
                        <strong>{u.username}</strong>
                      </td>
                      <td style={{ fontFamily: "monospace", color: "#ef4444" }}>
                        {u.password || "••••••"}
                      </td>
                      <td>{whName}</td>
                      <td>
                        <button onClick={() => openEdit(u)}>Sửa</button>
                        <button
                          onClick={() => deleteUser(u._id)}
                          style={{ color: "red", marginLeft: "10px" }}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === "no-manager" && (
        <div className="users-table-wrap">
          <h3>Kho chưa có Quản lý</h3>
          {warehousesNoManager.length === 0 ? (
            <p>✅ Tất cả kho đã có quản lý.</p>
          ) : (
            warehousesNoManager.map((wh) => (
              <div key={wh._id} className="warehouse-item">
                <strong>{wh.name}</strong>
                <button
                  onClick={() => {
                    const username = `ql_${wh.name.toLowerCase().replace(/\s+/g, "")}`;
                    if (
                      window.confirm(
                        `Tạo quản lý cho ${wh.name}?\nUsername: ${username}\nMật khẩu: 123456`,
                      )
                    ) {
                      userApi
                        .create({
                          name: `Quản lý ${wh.name}`,
                          username,
                          password: "123456",
                          role: "quan_ly_kho",
                          warehouseId: wh._id,
                          status: "active",
                        })
                        .then(() => {
                          alert("Tạo quản lý kho thành công!");
                          fetchData();
                        });
                    }
                  }}
                >
                  Tạo Quản lý kho
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {modalMode === "add"
                  ? "Thêm Quản lý kho mới"
                  : editingUser?.role === "chu_kho"
                    ? "Sửa thông tin Chủ kho"
                    : "Sửa thông tin Quản lý kho"}
              </h2>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              {formError && (
                <p style={{ color: "red", marginBottom: "12px" }}>
                  {formError}
                </p>
              )}

              <div className="modal-form">
                <label>Tên đầy đủ *</label>
                <input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />

                <label>Tên tài khoản *</label>
                <input
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  required
                />

                {/* Chỉ hiển thị Email và Kho quản lý khi là Quản lý kho */}
                {editingUser?.role !== "chu_kho" && (
                  <>
                    <label>Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />

                    <label>Kho quản lý *</label>
                    <select
                      value={formData.warehouseId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          warehouseId: e.target.value,
                        })
                      }
                      required
                    >
                      <option value="">Chọn kho</option>
                      {warehouses.map((w) => (
                        <option key={w._id} value={w._id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                <label>
                  {modalMode === "add"
                    ? "Mật khẩu *"
                    : "Mật khẩu mới (để trống nếu không đổi)"}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required={modalMode === "add"}
                  placeholder={
                    modalMode === "edit" ? "Nhập mật khẩu mới nếu muốn đổi" : ""
                  }
                />
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)}>
                  Hủy
                </button>
                <button type="submit" disabled={submitting}>
                  {submitting
                    ? "Đang lưu..."
                    : modalMode === "add"
                      ? "Thêm tài khoản"
                      : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
