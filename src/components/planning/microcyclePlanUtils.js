export const WEEKDAY_NAMES_ES = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];

export const MD_OPTIONS = ["MD-5", "MD-4", "MD-3", "MD-2", "MD-1", "MD", "MD+1", "MD+2", "Libre"];

export const PHYSICAL_OBJECTIVES = [
  "Recuperación + Readaptación",
  "Recuperación",
  "Readaptación",
  "Tensión muscular",
  "Duración metabólica",
  "Velocidad",
  "Mixto",
  "Activación pre competencia",
];

export const OBJECTIVE_COLORS = {
  "Recuperación + Readaptación": { bg: "#ccfbf1", text: "#115e59", border: "#5eead4" },
  "Recuperación": { bg: "#ccfbf1", text: "#115e59", border: "#5eead4" },
  "Readaptación": { bg: "#e0f2fe", text: "#075985", border: "#7dd3fc" },
  "Tensión muscular": { bg: "#ede9fe", text: "#5b21b6", border: "#a78bfa" },
  "Duración metabólica": { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
  "Velocidad": { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
  "Mixto": { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  "Activación pre competencia": { bg: "#ffedd5", text: "#9a3412", border: "#fdba74" },
};

export const WORK_BLOCKS = [
  { type: "Gimnasio", label: "Tarea de gimnasio", color: "#5B8DEF" },
  { type: "Campo", label: "Tarea de campo", color: "#4FA66A" },
  { type: "Compensatorio", label: "Compensación", color: "#5CA8A6" },
  { type: "Vuelta a la calma", label: "Vuelta a la calma", color: "#8A93A3" },
];

export function dayNameEs(date) {
  const day = new Date(`${date}T12:00:00`).getDay();
  return WEEKDAY_NAMES_ES[day] || "DÍA";
}

export function isFreeDay(day) {
  return day?.auto_free || String(day?.md || "").toLowerCase() === "libre";
}

export function objectiveStyle(objective, objectives = []) {
  const match = objectives.find((item) => item.name === objective);
  if (match) return { bg: match.color || "#fef3c7", text: match.text_color || "#0f172a", border: match.border_color || match.color || "#fcd34d" };
  return OBJECTIVE_COLORS[objective] || OBJECTIVE_COLORS["Mixto"];
}

function clean(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function formatStrength(row) {
  return [row.exercise_name || row.name || "Ejercicio", row.volume, row.method || row.exercise_type].filter(Boolean).join(" · ");
}

function formatField(row) {
  const duration = row.duration_minutes || row.duration_min;
  const blocks = row.blocks ? `${row.blocks} bloques` : "";
  return [row.name || "Ejercicio", blocks, duration ? `${duration}'` : "", row.objective].filter(Boolean).join(" · ");
}

function filterExercises(exercises, words) {
  return (exercises || []).filter((ex) => words.some((word) => clean(`${ex.name} ${ex.type} ${ex.objective} ${ex.description} ${ex.notes}`).includes(word)));
}

export function inferSessionForBlock(day, type, sessionLibrary = []) {
  const sameDay = sessionLibrary.filter((session) => session.date === day?.date);
  const has = (session, words) => words.some((word) => clean(`${session.title} ${session.session_type} ${session.objective} ${session.session_objective}`).includes(word));
  if (type === "Gimnasio") return sameDay.find((session) => has(session, ["gimnasio", "fuerza", "gym"]));
  if (type === "Campo") return sameDay.find((session) => has(session, ["campo", "cancha", "entrenamiento"]) && !has(session, ["gimnasio", "fuerza", "gym"]));
  if (type === "Compensatorio") return sameDay.find((session) => has(session, ["compens", "prevent", "readapt"]));
  if (type === "Vuelta a la calma") return sameDay.find((session) => has(session, ["vuelta", "calma", "regener", "recuper"]));
  return sameDay[0];
}

export function getBlockAutoContent(block, session, details = {}) {
  const manual = String(block?.content || "").trim();
  let automatic = "";

  if (session) {
    if (block.type === "Gimnasio") {
      const workBlocks = (details.strengthBlocks || []).filter((item) => item.hidden !== true).sort((a, b) => (a.order || 0) - (b.order || 0));
      if (workBlocks.length) {
        automatic = workBlocks.map((item) => item.name).filter(Boolean).join("\n");
      } else if ((details.strength || []).length) {
        const names = [...new Set((details.strength || []).map((row) => row.strength_group).filter(Boolean))];
        automatic = names.length ? names.join("\n") : [session.title || "Sesión de fuerza", session.session_type, session.duration_minutes ? `${session.duration_minutes} min` : ""].filter(Boolean).join(" · ");
      } else {
        automatic = [session.title || "Sesión de fuerza", session.session_type, session.duration_minutes ? `${session.duration_minutes} min` : ""].filter(Boolean).join(" · ");
      }
    }

    if (block.type === "Campo") {
      const excluded = ["compens", "prevent", "readapt", "vuelta", "calma", "regener", "recuper", "elong", "movilidad"];
      const fieldRows = [...(details.field || []), ...(details.exercises || []).filter((ex) => !excluded.some((word) => clean(`${ex.name} ${ex.type} ${ex.objective} ${ex.description} ${ex.notes}`).includes(word)))];
      if (fieldRows.length) automatic = fieldRows.map(formatField).join("\n");
    }

    if (block.type === "Compensatorio") {
      const rows = filterExercises(details.exercises, ["compens", "prevent", "readapt", "correct", "estabil"]);
      if (rows.length) automatic = rows.map(formatField).join("\n");
    }

    if (block.type === "Vuelta a la calma") {
      const rows = filterExercises(details.exercises, ["vuelta", "calma", "regener", "recuper", "elong", "movilidad"]);
      if (rows.length) automatic = rows.map(formatField).join("\n");
    }

    if (!automatic) automatic = session.objective || session.session_objective || session.title || "Sesión vinculada";
  }

  return [block?.auto_sync === false ? "" : automatic, manual].filter(Boolean).join("\n");
}