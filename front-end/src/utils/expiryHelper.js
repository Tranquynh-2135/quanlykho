/**
 * Tính số ngày còn lại và trả về thông tin badge màu
 * Dùng chung cho mọi trang có hiển thị hạn sử dụng
 */
export function getExpiryInfo(expiryDate) {
  if (!expiryDate) return null;
  const now      = new Date();
  const expiry   = new Date(expiryDate);
  const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0)  return { daysLeft: 0,        label: "Hết hạn",          color: "expired" };
  if (daysLeft <= 10) return { daysLeft,            label: `Còn ${daysLeft} ngày`, color: "red"     };
  if (daysLeft <= 30) return { daysLeft,            label: `Còn ${daysLeft} ngày`, color: "yellow"  };
  return               { daysLeft,                  label: `Còn ${daysLeft} ngày`, color: "green"   };
}