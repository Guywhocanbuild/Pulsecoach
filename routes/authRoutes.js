const express = require("express");
const rateLimit = require("express-rate-limit");
const { register, login, getMe, forgotPassword, resetPassword, updateGoals } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many attempts, please try again later" }
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.get("/me", protect, getMe);
router.patch("/goals", protect, updateGoals);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);

module.exports = router;
