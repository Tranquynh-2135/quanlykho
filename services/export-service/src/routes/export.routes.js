const express = require("express");
const router = express.Router();
const {
  createExport,
  getAllExports,
  getExportById,
} = require("../controllers/export.controller");

router.post("/", createExport);
router.get("/", getAllExports);
router.get("/:id", getExportById);

module.exports = router;
