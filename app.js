const STORAGE_KEY = "daywell-journal-v1";
const DEFAULT_GOALS = { calories: 2000, protein: 100, water: 2000 };
const MEALS = ["Breakfast", "Lunch", "Dinner", "Snack"];
const VITALS = {
  weight: { label: "Weight", unit: "kg", symbol: "⚖", min: "1", max: "500", step: "0.1", example: "68.4" },
  water: { label: "Water", unit: "ml", symbol: "◉", min: "1", max: "20000", step: "1", example: "250" },
  steps: { label: "Steps", unit: "steps", symbol: "↗", min: "1", max: "200000", step: "1", example: "4000" },
  sleep: { label: "Sleep", unit: "hrs", symbol: "☾", min: "0.1", max: "24", step: "0.1", example: "7.5" },
  heartRate: { label: "Heart rate", unit: "bpm", symbol: "♡", min: "20", max: "300", step: "1", example: "72" }
};
const FOOD_EMOJIS = { Breakfast: "☀", Lunch: "🥗", Dinner: "🍲", Snack: "🍎" };
const WORKOUT_EMOJIS = { Walking: "🚶", Running: "🏃", Cycling: "🚴", Strength: "🏋", Yoga: "🧘", Swimming: "🏊", Other: "✳" };
const WEEKLY_WORKOUTS = {
  0: {
    focus: "Rest day",
    rest: "Rest day. Enjoy a 30–45 minute walk or other light activity if it feels good."
  },
  1: {
    focus: "Rest day",
    rest: "Rest day. An easy 30–40 minute walk is optional; gentle stretching is another option."
  },
  2: {
    focus: "Lower body strength",
    exercises: [
      ["Goblet squat (or leg press)", "3", "10–12", "60–90 s", "Sit back, chest up"],
      ["Romanian deadlift (dumbbells)", "3", "10–12", "60–90 s", "Hinge at hips, back flat"],
      ["Glute bridge or hip thrust", "3", "12–15", "60 s", "Squeeze at the top"],
      ["Reverse lunge (or step-up)", "2", "10 each leg", "60 s", "Hold a rail if needed"],
      ["Leg curl machine", "2", "12–15", "60 s", "Slow, controlled"],
      ["Plank", "3", "20–40 s", "45 s", "Knees down if needed"]
    ],
    finisher: "10 min incline treadmill walk · 6–10% incline, brisk pace"
  },
  3: {
    focus: "Upper body strength",
    exercises: [
      ["Incline DB press (or bench push-ups)", "3", "8–12", "60–90 s", ""],
      ["Lat pulldown", "3", "10–12", "60–90 s", "Pull to upper chest"],
      ["Seated cable row", "3", "10–12", "60–90 s", "Squeeze shoulder blades"],
      ["Dumbbell shoulder press", "3", "10", "60–90 s", ""],
      ["Biceps curl + triceps pushdown (superset)", "2", "12 each", "60 s", ""],
      ["Face pull or rear delt fly", "2", "15", "45 s", "Good for posture"]
    ],
    finisher: "10 min stationary bike or rower · steady, moderate effort"
  },
  4: {
    focus: "Full body & core",
    exercises: [
      ["Kettlebell/dumbbell deadlift", "3", "12", "45–60 s", "Light to moderate weight"],
      ["Machine chest press", "3", "12", "45–60 s", ""],
      ["Seated row", "3", "12", "45–60 s", ""],
      ["Step-ups", "2", "10 each leg", "45 s", ""],
      ["Dead bug", "3", "10", "30 s", "Slow, core braced"],
      ["Side plank", "2", "20–30 s each", "30 s", ""]
    ],
    finisher: "12 min low-impact intervals · 1 min hard, 2 min easy, repeat 4 times"
  },
  5: {
    focus: "Rest day",
    rest: "Rest day. Take an easy walk and stretch if you’d like."
  },
  6: {
    focus: "Full body strength",
    exercises: [
      ["Leg press (or box squat)", "4", "8–10", "90 s", "Heaviest lift of the week"],
      ["DB or barbell bench press", "4", "8–10", "90 s", ""],
      ["DB or barbell row", "3", "10", "90 s", ""],
      ["Hip thrust", "3", "10–12", "60–90 s", ""],
      ["Overhead press", "3", "8–10", "60–90 s", ""],
      ["Farmer’s walk", "3", "30 s", "45 s", "Heavy dumbbells, tall posture"]
    ],
    finisher: "15 min incline walk · steady pace"
  }
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const dateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);
const numberFormat = (value) => Math.round(value || 0).toLocaleString();
const showStorageError = (message) => {
  const notice = $("#storageNotice");
  notice.textContent = message;
  notice.hidden = false;
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { goals: { ...DEFAULT_GOALS }, days: {} };
    const parsed = JSON.parse(saved);
    return {
      goals: { ...DEFAULT_GOALS, ...(parsed.goals || {}) },
      days: parsed.days && typeof parsed.days === "object" ? parsed.days : {}
    };
  } catch (error) {
    console.error("Could not read the Daywell journal.", error);
    showStorageError("Your saved journal could not be read. Check your browser storage settings before making changes.");
    return { goals: { ...DEFAULT_GOALS }, days: {} };
  }
}

let state = loadState();
let selectedDate = new Date();
selectedDate.setHours(0, 0, 0, 0);
let activeView = "today";
let activeEntryType = "food";

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    $("#storageNotice").hidden = true;
    return true;
  } catch (error) {
    console.error("Could not save the Daywell journal.", error);
    showStorageError("Your changes couldn’t be saved. Check available browser storage and try again.");
    return false;
  }
}

function dayData(key = dateKey(selectedDate)) {
  const day = state.days[key];
  if (!day || typeof day !== "object") return { food: [], workouts: [], vitals: [] };
  return {
    food: Array.isArray(day.food) ? day.food : [],
    workouts: Array.isArray(day.workouts) ? day.workouts : [],
    vitals: Array.isArray(day.vitals) ? day.vitals : []
  };
}

function ensureDay(key = dateKey(selectedDate)) {
  if (!state.days[key]) state.days[key] = { food: [], workouts: [], vitals: [] };
  for (const type of ["food", "workouts", "vitals"]) {
    if (!Array.isArray(state.days[key][type])) state.days[key][type] = [];
  }
  return state.days[key];
}

function formatDate(date, options = { weekday: "long", month: "long", day: "numeric", year: "numeric" }) {
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function renderToday() {
  const key = dateKey(selectedDate);
  const day = dayData(key);
  const todayKey = dateKey(new Date());
  $("#selectedDateText").textContent = key === todayKey ? "Today" : formatDate(selectedDate, { month: "short", day: "numeric", year: "numeric" });
  $("#dateInput").value = key;
  $("#todayGreeting").textContent = key === todayKey ? "A FRESH PAGE" : formatDate(selectedDate, { weekday: "long" }).toUpperCase();

  const totals = day.food.reduce((acc, item) => {
    acc.calories += Number(item.calories) || 0;
    acc.protein += Number(item.protein) || 0;
    return acc;
  }, { calories: 0, protein: 0 });
  const minutes = day.workouts.reduce((sum, item) => sum + (Number(item.duration) || 0), 0);
  const burned = day.workouts.reduce((sum, item) => sum + (Number(item.caloriesBurned) || 0), 0);
  const calorieGoal = Number(state.goals.calories) || DEFAULT_GOALS.calories;
  const proteinGoal = Number(state.goals.protein) || DEFAULT_GOALS.protein;
  const waterGoal = Number(state.goals.water) || DEFAULT_GOALS.water;
  const water = day.vitals.filter((vital) => vital.kind === "water").reduce((sum, vital) => sum + (Number(vital.value) || 0), 0);
  $("#caloriesValue").textContent = numberFormat(totals.calories);
  $("#proteinValue").textContent = numberFormat(totals.protein);
  $("#caloriesProgress").style.width = `${Math.min(100, totals.calories / calorieGoal * 100)}%`;
  $("#proteinProgress").style.width = `${Math.min(100, totals.protein / proteinGoal * 100)}%`;
  $("#caloriesRemaining").textContent = numberFormat(Math.max(0, calorieGoal - totals.calories));
  $("#proteinRemaining").textContent = numberFormat(Math.max(0, proteinGoal - totals.protein));
  $("#calorieGoalLabel").textContent = numberFormat(calorieGoal);
  $("#proteinGoalLabel").textContent = numberFormat(proteinGoal);
  $("#waterValue").textContent = numberFormat(water);
  $("#waterProgress").style.width = `${Math.min(100, water / waterGoal * 100)}%`;
  $("#waterRemaining").textContent = numberFormat(Math.max(0, waterGoal - water));
  $("#waterGoalLabel").textContent = numberFormat(waterGoal);
  $("#movementValue").textContent = numberFormat(minutes);
  $("#workoutCount").textContent = day.workouts.length ? `${day.workouts.length} ${day.workouts.length === 1 ? "session" : "sessions"} logged` : "No movement logged yet";
  $("#burnedValue").textContent = `${numberFormat(burned)} kcal`;

  renderPlannedWorkout(selectedDate);
  renderFood(day);
  renderVitals(day);
  renderWorkouts(day);
}

function renderPlannedWorkout(date) {
  const plan = WEEKLY_WORKOUTS[date.getDay()];
  const weekday = formatDate(date, { weekday: "long" });
  $("#plannedWorkoutSubtitle").textContent = `${weekday} · ${plan.focus}`;
  if (plan.rest) {
    $("#plannedWorkoutBadge").textContent = "RECOVERY DAY";
    $("#plannedWorkoutContent").innerHTML = `<div class="rest-day-copy"><span class="rest-day-sparkle" aria-hidden="true">✳</span><p>${escapeHTML(plan.rest)}</p></div>`;
    return;
  }
  $("#plannedWorkoutBadge").textContent = "60 MIN · GYM DAY";
  $("#plannedWorkoutContent").innerHTML = `
    <div class="plan-session-note"><strong>Session flow</strong><span>8 min warm-up</span><span>35–38 min strength</span><span>5 min cool-down</span></div>
    <div class="plan-table-wrap"><table class="plan-table">
      <thead><tr><th scope="col">Exercise</th><th scope="col">Sets</th><th scope="col">Reps</th><th scope="col">Rest</th><th scope="col">Form notes</th></tr></thead>
      <tbody>${plan.exercises.map(([exercise, sets, reps, rest, notes]) => `<tr><th scope="row">${escapeHTML(exercise)}</th><td>${escapeHTML(sets)}</td><td>${escapeHTML(reps)}</td><td>${escapeHTML(rest)}</td><td>${notes ? escapeHTML(notes) : "—"}</td></tr>`).join("")}</tbody>
    </table></div>
    <div class="plan-finisher"><span class="finisher-icon" aria-hidden="true">↗</span><div><strong>Cardio finisher</strong><span>${escapeHTML(plan.finisher)}</span></div></div>`;
}

function renderFood(day) {
  const list = $("#mealList");
  const items = [...day.food].sort((a, b) => String(a.time).localeCompare(String(b.time)));
  if (!items.length) {
    list.innerHTML = `<div class="empty-state"><span class="empty-icon">✳</span><strong>Nothing on the menu just yet</strong><span>Log a meal or snack whenever you’re ready.</span></div>`;
    return;
  }
  list.innerHTML = MEALS.map((meal) => {
    const mealItems = items.filter((item) => item.meal === meal);
    if (!mealItems.length) return "";
    const calories = mealItems.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
    return `<div class="meal-group">
      <div class="meal-heading"><span>${meal}</span><span>${numberFormat(calories)} kcal</span></div>
      ${mealItems.map((item) => `<div class="food-entry">
        <span class="food-emoji" aria-hidden="true">${FOOD_EMOJIS[item.meal] || "🍽"}</span>
        <div class="entry-copy"><div class="entry-name">${escapeHTML(item.name)}</div><div class="entry-detail">${numberFormat(item.calories)} kcal${item.protein ? ` · P ${numberFormat(item.protein)}g` : ""}${item.carbs ? ` · C ${numberFormat(item.carbs)}g` : ""}${item.fat ? ` · F ${numberFormat(item.fat)}g` : ""}${item.time ? ` · ${escapeHTML(item.time)}` : ""}</div></div>
        <span class="entry-calories">${numberFormat(item.calories)} kcal</span>
        <button class="delete-entry" data-delete="food" data-id="${escapeHTML(item.id)}" aria-label="Delete ${escapeHTML(item.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 14h11l1-14M9 7V4h6v3"/></svg></button>
      </div>`).join("")}
    </div>`;
  }).join("");
}

function latestByKind(vitals, kind) {
  return [...vitals].filter((vital) => vital.kind === kind).sort((a, b) => String(b.time).localeCompare(String(a.time)))[0];
}

function renderVitals(day) {
  const list = $("#vitalsList");
  const order = ["weight", "water", "steps", "sleep", "heartRate"];
  const rows = order.map((kind) => {
    const vital = latestByKind(day.vitals, kind);
    if (!vital) return "";
    const config = VITALS[kind];
    const value = Number(vital.value);
    const shown = kind === "weight" || kind === "sleep" ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : numberFormat(value);
    const time = vital.time ? `Today · ${escapeHTML(vital.time)}` : "Today";
    return `<div class="vital-row">
      <span class="vital-symbol" aria-hidden="true">${config.symbol}</span>
      <div class="vital-info">${config.label}<small>${time}</small></div>
      <span class="vital-value">${shown} ${config.unit}</span>
      <button class="delete-entry" data-delete="vitals" data-id="${escapeHTML(vital.id)}" aria-label="Delete ${config.label} entry"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 14h11l1-14M9 7V4h6v3"/></svg></button>
    </div>`;
  }).join("");
  list.innerHTML = rows || `<div class="vital-empty">A small check-in can help you notice how you’re feeling. Add weight, water, steps, sleep, or heart rate.</div>`;
}

function renderWorkouts(day) {
  const list = $("#workoutList");
  if (!day.workouts.length) {
    list.innerHTML = `<div class="empty-state"><span class="empty-icon">↗</span><strong>Movement looks different for everyone</strong><span>A walk, a stretch, a workout — it all counts.</span></div>`;
    return;
  }
  list.innerHTML = [...day.workouts].sort((a, b) => String(a.time).localeCompare(String(b.time))).map((item) => `<div class="workout-entry">
    <span class="workout-emoji" aria-hidden="true">${WORKOUT_EMOJIS[item.activity] || "✳"}</span>
    <div class="entry-copy"><div class="entry-name">${escapeHTML(item.activity)}</div><div class="workout-meta">${numberFormat(item.duration)} min${item.intensity ? ` · ${escapeHTML(item.intensity)} effort` : ""}${item.time ? ` · ${escapeHTML(item.time)}` : ""}${item.notes ? ` · ${escapeHTML(item.notes)}` : ""}</div></div>
    ${Number(item.caloriesBurned) ? `<span class="workout-energy">${numberFormat(item.caloriesBurned)} kcal</span>` : ""}
    <button class="delete-entry" data-delete="workouts" data-id="${escapeHTML(item.id)}" aria-label="Delete ${escapeHTML(item.activity)} entry"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 14h11l1-14M9 7V4h6v3"/></svg></button>
  </div>`).join("");
}

function setView(name) {
  activeView = name;
  $$(".view").forEach((view) => {
    const isActive = view.id === `view-${name}`;
    view.classList.toggle("is-visible", isActive);
    view.hidden = !isActive;
  });
  $$(".nav-item[data-nav]").forEach((button) => button.classList.toggle("is-active", button.dataset.nav === name));
  if (name === "today") renderToday();
  if (name === "history") renderHistory();
  if (name === "insights") renderInsights();
  if (name === "settings") renderSettings();
}

function shiftDate(amount) {
  selectedDate.setDate(selectedDate.getDate() + amount);
  renderToday();
  if (activeView === "insights") renderInsights();
}

function renderHistory() {
  const container = $("#historyList");
  const keys = Object.keys(state.days).filter((key) => {
    const day = dayData(key);
    return day.food.length + day.workouts.length + day.vitals.length > 0;
  }).sort((a, b) => b.localeCompare(a));
  if (!keys.length) {
    container.innerHTML = `<div class="history-empty">Your journal is ready when you are.<br />Entries you add will show up here.</div>`;
    return;
  }
  container.innerHTML = keys.map((key) => {
    const day = dayData(key);
    const date = new Date(`${key}T12:00:00`);
    const calories = day.food.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
    const minutes = day.workouts.reduce((sum, item) => sum + (Number(item.duration) || 0), 0);
    const chips = [];
    if (day.food.length) chips.push(`<span class="history-chip">◒ ${numberFormat(calories)} kcal eaten</span>`);
    if (day.workouts.length) chips.push(`<span class="history-chip">↗ ${numberFormat(minutes)} min movement</span>`);
    if (day.vitals.length) chips.push(`<span class="history-chip">♡ ${day.vitals.length} check-in${day.vitals.length === 1 ? "" : "s"}</span>`);
    return `<div class="history-day"><div class="history-date">${formatDate(date, { month: "short", day: "numeric" })}<span>${formatDate(date, { weekday: "long", year: "numeric" })}</span></div><div class="history-summary">${chips.join("")}</div><button class="history-open" data-open-day="${key}">View day →</button></div>`;
  }).join("");
}

function weekKeys(endDate) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(endDate);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
}

function renderInsights() {
  const days = weekKeys(selectedDate);
  const end = days[6];
  const start = days[0];
  $("#insightRangeLabel").textContent = `${formatDate(start, { month: "short", day: "numeric" })} – ${formatDate(end, { month: "short", day: "numeric" })}`;
  const records = days.map((date) => dayData(dateKey(date)));
  const totals = records.reduce((acc, day) => {
    acc.calories += day.food.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
    acc.protein += day.food.reduce((sum, item) => sum + (Number(item.protein) || 0), 0);
    acc.minutes += day.workouts.reduce((sum, item) => sum + (Number(item.duration) || 0), 0);
    acc.workouts += day.workouts.length;
    return acc;
  }, { calories: 0, protein: 0, minutes: 0, workouts: 0 });
  const weightReadings = days.flatMap((date) => dayData(dateKey(date)).vitals.filter((vital) => vital.kind === "weight").map((vital) => ({ date, value: Number(vital.value) }))).filter((reading) => Number.isFinite(reading.value));
  const weightCopy = weightReadings.length ? `${weightReadings[weightReadings.length - 1].value.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg latest` : "Log weight to see a trend";
  $("#insightCards").innerHTML = `
    <article class="insight-card"><span class="insight-card-label">Movement</span><strong class="insight-card-value">${numberFormat(totals.minutes)} <small>min</small></strong><span class="insight-card-sub">${totals.workouts} session${totals.workouts === 1 ? "" : "s"} this week</span></article>
    <article class="insight-card"><span class="insight-card-label">Food logged</span><strong class="insight-card-value">${numberFormat(totals.calories)} <small>kcal</small></strong><span class="insight-card-sub">${numberFormat(totals.protein)}g protein in all</span></article>
    <article class="insight-card"><span class="insight-card-label">Weight check-in</span><strong class="insight-card-value">${weightReadings.length ? weightReadings.length : "—"}</strong><span class="insight-card-sub">${weightCopy}</span></article>`;
  const maxMinutes = Math.max(1, ...records.map((day) => day.workouts.reduce((sum, item) => sum + (Number(item.duration) || 0), 0)));
  $("#weeklyChart").innerHTML = days.map((date, index) => {
    const day = records[index];
    const minutes = day.workouts.reduce((sum, item) => sum + (Number(item.duration) || 0), 0);
    const height = minutes ? Math.max(5, minutes / maxMinutes * 100) : 0;
    const isSelected = dateKey(date) === dateKey(selectedDate);
    return `<div class="chart-day ${isSelected ? "is-selected" : ""}"><span class="chart-bar-track"><span class="chart-bar" style="height:${height}%"></span></span><span>${formatDate(date, { weekday: "short" })}</span><span class="chart-date">${date.getDate()}</span></div>`;
  }).join("");
}

function renderSettings() {
  const form = $("#goalsForm");
  form.elements.calories.value = state.goals.calories;
  form.elements.protein.value = state.goals.protein;
  form.elements.water.value = state.goals.water;
}

function field(name, label, type = "text", options = {}) {
  const required = options.required !== false;
  const full = options.full ? " field-full" : "";
  const control = options.options
    ? `<select class="field-control" name="${name}" ${required ? "required" : ""}>${options.options.map((option) => {
      const value = typeof option === "string" ? option : option.value;
      const labelText = typeof option === "string" ? option : option.label;
      return `<option value="${escapeHTML(value)}">${escapeHTML(labelText)}</option>`;
    }).join("")}</select>`
    : type === "textarea"
      ? `<textarea class="field-control" name="${name}" ${required ? "required" : ""} maxlength="${options.maxlength || 120}" placeholder="${escapeHTML(options.placeholder || "")}"></textarea>`
      : `<input class="field-control" name="${name}" type="${type}" ${required ? "required" : ""}${options.min !== undefined ? ` min="${options.min}"` : ""}${options.max !== undefined ? ` max="${options.max}"` : ""}${options.step ? ` step="${options.step}"` : ""}${options.placeholder ? ` placeholder="${escapeHTML(options.placeholder)}"` : ""}${options.value !== undefined ? ` value="${escapeHTML(options.value)}"` : ""}>`;
  return `<label class="field-label${full}">${label}${options.hint ? ` <span class="field-hint">${options.hint}</span>` : ""}${control}</label>`;
}

function renderEntryFields(type) {
  activeEntryType = type;
  $$(".entry-tab").forEach((tab) => {
    const isActive = tab.dataset.entryTab === type;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  const time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  let html = "";
  if (type === "food") {
    html = field("name", "What did you have?", "text", { full: true, placeholder: "e.g. Avocado toast" })
      + field("meal", "Meal", "select", { options: MEALS })
      + field("time", "Time", "time", { value: time })
      + field("calories", "Calories", "number", { min: 0, max: 20000, step: 1, placeholder: "e.g. 350" })
      + field("protein", "Protein", "number", { min: 0, max: 1000, step: 1, placeholder: "e.g. 20", required: false })
      + field("carbs", "Carbs", "number", { min: 0, max: 1000, step: 1, placeholder: "Optional", required: false })
      + field("fat", "Fat", "number", { min: 0, max: 1000, step: 1, placeholder: "Optional", required: false });
  } else if (type === "workout") {
    html = field("activity", "What did you do?", "select", { options: Object.keys(WORKOUT_EMOJIS) })
      + field("duration", "Duration", "number", { min: 1, max: 1440, step: 1, placeholder: "Minutes" })
      + field("time", "Time", "time", { value: time })
      + field("intensity", "Effort", "select", { options: ["Gentle", "Moderate", "Vigorous"] })
      + field("caloriesBurned", "Calories burned", "number", { min: 0, max: 20000, step: 1, placeholder: "Optional", required: false })
      + field("notes", "A note to yourself", "textarea", { full: true, required: false, placeholder: "How did it feel?" });
  } else {
    html = field("kind", "What would you like to track?", "select", {
      options: Object.entries(VITALS).map(([kind, config]) => ({ value: kind, label: `${config.label} (${config.unit})` }))
    });
    html += field("value", "Reading", "number", { min: 0, max: 200000, step: 0.1, placeholder: "Enter a value" })
      + field("time", "Time", "time", { value: time })
      + field("note", "A note to yourself", "text", { full: true, required: false, placeholder: "Optional" });
  }
  $("#entryFields").innerHTML = html;
  if (type === "vitals") {
    const updateVitalInput = () => {
      const kind = $("#entryFields select[name=kind]").value;
      const config = VITALS[kind];
      const input = $("#entryFields input[name=value]");
      input.min = config.min;
      input.max = config.max;
      input.step = config.step;
      input.placeholder = `e.g. ${config.example}`;
      input.closest(".field-label").firstChild.textContent = `Reading (${config.unit})`;
    };
    $("#entryFields select[name=kind]").addEventListener("change", updateVitalInput);
    updateVitalInput();
  }
  $("#entryError").textContent = "";
}

function openEntry(type = "food") {
  renderEntryFields(type);
  $("#entryDialog").showModal();
  const first = $("#entryFields input, #entryFields select");
  if (first) first.focus();
}

function saveEntry(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form).entries());
  const now = new Date();
  const base = { id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`, time: values.time || "" };
  let entry;
  let category;
  if (activeEntryType === "food") {
    entry = {
      ...base, name: values.name.trim(), meal: values.meal,
      calories: Number(values.calories), protein: Number(values.protein) || 0,
      carbs: Number(values.carbs) || 0, fat: Number(values.fat) || 0
    };
    category = "food";
  } else if (activeEntryType === "workout") {
    entry = {
      ...base, activity: values.activity, duration: Number(values.duration),
      intensity: values.intensity, caloriesBurned: Number(values.caloriesBurned) || 0,
      notes: values.notes.trim()
    };
    category = "workouts";
  } else {
    const kind = values.kind;
    if (!VITALS[kind]) {
      $("#entryError").textContent = "Choose a valid measurement and try again.";
      return;
    }
    entry = { ...base, kind, value: Number(values.value), note: values.note.trim() };
    category = "vitals";
  }
  const day = ensureDay();
  day[category].push(entry);
  if (!saveState()) {
    day[category].pop();
    return;
  }
  $("#entryDialog").close();
  form.reset();
  renderToday();
  if (activeView === "history") renderHistory();
  if (activeView === "insights") renderInsights();
}

function deleteEntry(category, id) {
  const day = ensureDay();
  const removed = day[category].find((item) => item.id === id);
  day[category] = day[category].filter((item) => item.id !== id);
  if (!saveState()) {
    if (removed) day[category].push(removed);
    return;
  }
  renderToday();
  if (activeView === "history") renderHistory();
  if (activeView === "insights") renderInsights();
}

function exportData() {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...state }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `daywell-journal-${dateKey(new Date())}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$$("[data-nav]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.nav)));
$$("[data-open-entry]").forEach((button) => button.addEventListener("click", () => openEntry(button.dataset.entryType || "food")));
$$("[data-close-entry]").forEach((button) => button.addEventListener("click", () => $("#entryDialog").close()));
$$("[data-entry-tab]").forEach((button) => button.addEventListener("click", () => renderEntryFields(button.dataset.entryTab)));
$$("[data-date-step]").forEach((button) => button.addEventListener("click", () => shiftDate(Number(button.dataset.dateStep))));
$("#selectedDateButton").addEventListener("click", () => $("#dateInput").showPicker?.());
$("#dateInput").addEventListener("change", (event) => {
  if (!event.target.value) return;
  selectedDate = new Date(`${event.target.value}T12:00:00`);
  selectedDate.setHours(0, 0, 0, 0);
  renderToday();
  if (activeView === "insights") renderInsights();
});
$("#entryForm").addEventListener("submit", saveEntry);
$("#entryDialog").addEventListener("click", (event) => {
  if (event.target === $("#entryDialog")) $("#entryDialog").close();
});
document.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete]");
  if (deleteButton) {
    deleteEntry(deleteButton.dataset.delete, deleteButton.dataset.id);
    return;
  }
  const dayButton = event.target.closest("[data-open-day]");
  if (dayButton) {
    selectedDate = new Date(`${dayButton.dataset.openDay}T12:00:00`);
    selectedDate.setHours(0, 0, 0, 0);
    setView("today");
  }
});
$("#goalsForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const previousGoals = state.goals;
  state.goals = {
    calories: Number(form.elements.calories.value),
    protein: Number(form.elements.protein.value),
    water: Number(form.elements.water.value)
  };
  if (!saveState()) {
    state.goals = previousGoals;
    return;
  }
  $("#goalsFeedback").textContent = "Your guideposts are saved.";
  renderToday();
});
$("#exportButton").addEventListener("click", exportData);
$("#clearButton").addEventListener("click", () => {
  if (!window.confirm("Clear all journal entries from this device? Your daily goals will stay saved.")) return;
  const previousDays = state.days;
  state.days = {};
  if (!saveState()) {
    state.days = previousDays;
    return;
  }
  renderToday();
  $("#goalsFeedback").textContent = "";
});

renderToday();
