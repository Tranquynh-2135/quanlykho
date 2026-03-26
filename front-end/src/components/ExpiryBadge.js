import React from "react";
import { getExpiryInfo } from "../utils/expiryHelper";
import "./ExpiryBadge.css";

const ExpiryBadge = ({ expiryDate }) => {
  const info = getExpiryInfo(expiryDate);
  if (!info) return <span className="expiry-badge expiry-none">Không có HSD</span>;
  return (
    <span className={`expiry-badge expiry-${info.color}`}>
      {info.label}
    </span>
  );
};

export default ExpiryBadge;