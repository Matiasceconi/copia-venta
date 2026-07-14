// Definición central de columnas GPS Catapult: nombre CSV <-> campo de la entidad.
// Agregar una nueva variable acá es suficiente para que el importador la detecte.

export const COLUMN_DEFS = [
  { field: "player_name_original", csvHeader: "Name",                          label: "Jugador",              numeric: false, main: true,  core: true },
  { field: "duration",             csvHeader: "Total Duration",                label: "Duración",             numeric: false, main: true },
  { field: "total_distance",       csvHeader: "Total Distance (m)",            label: "Distancia (m)",        numeric: true,  main: true,  color: "#3b82f6" },
  { field: "m_min",                csvHeader: "Metros x Min",                  label: "m/min",                numeric: true,  main: true,  color: "#22c55e" },
  { field: "distance_14_19_8",     csvHeader: "D 14,0-19,8 km/h (m)",          label: "D 14-19,8 (m)",        numeric: true,  main: false, color: "#84cc16" },
  { field: "distance_19_8",        csvHeader: "D 19,8-25,0 km/h (m)",          label: "D 19,8-25 (m)",        numeric: true,  main: true,  color: "#10b981" },
  { field: "distance_25",          csvHeader: "D+ 25,0 km/h (m)",              label: "D+ 25 (m)",            numeric: true,  main: true,  color: "#f97316" },
  { field: "sprints",              csvHeader: "Sprint Efforts",                label: "Sprints",              numeric: true,  main: true,  color: "#06b6d4" },
  { field: "acc_2_3_distance",     csvHeader: "Acc 2-3 Mts/s distancia (m)",   label: "Acc 2-3 dist (m)",      numeric: true,  main: false },
  { field: "acc_2_3_eff",          csvHeader: "Acc 2-3 Mts/s Eff",             label: "Acc 2-3 Eff",          numeric: true,  main: false },
  { field: "acc_3_distance",       csvHeader: "Acc + 3mt/s distancia (m)",     label: "Acc +3 dist (m)",       numeric: true,  main: false },
  { field: "acc_3",                csvHeader: "Acc + 3mt/s eff",               label: "Acc +3 Eff",           numeric: true,  main: true,  color: "#f59e0b" },
  { field: "dec_2_3_distance",     csvHeader: "Dec 2-3 mts/s distancia (m)",   label: "Dec 2-3 dist (m)",      numeric: true,  main: false },
  { field: "dec_2_3_eff",          csvHeader: "Dec 2-3 mts/s Eff",             label: "Dec 2-3 Eff",          numeric: true,  main: false },
  { field: "dec_3_distance",       csvHeader: "Dec +3mts/s distancia (m)",     label: "Dec +3 dist (m)",       numeric: true,  main: false },
  { field: "dec_3",                csvHeader: "Dec +3mts/s Eff",               label: "Dec +3 Eff",           numeric: true,  main: true,  color: "#ec4899" },
  { field: "hmld",                 csvHeader: "H Meta Load D (m)",             label: "HMLD (m)",             numeric: true,  main: false },
  { field: "player_load",          csvHeader: "Total Player Load",             label: "P. Load",              numeric: true,  main: true,  color: "#a855f7" },
  { field: "player_load_per_min",  csvHeader: "Player Load Per Minute",        label: "P.Load/min",           numeric: true,  main: false },
  { field: "rhie_bouts",           csvHeader: "RHIE Total Bouts",              label: "RHIE Bouts",           numeric: true,  main: false },
  { field: "smax",                 csvHeader: "Maximum Velocity (km/h)",       label: "Vel. Máx (km/h)",       numeric: true,  main: true,  color: "#ef4444" },
  { field: "max_vel_percent",      csvHeader: "Max Vel (% Max)",               label: "% Vel. Máx",           numeric: true,  main: false },
];

export const MAIN_FIELDS = COLUMN_DEFS.filter(c => c.main && !c.core).map(c => c.field);
export const ALL_FIELDS = COLUMN_DEFS.filter(c => !c.core).map(c => c.field);

export const TEMPLATE_STORAGE_KEY = "gps_column_templates_v1";

export const DEFAULT_TEMPLATE_NAMES = [
  "GPS Sesión completa",
  "GPS Ejercicio",
  "GPS Partido",
  "GPS Reducido",
  "GPS personalizado",
];

export function loadTemplates() {
  try {
    const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : {};
    return {
      "GPS Sesión completa": ALL_FIELDS,
      "GPS Ejercicio": MAIN_FIELDS,
      "GPS Partido": MAIN_FIELDS,
      "GPS Reducido": MAIN_FIELDS.slice(0, 6),
      ...saved,
    };
  } catch {
    return { "GPS Sesión completa": ALL_FIELDS, "GPS Ejercicio": MAIN_FIELDS, "GPS Partido": MAIN_FIELDS, "GPS Reducido": MAIN_FIELDS.slice(0, 6) };
  }
}

export function saveTemplate(name, fields) {
  const templates = loadTemplates();
  templates[name] = fields;
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
  return templates;
}