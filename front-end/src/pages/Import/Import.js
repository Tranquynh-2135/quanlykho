import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import Select from "react-select";
import { importApi } from "../../services/importApi";
import { supplierApi } from "../../services/supplierApi";
import { warehouseApi } from "../../services/warehouseApi";
import { productApi } from "../../services/productApi";
import { useAuth } from "../../context/AuthContext";
import "./Import.css";

const Import = () => {
  const location = useLocation();
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [imports, setImports] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailTarget, setDetailTarget] = useState(null);

  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportSupplierId, setExportSupplierId] = useState("");
  const [exportWarehouseId, setExportWarehouseId] = useState("");
  const [exportProductCode, setExportProductCode] = useState("");

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newWarehouseName, setNewWarehouseName] = useState("");

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    supplierId: "",
    warehouseId: "",
    notes: "",
    items: [
      {
        productCode: "",
        quantity: 1,
        unitPrice: 0,
        manufacturingDate: "",
        expiryDate: "",
        unit: "",
      },
    ],
  });

  const loadData = async (showLoading = true, currentPage = 1) => {
    try {
      if (showLoading) setLoading(true);
      const [supRes, whRes, prodRes, catRes, impRes] = await Promise.all([
        supplierApi.getAll({ status: "active" }),
        warehouseApi.getAll({ status: "active" }),
        productApi.getAll(),
        productApi.getAllCategories(),
        importApi.getAll({ page: currentPage, limit: 20 }),
      ]);

      setSuppliers(supRes.data.data || []);
      setWarehouses(whRes.data.data || []);
      setProducts(prodRes.data?.data || prodRes.data || []);
      setCategories(catRes.data.data || []);
      setImports(impRes.data.data || []);
      setPagination(impRes.data.pagination || { totalPages: 1, total: 0 });
    } catch (err) {
      console.error("Lỗi tải dữ liệu:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true, page);
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
            unitPrice: Number(p.costPrice || 0),
            unit: p.unit || "",
            manufacturingDate: p.manufacturingDate || "",
            expiryDate: p.expiryDate || "",
          },
        ],
      }));
    }
  }, [location.state, products]);

  // Tự động điền kho cho Quản lý kho
  useEffect(() => {
    if (user?.role === "nhan_vien_kho" && user.warehouseId) {
      setFormData((prev) => ({ ...prev, warehouseId: user.warehouseId }));
    }
  }, [user]);

  const warehouseOptions = useMemo(() => {
    if (user?.role === "nhan_vien_kho" && user.warehouseId) {
      const myWarehouse = warehouses.find((w) => w._id === user.warehouseId);
      return myWarehouse
        ? [{ value: myWarehouse._id, label: myWarehouse.name }]
        : [];
    }
    return warehouses.map((w) => ({
      value: w._id,
      label: w.name,
    }));
  }, [warehouses, user]);

  useEffect(() => {
    const sum = formData.items.reduce(
      (acc, item) => acc + Number(item.quantity) * Number(item.unitPrice),
      0,
    );
    setTotalAmount(sum);
  }, [formData.items]);

  const filteredImports = React.useMemo(() => {
    if (!search.trim()) return imports;
    const keyword = search.toLowerCase().trim();
    return imports.filter((imp) => {
      const sName =
        suppliers.find((s) => s._id === imp.supplierId)?.name?.toLowerCase() ||
        "";
      const wName =
        warehouses
          .find((w) => w._id === imp.warehouseId)
          ?.name?.toLowerCase() || "";
      const dateStr = new Date(imp.importDate)
        .toLocaleDateString("vi-VN")
        .toLowerCase();
      return (
        imp.code?.toLowerCase().includes(keyword) ||
        sName.includes(keyword) ||
        wName.includes(keyword) ||
        dateStr.includes(keyword)
      );
    });
  }, [imports, suppliers, warehouses, search]);

  const filteredProducts = useMemo(() => {
    if (!selectedCategoryFilter) return products;
    return products.filter((p) => {
      const catId = p.categoryId?._id || p.categoryId;
      return catId === selectedCategoryFilter;
    });
  }, [products, selectedCategoryFilter]);

  const allProductOptions = useMemo(() => {
    return products.map((p) => ({
      value: p.code,
      label: `${p.code} — ${p.name}`,
    }));
  }, [products]);

  const supplierOptions = useMemo(() => {
    return suppliers.map((s) => ({
      value: s._id,
      label: s.name,
    }));
  }, [suppliers]);

  const supplierFilterOptions = useMemo(() => {
    return [
      { value: "", label: "Tất cả nhà cung cấp" },
      ...suppliers.map((s) => ({ value: s._id, label: s.name })),
    ];
  }, [suppliers]);

  const warehouseFilterOptions = useMemo(() => {
    return [
      { value: "", label: "Tất cả các kho" },
      ...warehouses.map((w) => ({ value: w._id, label: w.name })),
    ];
  }, [warehouses]);

  const productOptions = useMemo(() => {
    const groups = categories
      .map((cat) => {
        const prodsInCat = filteredProducts.filter((p) => {
          const catId = p.categoryId?._id || p.categoryId;
          return catId === cat._id;
        });
        if (prodsInCat.length === 0) return null;
        return {
          label: cat.name,
          options: prodsInCat.map((p) => ({
            value: p.code,
            label: `${p.code} — ${p.name} (${p.unit || cat.defaultUnit || "đơn vị"})`,
            expiryDays: p.expiryDays,
            categoryName: cat.name,
          })),
        };
      })
      .filter(Boolean);

    const noCategoryProds = filteredProducts.filter((p) => !p.categoryId);
    if (noCategoryProds.length > 0) {
      groups.unshift({
        label: "Khác (Chưa phân loại)",
        options: noCategoryProds.map((p) => ({
          value: p.code,
          label: `${p.code} — ${p.name}`,
          expiryDays: p.expiryDays,
          categoryName: "Chưa phân loại",
        })),
      });
    }
    return groups;
  }, [filteredProducts, categories]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "productCode" && value) {
      const selected = products.find((p) => p.code === value);
      if (selected) {
        newItems[index].unitPrice = Number(selected.costPrice || 0);
        newItems[index].unit = selected.unit || "";
      }
      // newItems[index].batchCode = ""; // Reset lô khi đổi SP - Đã xóa batch
    }
    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productCode: "",
          quantity: 1,
          unitPrice: 0,
          unit: "",
        },
      ],
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
    if (!formData.supplierId || !formData.warehouseId) {
      alert("Vui lòng chọn Nhà cung cấp và Kho");
      return;
    }

    try {
      const payload = {
        supplierId: formData.supplierId,
        warehouseId: formData.warehouseId,
        notes: formData.notes.trim(),
        items: formData.items.map((item) => ({
          productCode: item.productCode,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          manufacturingDate: item.manufacturingDate || undefined,
          expiryDate: item.expiryDate || undefined,
          unit: item.unit?.trim() || "",
          warehouseId: formData.warehouseId,
        })),
      };

      console.log("📤 Payload gửi đi:", JSON.stringify(payload, null, 2));

      const res = await importApi.create(payload);
      if (res.data.success) {
        const newCode = res.data.code || res.data.data?.code;
        alert(`✅ Tạo phiếu nhập kho thành công!\nMã phiếu: ${newCode}`);

        setFormData({
          supplierId: "",
          warehouseId: "",
          notes: "",
          items: [
            {
              productCode: "",
              quantity: 1,
              unitPrice: 0,
              manufacturingDate: "",
              expiryDate: "",
              unit: "",
            },
          ],
        });
        setSelectedCategoryFilter("");

        await loadData(false); // Tải lại toàn bộ dữ liệu bao gồm cả sản phẩm và lô hàng mới
      }
    } catch (err) {
      alert("❌ Lỗi: " + (err.response?.data?.message || err.message));
    }
  };

  const handleAddSupplier = async () => {
    if (!newSupplierName.trim()) return alert("Vui lòng nhập tên nhà cung cấp");
    try {
      const res = await supplierApi.create({
        name: newSupplierName.trim(),
        status: "active",
      });
      setSuppliers([...suppliers, res.data.data]);
      setFormData((prev) => ({ ...prev, supplierId: res.data.data._id }));
      setNewSupplierName("");
      setShowSupplierModal(false);
    } catch {
      alert("Không thể thêm nhà cung cấp");
    }
  };

  const handleAddWarehouse = async () => {
    if (!newWarehouseName.trim()) return alert("Vui lòng nhập tên kho");
    try {
      const res = await warehouseApi.create({
        name: newWarehouseName.trim(),
        status: "active",
      });
      setWarehouses([...warehouses, res.data.data]);
      setFormData((prev) => ({ ...prev, warehouseId: res.data.data._id }));
      setNewWarehouseName("");
      setShowWarehouseModal(false);
    } catch {
      alert("Không thể thêm kho");
    }
  };

  const handleDeleteImport = async (id, code) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa phiếu nhập kho "${code}"?\n\nHành động này sẽ trừ lại tồn kho.`,
      )
    )
      return;

    try {
      const res = await importApi.delete(id);
      if (res.data.success) {
        alert(`✅ Đã xóa phiếu ${code} thành công!`);
        await loadData(false); // Cập nhật lại tồn kho sau khi xóa phiếu
      }
    } catch (err) {
      alert(
        "❌ Lỗi khi xóa phiếu: " + (err.response?.data?.message || err.message),
      );
    }
  };

  // ============================================================
  // HÀM IN PHIẾU NHẬP KHO - PHIÊN BẢN CHUYÊN NGHIỆP
  // ============================================================
  const handlePrint = (imp) => {
    const printWindow = window.open("", "_blank", "width=900,height=700");

    const supplier = suppliers.find((s) => s._id === imp.supplierId);
    const warehouse = warehouses.find((w) => w._id === imp.warehouseId);
    const importDate = new Date(imp.importDate);

    // Tính tổng số lượng tất cả mặt hàng
    const totalQty =
      imp.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) ||
      0;

    // Hàm đọc số thành chữ (đơn giản cho VND)
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
      const teens = [
        "mười",
        "mười một",
        "mười hai",
        "mười ba",
        "mười bốn",
        "mười lăm",
        "mười sáu",
        "mười bảy",
        "mười tám",
        "mười chín",
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
        if (n < 20) return teens[n - 10];
        if (n < 100) {
          const t = Math.floor(n / 10);
          const u = n % 10;
          return tens[t] + (u !== 0 ? " " + units[u] : "");
        }
        const h = Math.floor(n / 100);
        const rest = n % 100;
        let result = units[h] + " trăm";
        if (rest > 0) {
          if (rest < 10) result += " lẻ " + units[rest];
          else result += " " + readGroup(rest);
        }
        return result;
      };

      const billion = Math.floor(num / 1_000_000_000);
      const million = Math.floor((num % 1_000_000_000) / 1_000_000);
      const thousand = Math.floor((num % 1_000_000) / 1_000);
      const remainder = num % 1_000;

      let result = "";
      if (billion > 0) result += readGroup(billion) + " tỷ ";
      if (million > 0) result += readGroup(million) + " triệu ";
      if (thousand > 0) result += readGroup(thousand) + " nghìn ";
      if (remainder > 0) result += readGroup(remainder);

      return result.trim().replace(/^\w/, (c) => c.toUpperCase()) + " đồng";
    };

    const itemsHtml = (imp.items || [])
      .map((item, i) => {
        const prod = products.find((p) => p.code === item.productCode);
        const catName = prod?.categoryId?.name || "—";
        const lineTotal =
          Number(item.quantity || 0) * Number(item.unitPrice || 0);

        return `
        <tr>
          <td class="center">${i + 1}</td>
          <td class="code">${item.productCode || "—"}</td>
          <td>${prod?.name || item.productCode || "—"}</td>
          <td class="center">${catName}</td>
          <td class="center">${Number(item.quantity).toLocaleString("vi-VN")}</td>
          <td class="center">${item.unit || "—"}</td>
          <td class="right">${Number(item.unitPrice).toLocaleString("vi-VN")}</td>
          <td class="center">${item.manufacturingDate ? new Date(item.manufacturingDate).toLocaleDateString("vi-VN") : "—"}</td>
          <td class="center">${item.expiryDate ? new Date(item.expiryDate).toLocaleDateString("vi-VN") : "—"}</td>
          <td class="right bold">${lineTotal.toLocaleString("vi-VN")}</td>
        </tr>`;
      })
      .join("");

    const amountInWords = numberToWords(imp.totalAmount || 0);

    printWindow.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Phiếu nhập kho - ${imp.code}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 13px;
      color: #111;
      background: #fff;
      padding: 20px 30px;
    }

    /* Header công ty */
    .company-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
      padding-bottom: 8px;
      border-bottom: 2px solid #111;
    }
    .company-left { flex: 1; }
    .company-name {
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .company-info {
      font-size: 11px;
      color: #444;
      margin-top: 3px;
      line-height: 1.6;
    }
    .form-code {
      text-align: right;
      font-size: 11px;
      color: #444;
    }
    .form-code strong { display: block; font-size: 12px; }

    /* Tiêu đề phiếu */
    .doc-title {
      text-align: center;
      margin: 14px 0 4px;
    }
    .doc-title h1 {
      font-size: 20px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .doc-title .doc-code {
      font-size: 13px;
      margin-top: 4px;
      color: #333;
    }
    .doc-title .doc-date {
      font-size: 12px;
      color: #555;
      margin-top: 2px;
      font-style: italic;
    }

    /* Thông tin phiếu */
    .info-section {
      margin: 14px 0 12px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 24px;
    }
    .info-row {
      display: flex;
      gap: 6px;
      font-size: 12.5px;
      padding: 2px 0;
      border-bottom: 1px dotted #ccc;
    }
    .info-row.full-width {
      grid-column: 1 / -1;
    }
    .info-label {
      font-weight: bold;
      white-space: nowrap;
      min-width: 130px;
    }
    .info-value { color: #222; flex: 1; }

    /* Bảng hàng hoá */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 8px;
      font-size: 12px;
    }
    th {
      background: #f0f0f0;
      border: 1px solid #555;
      padding: 6px 5px;
      text-align: center;
      font-size: 11.5px;
      font-weight: bold;
      line-height: 1.3;
    }
    td {
      border: 1px solid #888;
      padding: 5px 5px;
      vertical-align: middle;
      line-height: 1.4;
    }
    td.center { text-align: center; }
    td.right { text-align: right; }
    td.bold { font-weight: bold; }
    td.code { font-family: "Courier New", monospace; font-size: 11px; color: #1a3db8; }

    /* Tổng cộng */
    .total-section {
      margin-top: 8px;
      border-top: 2px solid #333;
      padding-top: 8px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13.5px;
      font-weight: bold;
    }
    .total-amount {
      font-size: 16px;
      color: #1a3db8;
    }
    .amount-in-words {
      font-size: 12px;
      font-style: italic;
      color: #333;
      margin-top: 4px;
    }
    .amount-in-words span { font-weight: bold; font-style: normal; }

    /* Ghi chú */
    .notes-section {
      margin-top: 8px;
      font-size: 12px;
      font-style: italic;
      color: #444;
      padding: 6px 10px;
      border-left: 3px solid #888;
      background: #fafafa;
    }

    /* Khu vực ký tên */
    .signature-section {
      margin-top: 24px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      text-align: center;
      font-size: 12px;
    }
    .sig-box .sig-title {
      font-weight: bold;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .sig-box .sig-note {
      font-size: 11px;
      color: #555;
      font-style: italic;
      margin-top: 2px;
    }
    .sig-box .sig-space {
      height: 70px;
      border-bottom: 1px solid #aaa;
      margin: 6px 8px 4px;
    }
    .sig-box .sig-name {
      font-size: 11px;
      color: #666;
    }

    /* Footer */
    .print-footer {
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px solid #ddd;
      font-size: 10px;
      color: #999;
      display: flex;
      justify-content: space-between;
    }

    @media print {
      @page {
        size: A4;
        margin: 1.2cm 1.5cm;
      }
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>

  <!-- Header công ty -->
  <div class="company-header">
    <div class="company-left">
      <div class="company-name">Công ty / Cửa hàng</div>
      <div class="company-info">
        Địa chỉ: ......................................................<br/>
        Điện thoại: ........................... | MST: ...........................
      </div>
    </div>
    <div class="form-code">
      <strong>Mẫu số: 01-VT</strong>
      (Ban hành theo TT 200/2014/TT-BTC)
    </div>
  </div>

  <!-- Tiêu đề phiếu -->
  <div class="doc-title">
    <h1>Phiếu nhập kho</h1>
    <div class="doc-code">Số: <strong>${imp.code}</strong></div>
    <div class="doc-date">
      Ngày ${importDate.getDate()} tháng ${importDate.getMonth() + 1} năm ${importDate.getFullYear()}
    </div>
  </div>

  <!-- Thông tin -->
  <div class="info-section">
    <div class="info-row">
      <span class="info-label">Nhà cung cấp:</span>
      <span class="info-value"><strong>${supplier?.name || "—"}</strong></span>
    </div>
    <div class="info-row">
      <span class="info-label">Kho nhập:</span>
      <span class="info-value"><strong>${warehouse?.name || "—"}</strong></span>
    </div>

    <div class="info-row">
      <span class="info-label">Địa chỉ NCC:</span>
      <span class="info-value">${supplier?.address || "............................................"}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Địa chỉ kho:</span>
      <span class="info-value">${warehouse?.address || "............................................"}</span>
    </div>

    <div class="info-row">
      <span class="info-label">Điện thoại NCC:</span>
      <span class="info-value">${supplier?.phone || "............................................"}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Người nhận hàng:</span>
      <span class="info-value">............................................</span>
    </div>

    <div class="info-row full-width">
      <span class="info-label">Theo chứng từ số:</span>
      <span class="info-value">...........  ngày ...... tháng ...... năm ............</span>
    </div>
  </div>

  <!-- Bảng hàng hoá -->
  <table>
    <thead>
      <tr>
        <th rowspan="2" style="width:28px">STT</th>
        <th rowspan="2" style="min-width:75px">Mã hàng</th>
        <th rowspan="2">Tên hàng hoá, vật tư</th>
        <th rowspan="2" style="min-width:80px">Danh mục</th>
        <th rowspan="2" style="min-width:80px">Số lượng</th>
        <th rowspan="2" style="min-width:70px">Đơn vị tính</th>
        <th rowspan="2" style="min-width:90px">Đơn giá (₫)</th>
        <th rowspan="2" style="min-width:100px">NSX</th>
        <th rowspan="2" style="min-width:100px">HSD</th>
        <th rowspan="2" style="min-width:95px">Thành tiền (₫)</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4" class="right bold" style="font-size:12.5px; padding: 7px 6px;">
          Cộng
        </td>
        <td class="center bold">${totalQty.toLocaleString("vi-VN")}</td>
        <td class="center bold"></td>
        <td></td>
        <td></td>
        <td></td>
        <td class="right bold" style="font-size:13px; color:#1a3db8;">
          ${(imp.totalAmount || 0).toLocaleString("vi-VN")}
        </td>
      </tr>
    </tfoot>
  </table>

  <!-- Tổng tiền -->
  <div class="total-section">
    <div class="total-row">
      <span>Tổng số tiền (bằng số):</span>
      <span class="total-amount">${(imp.totalAmount || 0).toLocaleString("vi-VN")} ₫</span>
    </div>
    <div class="amount-in-words">
      Số tiền bằng chữ: <span>${amountInWords}</span>
    </div>
  </div>

  ${
    imp.notes
      ? `
  <div class="notes-section">
    <strong>Ghi chú:</strong> ${imp.notes}
  </div>`
      : ""
  }

  <!-- Chữ ký -->
  <div class="signature-section">
    <div class="sig-box">
      <div class="sig-title">Người lập phiếu</div>
      <div class="sig-note">(Ký, ghi rõ họ tên)</div>
      <div class="sig-space"></div>
      <div class="sig-name">..............................</div>
    </div>
    <div class="sig-box">
      <div class="sig-title">Người giao hàng</div>
      <div class="sig-note">(Ký, ghi rõ họ tên)</div>
      <div class="sig-space"></div>
      <div class="sig-name">..............................</div>
    </div>
    <div class="sig-box">
      <div class="sig-title">Thủ kho</div>
      <div class="sig-note">(Ký, ghi rõ họ tên)</div>
      <div class="sig-space"></div>
      <div class="sig-name">..............................</div>
    </div>
    <div class="sig-box">
      <div class="sig-title">Kế toán trưởng</div>
      <div class="sig-note">(Ký, ghi rõ họ tên)</div>
      <div class="sig-space"></div>
      <div class="sig-name">..............................</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="print-footer">
    <span>In lúc: ${new Date().toLocaleString("vi-VN")}</span>
    <span>Phiếu nhập kho số: ${imp.code} | ${totalQty} mặt hàng | ${(imp.items || []).length} dòng</span>
  </div>

  <script>
    window.onload = function () {
      window.print();
    };
  </script>
</body>
</html>`);

    printWindow.document.close();
  };

  const handleExportExcel = () => {
    const params = {
      startDate: exportStartDate,
      endDate: exportEndDate,
      supplierId: exportSupplierId,
      warehouseId: exportWarehouseId,
      productCode: exportProductCode,
    };
    window.open(importApi.getExportUrl(params), "_blank");
  };

  if (loading) return <div className="loading">Đang tải dữ liệu...</div>;

  return (
    <div className="im-root">
      <div className="im-header">
        <div className="im-title-block">
          <span className="im-title-icon">📥</span>
          <div>
            <h1 className="im-title">Nhập kho</h1>
            <p className="im-subtitle">{imports.length} phiếu nhập</p>
          </div>
        </div>
      </div>

      <div className="im-form-card">
        <h2>Tạo phiếu nhập kho mới</h2>
        <form onSubmit={handleSubmit}>
          <div className="im-form-row">
            {/* Nhà cung cấp */}
            <div className="im-form-group">
              <label>
                Nhà cung cấp <span className="required">*</span>
              </label>
              <div className="select-with-add">
                <Select
                  options={supplierOptions}
                  value={
                    supplierOptions.find(
                      (o) => o.value === formData.supplierId,
                    ) || null
                  }
                  onChange={(sel) =>
                    setFormData((p) => ({ ...p, supplierId: sel?.value || "" }))
                  }
                  placeholder="Tìm theo tên hoặc SĐT..."
                  isSearchable
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
                <button
                  type="button"
                  className="btn-add-inline"
                  onClick={() => setShowSupplierModal(true)}
                >
                  +
                </button>
              </div>
            </div>

            {/* ==================== KHO - ĐÃ SỬA HOÀN CHỈNH ==================== */}
            <div className="im-form-group">
              <label>
                Kho <span className="required">*</span>
              </label>
              <div className="select-with-add">
                <Select
                  options={warehouseOptions}
                  value={
                    warehouseOptions.find(
                      (o) => o.value === formData.warehouseId,
                    ) || null
                  }
                  onChange={(sel) =>
                    setFormData((p) => ({
                      ...p,
                      warehouseId: sel?.value || "",
                    }))
                  }
                  placeholder="Chọn kho..."
                  isSearchable
                  className="react-select-container"
                  classNamePrefix="react-select"
                />

                {/* Chỉ Chủ kho mới thấy nút + */}
                {user?.role === "quan_ly_kho" && (
                  <button
                    type="button"
                    className="btn-add-inline"
                    onClick={() => setShowWarehouseModal(true)}
                  >
                    +
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="im-form-group" style={{ marginBottom: "24px" }}>
            <label>Lọc sản phẩm theo danh mục</label>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1.5px solid #e2e8f0",
                borderRadius: "10px",
              }}
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="items-section">
            <h3>Chi tiết sản phẩm nhập</h3>
            <div className="items-table-wrap">
              <table className="items-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 260 }}>Sản phẩm</th>
                    <th style={{ minWidth: 150 }}>Danh mục</th>
                    <th style={{ minWidth: 100 }}>Số lượng</th>
                    <th style={{ minWidth: 130 }}>Đơn vị tính</th>
                    <th style={{ minWidth: 140 }}>Giá vốn (₫)</th>
                    <th style={{ minWidth: 150 }}>NSX</th>
                    <th style={{ minWidth: 150 }}>HSD</th>
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
                      selectedProduct?.categoryId?.name || "—";

                    return (
                      <tr key={index}>
                        <td>
                          <Select
                            options={productOptions}
                            value={
                              productOptions
                                .flatMap((g) => g.options || [])
                                .find((o) => o.value === item.productCode) ||
                              null
                            }
                            onChange={(sel) =>
                              handleItemChange(
                                index,
                                "productCode",
                                sel ? sel.value : "",
                              )
                            }
                            placeholder="Chọn sản phẩm..."
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
                        <td>
                          <input
                            type="text"
                            value={item.unit || ""}
                            onChange={(e) =>
                              handleItemChange(index, "unit", e.target.value)
                            }
                            placeholder="kg, thùng, chai..."
                            style={{ textAlign: "center" }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "unitPrice",
                                e.target.value,
                              )
                            }
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="date"
                            value={item.manufacturingDate || ""}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "manufacturingDate",
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="date"
                            value={item.expiryDate || ""}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "expiryDate",
                                e.target.value,
                              )
                            }
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
              value={formData.notes}
              onChange={(e) =>
                setFormData((p) => ({ ...p, notes: e.target.value }))
              }
              placeholder="Ghi chú thêm (nếu có)"
              rows={4}
            />
          </div>

          <button type="submit" className="im-btn-primary">
            Tạo phiếu nhập kho
          </button>
        </form>
      </div>

      {/* Lịch sử phiếu nhập */}
      <div className="im-history">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h2 style={{ margin: 0 }}>Lịch sử phiếu nhập kho</h2>
          <button
            className="im-btn-detail"
            onClick={handleExportExcel}
            style={{
              padding: "8px 16px",
              background: "#15803d",
              color: "#fff",
              border: "none",
              fontWeight: "600",
            }}
          >
            📊 Xuất Excel báo cáo
          </button>
        </div>

        <div
          className="im-export-filters"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            marginBottom: "16px",
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
            <label style={{ fontSize: "12px" }}>Nhà cung cấp</label>
            <Select
              options={supplierFilterOptions}
              value={
                supplierFilterOptions.find(
                  (o) => o.value === exportSupplierId,
                ) || supplierFilterOptions[0]
              }
              onChange={(sel) => setExportSupplierId(sel?.value || "")}
              placeholder="Chọn NCC..."
              isSearchable
              className="react-select-container"
              classNamePrefix="react-select"
              styles={{
                control: (base) => ({
                  ...base,
                  minHeight: "38px",
                  borderRadius: "8px",
                }),
              }}
            />
          </div>
          <div className="im-form-group">
            <label style={{ fontSize: "12px" }}>Kho nhập</label>
            <Select
              options={warehouseFilterOptions}
              value={
                warehouseFilterOptions.find(
                  (o) => o.value === exportWarehouseId,
                ) || warehouseFilterOptions[0]
              }
              onChange={(sel) => setExportWarehouseId(sel?.value || "")}
              placeholder="Chọn kho..."
              isSearchable
              className="react-select-container"
              classNamePrefix="react-select"
              styles={{
                control: (base) => ({
                  ...base,
                  minHeight: "38px",
                  borderRadius: "8px",
                }),
              }}
            />
          </div>
          <div className="im-form-group">
            <label style={{ fontSize: "12px" }}>Mã sản phẩm</label>
            <Select
              options={[
                { value: "", label: "Tất cả sản phẩm" },
                ...allProductOptions,
              ]}
              value={
                exportProductCode
                  ? allProductOptions.find((o) => o.value === exportProductCode)
                  : { value: "", label: "Tất cả sản phẩm" }
              }
              onChange={(sel) => setExportProductCode(sel?.value || "")}
              placeholder="Chọn sản phẩm..."
              isSearchable
              className="react-select-container"
              classNamePrefix="react-select"
              styles={{
                control: (base) => ({
                  ...base,
                  minHeight: "38px",
                  borderRadius: "8px",
                }),
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              type="button"
              className="btn-remove"
              style={{ width: "100%", height: "38px" }}
              onClick={() => {
                setExportStartDate("");
                setExportEndDate("");
                setExportSupplierId("");
                setExportWarehouseId("");
                setExportProductCode("");
              }}
            >
              Xóa lọc
            </button>
          </div>
        </div>

        <input
          className="im-search"
          placeholder="Tìm nhanh trong danh sách phiếu hiển thị bên dưới..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <table className="im-table">
          <thead>
            <tr>
              <th>Mã phiếu</th>
              <th>Ngày nhập</th>
              <th>Nhà cung cấp</th>
              <th>Kho</th>
              <th>Số mặt hàng</th>
              <th>Tổng tiền</th>
              <th>Ghi chú</th>
              <th>Chi tiết</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredImports.length === 0 ? (
              <tr>
                <td
                  colSpan="9"
                  style={{
                    textAlign: "center",
                    padding: "60px",
                    color: "#94a3b8",
                  }}
                >
                  Không tìm thấy phiếu nhập nào
                </td>
              </tr>
            ) : (
              filteredImports.map((imp) => (
                <tr key={imp._id}>
                  <td>
                    <strong style={{ color: "#3b6ef8" }}>{imp.code}</strong>
                  </td>
                  <td>
                    {new Date(imp.importDate).toLocaleDateString("vi-VN")}
                  </td>
                  <td>
                    {suppliers.find((s) => s._id === imp.supplierId)?.name ||
                      "—"}
                  </td>
                  <td>
                    {warehouses.find((w) => w._id === imp.warehouseId)?.name ||
                      "—"}
                  </td>
                  <td>{imp.items?.length || 0} mặt hàng</td>
                  <td>
                    <strong>
                      {imp.totalAmount?.toLocaleString("vi-VN")} ₫
                    </strong>
                  </td>
                  <td>
                    {imp.notes || <span style={{ color: "#94a3b8" }}>—</span>}
                  </td>
                  <td>
                    <button
                      className="im-btn-detail"
                      onClick={() => setDetailTarget(imp)}
                    >
                      🔍 Xem
                    </button>
                  </td>
                  <td>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteImport(imp._id, imp.code)}
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
        {!loading && imports.length > 0 && pagination.totalPages > 1 && (
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

      {/* Modal chi tiết phiếu */}
      {detailTarget && (
        <div className="modal-overlay" onClick={() => setDetailTarget(null)}>
          <div className="modal-detail" onClick={(e) => e.stopPropagation()}>
            <div className="modal-detail-header">
              <h3>📋 Chi tiết phiếu {detailTarget.code}</h3>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className="im-btn-detail"
                  onClick={() => handlePrint(detailTarget)}
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
                <span>Ngày nhập:</span>
                <strong>
                  {new Date(detailTarget.importDate).toLocaleDateString(
                    "vi-VN",
                  )}
                </strong>
              </div>
              <div className="detail-row">
                <span>Nhà cung cấp:</span>
                <strong>
                  {suppliers.find((s) => s._id === detailTarget.supplierId)
                    ?.name || "—"}
                </strong>
              </div>
              <div className="detail-row">
                <span>Kho:</span>
                <strong>
                  {warehouses.find((w) => w._id === detailTarget.warehouseId)
                    ?.name || "—"}
                </strong>
              </div>
              {detailTarget.notes && (
                <div className="detail-row">
                  <span>Ghi chú:</span>
                  <strong>{detailTarget.notes}</strong>
                </div>
              )}
            </div>

            <table className="detail-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Mã SP</th>
                  <th>Tên sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Số lượng</th>
                  <th>Đơn vị tính</th>
                  <th>Giá vốn</th>
                  <th>NSX</th>
                  <th>HSD</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {detailTarget.items?.map((item, i) => {
                  const prod = products.find(
                    (p) => p.code === item.productCode,
                  );
                  const categoryName = prod?.categoryId?.name || "—";
                  return (
                    <tr key={i}>
                      <td style={{ color: "#94a3b8" }}>{i + 1}</td>
                      <td>
                        <code className="im-code">{item.productCode}</code>
                      </td>
                      <td>{prod?.name || item.productCode}</td>
                      <td>{categoryName}</td>
                      <td>{item.quantity}</td>
                      <td>
                        <strong>{item.unit || "—"}</strong>
                      </td>
                      <td>{item.unitPrice?.toLocaleString("vi-VN")} ₫</td>
                      <td>
                        {item.manufacturingDate
                          ? new Date(item.manufacturingDate).toLocaleDateString(
                              "vi-VN",
                            )
                          : "—"}
                      </td>
                      <td>
                        {item.expiryDate
                          ? new Date(item.expiryDate).toLocaleDateString(
                              "vi-VN",
                            )
                          : "—"}
                      </td>
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
                    colSpan="9"
                    style={{
                      textAlign: "right",
                      fontWeight: 600,
                      padding: "12px 14px",
                    }}
                  >
                    Tổng cộng:
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <strong style={{ color: "#3b6ef8", fontSize: 15 }}>
                      {detailTarget.totalAmount?.toLocaleString("vi-VN")} ₫
                    </strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Modal thêm NCC */}
      {showSupplierModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowSupplierModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Thêm nhà cung cấp mới</h3>
            <input
              type="text"
              placeholder="Tên nhà cung cấp"
              value={newSupplierName}
              onChange={(e) => setNewSupplierName(e.target.value)}
            />
            <div className="modal-buttons">
              <button onClick={() => setShowSupplierModal(false)}>Hủy</button>
              <button onClick={handleAddSupplier}>Thêm</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal thêm kho */}
      {showWarehouseModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowWarehouseModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Thêm kho mới</h3>
            <input
              type="text"
              placeholder="Tên kho"
              value={newWarehouseName}
              onChange={(e) => setNewWarehouseName(e.target.value)}
            />
            <div className="modal-buttons">
              <button onClick={() => setShowWarehouseModal(false)}>Hủy</button>
              <button onClick={handleAddWarehouse}>Thêm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Import;
