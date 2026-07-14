// Configuración de áreas, módulos y catálogo de páginas del sistema.
// La navegación y los permisos se basan en módulos independientes, no en categorías padre.

export const AREAS = [
  { id: "cuerpo_tecnico",       name: "Cuerpo Técnico",       description: "Sesiones, partidos, plantel y táctica",        icon: "Users" },
  { id: "rendimiento_fisico",   name: "Rendimiento Físico",   description: "Carga externa, GPS y evaluaciones físicas",    icon: "Gauge" },
  { id: "area_medica",          name: "Área Médica",          description: "Seguimiento médico de los jugadores",         icon: "Heart" },
  { id: "kinesiologia",         name: "Kinesiología",         description: "Readaptación y trabajo kinésico",             icon: "HeartPulse" },
  { id: "nutricion",            name: "Nutrición",            description: "Seguimiento nutricional del plantel",         icon: "Apple" },
  { id: "psicologia",           name: "Psicología",           description: "Seguimiento psicológico del plantel",         icon: "Brain" },
  { id: "coordinacion_general", name: "Coordinación General", description: "Visión global de todas las áreas",            icon: "ClipboardList" },
  { id: "administracion",       name: "Administración",       description: "Usuarios, roles, planteles y configuración",  icon: "Settings2" },
];

export const MODULE_ACTIONS = [
  { key: "can_view", label: "Ver" },
  { key: "can_create", label: "Crear" },
  { key: "can_edit", label: "Editar" },
  { key: "can_delete", label: "Eliminar" },
  { key: "can_export", label: "Exportar" },
  { key: "can_admin", label: "Administrar" },
];

export const MODULES = [
  { id: "dashboard", label: "Dashboard", path: "/" },
  { id: "sesiones", label: "Sesiones", path: "/sessions" },
  { id: "partidos", label: "Partidos", path: "/matches" },
  { id: "mapa_tactico", label: "Mapa Táctico", path: "/tactical" },
  { id: "carga_externa", label: "Carga Externa", path: "/performance/external-load" },
  { id: "carga_interna", label: "Carga Interna", path: "/performance/internal-load" },
  { id: "area_medica", label: "Área Médica", path: "/performance/medical" },
  { id: "nutricion", label: "Nutrición", path: "/performance/nutrition" },
  { id: "minutos_jugados", label: "Minutos Jugados", path: "/performance/minutes" },
  { id: "calendario", label: "Calendario", path: "/schedule" },
  { id: "plan_semanal", label: "Plan Semanal", path: "/weekly-planner" },
  { id: "estado_plantel", label: "Estado del Plantel", path: "/daily-squad" },
  { id: "jugadores", label: "Jugadores", path: "/players" },
  { id: "biblioteca_campo", label: "Biblioteca Campo", path: "/field-library" },
  { id: "biblioteca_fuerza", label: "Biblioteca Fuerza", path: "/strength-library" },
  { id: "cuerpo_tecnico", label: "Cuerpo Técnico", path: "/team" },
  { id: "configuracion", label: "Configuración", path: "/admin" },
];

export const PAGES = [
  ...MODULES.map((m) => ({ path: m.path, label: m.label, module_id: m.id })),
  { path: "/performance/microcycle-history", label: "Histórico de Microciclos", module_id: "carga_externa" },
  { path: "/squad-manager", label: "Planteles", module_id: "configuracion" },
  { path: "/users-access", label: "Accesos de Usuarios", module_id: "configuracion" },
  { path: "/player-names", label: "Gestión de Nombres", module_id: "jugadores" },
  { path: "/plantil-diagnostic", label: "Diagnóstico de Plantel", module_id: "configuracion" },
];