const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ ok: true, message: "Check-in route online" });
});

module.exports = router;