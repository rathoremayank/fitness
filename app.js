const STORAGE_KEY = "daywell-journal-v1";
const THEME_STORAGE_KEY = "daywell-theme";
const DEFAULT_GOALS = { calories: 1714, protein: 142, water: 3500 };
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
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field.trim());
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function findCSVRow(rows, label, start = 0) {
  return rows.findIndex((row, index) => index >= start && row[0] === label);
}

function sectionRows(rows, startLabel, nextLabel) {
  const start = findCSVRow(rows, startLabel);
  if (start < 0) throw new Error(`Missing section "${startLabel}" in program CSV data.`);
  const end = nextLabel
    ? rows.findIndex((row, index) => index > start && row[0].startsWith(nextLabel))
    : rows.length;
  if (nextLabel && end < 0) throw new Error(`Missing section "${nextLabel}" in program CSV data.`);
  return rows.slice(start + 1, end).filter((row) => row.some(Boolean));
}

function parseProgramData(csv) {
  const bodyRows = parseCSV(csv.body);
  const dietRows = parseCSV(csv.diet);
  const workoutRows = parseCSV(csv.workout);
  const loadRows = parseCSV(csv.load);
  const weeklyRows = parseCSV(csv.weekly);

  const startNote = weeklyRows.find((row) => row[0].includes("Week 1 -> Date"))?.[0] || "";
  const startMatch = startNote.match(/Date\s+(\d{1,2})-([A-Za-z]{3})-(\d{2})/);
  const startDate = startMatch
    ? new Date(Number(`20${startMatch[3]}`), new Date(`${startMatch[2]} 1, 2000`).getMonth(), Number(startMatch[1]))
    : new Date(2026, 10, 17);
  if (Number.isNaN(startDate.getTime())) throw new Error("The program start date in the weekly log is invalid.");

  const workoutStages = [];
  workoutRows.forEach((row, index) => {
    const match = row[0].match(/^Stage (\d): (.+)$/);
    if (!match) return;
    const dayHeaderIndex = findCSVRow(workoutRows, "Day", index + 1);
    if (dayHeaderIndex < 0) throw new Error(`Stage ${match[1]} is missing its workout day header.`);
    const nextSectionIndex = workoutRows.findIndex((candidate, candidateIndex) =>
      candidateIndex > index && (/^Stage \d: /.test(candidate[0]) || candidate[0] === "Rules")
    );
    const sessions = workoutRows.slice(dayHeaderIndex + 1, nextSectionIndex < 0 ? undefined : nextSectionIndex).filter((session) =>
      ["Mon", "Tue", "Sat", "Sun"].includes(session[0]) || session[0] === "Wed-Fri"
    );
    workoutStages.push({
      number: Number(match[1]),
      title: match[2].split(". ")[0],
      guidance: match[2].slice(match[2].split(". ")[0].length).replace(/^\.\s*/, ""),
      sessions: Object.fromEntries(sessions.map(([day, focus]) => [day, focus]))
    });
  });

  const targetsHeader = findCSVRow(dietRows, "Day");
  const mealHeader = findCSVRow(dietRows, "Time");
  const adjustmentHeader = findCSVRow(dietRows, "Day type");
  const supplementHeader = findCSVRow(dietRows, "Item");
  const adjustmentRulesHeader = findCSVRow(dietRows, "Weekly avg weight change");
  if ([targetsHeader, mealHeader, adjustmentHeader, supplementHeader, adjustmentRulesHeader].some((index) => index < 0)) {
    throw new Error("The diet plan CSV is missing a required section.");
  }
  const weeklyAverageRow = dietRows.find((row) => row[0] === "Weekly average") || [];
  const targets = dietRows.slice(targetsHeader + 1, mealHeader).filter((row) => /^[A-Z][a-z]{2}$/.test(row[0]));
  const menuEnd = findCSVRow(dietRows, "Total", mealHeader);
  const mealMenu = menuEnd < 0 ? [] : dietRows.slice(mealHeader + 1, menuEnd).filter((row) => row[0] && row[0] !== "Time");
  const adjustments = dietRows.slice(adjustmentHeader + 1, supplementHeader).filter((row) => row[0] && row[0] !== "Day type");
  const supplements = dietRows.slice(supplementHeader + 1, adjustmentRulesHeader).filter((row) => row[0] && row[0] !== "Item");
  const adjustmentRules = dietRows.slice(adjustmentRulesHeader + 1).filter((row) => row[0] && row[0] !== "Weekly avg weight change");

  const trackerHeader = findCSVRow(loadRows, "Day");
  const tracker = loadRows.slice(trackerHeader + 1)
    .filter((row) => row[0] && row[1])
    .map((row, index) => ({
      id: String(index),
      day: row[0],
      exercise: row[1],
      targets: row.slice(2, 8),
      actuals: row.slice(8, 14)
    }));

  const weeklyHeader = findCSVRow(weeklyRows, "Week");
  const baselineRow = weeklyRows.find((row) => row[0] === "Start") || [];
  return {
    startDate,
    body: {
      inputs: sectionRows(bodyRows, "Inputs (measured Nov 2026)", "Derived metrics").slice(1),
      derived: sectionRows(bodyRows, "Derived metrics", "Maintenance calories").slice(1),
      maintenance: sectionRows(bodyRows, "Maintenance calories", "Areas to improve (priority order)"),
      priorities: sectionRows(bodyRows, "Areas to improve (priority order)", null).filter((row) => row[0] && /^\d/.test(row[0]))
    },
    diet: {
      targets,
      weeklyAverage: weeklyAverageRow,
      proteinPerKg: dietRows.find((row) => row[0] === "Protein g/kg")?.[3] || "",
      fatPerKg: dietRows.find((row) => row[0] === "Fat g/kg")?.[3] || "",
      weeklyDeficit: dietRows.find((row) => row[0] === "Weekly deficit vs maintenance (kcal)")?.[2] || "",
      meals: mealMenu,
      adjustments,
      supplements,
      adjustmentRules
    },
    workouts: {
      structure: sectionRows(workoutRows, "Weekly structure", "Stage 1: Days 1-60 (foundation, technique, habit)").slice(1),
      stages: workoutStages,
      rules: sectionRows(workoutRows, "Rules", null).slice(1)
    },
    tracker,
    weeklyLog: {
      weeks: weeklyRows.slice(weeklyHeader + 1).filter((row) => /^\d+$/.test(row[0])).map((row) => Number(row[0])),
      startWeight: baselineRow[2],
      startWaist: baselineRow[3]
    }
  };
}

const PROGRAM = parseProgramData(window.PROGRAM_CSV);

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
    if (!saved) return { goals: { ...DEFAULT_GOALS }, days: {}, planChecks: {}, loadActuals: {}, weeklyLogs: {} };
    const parsed = JSON.parse(saved);
    return {
      goals: { ...DEFAULT_GOALS, ...(parsed.goals || {}) },
      days: parsed.days && typeof parsed.days === "object" ? parsed.days : {},
      planChecks: parsed.planChecks && typeof parsed.planChecks === "object" ? parsed.planChecks : {},
      loadActuals: parsed.loadActuals && typeof parsed.loadActuals === "object" ? parsed.loadActuals : {},
      weeklyLogs: parsed.weeklyLogs && typeof parsed.weeklyLogs === "object" ? parsed.weeklyLogs : {}
    };
  } catch (error) {
    console.error("Could not read the Rewire journal.", error);
    showStorageError("Your saved journal could not be read. Check your browser storage settings before making changes.");
    return { goals: { ...DEFAULT_GOALS }, days: {}, planChecks: {}, loadActuals: {}, weeklyLogs: {} };
  }
}

let state = loadState();
let selectedDate = new Date();
selectedDate.setHours(0, 0, 0, 0);
let activeView = "today";
let activeEntryType = "food";
let activeProgramTab = "overview";
let activeLoadMonth = 0;
let activeWorkoutStage = 0;

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    $("#storageNotice").hidden = true;
    return true;
  } catch (error) {
    console.error("Could not save the Rewire journal.", error);
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
  if (themeColor) themeColor.content = isDark ? "#050505" : "#fbf5f3";
  if (!persist) return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
  } catch (error) {
    console.error("Could not save the Rewire theme preference.", error);
    showStorageError("Your theme changed, but this browser couldn’t save that preference.");
  }
}

function loadTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch (error) {
    console.error("Could not read the Rewire theme preference.", error);
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
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day];
  if (category === "movement") {
    const plan = workoutSession(date);
    if (!plan) return [{ id: "recovery", label: "Rest-day steps" }];
    return [
      ...plan.exercises.map((exercise, index) => ({ id: `exercise-${index}`, label: exercise })),
      { id: "session-log", label: `${weekday} workout` }
    ];
  }
  const target = dietTarget(date);
  if (!target || target[1] !== "Training, non-veg") return [{ id: "daily-guidance", label: "Daily nutrition guidance" }];
  return PROGRAM.diet.meals.map((meal, index) => ({ id: `meal-${index}`, label: meal[1] }));
}

function workoutSession(date) {
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
  if (["Wed", "Thu", "Fri"].includes(day)) return null;
  const stage = PROGRAM.workouts.stages[getProgramStageIndex(date)];
  const exercises = stage?.sessions[day];
  if (!exercises) return null;
  const focus = PROGRAM.workouts.structure.find((row) => row[0] === day)?.[1] || day;
  return { day, focus, exercises: exercises.split(";").map((exercise) => exercise.trim()).filter(Boolean) };
}

function getProgramStageIndex(date) {
  const start = PROGRAM.startDate;
  const elapsedDays = Math.max(0, Math.floor((
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  ) / 86400000));
  return Math.min(2, Math.floor(elapsedDays / 60));
}

function dietTarget(date) {
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
  return PROGRAM.diet.targets.find((target) => target[0] === day);
}

function nutritionAdjustment(target) {
  if (target[1] === "Rest, non-veg") return PROGRAM.diet.adjustments[0];
  if (target[1] === "Training, veg") return PROGRAM.diet.adjustments[1];
  if (target[1] === "Rest, veg") return PROGRAM.diet.adjustments[2];
  return null;
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
  const key = dateKey(date);
  const session = workoutSession(date);
  const stage = PROGRAM.workouts.stages[getProgramStageIndex(date)];
  $("#plannedWorkoutSubtitle").textContent = session
    ? `${formatDate(date, { weekday: "long" })} · ${session.focus}`
    : `${formatDate(date, { weekday: "long" })} · Rest and recovery`;
  if (!session) {
    $("#plannedWorkoutBadge").textContent = "RECOVERY";
    $("#plannedWorkoutContent").innerHTML = `<div class="rest-day-copy">${planCheckbox(key, "movement", "recovery", "Mark today’s recovery activity complete")}<span class="rest-day-sparkle" aria-hidden="true">✳</span><p>Rest day · target 8–10k steps. Your next workout starts with ${escapeHTML(stage?.title || "the current stage")}.</p></div>`;
    renderPlanCompletionSummary(date, "movement");
    return;
  }
  $("#plannedWorkoutBadge").textContent = `STAGE ${stage.number}`;
  $("#plannedWorkoutContent").innerHTML = `
    <div class="plan-session-note"><strong>Stage ${stage.number} · ${escapeHTML(stage.title)}</strong><span>60–75 min · 6–8 am slot · follow the progression in Program</span></div>
    <div class="program-exercise-list">${session.exercises.map((exercise, index) => `
      <label class="program-exercise">${planCheckbox(key, "movement", `exercise-${index}`, `Mark ${exercise} complete`)}<span>${escapeHTML(exercise)}</span></label>
    `).join("")}</div>`;
  renderPlanCompletionSummary(date, "movement");
}

function renderPlannedNutrition(date) {
  const target = dietTarget(date);
  if (!target) throw new Error("No daily nutrition target matches the selected date.");
  const key = dateKey(date);
  const weekday = formatDate(date, { weekday: "long" });
  const adjustment = nutritionAdjustment(target);
  const calories = Number(target[2].replace(/,/g, ""));
  const protein = Number(target[3]);
  const carbs = Number(target[4]);
  const fat = Number(target[5]);
  $("#plannedNutritionSubtitle").textContent = `${weekday} · ${target[1]}`;
  $("#plannedNutritionBadge").textContent = `${numberFormat(calories)} KCAL`;
  const content = target[1] === "Training, non-veg"
    ? `<div class="nutrition-menu-grid">
      ${PROGRAM.diet.meals.map((meal, index) => {
        const [time, name, mealCalories, mealProtein, mealCarbs, mealFat] = meal;
        const id = `meal-${index}`;
        const checked = isPlanComplete(key, "nutrition", id);
        return `<article class="nutrition-meal ${checked ? "is-complete" : ""}">
          <div class="nutrition-meal-heading">${planCheckbox(key, "nutrition", id, `Mark ${name} complete`)}<h3>${escapeHTML(name)}</h3><span>${escapeHTML(time)}</span></div>
          <p>${escapeHTML(mealCalories)} kcal · ${escapeHTML(mealProtein)} g protein · ${escapeHTML(mealCarbs)} g carbs · ${escapeHTML(mealFat)} g fat</p>
        </article>`;
      }).join("")}
    </div><p class="nutrition-disclaimer">Base non-veg training-day menu. Portions and calorie values are estimates; weigh food as described in the plan.</p>`
    : `<div class="nutrition-adjustment">${planCheckbox(key, "nutrition", "daily-guidance", "Mark daily nutrition guidance reviewed")}<div><strong>${escapeHTML(adjustment?.[0] || target[1])}</strong><p>${escapeHTML(adjustment?.[1] || "Follow the daily targets and meal plan.")}</p><small>${escapeHTML(adjustment?.[2] || "")}</small></div></div>`;
  $("#plannedNutritionContent").innerHTML = `
    ${content}
    <div class="nutrition-guidance">
      <strong>Daily target</strong>
      <div class="nutrition-guidance-chips">
        <span>${numberFormat(calories)} kcal</span><span>Protein ${numberFormat(protein)} g</span><span>Carbs ${numberFormat(carbs)} g</span><span>Fat ${numberFormat(fat)} g</span>
      </div>
    </div>`;
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
  if (name === "program") renderProgram();
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

function renderProgram() {
  const stage = PROGRAM.workouts.stages[activeWorkoutStage] || PROGRAM.workouts.stages[0];
  if (!stage) throw new Error("No workout stages were found in the program data.");
  $$(".program-tab").forEach((tab) => {
    const active = tab.dataset.programTab === activeProgramTab;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  const renderers = {
    overview: renderProgramOverview,
    workouts: renderProgramWorkouts,
    nutrition: renderProgramNutrition,
    tracker: renderProgramTracker,
    body: renderProgramBody,
    log: renderProgramLog
  };
  const renderer = renderers[activeProgramTab];
  if (!renderer) throw new Error(`Unknown program section: ${activeProgramTab}`);
  $("#programContent").innerHTML = renderer(stage);
}

function renderProgramOverview(stage) {
  const target = dietTarget(selectedDate);
  const workout = workoutSession(selectedDate);
  const baseline = `${PROGRAM.weeklyLog.startWeight} kg · ${PROGRAM.weeklyLog.startWaist} in waist`;
  return `
    <div class="program-overview-grid">
      <article class="program-stat-card"><span>Current phase</span><strong>Stage ${stage.number}</strong><small>${escapeHTML(stage.title)}</small></article>
      <article class="program-stat-card"><span>Today’s session</span><strong>${escapeHTML(workout?.focus || "Rest & recovery")}</strong><small>${workout ? `${workout.exercises.length} planned movements` : "8–10k steps on rest days"}</small></article>
      <article class="program-stat-card"><span>Daily nutrition target</span><strong>${numberFormat(Number(target?.[2].replace(/,/g, "")))} kcal</strong><small>${escapeHTML(target?.[1] || "Daily plan")} · ${escapeHTML(target?.[3] || "—")} g protein</small></article>
      <article class="program-stat-card"><span>Starting check-in</span><strong>${escapeHTML(baseline)}</strong><small>Compare weekly measurements in the log.</small></article>
    </div>
    <section class="panel program-callout">
      <p class="eyebrow">HOW TO USE THE PLAN</p>
      <h2>Build consistency before chasing intensity.</h2>
      <p>Four training days each week: push, pull, legs, and arms. The sessions progress through three 60-day stages, with deloads in weeks 8, 16, and 24. Log completed work on Today, record actual lifting loads in the tracker, and add weekly check-ins below.</p>
      <div class="program-quick-links">
        <button type="button" data-program-tab="workouts">Explore workouts</button>
        <button type="button" data-program-tab="nutrition">View nutrition targets</button>
        <button type="button" data-program-tab="log">Update weekly log</button>
      </div>
    </section>
    <p class="program-source-note">The targets and plan details shown here are taken from the supplied six-month CSV plan. Nutrition and calorie estimates are not medical advice.</p>`;
}

function renderProgramWorkouts() {
  const stage = PROGRAM.workouts.stages[activeWorkoutStage] || PROGRAM.workouts.stages[0];
  const sessionOrder = ["Mon", "Tue", "Sat", "Sun"];
  const dayNames = { Mon: "Monday", Tue: "Tuesday", Sat: "Saturday", Sun: "Sunday" };
  const dayFocus = { Mon: "Push", Tue: "Pull", Sat: "Legs", Sun: "Arms, rear delts, core & calves" };
  return `
    <section class="panel program-section-panel">
      <div class="program-section-heading"><div><p class="eyebrow">PROGRESSIVE TRAINING</p><h2>Workout stages</h2><p>Select a phase to view its sessions and coaching notes.</p></div></div>
      <div class="stage-selector" role="group" aria-label="Workout stage">
        ${PROGRAM.workouts.stages.map((item, index) => `<button type="button" class="stage-button ${index === activeWorkoutStage ? "is-active" : ""}" data-stage-index="${index}">Stage ${item.number}<small>${escapeHTML(item.title.split("(")[0].trim())}</small></button>`).join("")}
      </div>
      <div class="stage-note">${escapeHTML(stage.title)}. ${escapeHTML(stage.guidance)}</div>
      <div class="workout-stage-grid">
        ${sessionOrder.map((day) => {
          const exercises = stage.sessions[day] || "";
          return `<article class="workout-stage-card"><div class="workout-stage-card-heading"><span>${dayNames[day]}</span><strong>${escapeHTML(dayFocus[day])}</strong></div><ul>${exercises.split(";").filter(Boolean).map((exercise) => `<li>${escapeHTML(exercise.trim())}</li>`).join("")}</ul></article>`;
        }).join("")}
        <article class="workout-stage-card"><div class="workout-stage-card-heading"><span>Wednesday–Friday</span><strong>Rest & recovery</strong></div><ul><li>${escapeHTML(PROGRAM.workouts.structure.find((row) => row[0] === "Wed-Fri")?.[1] || "Rest and recovery")}</li></ul></article>
      </div>
      <div class="program-rules"><h3>Training guidance</h3><ul>${PROGRAM.workouts.rules.map(([item, detail]) => `<li><strong>${escapeHTML(item)}</strong>${escapeHTML(detail)}</li>`).join("")}</ul></div>
    </section>`;
}

function renderProgramNutrition() {
  const dailyTargets = PROGRAM.diet.targets.map((row) => `<tr><th scope="row">${escapeHTML(row[0])}</th><td>${escapeHTML(row[1])}</td><td>${escapeHTML(row[2])}</td><td>${escapeHTML(row[3])} g</td><td>${escapeHTML(row[4])} g</td><td>${escapeHTML(row[5])} g</td><td>${escapeHTML(row[6])}</td></tr>`).join("");
  const [weeklyAverageDay, , averageCalories, averageProtein, averageCarbs, averageFat, averageCheck] = PROGRAM.diet.weeklyAverage;
  return `
    <section class="panel program-section-panel">
      <div class="program-section-heading"><div><p class="eyebrow">DAILY TARGETS</p><h2>Calories & macros</h2><p>Training and rest-day targets from the diet plan.</p></div></div>
      <div class="program-table-wrap"><table class="program-table">
        <thead><tr><th scope="col">Day</th><th scope="col">Plan type</th><th scope="col">Target kcal</th><th scope="col">Protein</th><th scope="col">Carbs</th><th scope="col">Fat</th><th scope="col">Kcal check</th></tr></thead>
        <tbody>${dailyTargets}<tr class="program-average-row"><th scope="row">${escapeHTML(weeklyAverageDay)}</th><td>Weekly average</td><td>${escapeHTML(averageCalories)}</td><td>${escapeHTML(averageProtein)} g</td><td>${escapeHTML(averageCarbs)} g</td><td>${escapeHTML(averageFat)} g</td><td>${escapeHTML(averageCheck)}</td></tr></tbody>
      </table></div>
      <div class="nutrition-summary-grid">
        <article><span>Protein per kg</span><strong>${escapeHTML(PROGRAM.diet.proteinPerKg)} g</strong></article>
        <article><span>Fat per kg</span><strong>${escapeHTML(PROGRAM.diet.fatPerKg)} g</strong></article>
        <article><span>Weekly deficit</span><strong>${escapeHTML(PROGRAM.diet.weeklyDeficit)} kcal</strong></article>
      </div>
      <div class="nutrition-menu-grid nutrition-reference-menu">
        ${PROGRAM.diet.meals.map(([time, meal, calories, protein, carbs, fat]) => `<article class="nutrition-meal"><div class="nutrition-meal-heading"><h3>${escapeHTML(meal)}</h3><span>${escapeHTML(time)}</span></div><p>${escapeHTML(calories)} kcal · ${escapeHTML(protein)} g protein · ${escapeHTML(carbs)} g carbs · ${escapeHTML(fat)} g fat</p></article>`).join("")}
      </div>
      <p class="nutrition-disclaimer">Base non-veg training-day menu. The meal sum is approximately 1,775 kcal; the 1,800 kcal target allows for cooking oil and rounding.</p>
    </section>
    <section class="panel program-section-panel"><div class="program-section-heading"><div><p class="eyebrow">DAY-TYPE ADJUSTMENTS</p><h2>How to adapt the menu</h2></div></div><div class="program-adjustment-list">
      ${PROGRAM.diet.adjustments.map(([dayType, changes, result]) => `<article><strong>${escapeHTML(dayType)}</strong><p>${escapeHTML(changes)}</p><span>${escapeHTML(result)}</span></article>`).join("")}
    </div></section>
    <section class="program-detail-grid">
      <article class="panel program-section-panel"><h2>Daily rules & supplements</h2><ul class="program-simple-list">${PROGRAM.diet.supplements.map(([item, target]) => `<li><strong>${escapeHTML(item)}</strong><span>${escapeHTML(target)}</span></li>`).join("")}</ul></article>
      <article class="panel program-section-panel"><h2>Adjust every two weeks</h2><ul class="program-simple-list">${PROGRAM.diet.adjustmentRules.map(([change, action]) => `<li><strong>${escapeHTML(change)}</strong><span>${escapeHTML(action)}</span></li>`).join("")}</ul></article>
    </section>`;
}

function renderProgramTracker() {
  const dayOrder = ["Mon", "Tue", "Sat", "Sun"];
  const rows = PROGRAM.tracker.filter((exercise) => dayOrder.includes(exercise.day));
  const grouped = dayOrder.map((day) => {
    const exercises = rows.filter((exercise) => exercise.day === day);
    if (!exercises.length) return "";
    return `<section class="tracker-day-group"><h3>${({ Mon: "Monday · Push", Tue: "Tuesday · Pull", Sat: "Saturday · Legs", Sun: "Sunday · Arms & core" })[day]}</h3>
      <div class="tracker-exercise-list">${exercises.map((exercise) => {
        const target = exercise.targets[activeLoadMonth];
        const savedActual = state.loadActuals[`${exercise.id}:${activeLoadMonth}`] ?? exercise.actuals[activeLoadMonth];
        return `<article class="tracker-exercise-card">
          <div class="tracker-exercise-title"><span>${escapeHTML(exercise.day)}</span><strong>${escapeHTML(exercise.exercise)}</strong></div>
          <div class="tracker-target"><span>Target · M${activeLoadMonth + 1}</span><strong>${escapeHTML(target || "—")}${target && target !== "–" && target !== "BW" ? " kg" : ""}</strong></div>
          <label class="tracker-actual"><span>Actual ${target === "BW" ? "(reps / time)" : "(kg)"}</span><input type="text" inputmode="decimal" data-load-exercise="${exercise.id}" data-load-month="${activeLoadMonth}" aria-label="Actual for ${escapeHTML(exercise.exercise)} in month ${activeLoadMonth + 1}" placeholder="${target === "–" ? "Not in this phase" : target === "BW" ? "e.g. 12 reps" : "Enter actual"}" value="${escapeHTML(savedActual || "")}" ${target === "–" ? "disabled" : ""}></label>
        </article>`;
      }).join("")}</div></section>`;
  }).join("");
  return `
    <section class="panel program-section-panel">
      <div class="program-section-heading"><div><p class="eyebrow">PROGRESSIVE OVERLOAD</p><h2>Six-month load tracker</h2><p>Targets are planned loads in kilograms; dumbbell targets are per hand.</p></div></div>
      <div class="month-selector" role="group" aria-label="Training month">${Array.from({ length: 6 }, (_, index) => `<button type="button" class="month-button ${index === activeLoadMonth ? "is-active" : ""}" data-load-month-select="${index}">M${index + 1}</button>`).join("")}</div>
      <p class="tracker-stage-note">Stage ${Math.floor(activeLoadMonth / 2) + 1} · ${activeLoadMonth < 2 ? "Foundation" : activeLoadMonth < 4 ? "Hypertrophy" : "Intensity & definition"}</p>
      <p class="tracker-guidance">Add 2.5 kg after hitting the top of the rep range on all sets; reduce by 2.5 kg after missing the rep floor twice. Deload weeks 8, 16, and 24 use the same weight with 40% fewer sets. Dumbbells are per hand; barbell/EZ-bar targets include the bar. Pull-up negatives are assistance and positive values are added load.</p>
      ${rows.length ? `<div class="tracker-groups">${grouped}</div>` : `<p class="program-empty">No load-tracker exercises are available.</p>`}
    </section>`;
}

function renderProgramBody() {
  const body = PROGRAM.body;
  const currentMeasurements = body.inputs.filter((row) => row[0] && row[1]);
  const derivedMetrics = body.derived.filter((row) => row[0] && row[1]);
  const maintenance = body.maintenance.filter((row) => row[0] && row[1]);
  return `
    <section class="panel program-section-panel"><div class="program-section-heading"><div><p class="eyebrow">BASELINE · NOVEMBER 2026</p><h2>Starting measurements</h2><p>Re-measure monthly at the same time and under the same conditions.</p></div></div>
      <div class="measurement-grid">${currentMeasurements.map(([metric, value, unit]) => `<article><span>${escapeHTML(metric)}</span><strong>${escapeHTML(value)} <small>${escapeHTML(unit)}</small></strong></article>`).join("")}</div>
    </section>
    <section class="panel program-section-panel"><div class="program-section-heading"><div><p class="eyebrow">CALCULATED ESTIMATES</p><h2>Body metrics</h2></div></div>
      <div class="program-table-wrap"><table class="program-table"><thead><tr><th scope="col">Metric</th><th scope="col">Value</th><th scope="col">Reading</th></tr></thead><tbody>${derivedMetrics.map(([metric, value, reading]) => `<tr><th scope="row">${escapeHTML(metric)}</th><td>${escapeHTML(value)}</td><td>${escapeHTML(reading || "—")}</td></tr>`).join("")}</tbody></table></div>
      <p class="program-caution">Body-fat estimates have a stated ±3–4% error. BMI is a weak guide for lifters; these calculations are directional, not a diagnosis.</p>
    </section>
    <section class="panel program-section-panel"><div class="program-section-heading"><div><p class="eyebrow">ENERGY ESTIMATE</p><h2>Maintenance calories</h2></div></div>
      <div class="program-table-wrap"><table class="program-table"><thead><tr>${maintenance[0].map((cell) => `<th scope="col">${escapeHTML(cell)}</th>`).join("")}</tr></thead><tbody>${maintenance.slice(1).map((row) => `<tr>${row.map((cell) => `<td>${escapeHTML(cell || "—")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    </section>
    <section class="panel program-section-panel"><div class="program-section-heading"><div><p class="eyebrow">SIX-MONTH FOCUS</p><h2>Areas to improve</h2><p>Consistency is the priority before chasing individual measurements.</p></div></div>
      <div class="program-table-wrap"><table class="program-table"><thead><tr><th scope="col">Priority</th><th scope="col">Current</th><th scope="col">6-month target</th><th scope="col">Ideal</th><th scope="col">Gap</th></tr></thead><tbody>${body.priorities.map(([priority, current, target, ideal, gap]) => `<tr><th scope="row">${escapeHTML(priority)}</th><td>${escapeHTML(current)}</td><td>${escapeHTML(target)}</td><td>${escapeHTML(ideal)}</td><td>${escapeHTML(gap)}</td></tr>`).join("")}</tbody></table></div>
      <p class="program-caution">The plan notes a realistic waist target of 34–35 in, revised from the earlier 32–33 in target. Attendance outranks every other priority.</p>
    </section>`;
}

function weeklyProgressFor(week) {
  const entry = state.weeklyLogs[week] || {};
  const currentWeight = Number(entry.weight);
  if (!Number.isFinite(currentWeight) || !entry.weight) return { change: "—", verdict: "Log a weight to calculate progress." };

  let previousWeek = 0;
  let previousWeight = Number(PROGRAM.weeklyLog.startWeight);
  for (let candidate = week - 1; candidate > 0; candidate -= 1) {
    const savedWeight = state.weeklyLogs[candidate]?.weight;
    if (savedWeight && Number.isFinite(Number(savedWeight))) {
      previousWeek = candidate;
      previousWeight = Number(savedWeight);
      break;
    }
  }
  const difference = currentWeight - previousWeight;
  const weeksBetween = week - previousWeek;
  const weeklyLoss = -difference / weeksBetween;
  const change = `${difference > 0 ? "+" : ""}${difference.toFixed(1)} kg`;
  let verdict;
  if (weeklyLoss > 0.7) {
    verdict = "Loss is over 0.7 kg/week. Add 150 kcal; you may be losing muscle.";
  } else if (weeklyLoss >= 0.2 && weeklyLoss <= 0.5) {
    verdict = "On track. No change.";
  } else if (weeklyLoss > 0.5) {
    verdict = "Above the preferred pace. Monitor recovery and lifts.";
  } else {
    const priorWeek = week - 1;
    const twoWeeksAgo = week - 2;
    const priorWeight = Number(state.weeklyLogs[priorWeek]?.weight);
    const earlierWeight = Number(state.weeklyLogs[twoWeeksAgo]?.weight);
    const twoWeeksUnderTarget = priorWeek > 0 && twoWeeksAgo > 0
      && Number.isFinite(priorWeight) && Number.isFinite(earlierWeight)
      && earlierWeight - priorWeight < 0.2 && priorWeight - currentWeight < 0.2;
    verdict = twoWeeksUnderTarget
      ? "Loss has been under 0.2 kg/week for 2 weeks. Cut 100 kcal from carbs."
      : "Keep tracking; adjust only after 2 consecutive weeks below 0.2 kg.";
  }
  return { change, verdict };
}

function renderProgramLog() {
  const loggedWeights = Object.entries(state.weeklyLogs)
    .filter(([, entry]) => entry.weight && Number.isFinite(Number(entry.weight)))
    .sort(([weekA], [weekB]) => Number(weekB) - Number(weekA));
  const latest = loggedWeights[0];
  const latestWeight = latest ? Number(latest[1].weight) : Number(PROGRAM.weeklyLog.startWeight);
  const totalChange = latest ? `${latestWeight - Number(PROGRAM.weeklyLog.startWeight) > 0 ? "+" : ""}${(latestWeight - Number(PROGRAM.weeklyLog.startWeight)).toFixed(1)} kg` : "No new check-in";
  const weekCards = PROGRAM.weeklyLog.weeks.map((week) => {
    const entry = state.weeklyLogs[week] || {};
    const progress = weeklyProgressFor(week);
    const title = entry.weight ? `${entry.weight} kg` : "No check-in yet";
    const note = entry.date ? ` · ${entry.date}` : "";
    const fields = [
      ["date", "Date", "date"],
      ["weight", "Weight", "number", "0.1", "0", "500"],
      ["waist", "Waist", "number", "0.1", "0", "200"],
      ["gym", "Gym sessions (of 4)", "number", "1", "0", "4"],
      ["calories", "Average kcal", "number", "1", "0", "20000"],
      ["protein", "Average protein (g)", "number", "1", "0", "1000"],
      ["notes", "Notes", "text"]
    ];
    return `<details class="weekly-log-card">
      <summary><span>Week ${week}</span><strong>${escapeHTML(title)}${escapeHTML(note)}</strong></summary>
      <div class="weekly-log-fields">${fields.map(([name, label, type, step, min, max]) => `<label>${label}<input type="${type}" ${step ? `step="${step}"` : ""} ${min ? `min="${min}"` : ""} ${max ? `max="${max}"` : ""} data-week="${week}" data-week-field="${name}" aria-label="Week ${week} ${label}" value="${escapeHTML(entry[name] || "")}"></label>`).join("")}</div>
      <div class="weekly-log-result"><div><span>Weight change</span><strong data-week-change="${week}">${escapeHTML(progress.change)}</strong></div><div><span>Verdict</span><strong data-week-verdict="${week}">${escapeHTML(progress.verdict)}</strong></div></div>
    </details>`;
  }).join("");
  return `
    <section class="panel program-section-panel">
      <div class="program-section-heading"><div><p class="eyebrow">26-WEEK CHECK-IN</p><h2>Weekly progress log</h2><p>Weigh in on the same day each week, in the morning, after using the bathroom.</p></div></div>
      <div class="log-baseline"><span>Starting point</span><strong>${escapeHTML(PROGRAM.weeklyLog.startWeight)} kg · ${escapeHTML(PROGRAM.weeklyLog.startWaist)} in waist</strong></div>
      <div class="log-baseline"><span>Latest check-in · Week ${latest?.[0] || "—"}</span><strong>${latest ? `${escapeHTML(latestWeight.toFixed(1))} kg · ${escapeHTML(totalChange)} from start` : escapeHTML(totalChange)}</strong></div>
      <p class="tracker-guidance">Aim for 0.2–0.5 kg loss per week. Use the nutrition adjustment rules if progress is too slow, too fast, or your lifts are dropping.</p>
      <div class="weekly-log-list">${weekCards}</div>
    </section>`;
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
  anchor.download = `rewire-progress-${dateKey(new Date())}.json`;
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
document.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-program-tab]");
  if (tab) {
    activeProgramTab = tab.dataset.programTab;
    renderProgram();
    return;
  }
  const stageButton = event.target.closest("[data-stage-index]");
  if (stageButton) {
    activeWorkoutStage = Number(stageButton.dataset.stageIndex);
    renderProgram();
    return;
  }
  const monthButton = event.target.closest("[data-load-month-select]");
  if (monthButton) {
    activeLoadMonth = Number(monthButton.dataset.loadMonthSelect);
    renderProgram();
  }
});
document.addEventListener("change", (event) => {
  const actualInput = event.target.closest("[data-load-exercise]");
  if (actualInput) {
    const key = `${actualInput.dataset.loadExercise}:${actualInput.dataset.loadMonth}`;
    const previous = state.loadActuals[key];
    const value = actualInput.value.trim();
    if (value) state.loadActuals[key] = value;
    else delete state.loadActuals[key];
    if (!saveState()) {
      if (previous === undefined) delete state.loadActuals[key];
      else state.loadActuals[key] = previous;
      actualInput.value = previous || "";
    }
    return;
  }

  const weekInput = event.target.closest("[data-week-field]");
  if (!weekInput) return;
  const week = weekInput.dataset.week;
  const fieldName = weekInput.dataset.weekField;
  const previous = state.weeklyLogs[week]?.[fieldName];
  if (!weekInput.checkValidity()) {
    weekInput.reportValidity();
    weekInput.value = previous || "";
    return;
  }
  if (!state.weeklyLogs[week]) state.weeklyLogs[week] = {};
  const value = weekInput.value.trim();
  if (value) state.weeklyLogs[week][fieldName] = value;
  else delete state.weeklyLogs[week][fieldName];
  if (!Object.keys(state.weeklyLogs[week]).length) delete state.weeklyLogs[week];
  if (!saveState()) {
    if (!state.weeklyLogs[week]) state.weeklyLogs[week] = {};
    if (previous === undefined) delete state.weeklyLogs[week][fieldName];
    else state.weeklyLogs[week][fieldName] = previous;
    if (!Object.keys(state.weeklyLogs[week]).length) delete state.weeklyLogs[week];
    weekInput.value = previous || "";
  }
  const entry = state.weeklyLogs[week] || {};
  const summary = weekInput.closest(".weekly-log-card").querySelector("summary strong");
  summary.textContent = `${entry.weight ? `${entry.weight} kg` : "No check-in yet"}${entry.date ? ` · ${entry.date}` : ""}`;
  const progress = weeklyProgressFor(Number(week));
  weekInput.closest(".weekly-log-card").querySelector(`[data-week-change="${week}"]`).textContent = progress.change;
  weekInput.closest(".weekly-log-card").querySelector(`[data-week-verdict="${week}"]`).textContent = progress.verdict;
  const loggedWeights = Object.entries(state.weeklyLogs)
    .filter(([, savedEntry]) => savedEntry.weight && Number.isFinite(Number(savedEntry.weight)))
    .sort(([weekA], [weekB]) => Number(weekB) - Number(weekA));
  const latest = loggedWeights[0];
  const latestWeight = latest ? Number(latest[1].weight) : Number(PROGRAM.weeklyLog.startWeight);
  const totalChange = latest ? `${latestWeight - Number(PROGRAM.weeklyLog.startWeight) > 0 ? "+" : ""}${(latestWeight - Number(PROGRAM.weeklyLog.startWeight)).toFixed(1)} kg` : "No new check-in";
  const latestSummary = $("#programContent .log-baseline + .log-baseline strong");
  if (latestSummary) latestSummary.textContent = latest
    ? `${latestWeight.toFixed(1)} kg · ${totalChange} from start`
    : totalChange;
  const latestLabel = $("#programContent .log-baseline + .log-baseline span");
  if (latestLabel) latestLabel.textContent = `Latest check-in · Week ${latest?.[0] || "—"}`;
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
  if (!window.confirm("Clear all journal entries, planned-item check-ins, training loads, and weekly progress from this device? Your daily goals will stay saved.")) return;
  const previousDays = state.days;
  const previousPlanChecks = state.planChecks;
  const previousLoadActuals = state.loadActuals;
  const previousWeeklyLogs = state.weeklyLogs;
  state.days = {};
  state.planChecks = {};
  state.loadActuals = {};
  state.weeklyLogs = {};
  if (!saveState()) {
    state.days = previousDays;
    state.planChecks = previousPlanChecks;
    state.loadActuals = previousLoadActuals;
    state.weeklyLogs = previousWeeklyLogs;
    return;
  }
  renderToday();
  if (activeView === "history") renderHistory();
  if (activeView === "insights") renderInsights();
  $("#goalsFeedback").textContent = "";
});

setTheme(loadTheme());
renderToday();
