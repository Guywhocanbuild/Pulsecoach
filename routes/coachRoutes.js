const express = require("express");
const { chat } = require("../controllers/coachController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/chat", protect, chat);

module.exports = router;
