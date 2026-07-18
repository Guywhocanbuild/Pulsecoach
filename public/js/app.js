// ===========================================================
// PulseCoach — Web client
// Talks to the same Node/Express backend the iOS app uses.
// ===========================================================

const API_BASE = "/api"; // same origin now — Express serves this file directly, no port mismatch possible

const state = {
  token: localStorage.getItem("pulsecoach_token") || null,
  user: JSON.parse(localStorage.getItem("pulsecoach_user") || "null"),
};

// ---------- DOM refs ----------

const authScreen = document.getElementById("authScreen");
const appShell = document.getElementById("appShell");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginError = document.getElementById("loginError");
const registerError = document.getElementById("registerError");
const authTabs = document.querySelectorAll(".auth-tab");

const userNameEl = document.getElementById("userName");
const logoutBtn = document.getElementById("logoutBtn");

const tabnavBtns = document.querySelectorAll(".tabnav-btn");
const dashboardView = document.getElementById("dashboardView");
const chatView = document.getElementById("chatView");

const demoDataBtn = document.getElementById("demoDataBtn");
const manualLogForm = document.getElementById("manualLogForm");
const manualLogStatus = document.getElementById("manualLogStatus");

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatLog = document.getElementById("chatLog");

let weeklyChartInstance = null;

// ---------- API helper ----------

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

// ---------- Auth ----------

authTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    authTabs.forEach((t) => t.classList.remove("is-active"));
    tab.classList.add("is-active");
    const isLogin = tab.dataset.tab === "login";
    loginForm.classList.toggle("is-hidden", !isLogin);
    registerForm.classList.toggle("is-hidden", isLogin);
  });
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  const fd = new FormData(loginForm);

  try {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }),
    });
    onAuthSuccess(data);
  } catch (err) {
    loginError.textContent = err.message;
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  registerError.textContent = "";
  const fd = new FormData(registerForm);

  try {
    const data = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        password: fd.get("password"),
      }),
    });
    onAuthSuccess(data);
  } catch (err) {
    registerError.textContent = err.message;
  }
});

function onAuthSuccess(data) {
  state.token = data.token;
  state.user = { name: data.name, email: data.email, goals: data.goals };
  localStorage.setItem("pulsecoach_token", state.token);
  localStorage.setItem("pulsecoach_user", JSON.stringify(state.user));
  enterApp();
}

// ---------- Forgot password ----------

const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const forgotStatus = document.getElementById("forgotStatus");

forgotPasswordBtn?.addEventListener("click", async () => {
  const email = loginForm.querySelector('input[name="email"]').value.trim();

  if (!email) {
    forgotStatus.textContent = "Enter your email above first, then click this again.";
    forgotStatus.style.color = "var(--pulse)";
    return;
  }

  forgotStatus.style.color = "var(--mint)";
  forgotStatus.textContent = "Sending…";

  try {
    const data = await api("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    forgotStatus.textContent = data.message;
  } catch (err) {
    forgotStatus.style.color = "var(--pulse)";
    forgotStatus.textContent = err.message;
  }
});

logoutBtn.addEventListener("click", () => {
  state.token = null;
  state.user = null;
  localStorage.removeItem("pulsecoach_token");
  localStorage.removeItem("pulsecoach_user");
  appShell.classList.add("is-hidden");
  authScreen.classList.remove("is-hidden");
  loginForm.reset();
  registerForm.reset();
});

function enterApp() {
  authScreen.classList.add("is-hidden");
  appShell.classList.remove("is-hidden");
  userNameEl.textContent = state.user?.name || "";
  refreshDashboard();
}

// ---------- About modal ----------

const aboutBtn = document.getElementById("aboutBtn");
const aboutModal = document.getElementById("aboutModal");
const closeAboutBtn = document.getElementById("closeAboutBtn");

aboutBtn.addEventListener("click", () => aboutModal.classList.remove("is-hidden"));
closeAboutBtn.addEventListener("click", () => aboutModal.classList.add("is-hidden"));

// Close on backdrop click, but not when clicking inside the card itself
aboutModal.addEventListener("click", (e) => {
  if (e.target === aboutModal) aboutModal.classList.add("is-hidden");
});

// Close on Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!aboutModal.classList.contains("is-hidden")) aboutModal.classList.add("is-hidden");
    if (!goalsModal.classList.contains("is-hidden")) goalsModal.classList.add("is-hidden");
  }
});

// ---------- Goals modal ----------

const goalsBtn = document.getElementById("goalsBtn");
const goalsModal = document.getElementById("goalsModal");
const closeGoalsBtn = document.getElementById("closeGoalsBtn");
const goalsForm = document.getElementById("goalsForm");
const goalsStatus = document.getElementById("goalsStatus");

function prefillGoalsForm() {
  const defaultGoals = { dailyWaterML: 2500, dailyStepGoal: 8000, dailyActiveEnergyGoal: 600, dailySleepHours: 8 };
  const goals = { ...defaultGoals, ...(state.user?.goals || {}) };
  goalsForm.querySelector('[name="dailyWaterML"]').value = goals.dailyWaterML;
  goalsForm.querySelector('[name="dailyStepGoal"]').value = goals.dailyStepGoal;
  goalsForm.querySelector('[name="dailyActiveEnergyGoal"]').value = goals.dailyActiveEnergyGoal;
  goalsForm.querySelector('[name="dailySleepHours"]').value = goals.dailySleepHours;
}

goalsBtn.addEventListener("click", () => {
  prefillGoalsForm();
  goalsStatus.textContent = "";
  goalsModal.classList.remove("is-hidden");
});
closeGoalsBtn.addEventListener("click", () => goalsModal.classList.add("is-hidden"));
goalsModal.addEventListener("click", (e) => {
  if (e.target === goalsModal) goalsModal.classList.add("is-hidden");
});

goalsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  goalsStatus.textContent = "";
  const fd = new FormData(goalsForm);

  try {
    const updatedUser = await api("/auth/goals", {
      method: "PATCH",
      body: JSON.stringify({
        dailyWaterML: Number(fd.get("dailyWaterML")),
        dailyStepGoal: Number(fd.get("dailyStepGoal")),
        dailyActiveEnergyGoal: Number(fd.get("dailyActiveEnergyGoal")),
        dailySleepHours: Number(fd.get("dailySleepHours")),
      }),
    });

    state.user.goals = updatedUser.goals;
    localStorage.setItem("pulsecoach_user", JSON.stringify(state.user));

    goalsStatus.textContent = "Saved ✓";
    refreshDashboard();
    setTimeout(() => goalsModal.classList.add("is-hidden"), 700);
  } catch (err) {
    goalsStatus.textContent = err.message;
  }
});

// ---------- Tab navigation ----------

tabnavBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabnavBtns.forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    const view = btn.dataset.view;
    dashboardView.classList.toggle("is-hidden", view !== "dashboard");
    chatView.classList.toggle("is-hidden", view !== "chat");
    if (view === "dashboard") refreshDashboard();
  });
});

// ---------- Dashboard: snapshot + rings ----------

function setRing(metric, value, goal) {
  const card = document.querySelector(`.stat-card[data-metric="${metric}"] .ring-value`);
  if (!card) return;
  const circumference = 327; // 2 * pi * 52
  const pct = goal ? Math.min(value / goal, 1) : 0;
  card.style.strokeDashoffset = String(circumference * (1 - pct));
}

async function refreshDashboard() {
  try {
    const snap = await api("/health/today");

    // Merge per-field so older accounts missing a newer goal field (like
    // dailyActiveEnergyGoal, added after some users already existed) still
    // get a sane default instead of showing blank.
    const defaultGoals = { dailyWaterML: 2500, dailyStepGoal: 8000, dailyActiveEnergyGoal: 600, dailySleepHours: 8 };
    const goals = { ...defaultGoals, ...(state.user?.goals || {}) };

    document.getElementById("waterValue").textContent = Math.round(snap.waterIntakeML);
    document.getElementById("waterGoal").textContent = goals.dailyWaterML;
    document.getElementById("stepsValue").textContent = Math.round(snap.stepCount);
    document.getElementById("stepsGoal").textContent = goals.dailyStepGoal;
    document.getElementById("energyValue").textContent = Math.round(snap.activeEnergyBurned);
    document.getElementById("energyGoal").textContent = goals.dailyActiveEnergyGoal;
    document.getElementById("sleepValue").textContent = snap.sleepHours.toFixed(1);
    document.getElementById("sleepGoal").textContent = goals.dailySleepHours;

    setRing("water", snap.waterIntakeML, goals.dailyWaterML);
    setRing("steps", snap.stepCount, goals.dailyStepGoal);
    setRing("activeEnergy", snap.activeEnergyBurned, goals.dailyActiveEnergyGoal);
    setRing("sleep", snap.sleepHours, goals.dailySleepHours);

    // Show an encouraging empty state instead of four dead-looking zero rings
    const isCompletelyEmpty =
      snap.waterIntakeML === 0 && snap.stepCount === 0 && snap.activeEnergyBurned === 0 && snap.sleepHours === 0;

    document.getElementById("emptyStateBanner").classList.toggle("is-hidden", !isCompletelyEmpty);
    document.getElementById("statGrid").classList.toggle("is-hidden", isCompletelyEmpty);

    await refreshWeeklyChart();
    await refreshEntryList();
  } catch (err) {
    console.error("Failed to load dashboard:", err.message);
  }
}

// ---------- Today's entry list (with delete) ----------

const entryList = document.getElementById("entryList");

const UNIT_BY_TYPE = { water: "ml", steps: "", activeEnergy: "kcal", sleep: "hrs" };

async function refreshEntryList() {
  try {
    const logs = await api("/health/today/logs");

    if (!logs.length) {
      entryList.innerHTML = '<li class="entry-list-empty">No entries yet today.</li>';
      return;
    }

    entryList.innerHTML = "";
    logs.forEach((log) => {
      const li = document.createElement("li");
      li.className = "entry-row";

      const time = new Date(log.loggedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const unit = UNIT_BY_TYPE[log.type] || "";

      li.innerHTML = `
        <span class="entry-row-text">${log.type}: ${log.value}${unit} <span class="entry-row-source">${log.source} · ${time}</span></span>
      `;

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "entry-delete-btn";
      deleteBtn.textContent = "✕";
      deleteBtn.setAttribute("aria-label", `Delete this ${log.type} entry`);
      deleteBtn.addEventListener("click", () => deleteEntry(log._id));

      li.appendChild(deleteBtn);
      entryList.appendChild(li);
    });
  } catch (err) {
    console.error("Failed to load today's entries:", err.message);
  }
}

async function deleteEntry(id) {
  try {
    await api(`/health/log/${id}`, { method: "DELETE" });
    await refreshDashboard(); // re-sync rings, chart, and list together
  } catch (err) {
    console.error("Failed to delete entry:", err.message);
  }
}

async function refreshWeeklyChart() {
  const logs = await api("/health/weekly");

  // Group by day + type, summing values
  const dayBuckets = {};
  logs.forEach((log) => {
    const day = new Date(log.loggedAt).toLocaleDateString(undefined, { weekday: "short" });
    dayBuckets[day] = dayBuckets[day] || { water: 0, steps: 0 };
    if (log.type === "water") dayBuckets[day].water += log.value;
    if (log.type === "steps") dayBuckets[day].steps += log.value;
  });

  const labels = Object.keys(dayBuckets);
  const waterData = labels.map((d) => Math.round(dayBuckets[d].water));
  const stepsData = labels.map((d) => Math.round(dayBuckets[d].steps));

  const ctx = document.getElementById("weeklyChart");
  if (weeklyChartInstance) weeklyChartInstance.destroy();

  weeklyChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Water (ml)",
          data: waterData,
          backgroundColor: "#FF4B6E",
          borderRadius: 6,
          yAxisID: "y",
        },
        {
          label: "Steps",
          data: stepsData,
          backgroundColor: "#1C9C7E",
          borderRadius: 6,
          yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      scales: {
        y: { position: "left", grid: { color: "rgba(16,19,26,0.06)" } },
        y1: { position: "right", grid: { display: false } },
      },
      plugins: {
        legend: { labels: { font: { family: "Inter", size: 11 } } },
      },
    },
  });
}

// ---------- Manual entry ----------

function todayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function setManualFormDateToToday() {
  const dateInput = manualLogForm.querySelector('input[name="loggedAt"]');
  const today = todayDateString();
  dateInput.value = today;
  dateInput.max = today; // can't backfill into the future
}

setManualFormDateToToday();

manualLogForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  manualLogStatus.textContent = "";
  const fd = new FormData(manualLogForm);
  const loggedAt = fd.get("loggedAt"); // "YYYY-MM-DD" from the date input

  try {
    await api("/health/log", {
      method: "POST",
      body: JSON.stringify({
        type: fd.get("type"),
        value: Number(fd.get("value")),
        source: "manual",
        loggedAt: loggedAt ? new Date(`${loggedAt}T12:00:00`).toISOString() : undefined,
      }),
    });

    const isToday = loggedAt === todayDateString();
    manualLogStatus.textContent = isToday ? "Logged ✓" : `Logged for ${loggedAt} ✓ (won't show in today's rings)`;
    manualLogForm.reset();
    setManualFormDateToToday();
    refreshDashboard();
  } catch (err) {
    manualLogStatus.textContent = err.message;
  }
});

// ---------- Demo data ----------

const shuffleDemoBtn = document.getElementById("shuffleDemoBtn");

async function loadDemoData(shuffle = false) {
  const btn = shuffle ? shuffleDemoBtn : demoDataBtn;
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = shuffle ? "Shuffling…" : "Loading…";

  try {
    await api("/health/demo", {
      method: "POST",
      body: JSON.stringify({ shuffle }),
    });
    await refreshDashboard();
    shuffleDemoBtn.classList.remove("is-hidden"); // reveal shuffle option once demo data exists
  } catch (err) {
    console.error("Failed to seed demo data:", err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

demoDataBtn.addEventListener("click", () => loadDemoData(false));
shuffleDemoBtn.addEventListener("click", () => loadDemoData(true));
document.getElementById("emptyStateDemoBtn").addEventListener("click", () => loadDemoData(false));

// ---------- Chat (streams via fetch, not EventSource, since we need auth headers) ----------

function appendBubble(text, role) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble chat-bubble--${role}`;
  const p = document.createElement("p");
  p.textContent = text;
  bubble.appendChild(p);
  chatLog.appendChild(bubble);
  chatLog.scrollTop = chatLog.scrollHeight;
  return p;
}

function appendLogChip(log) {
  const chip = document.createElement("div");
  chip.className = "chat-log-chip";
  chip.textContent = `Logged: +${log.value} ${log.type}`;
  chatLog.appendChild(chip);
  chatLog.scrollTop = chatLog.scrollHeight;
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  appendBubble(message, "user");
  chatInput.value = "";
  chatInput.disabled = true;

  const coachParagraph = appendBubble("…", "coach");
  coachParagraph.textContent = "";

  try {
    let healthSnapshot = null;
    try {
      healthSnapshot = await api("/health/today");
    } catch (_) {
      /* proceed without snapshot context if this fails */
    }

    const res = await fetch(`${API_BASE}/coach/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.token}`,
      },
      body: JSON.stringify({ message, healthSnapshot }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop(); // keep incomplete chunk for next read

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data:")) continue;

        const jsonStr = line.slice(5).trim();
        let event;
        try {
          event = JSON.parse(jsonStr);
        } catch {
          continue;
        }

        if (event.type === "text") {
          coachParagraph.textContent += event.text;
          chatLog.scrollTop = chatLog.scrollHeight;
        } else if (event.type === "log_created") {
          appendLogChip(event.log);
        } else if (event.type === "error") {
          coachParagraph.textContent = `Something went wrong: ${event.message}`;
        }
      }
    }

    // Any numbers just got logged via chat — refresh the rings quietly
    refreshDashboard();
  } catch (err) {
    coachParagraph.textContent = `Couldn't reach the coach: ${err.message}`;
  } finally {
    chatInput.disabled = false;
    chatInput.focus();
  }
});

// ---------- Boot ----------

if (state.token && state.user) {
  enterApp();
}
