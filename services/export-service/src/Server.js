const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const exportRoutes = require("./routes/exportRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/exports", exportRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Export DB connected");
    app.listen(process.env.PORT, () => {
      console.log(`🚀 Export Service running on port ${process.env.PORT}`);
    });
  })
  .catch(err => console.error(err));