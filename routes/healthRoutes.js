const express = require("express");
const {
  createLog,
  getTodaySnapshot,
  getTodayLogs,
  getWeeklyData,
  seedDemoData,
  deleteLog
} = require("../controllers/healthController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/log", protect, createLog);
router.delete("/log/:id", protect, deleteLog);
router.get("/today", protect, getTodaySnapshot);
router.get("/today/logs", protect, getTodayLogs);
router.get("/weekly", protect, getWeeklyData);
router.post("/demo", protect, seedDemoData);

module.exports = router;
