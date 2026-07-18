const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { sendEmail, welcomeEmail, resetPasswordEmail, loginAlertEmail } = require("../utils/sendEmail");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const user = await User.create({ name, email, password });

    // Fire-and-forget — a failed welcome email should never block signup
    sendEmail({
      to: user.email,
      subject: "Welcome to PulseCoach",
      html: welcomeEmail(user.name)
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      goals: user.goals,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Fire-and-forget — a failed alert email should never block login itself
    sendEmail({
      to: user.email,
      subject: "New login to your PulseCoach account",
      html: loginAlertEmail({
        time: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
        ip: req.ip,
        device: req.headers["user-agent"]
      })
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      goals: user.goals,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json(req.user);
};

// PATCH /api/auth/goals
const GOAL_BOUNDS = {
  dailyWaterML: { min: 500, max: 8000 },
  dailyStepGoal: { min: 1000, max: 50000 },
  dailyActiveEnergyGoal: { min: 100, max: 5000 },
  dailySleepHours: { min: 3, max: 14 }
};

const updateGoals = async (req, res) => {
  try {
    const updates = {};

    for (const key of Object.keys(GOAL_BOUNDS)) {
      if (req.body[key] === undefined) continue;

      const value = Number(req.body[key]);
      const { min, max } = GOAL_BOUNDS[key];

      if (isNaN(value) || value < min || value > max) {
        return res.status(400).json({
          message: `${key} must be between ${min} and ${max}`
        });
      }

      updates[`goals.${key}`] = value;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid goal fields provided" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to update goals", error: error.message });
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always return the same response whether or not the email exists,
    // so this endpoint can't be used to check which emails are registered.
    const genericResponse = { message: "If that email is registered, a reset link has been sent" };

    if (!user) {
      return res.json(genericResponse);
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    // CLIENT_URL must match the deployed/local origin exactly, or this link 404s
    const resetUrl = `${process.env.CLIENT_URL || "http://localhost:5000"}/reset-password.html?token=${rawToken}`;

    await sendEmail({
      to: user.email,
      subject: "Reset your PulseCoach password",
      html: resetPasswordEmail(resetUrl)
    });

    res.json(genericResponse);
  } catch (error) {
    res.status(500).json({ message: "Failed to process request", error: error.message });
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "Token and new password are required" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Reset link is invalid or has expired" });
    }

    user.password = password; // pre-save hook in User model handles hashing
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password updated — you can log in now" });
  } catch (error) {
    res.status(500).json({ message: "Failed to reset password", error: error.message });
  }
};

module.exports = { register, login, getMe, forgotPassword, resetPassword, updateGoals };
