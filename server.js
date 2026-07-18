require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const coachRoutes = require("./routes/coachRoutes");
const healthRoutes = require("./routes/healthRoutes");

const app = express();

connectDB();

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

// Serve the web frontend from the same server — no separate port, no CORS to worry about
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/status", (req, res) => res.json({ status: "PulseCoach API running" }));

app.use("/api/auth", authRoutes);
app.use("/api/coach", coachRoutes);
app.use("/api/health", healthRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong", error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`PulseCoach backend running on port ${PORT}`));
