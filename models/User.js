const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    resetPasswordToken: String,
    resetPasswordExpires: Date,

    // Daily targets - used for ring progress + AI context. Bounds keep values
    // human-plausible (no one needs a 100,000ml water goal).
    goals: {
      dailyWaterML: { type: Number, default: 2500, min: 500, max: 8000 },
      dailyStepGoal: { type: Number, default: 8000, min: 1000, max: 50000 },
      dailyActiveEnergyGoal: { type: Number, default: 600, min: 100, max: 5000 },
      dailySleepHours: { type: Number, default: 8, min: 3, max: 14 }
    }
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);
