const HealthLog = require("../models/HealthLog");

// POST /api/health/log  (manual entry from web form)
const createLog = async (req, res) => {
  try {
    const { type, value, source, loggedAt } = req.body;

    if (!["water", "steps", "activeEnergy", "sleep"].includes(type)) {
      return res.status(400).json({ message: "Invalid log type" });
    }

    let entryDate = new Date(); // defaults to now if no date given

    if (loggedAt) {
      const parsed = new Date(loggedAt);

      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ message: "Invalid date" });
      }
      if (parsed.getTime() > Date.now()) {
        return res.status(400).json({ message: "Can't log an entry for a future date" });
      }

      entryDate = parsed;
    }

    const log = await HealthLog.create({
      user: req.user._id,
      type,
      value,
      source: source || "manual",
      loggedAt: entryDate
    });

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ message: "Failed to create log", error: error.message });
  }
};

// DELETE /api/health/log/:id
const deleteLog = async (req, res) => {
  try {
    const log = await HealthLog.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id // ensures users can only delete their own logs
    });

    if (!log) {
      return res.status(404).json({ message: "Log not found" });
    }

    res.json({ message: "Log deleted", deleted: log });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete log", error: error.message });
  }
};

// GET /api/health/today - aggregated snapshot, same shape as iOS HealthSnapshot
const getTodaySnapshot = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const logs = await HealthLog.find({
      user: req.user._id,
      loggedAt: { $gte: startOfDay }
    });

    const sumByType = (type) =>
      logs.filter((l) => l.type === type).reduce((acc, l) => acc + l.value, 0);

    res.json({
      waterIntakeML: sumByType("water"),
      stepCount: sumByType("steps"),
      activeEnergyBurned: sumByType("activeEnergy"),
      sleepHours: sumByType("sleep"),
      date: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch snapshot", error: error.message });
  }
};

// GET /api/health/weekly - last 7 days, grouped by day, for Chart.js
const getWeeklyData = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const logs = await HealthLog.find({
      user: req.user._id,
      loggedAt: { $gte: sevenDaysAgo }
    }).sort({ loggedAt: 1 });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch weekly data", error: error.message });
  }
};

// A fixed, realistic-looking 7-day pattern — same numbers every time,
// so screenshots/demos/case studies stay consistent between "Load demo data" clicks.
const FIXED_DEMO_PATTERN = [
  { water: 2350, steps: 11200, activeEnergy: 780, sleep: 7.4 }, // 6 days ago
  { water: 1980, steps: 6400, activeEnergy: 410, sleep: 6.1 },
  { water: 2700, steps: 9800, activeEnergy: 620, sleep: 7.8 },
  { water: 2150, steps: 5300, activeEnergy: 350, sleep: 5.9 },
  { water: 2900, steps: 12750, activeEnergy: 810, sleep: 8.2 },
  { water: 1700, steps: 4200, activeEnergy: 290, sleep: 6.5 },
  { water: 2425, steps: 8600, activeEnergy: 540, sleep: 7.1 } // today
];

// POST /api/health/demo - seed demo data for portfolio demos
// Body: { shuffle?: boolean } - defaults to a fixed pattern; pass shuffle:true for fresh random numbers
const seedDemoData = async (req, res) => {
  try {
    const shuffle = Boolean(req.body?.shuffle);

    await HealthLog.deleteMany({ user: req.user._id, source: "demo" });

    const entries = [];
    for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);

      const day = shuffle
        ? {
            water: 1500 + Math.random() * 1500,
            steps: 4000 + Math.random() * 7000,
            activeEnergy: 200 + Math.random() * 500,
            sleep: 5 + Math.random() * 3.5
          }
        : FIXED_DEMO_PATTERN[6 - daysAgo];

      entries.push(
        { user: req.user._id, type: "water", value: day.water, source: "demo", loggedAt: date },
        { user: req.user._id, type: "steps", value: day.steps, source: "demo", loggedAt: date },
        { user: req.user._id, type: "activeEnergy", value: day.activeEnergy, source: "demo", loggedAt: date },
        { user: req.user._id, type: "sleep", value: day.sleep, source: "demo", loggedAt: date }
      );
    }

    await HealthLog.insertMany(entries);
    res.json({ message: "Demo data seeded", count: entries.length, shuffled: shuffle });
  } catch (error) {
    res.status(500).json({ message: "Failed to seed demo data", error: error.message });
  }
};

// GET /api/health/today/logs - individual entries for today (for the delete-log UI)
const getTodayLogs = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const logs = await HealthLog.find({
      user: req.user._id,
      loggedAt: { $gte: startOfDay }
    }).sort({ loggedAt: -1 });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch today's logs", error: error.message });
  }
};

module.exports = { createLog, getTodaySnapshot, getTodayLogs, getWeeklyData, seedDemoData, deleteLog };
