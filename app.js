const STORAGE_KEY = "daywell-journal-v1";
const THEME_STORAGE_KEY = "daywell-theme";
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
const WEEKLY_MEALS = {
  0: {
    type: "Rest day", calories: 1300, preWorkout: "",
    meals: [
      ["Breakfast", "8:15 AM", "Veg poha with peanuts (1 cup) + 1 glass buttermilk"],
      ["Mid-morning", "11 AM", "1 orange"],
      ["Lunch", "1 PM", "1 cup sambar + 3/4 cup white rice + 2 veg sides + salad"],
      ["Evening", "4:30 PM", "Hummus (2 tbsp) + cucumber/carrot sticks"],
      ["Dinner", "7:30 PM", "80 g grilled paneer tikka + large salad + 1 roti"]
    ]
  },
  1: {
    type: "Rest day", calories: 1300, preWorkout: "",
    meals: [
      ["Breakfast", "8:15 AM", "2 moong dal chillas + mint chutney + 1/2 cup low-fat curd"],
      ["Mid-morning", "11 AM", "1 apple"],
      ["Lunch", "1 PM", "1 cup toor dal + 2 small rotis + beans poriyal + cucumber salad"],
      ["Evening", "4:30 PM", "30 g roasted chana + green tea"],
      ["Dinner", "7:30 PM", "40 g (dry) soya chunks curry + 1 roti + salad"]
    ]
  },
  2: {
    type: "Gym day", calories: 1300, preWorkout: "1/2 banana + black coffee",
    meals: [
      ["Breakfast", "8:15 AM", "Veg oats upma (3/4 cup) + 1 glass skim milk"],
      ["Mid-morning", "11 AM", "1 glass buttermilk"],
      ["Lunch", "1 PM", "3/4 cup white rice + 1 cup sambar + cabbage stir-fry + salad"],
      ["Evening", "4:30 PM", "Sprouts chaat (1/2 cup moong sprouts)"],
      ["Dinner", "7:30 PM", "80 g paneer bhurji + 1 roti + salad"]
    ]
  },
  3: {
    type: "Gym day", calories: 1280, preWorkout: "1/2 banana + green tea",
    meals: [
      ["Breakfast", "8:15 AM", "3 idlis + 1 cup sambar"],
      ["Mid-morning", "11 AM", "1 glass buttermilk"],
      ["Lunch", "1 PM", "1 cup masoor dal + 2 rotis + palak sabzi + salad"],
      ["Evening", "4:30 PM", "1 cup unsweetened soy milk + 5 almonds"],
      ["Dinner", "7:30 PM", "Soya keema (40 g dry) + 1 cup veg soup"]
    ]
  },
  4: {
    type: "Gym day", calories: 1300, preWorkout: "1/2 banana + black coffee",
    meals: [
      ["Breakfast", "8:15 AM", "2 besan chillas with veggies + 1 cup curd"],
      ["Mid-morning", "11 AM", "1 small guava"],
      ["Lunch", "1 PM", "1 cup chana dal + 3/4 cup white rice + bhindi sabzi + salad"],
      ["Evening", "4:30 PM", "1 cup roasted makhana + green tea"],
      ["Dinner", "7:30 PM", "2 small soya/paneer-stuffed rotis + raita"]
    ]
  },
  5: {
    type: "Rest day", calories: 1290, preWorkout: "",
    meals: [
      ["Breakfast", "8:15 AM", "2 multigrain toasts + 60 g paneer + tomato/cucumber"],
      ["Mid-morning", "11 AM", "1 cup papaya"],
      ["Lunch", "1 PM", "1 cup rajma (or horse gram) + 2 rotis + mixed veg + salad"],
      ["Evening", "4:30 PM", "30 g roasted chana + buttermilk"],
      ["Dinner", "7:30 PM", "1.5 cups moong dal soup + sauteed veggies with 40 g tofu"]
    ]
  },
  6: {
    type: "Gym day", calories: 1300, preWorkout: "1/2 banana + green tea",
    meals: [
      ["Breakfast", "8:15 AM", "2 ragi dosas + chutney + 1 glass skim milk"],
      ["Mid-morning", "11 AM", "1 glass buttermilk"],
      ["Lunch", "1 PM", "1 cup mixed dal + 3/4 cup foxtail millet/jowar + stir-fried veggies + salad"],
      ["Evening", "4:30 PM", "Sprouts salad or small boiled sweet potato"],
      ["Dinner", "7:30 PM", "Soya chunk pulao (40 g dry soya, 1/2 cup rice, lots of veggies) + raita"]
    ]
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
    if (!saved) return { goals: { ...DEFAULT_GOALS }, days: {}, planChecks: {} };
    const parsed = JSON.parse(saved);
    return {
      goals: { ...DEFAULT_GOALS, ...(parsed.goals || {}) },
      days: parsed.days && typeof parsed.days === "object" ? parsed.days : {},
      planChecks: parsed.planChecks && typeof parsed.planChecks === "object" ? parsed.planChecks : {}
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

function setTheme(theme, persist = false) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  const toggle = $("#themeToggle");
  if (toggle) {
    toggle.setAttribute("aria-checked", String(isDark));
    toggle.setAttribute("aria-label", isDark ? "Disable dark mode" : "Enable dark mode");
    $("#themeToggleLabel").textContent = isDark ? "On" : "Off";
  }
  const themeColor = $('meta[name="theme-color"]');
  if (themeColor) themeColor.content = isDark ? "#21191a" : "#fff7f6";
  if (!persist) return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
  } catch (error) {
    console.error("Could not save the Daywell theme preference.", error);
    showStorageError("Your theme changed, but this browser couldn’t save that preference.");
  }
}

function loadTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch (error) {
    console.error("Could not read the Daywell theme preference.", error);
    return "light";
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
  renderPlannedNutrition(selectedDate);
  renderFood(day);
  renderVitals(day);
  renderWorkouts(day);
}

function plannedTasks(date, category) {
  const day = date.getDay();
  if (category === "movement") {
    const plan = WEEKLY_WORKOUTS[day];
    if (plan.rest) return [{ id: "recovery", label: plan.rest }];
    return [
      { id: "warmup", label: "8 min warm-up" },
      ...plan.exercises.map(([exercise], index) => ({ id: `exercise-${index}`, label: exercise })),
      { id: "finisher", label: "Cardio finisher" },
      { id: "cooldown", label: "5 min cool-down" }
    ];
  }
  const plan = WEEKLY_MEALS[day];
  return [
    ...(plan.preWorkout ? [{ id: "pre-workout", label: "Pre-workout" }] : []),
    ...plan.meals.map(([name]) => ({
      id: `meal-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      label: name
    }))
  ];
}

function isPlanComplete(key, category, id) {
  return state.planChecks?.[key]?.[category]?.[id] === true;
}

function planCheckbox(key, category, id, label) {
  const checked = isPlanComplete(key, category, id);
  return `<input class="plan-checkbox" type="checkbox" data-plan-check data-date="${escapeHTML(key)}" data-category="${category}" data-item="${id}" aria-label="${escapeHTML(label)}"${checked ? " checked" : ""}>`;
}

function renderPlanCompletionSummary(date, category) {
  const tasks = plannedTasks(date, category);
  const completed = tasks.filter((task) => isPlanComplete(dateKey(date), category, task.id)).length;
  const container = $(`#${category === "movement" ? "movement" : "nutrition"}CompletionSummary`);
  container.textContent = `${completed} of ${tasks.length} items completed`;
}

function renderPlannedWorkout(date) {
  const plan = WEEKLY_WORKOUTS[date.getDay()];
  const key = dateKey(date);
  const weekday = formatDate(date, { weekday: "long" });
  $("#plannedWorkoutSubtitle").textContent = `${weekday} · ${plan.focus}`;
  if (plan.rest) {
    $("#plannedWorkoutBadge").textContent = "RECOVERY DAY";
    $("#plannedWorkoutContent").innerHTML = `<div class="rest-day-copy">${planCheckbox(key, "movement", "recovery", "Mark today’s recovery activity complete")}<span class="rest-day-sparkle" aria-hidden="true">✳</span><p>${escapeHTML(plan.rest)}</p></div>`;
    renderPlanCompletionSummary(date, "movement");
    return;
  }
  $("#plannedWorkoutBadge").textContent = "60 MIN · GYM DAY";
  $("#plannedWorkoutContent").innerHTML = `
    <div class="plan-session-note"><strong>Session flow</strong><label class="plan-flow-item">${planCheckbox(key, "movement", "warmup", "Mark warm-up complete")}<span>8 min warm-up</span></label><span>35–38 min strength</span><label class="plan-flow-item">${planCheckbox(key, "movement", "cooldown", "Mark cool-down complete")}<span>5 min cool-down</span></label></div>
    <div class="plan-table-wrap"><table class="plan-table">
      <thead><tr><th scope="col">Done</th><th scope="col">Exercise</th><th scope="col">Sets</th><th scope="col">Reps</th><th scope="col">Rest</th><th scope="col">Form notes</th></tr></thead>
      <tbody>${plan.exercises.map(([exercise, sets, reps, rest, notes], index) => {
        const id = `exercise-${index}`;
        const checked = isPlanComplete(key, "movement", id);
        return `<tr class="${checked ? "is-complete" : ""}"><td>${planCheckbox(key, "movement", id, `Mark ${exercise} complete`)}</td><th scope="row">${escapeHTML(exercise)}</th><td>${escapeHTML(sets)}</td><td>${escapeHTML(reps)}</td><td>${escapeHTML(rest)}</td><td>${notes ? escapeHTML(notes) : "—"}</td></tr>`;
      }).join("")}</tbody>
    </table></div>
    <div class="plan-finisher">${planCheckbox(key, "movement", "finisher", "Mark cardio finisher complete")}<span class="finisher-icon" aria-hidden="true">↗</span><div><strong>Cardio finisher</strong><span>${escapeHTML(plan.finisher)}</span></div></div>`;
  renderPlanCompletionSummary(date, "movement");
}

function renderPlannedNutrition(date) {
  const plan = WEEKLY_MEALS[date.getDay()];
  const key = dateKey(date);
  const weekday = formatDate(date, { weekday: "long" });
  $("#plannedNutritionSubtitle").textContent = `${weekday} · ${plan.type} menu`;
  $("#plannedNutritionBadge").textContent = `ABOUT ${numberFormat(plan.calories)} KCAL`;
  const meals = [
    ...(plan.preWorkout ? [["Pre-workout", "6:15 AM", plan.preWorkout]] : []),
    ...plan.meals
  ];
  $("#plannedNutritionContent").innerHTML = `
    <div class="nutrition-menu-grid">
      ${meals.map(([name, time, description]) => {
        const id = name === "Pre-workout" ? "pre-workout" : `meal-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        const checked = isPlanComplete(key, "nutrition", id);
        return `<article class="nutrition-meal ${checked ? "is-complete" : ""}">
        <div class="nutrition-meal-heading">${planCheckbox(key, "nutrition", id, `Mark ${name} complete`)}<h3>${escapeHTML(name)}</h3><span>${escapeHTML(time)}</span></div>
        <p>${escapeHTML(description)}</p>
      </article>`;
      }).join("")}
    </div>
    <div class="nutrition-guidance">
      <strong>Daily guide from your plan</strong>
      <div class="nutrition-guidance-chips">
        <span>Protein 80–90 g</span><span>Carbs 130–150 g</span><span>Fat 35–40 g</span><span>Fibre 25+ g</span><span>Water 3–3.5 L</span>
      </div>
    </div>
    <p class="nutrition-disclaimer">Calorie and portion values are estimates, not a medical prescription. Individual needs vary; consider reviewing the plan with a doctor or dietitian.</p>`;
  renderPlanCompletionSummary(date, "nutrition");
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

function fourWeekKeys(endDate) {
  return Array.from({ length: 28 }, (_, index) => {
    const date = new Date(endDate);
    date.setDate(date.getDate() - (27 - index));
    return date;
  });
}

function renderWeightTrend() {
  const dates = fourWeekKeys(selectedDate);
  const start = dates[0];
  const end = dates[dates.length - 1];
  $("#weightTrendRange").textContent = `${formatDate(start, { month: "short", day: "numeric" })} – ${formatDate(end, { month: "short", day: "numeric" })}`;

  const readings = dates.map((date, index) => {
    const vital = latestByKind(dayData(dateKey(date)).vitals, "weight");
    const value = Number(vital?.value);
    return Number.isFinite(value) && value > 0 ? { index, date, value } : null;
  }).filter(Boolean);

  const chart = $("#weightTrendChart");
  if (!readings.length) {
    $("#weightTrendSummary").textContent = "";
    chart.innerHTML = `<div class="weight-trend-empty"><span aria-hidden="true">⚖</span><strong>No weight entries in this period</strong><p>Log a weight check-in to start seeing your trend.</p></div>`;
    return;
  }

  const earliest = readings[0];
  const latest = readings[readings.length - 1];
  if (readings.length > 1) {
    const change = latest.value - earliest.value;
    const sign = change > 0 ? "+" : "";
    $("#weightTrendSummary").textContent = `${sign}${change.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`;
  } else {
    $("#weightTrendSummary").textContent = "1 check-in";
  }

  const width = 720;
  const height = 280;
  const left = 58;
  const right = 18;
  const top = 22;
  const bottom = 38;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const minValue = Math.min(...readings.map((reading) => reading.value));
  const maxValue = Math.max(...readings.map((reading) => reading.value));
  const padding = Math.max((maxValue - minValue) * 0.2, 1);
  const lower = minValue - padding;
  const upper = maxValue + padding;
  const x = (index) => left + index / 27 * plotWidth;
  const y = (value) => top + (upper - value) / (upper - lower) * plotHeight;
  const yTicks = [0, 1, 2].map((index) => upper - (upper - lower) * index / 2);
  const xTicks = [0, 7, 14, 21, 27];
  const points = readings.map((reading) => `${x(reading.index)},${y(reading.value)}`).join(" ");
  const formatWeight = (value) => value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  const grid = yTicks.map((value) => `
    <g class="weight-grid-line">
      <line x1="${left}" y1="${y(value)}" x2="${width - right}" y2="${y(value)}"></line>
      <text x="${left - 10}" y="${y(value) + 4}" text-anchor="end">${formatWeight(value)}</text>
    </g>`).join("");
  const datesAxis = xTicks.map((index) => {
    const date = dates[index];
    return `<text class="weight-axis-date" x="${x(index)}" y="${height - 10}" text-anchor="middle">${formatDate(date, { month: "short", day: "numeric" })}</text>`;
  }).join("");
  const markers = readings.map((reading) => `
    <circle class="weight-point" cx="${x(reading.index)}" cy="${y(reading.value)}" r="5">
      <title>${escapeHTML(formatDate(reading.date, { month: "long", day: "numeric", year: "numeric" }))}: ${formatWeight(reading.value)} kg</title>
    </circle>`).join("");

  chart.innerHTML = `
    <div class="weight-chart-scroll">
      <svg class="weight-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Weight trend for the 28 days ending ${escapeHTML(formatDate(end, { month: "long", day: "numeric", year: "numeric" }))}. ${readings.length} weight check-ins.">
        ${grid}
        ${readings.length > 1 ? `<polyline class="weight-trend-line" points="${points}"></polyline>` : ""}
        ${markers}
        ${datesAxis}
      </svg>
    </div>
    <p class="weight-chart-caption">${readings.length} check-in${readings.length === 1 ? "" : "s"} · ${escapeHTML(formatDate(earliest.date, { month: "short", day: "numeric" }))}: ${formatWeight(earliest.value)} kg${readings.length > 1 ? ` · ${escapeHTML(formatDate(latest.date, { month: "short", day: "numeric" }))}: ${formatWeight(latest.value)} kg` : ""}</p>`;
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
  renderWeightTrend();
  renderPlanCompletionChart();
}

function renderPlanCompletionChart() {
  const dates = fourWeekKeys(selectedDate);
  const start = dates[0];
  const end = dates[dates.length - 1];
  $("#planCompletionRange").textContent = `${formatDate(start, { month: "short", day: "numeric" })} – ${formatDate(end, { month: "short", day: "numeric" })}`;

  const progress = dates.map((date, index) => {
    const key = dateKey(date);
    const tasks = [
      ...plannedTasks(date, "movement").map((task) => ({ ...task, category: "movement" })),
      ...plannedTasks(date, "nutrition").map((task) => ({ ...task, category: "nutrition" }))
    ];
    const completed = tasks.filter((task) => isPlanComplete(key, task.category, task.id)).length;
    return { date, index, tasks: tasks.length, completed };
  });
  const totalTasks = progress.reduce((sum, day) => sum + day.tasks, 0);
  const completedTasks = progress.reduce((sum, day) => sum + day.completed, 0);
  const trackedDays = progress.filter((day) => day.completed > 0).length;
  const summary = $("#planCompletionSummary");
  const chart = $("#planCompletionChart");

  if (!completedTasks) {
    summary.textContent = "";
    chart.innerHTML = `<div class="weight-trend-empty"><span aria-hidden="true">✓</span><strong>No planned items checked off yet</strong><p>Tick completed meals or movement on the home page to see your progress here.</p></div>`;
    return;
  }

  const percent = Math.round(completedTasks / totalTasks * 100);
  summary.textContent = `${completedTasks} / ${totalTasks} · ${percent}%`;
  chart.innerHTML = `<div class="plan-completion-bars" role="list" aria-label="Daily planned-item completion for the last four weeks">
    ${progress.map(({ date, index, tasks, completed }) => {
      const height = tasks ? completed / tasks * 100 : 0;
      const label = `${formatDate(date, { weekday: "long", month: "long", day: "numeric" })}: ${completed} of ${tasks} planned items completed`;
      return `<div class="completion-day ${completed ? "has-completion" : ""}" role="listitem" title="${escapeHTML(label)}" aria-label="${escapeHTML(label)}">
        <div class="completion-track"><span class="completion-bar" style="height:${height}%"></span></div>
        <span class="completion-date">${index % 7 === 0 || index === 27 ? formatDate(date, { month: "short", day: "numeric" }) : formatDate(date, { weekday: "narrow" })}</span>
      </div>`;
    }).join("")}
  </div><p class="completion-caption">${completedTasks} of ${totalTasks} planned items completed across ${trackedDays} day${trackedDays === 1 ? "" : "s"} with check-ins.</p>`;
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
document.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-plan-check]");
  if (!checkbox) return;
  const { date, category, item } = checkbox.dataset;
  if (!date || (category !== "movement" && category !== "nutrition") || !item) return;

  if (!state.planChecks || typeof state.planChecks !== "object") state.planChecks = {};
  const dayChecks = state.planChecks[date] || {};
  const categoryChecks = dayChecks[category] || {};
  const previous = categoryChecks[item] === true;
  state.planChecks[date] = dayChecks;
  dayChecks[category] = categoryChecks;
  categoryChecks[item] = checkbox.checked;
  if (!saveState()) {
    categoryChecks[item] = previous;
    checkbox.checked = previous;
    return;
  }

  const selectedKey = dateKey(selectedDate);
  if (date === selectedKey) {
    if (category === "movement") renderPlannedWorkout(selectedDate);
    if (category === "nutrition") renderPlannedNutrition(selectedDate);
  }
  if (activeView === "insights") renderPlanCompletionChart();
});
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
$("#themeToggle").addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(nextTheme, true);
});
$("#clearButton").addEventListener("click", () => {
  if (!window.confirm("Clear all journal entries and planned-item check-ins from this device? Your daily goals will stay saved.")) return;
  const previousDays = state.days;
  const previousPlanChecks = state.planChecks;
  state.days = {};
  state.planChecks = {};
  if (!saveState()) {
    state.days = previousDays;
    state.planChecks = previousPlanChecks;
    return;
  }
  renderToday();
  if (activeView === "history") renderHistory();
  if (activeView === "insights") renderInsights();
  $("#goalsFeedback").textContent = "";
});

setTheme(loadTheme());
renderToday();
