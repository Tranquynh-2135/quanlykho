import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import Select from "react-select";
import { exportApi } from "../../services/exportApi";
import { productApi } from "../../services/productApi";
import { warehouseApi } from "../../services/warehouseApi";
import { useAuth } from "../../context/AuthContext";
import "./Export.css";

const Export = () => {
  const location = useLocation();
  const { user, isQuanLyKho } = useAuth();
  const isManager = isQuanLyKho();

  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [exports, setExports] = useState([]);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  // các state filter
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportWarehouseId, setExportWarehouseId] = useState("");

  const [formData, setFormData] = useState({
    warehouseId: "",
    recipient: "",
    recipientType: "khach_hang",
    note: "",
    items: [
      {
        productCode: "",
        quantity: 1,
        unitPrice: 0,
        manufacturingDate: "",
        expiryDate: "",
      },
    ],
  });

  const [totalAmount, setTotalAmount] = useState(0);
  const [detailTarget, setDetailTarget] = useState(null);

  // Load dữ liệu ban đầu
  const loadData = async (currentPage = 1) => {
    try {
      setLoading(true);
      const [whRes, prodRes, expRes] = await Promise.all([
        warehouseApi.getAll({ status: "active" }),
        productApi.getAll(),
        exportApi.getAll({ page: currentPage, limit: 20 }),
      ]);

      setWarehouses(whRes.data.data || []);
      setProducts(prodRes.data?.data || prodRes.data || []);
      setExports(expRes.data?.data || []);
      setPagination(expRes.data.pagination || { totalPages: 1, total: 0 });
    } catch (err) {
      console.error("Lỗi tải dữ liệu xuất kho:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(page);
  }, [page]);

  // Xử lý tự động điền từ trang Tồn kho
  useEffect(() => {
    if (location.state?.prefill) {
      const p = location.state.prefill;
      setFormData((prev) => ({
        ...prev,
        warehouseId: p.warehouseId || prev.warehouseId,
        items: [
          {
            productCode: p.productCode,
            quantity: 1,
            unitPrice: p.price || 0,
            unit: p.unit || "",
            manufacturingDate: p.manufacturingDate || "",
            expiryDate: p.expiryDate || "",
          },
        ],
      }));
    }
  }, [location.state, products]);

  // Cố định kho cho Quản lý kho
  useEffect(() => {
    if (!isManager && user?.warehouseId) {
      setFormData((prev) => ({ ...prev, warehouseId: user.warehouseId }));
    }
  }, [user, isManager]);

  // Tính tổng tiền
  useEffect(() => {
    const sum = formData.items.reduce(
      (acc, item) => acc + Number(item.quantity) * Number(item.unitPrice),
      0,
    );
    setTotalAmount(sum);
  }, [formData.items]);

  // Danh sách kho (chỉ cho Chủ kho)
  const warehouseOptions = useMemo(() => {
    if (!isManager && user?.warehouseId) {
      const myWh = warehouses.find((w) => w._id === user.warehouseId);
      return myWh ? [{ value: myWh._id, label: myWh.name }] : [];
    }
    return warehouses.map((w) => ({ value: w._id, label: w.name }));
  }, [warehouses, user, isManager]);

  // ==================== CHỈ HIỂN THỊ SẢN PHẨM CÓ TỒN KHO > 0 ====================
  const availableProducts = useMemo(() => {
    if (!formData.warehouseId) return [];

    return products.filter((product) => {
      if (
        !product.stocks ||
        !Array.isArray(product.stocks) ||
        product.stocks.length === 0
      ) {
        return false; // Không có stocks array → ẩn
      }

      const stockInfo = product.stocks.find(
        (s) => String(s.warehouseId) === String(formData.warehouseId),
      );

      return (stockInfo?.quantity || 0) > 0;
    });
  }, [products, formData.warehouseId]);

  const productOptions = useMemo(() => {
    return availableProducts.map((p) => {
      const stockInfo = p.stocks.find(
        (s) => String(s.warehouseId) === String(formData.warehouseId),
      );

      return {
        value: p.code,
        label: `${p.code} — ${p.name} (Tồn: ${stockInfo?.quantity || 0})`,
        stock: stockInfo?.quantity || 0,
        unit: p.unit || "",
        price: p.price || 0,
      };
    });
  }, [availableProducts, formData.warehouseId]);

  // ==================== LỌC PHIẾU XUẤT ====================
  const filteredExports = useMemo(() => {
    return exports.filter((exp) => {
      const keyword = search.toLowerCase().trim();
      const expDate = new Date(exp.createdAt || exp.date);

      const matchSearch =
        !keyword ||
        exp.code?.toLowerCase().includes(keyword) ||
        exp.recipient?.toLowerCase().includes(keyword) ||
        expDate.toLocaleDateString("vi-VN").toLowerCase().includes(keyword);

      const matchType = !filterType || exp.recipientType === filterType;

      const matchWarehouse =
        !exportWarehouseId || exp.warehouseId === exportWarehouseId;

      const matchDate = (() => {
        if (!exportStartDate && !exportEndDate) return true;
        const d = new Date(expDate);
        d.setHours(0, 0, 0, 0);

        if (exportStartDate) {
          const start = new Date(exportStartDate);
          if (d < start) return false;
        }
        if (exportEndDate) {
          const end = new Date(exportEndDate);
          if (d > end) return false;
        }
        return true;
      })();

      return matchSearch && matchType && matchWarehouse && matchDate;
    });
  }, [
    exports,
    search,
    filterType,
    exportWarehouseId,
    exportStartDate,
    exportEndDate,
  ]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "productCode" && value) {
      const selected = availableProducts.find((p) => p.code === value);
      if (selected) {
        const stockInfo = selected.stocks?.find(
          (s) => s.warehouseId === formData.warehouseId,
        );
        newItems[index].unitPrice = selected.price || 0;
        newItems[index].unit = selected.unit || "";
        if (newItems[index].quantity > (stockInfo?.quantity || 0)) {
          newItems[index].quantity = stockInfo?.quantity || 1;
        }
      }
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
    if (!formData.warehouseId) return alert("Vui lòng chọn kho xuất");
    if (!formData.recipient) return alert("Vui lòng nhập người nhận");

    try {
      const payload = {
        warehouseId: formData.warehouseId,
        recipient: formData.recipient,
        recipientType: formData.recipientType,
        note: formData.note,
        items: formData.items.map((item) => ({
          productCode: item.productCode,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          unit: item.unit || "",
          manufacturingDate: item.manufacturingDate,
          expiryDate: item.expiryDate,
        })),
      };

      const res = await exportApi.create(payload);
      if (res.data.success) {
        alert(
          `✅ Xuất kho thành công!\nMã phiếu: ${res.data.data.code || "EXP-..."}`,
        );

        setFormData({
          warehouseId: isManager ? "" : user?.warehouseId || "",
          recipient: "",
          recipientType: "khach_hang",
          note: "",
          items: [
            {
              productCode: "",
              quantity: 1,
              unitPrice: 0,
              manufacturingDate: "",
              expiryDate: "",
            },
          ],
        });

        const fresh = await exportApi.getAll();
        setExports(fresh.data?.data || []);
      }
    } catch (err) {
      alert("❌ Lỗi: " + (err.response?.data?.message || err.message));
    }
  };

  // Hàm xóa phiếu xuất
  const handleDeleteExport = async (id, code) => {
    if (
      !window.confirm(
        `Bạn có chắc muốn xóa phiếu xuất "${code}"?\n\nHành động này sẽ hoàn lại tồn kho.`,
      )
    )
      return;

    try {
      const res = await exportApi.delete(id);
      if (res.data.success) {
        alert(`✅ Đã xóa phiếu ${code} thành công!`);
        const fresh = await exportApi.getAll();
        setExports(fresh.data?.data || []);
      }
    } catch (err) {
      alert(
        "❌ Lỗi khi xóa phiếu: " + (err.response?.data?.message || err.message),
      );
    }
  };

  const handleClearFilters = () => {
    setSearch("");
    setExportStartDate("");
    setExportEndDate("");
    setExportWarehouseId("");
    setFilterType("");
  };

  const handlePrintExport = (exp) => {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    const warehouse = warehouses.find((w) => w._id === exp.warehouseId);
    const exportDate = new Date(exp.createdAt);

    const totalQty =
      exp.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) ||
      0;

    const numberToWords = (num) => {
      if (!num || num === 0) return "Không đồng";
      const units = [
        "",
        "một",
        "hai",
        "ba",
        "bốn",
        "năm",
        "sáu",
        "bảy",
        "tám",
        "chín",
      ];
      const tens = [
        "",
        "",
        "hai mươi",
        "ba mươi",
        "bốn mươi",
        "năm mươi",
        "sáu mươi",
        "bảy mươi",
        "tám mươi",
        "chín mươi",
      ];
      const readGroup = (n) => {
        if (n === 0) return "";
        if (n < 10) return units[n];
        if (n < 20) return "mười " + (n % 10 === 5 ? "lăm" : units[n % 10]);
        const t = Math.floor(n / 10),
          u = n % 10;
        return tens[t] + (u !== 0 ? " " + (u === 5 ? "lăm" : units[u]) : "");
      };
      const readFull = (n) => {
        if (n === 0) return "";
        const h = Math.floor(n / 100),
          r = n % 100;
        let res = units[h] + " trăm";
        if (r > 0) res += (r < 10 ? " lẻ " : " ") + readGroup(r);
        return res;
      };
      const billion = Math.floor(num / 1e9),
        million = Math.floor((num % 1e9) / 1e6),
        thousand = Math.floor((num % 1e6) / 1e3),
        rem = num % 1e3;
      let res = "";
      if (billion > 0) res += readFull(billion) + " tỷ ";
      if (million > 0) res += readFull(million) + " triệu ";
      if (thousand > 0) res += readFull(thousand) + " nghìn ";
      if (rem > 0) res += readFull(rem);
      return res.trim().replace(/^\w/, (c) => c.toUpperCase()) + " đồng";
    };

    const itemsHtml = (exp.items || [])
      .map((item, i) => {
        const prod = products.find((p) => p.code === item.productCode);
        return `
        <tr>
          <td style="text-align:center">${i + 1}</td>
          <td style="font-family:monospace">${item.productCode}</td>
          <td>${prod?.name || item.productCode}</td>
          <td style="text-align:center">${prod?.categoryId?.name || "—"}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:center">${item.unit || prod?.unit || "—"}</td>
          <td style="text-align:right">${item.unitPrice?.toLocaleString("vi-VN")}</td>
          <td style="text-align:right; font-weight:bold">${(item.quantity * item.unitPrice).toLocaleString("vi-VN")}</td>
        </tr>`;
      })
      .join("");

    printWindow.document.write(`
      <html>
      <head>
        <title>Phiếu xuất kho - ${exp.code}</title>
        <style>
          body { font-family: "Times New Roman", serif; padding: 30px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .title { text-align: center; margin: 20px 0; }
          .title h1 { text-transform: uppercase; margin: 0; font-size: 22px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #000; padding: 8px; font-size: 13px; }
          th { background: #f2f2f2; text-transform: uppercase; }
          .total-box { margin-top: 20px; border-top: 2px solid #000; padding-top: 10px; }
          .sig-grid { display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 40px; text-align: center; }
          .sig-box { min-height: 100px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div><strong>ĐƠN VỊ: .................................</strong><br/>Địa chỉ: ............................................</div>
          <div style="text-align:right"><strong>Mẫu số: 02-VT</strong><br/>(Ban hành theo TT 200/2014/TT-BTC)</div>
        </div>
        <div class="title">
          <h1>Phiếu xuất kho</h1>
          <p>Ngày ${exportDate.getDate()} tháng ${exportDate.getMonth() + 1} năm ${exportDate.getFullYear()}</p>
          <p>Số: <strong>${exp.code}</strong></p>
        </div>
        <div class="info-grid">
          <div>Người nhận hàng: <strong>${exp.recipient}</strong></div>
          <div>Kho xuất: <strong>${warehouse?.name || "—"}</strong></div>
          <div>Lý do xuất: ${exp.note || "Xuất bán / Điều chuyển"}</div>
          <div>Loại đối tượng: ${exp.recipientType === "khach_hang" ? "Khách hàng" : "Đối tác"}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã hàng</th>
              <th>Tên hàng hóa</th>
              <th>Danh mục</th>
              <th>Số lượng</th>
              <th>ĐVT</th>
              <th>Đơn giá (₫)</th>
              <th>Thành tiền (₫)</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="text-align:right; font-weight:bold">Tổng cộng</td>
              <td style="text-align:center; font-weight:bold">${totalQty}</td>
              <td></td>
              <td></td>
              <td style="text-align:right; font-weight:bold">${exp.totalAmount?.toLocaleString("vi-VN")}</td>
            </tr>
          </tfoot>
        </table>
        <div class="total-section">
          <p>Tổng số tiền (viết bằng chữ): <em>${numberToWords(exp.totalAmount)}</em></p>
        </div>
        <div class="sig-grid">
          <div class="sig-box"><strong>Người lập phiếu</strong><br/>(Ký, họ tên)</div>
          <div class="sig-box"><strong>Người nhận hàng</strong><br/>(Ký, họ tên)</div>
          <div class="sig-box"><strong>Thủ kho</strong><br/>(Ký, họ tên)</div>
          <div class="sig-box"><strong>Kế toán trưởng</strong><br/>(Ký, họ tên)</div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Xuất Excel báo cáo
  const handleExportExcel = () => {
    const params = {
      startDate: exportStartDate,
      endDate: exportEndDate,
      warehouseId: exportWarehouseId,
      recipientType: filterType,
    };

    window.open(exportApi.getExportUrl(params), "_blank");
  };

  if (loading) return <div className="loading">Đang tải dữ liệu...</div>;

  return (
    <div className="export-container">
      <div className="im-header">
        <div className="im-title-block">
          <span className="im-title-icon">📤</span>
          <div>
            <h1 className="im-title">Xuất kho</h1>
            <p className="im-subtitle">{exports.length} phiếu xuất</p>
          </div>
        </div>
      </div>
      {/* Form tạo phiếu */}
      <div className="im-form-card">
        <h2>Tạo phiếu xuất kho mới</h2>
        <form onSubmit={handleSubmit}>
          <div className="im-form-row">
            <div className="im-form-group">
              <label>
                Kho xuất <span className="required">*</span>
              </label>
              <Select
                options={warehouseOptions}
                value={
                  warehouseOptions.find(
                    (o) => o.value === formData.warehouseId,
                  ) || null
                }
                onChange={(sel) =>
                  setFormData((p) => ({ ...p, warehouseId: sel?.value || "" }))
                }
                placeholder="Chọn kho xuất..."
                isSearchable
                isDisabled={!isManager}
                className="react-select-container"
                classNamePrefix="react-select"
              />
            </div>

            <div className="im-form-group">
              <label>
                Người/Nơi nhận <span className="required">*</span>
              </label>
              <input
                type="text"
                value={formData.recipient}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, recipient: e.target.value }))
                }
                placeholder="Tên khách hàng / Đối tác..."
                required
              />
            </div>
          </div>

          {/* Phần chọn loại người nhận */}
          <div className="im-form-group">
            <label>Loại người nhận</label>
            <select
              value={formData.recipientType}
              onChange={(e) =>
                setFormData((p) => ({ ...p, recipientType: e.target.value }))
              }
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "10px",
              }}
            >
              <option value="khach_hang">Khách hàng</option>
              <option value="nha_phan_phoi">Nhà phân phối</option>
              <option value="khac">Khác</option>
            </select>
          </div>

          {/* Bảng sản phẩm */}
          <div className="items-section">
            <h3>Chi tiết sản phẩm xuất</h3>
            <div className="items-table-wrap">
              <table className="items-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 260 }}>Sản phẩm</th>
                    <th style={{ minWidth: 160 }}>Danh mục</th>
                    <th style={{ minWidth: 100 }}>Số lượng</th>
                    <th style={{ minWidth: 130 }}>Đơn vị tính</th>{" "}
                    {/* ← Thêm cột này */}
                    <th style={{ minWidth: 160 }}>Giá bán (₫)</th>
                    <th style={{ minWidth: 130 }}>Thành tiền</th>
                    <th style={{ minWidth: 60 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => {
                    const selectedProduct = products.find(
                      (p) => p.code === item.productCode,
                    );

                    const categoryName =
                      selectedProduct?.categoryId?.name ||
                      categories.find(
                        (c) =>
                          c._id ===
                          (selectedProduct?.categoryId?._id ||
                            selectedProduct?.categoryId),
                      )?.name ||
                      "—";

                    return (
                      <tr key={index}>
                        <td>
                          <Select
                            options={productOptions}
                            value={
                              productOptions.find(
                                (o) => o.value === item.productCode,
                              ) || null
                            }
                            onChange={(sel) =>
                              handleItemChange(
                                index,
                                "productCode",
                                sel ? sel.value : "",
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

                        <td style={{ fontWeight: 500, color: "#3b6ef8" }}>
                          {categoryName}
                        </td>

                        <td>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "quantity",
                                e.target.value,
                              )
                            }
                            required
                          />
                        </td>

                        {/* ==================== Ô ĐƠN VỊ TÍNH ==================== */}
                        <td>
                          <input
                            type="text"
                            value={item.unit || ""}
                            onChange={(e) =>
                              handleItemChange(index, "unit", e.target.value)
                            }
                            placeholder="chai, thùng, kg..."
                            style={{ textAlign: "center" }}
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "unitPrice",
                                e.target.value,
                              )
                            }
                            placeholder="Nhập giá bán"
                            required
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
            </div>

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
              value={formData.note}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, note: e.target.value }))
              }
              placeholder="Ghi chú thêm (nếu có)..."
              rows={4}
            />
          </div>

          <button type="submit" className="im-btn-primary">
            Tạo phiếu xuất kho
          </button>
        </form>
      </div>
      {/* Lịch sử phiếu xuất */}
      <div className="im-history">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h2 style={{ margin: 0 }}>Lịch sử phiếu xuất kho</h2>

          <button
            className="im-btn-detail"
            onClick={handleExportExcel}
            style={{
              background: "#15803d",
              color: "#fff",
              padding: "8px 16px",
            }}
          >
            📊 Xuất Excel báo cáo
          </button>
        </div>

        {/* Bộ lọc */}
        {/* Bộ lọc đầy đủ */}
        <div
          className="im-export-filters"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            marginBottom: "20px",
            background: "#fff",
            padding: "16px",
            borderRadius: "12px",
            border: "1.5px solid #e2e8f0",
          }}
        >
          <div className="im-form-group">
            <label style={{ fontSize: "12px" }}>Từ ngày</label>
            <input
              type="date"
              value={exportStartDate}
              onChange={(e) => setExportStartDate(e.target.value)}
            />
          </div>

          <div className="im-form-group">
            <label style={{ fontSize: "12px" }}>Đến ngày</label>
            <input
              type="date"
              value={exportEndDate}
              onChange={(e) => setExportEndDate(e.target.value)}
            />
          </div>

          <div className="im-form-group">
            <label style={{ fontSize: "12px" }}>Kho xuất</label>
            <select
              value={exportWarehouseId}
              onChange={(e) => setExportWarehouseId(e.target.value)}
            >
              <option value="">Tất cả kho</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div className="im-form-group">
            <label style={{ fontSize: "12px" }}>Loại đối tượng</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">Tất cả loại</option>
              <option value="khach_hang">Khách hàng</option>
              <option value="nha_phan_phoi">Nhà phân phối</option>
              <option value="khac">Khác</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              type="button"
              className="btn-remove"
              style={{ width: "100%", height: "38px" }}
              onClick={handleClearFilters}
            >
              Xóa lọc
            </button>
          </div>
        </div>

        <input
          className="im-search"
          placeholder="Tìm nhanh theo mã phiếu, người nhận..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Bảng lịch sử */}
        <table className="im-table">
          <thead>
            <tr>
              <th>Mã phiếu</th>
              <th>Ngày xuất</th>
              <th>Kho xuất</th>
              <th>Người nhận</th>
              <th>Loại</th>
              <th>Số mặt hàng</th>
              <th>Tổng tiền</th>
              <th>Ghi chú</th>
              <th>Chi tiết</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredExports.length === 0 ? (
              <tr>
                <td
                  colSpan="10"
                  style={{
                    textAlign: "center",
                    padding: "60px",
                    color: "#94a3b8",
                  }}
                >
                  Không tìm thấy phiếu xuất nào
                </td>
              </tr>
            ) : (
              filteredExports.map((exp) => (
                <tr key={exp._id}>
                  <td>
                    <strong style={{ color: "#3b6ef8" }}>{exp.code}</strong>
                  </td>
                  <td>{new Date(exp.createdAt).toLocaleDateString("vi-VN")}</td>
                  <td>
                    {warehouses.find((w) => w._id === exp.warehouseId)?.name ||
                      "—"}
                  </td>
                  <td>{exp.recipient}</td>
                  <td>
                    <span className={`type-badge type-${exp.recipientType}`}>
                      {exp.recipientType === "khach_hang"
                        ? "Khách hàng"
                        : exp.recipientType === "nha_phan_phoi"
                          ? "NPP"
                          : "Khác"}
                    </span>
                  </td>
                  <td>{exp.items?.length || 0}</td>
                  <td>
                    <strong>
                      {exp.totalAmount?.toLocaleString("vi-VN")} ₫
                    </strong>
                  </td>
                  <td>{exp.note ? exp.note.substring(0, 25) + "..." : "—"}</td>
                  <td>
                    <button
                      className="im-btn-detail"
                      onClick={() => setDetailTarget(exp)}
                    >
                      🔍 Xem
                    </button>
                  </td>
                  <td>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteExport(exp._id, exp.code)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Bộ điều khiển phân trang */}
        {!loading && exports.length > 0 && pagination.totalPages > 1 && (
          <div
            className="pp-pagination"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "20px",
              marginTop: "20px",
            }}
          >
            <button
              className="pp-btn pp-btn-ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Trang trước
            </button>
            <span style={{ fontWeight: "600", color: "#64748b" }}>
              Trang {page} / {pagination.totalPages}
            </span>
            <button
              className="pp-btn pp-btn-ghost"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Trang sau
            </button>
          </div>
        )}
      </div>
      {/* Modal Chi tiết phiếu xuất */}
      {detailTarget && (
        <div className="modal-overlay" onClick={() => setDetailTarget(null)}>
          <div className="modal-detail" onClick={(e) => e.stopPropagation()}>
            <div className="modal-detail-header">
              <h3>📋 Chi tiết phiếu xuất {detailTarget.code}</h3>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className="im-btn-detail"
                  onClick={() => handlePrintExport(detailTarget)}
                  style={{
                    background: "#3b6ef8",
                    color: "#fff",
                    border: "none",
                  }}
                >
                  🖨️ In phiếu
                </button>
                <button onClick={() => setDetailTarget(null)}>✕</button>
              </div>
            </div>

            <div className="modal-detail-info">
              <div className="detail-row">
                <span>Ngày xuất:</span>
                <strong>
                  {new Date(detailTarget.createdAt).toLocaleDateString("vi-VN")}
                </strong>
              </div>
              <div className="detail-row">
                <span>Kho xuất:</span>
                <strong>
                  {warehouses.find((w) => w._id === detailTarget.warehouseId)
                    ?.name || "—"}
                </strong>
              </div>
              <div className="detail-row">
                <span>Người nhận:</span>
                <strong>{detailTarget.recipient}</strong>
              </div>
              <div className="detail-row">
                <span>Loại:</span>
                <strong>
                  {detailTarget.recipientType === "khach_hang"
                    ? "Khách hàng"
                    : detailTarget.recipientType === "nha_phan_phoi"
                      ? "Nhà phân phối"
                      : "Khác"}
                </strong>
              </div>
              {detailTarget.note && (
                <div className="detail-row">
                  <span>Ghi chú:</span>
                  <strong>{detailTarget.note}</strong>
                </div>
              )}
            </div>

            {/* Bảng chi tiết sản phẩm */}
            <table className="detail-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Mã SP</th>
                  <th>Tên sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Số lượng</th>
                  <th>Đơn vị</th>
                  <th>Đơn giá</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {detailTarget.items?.map((item, i) => {
                  const prod = products.find(
                    (p) => p.code === item.productCode,
                  );
                  return (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>
                        <code className="im-code">{item.productCode}</code>
                      </td>
                      <td>{prod?.name || item.productCode}</td>
                      <td>{prod?.categoryId?.name || "—"}</td>
                      <td>
                        <strong>{item.quantity}</strong>
                      </td>
                      <td>{item.unit?.trim() || prod?.unit || "—"}</td>
                      <td>{item.unitPrice?.toLocaleString("vi-VN")} ₫</td>
                      <td>
                        <strong>
                          {item.totalPrice?.toLocaleString("vi-VN")} ₫
                        </strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colSpan="7"
                    style={{ textAlign: "right", fontWeight: 600 }}
                  >
                    Tổng cộng:
                  </td>
                  <td
                    style={{
                      fontWeight: 700,
                      color: "#3b6ef8",
                      fontSize: "15px",
                    }}
                  >
                    {detailTarget.totalAmount?.toLocaleString("vi-VN")} ₫
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Export;
