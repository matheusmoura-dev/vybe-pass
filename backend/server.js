const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const eventRoutes = require("./routes/events");
const vipRoutes = require("./routes/vip");
const checkinRoutes = require("./routes/checkin");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    app: "VYBE Pass",
    status: "online",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/vip", vipRoutes);
app.use("/api/checkin", checkinRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`VYBE API rodando na porta ${PORT}`);
});