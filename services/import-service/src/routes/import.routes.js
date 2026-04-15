const express = require("express");
const router = express.Router();
const {
  getAllImports,
  createImport,
  deleteImport,
} = require("../controllers/import.controller");

router.get("/", getAllImports);
router.post("/", createImport);
router.delete("/:id", deleteImport);

module.exports = router;
