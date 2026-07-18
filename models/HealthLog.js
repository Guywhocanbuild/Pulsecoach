const mongoose = require("mongoose");

const healthLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["water", "steps", "activeEnergy", "sleep"],
      required: true
    },
    value: { type: Number, required: true }, // ml, count, kcal, or hours depending on type
    source: { type: String, enum: ["manual", "demo", "chat", "healthkit"], default: "manual" },
    loggedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

healthLogSchema.index({ user: 1, type: 1, loggedAt: -1 });

module.exports = mongoose.model("HealthLog", healthLogSchema);
