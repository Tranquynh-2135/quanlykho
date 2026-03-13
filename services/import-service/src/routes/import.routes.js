const express = require("express");
const router = express.Router();
const {
  getAllImports,
  createImport,
} = require("../controllers/import.controller");

router.get("/", getAllImports);
router.post("/", createImport);

module.exports = router;
