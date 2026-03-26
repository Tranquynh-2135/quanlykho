const crypto = require("crypto");
const path   = require("path");

function hashFileName(originalName) {
  const ext  = path.extname(originalName);
  const base = path.basename(originalName, ext) + Date.now();
  return crypto.createHash("sha256").update(base).digest("hex").slice(0, 16) + ext;
}

module.exports = { hashFileName };