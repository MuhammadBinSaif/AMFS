const express = require("express");
const cors = require("cors");
const blobRoutes = require("./routes/blobRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/blobs", blobRoutes);

app.use((err, req, res, next) => {
  // Error handling middleware
  res.status(500).json({ error: err.message });
});

module.exports = app;
