export const MICROCycle_TEMPLATES = [
  {
    id: "normal",
    name: "Semana normal",
    type: "Normal",
    days: ["MD+1", "MD-4", "MD-3", "MD-2", "MD-1", "MD", "MD+1"],
    objectives: ["Recuperación", "Volumen", "Tensión", "Velocidad", "Activación", "Competencia", "Recuperación"],
  },
  {
    id: "short",
    name: "Semana corta",
    type: "Semana corta",
    days: ["MD+1", "MD-3", "MD-2", "MD-1", "MD", "MD+1"],
    objectives: ["Recuperación", "Tensión", "Velocidad", "Activación", "Competencia", "Recuperación"],
  },
  {
    id: "long",
    name: "Semana larga",
    type: "Semana larga",
    days: ["MD+1", "MD-5", "MD-4", "MD-3", "MD-2", "MD-1", "MD"],
    objectives: ["Recuperación", "Volumen", "Volumen", "Tensión", "Velocidad", "Activación", "Competencia"],
  },
  {
    id: "double",
    name: "Doble competencia",
    type: "Doble competencia",
    days: ["MD+1", "MD-2", "MD-1", "MD", "MD+1", "MD-1", "MD"],
    objectives: ["Recuperación", "Activación", "Velocidad", "Competencia", "Recuperación", "Activación", "Competencia"],
  },
  {
    id: "deload",
    name: "Descarga",
    type: "Descarga",
    days: ["MD+1", "MD-4", "MD-3", "MD-2", "MD-1", "MD", "MD+1"],
    objectives: ["Recuperación", "Técnica", "Compensación", "Velocidad", "Activación", "Competencia", "Recuperación"],
  },
  {
    id: "preseason",
    name: "Pretemporada",
    type: "Pretemporada",
    days: ["Día 1", "Día 2", "Día 3", "Día 4", "Día 5", "Día 6", "Día 7"],
    objectives: ["Volumen", "Fuerza", "Resistencia", "Velocidad", "Táctica", "Intermitente", "Recuperación"],
  },
];

export const TEMPLATE_BLOCKS = {
  Recuperación: [
    { type: "Recuperación", title: "Recuperación", content: "Movilidad, descarga y control wellness." },
    { type: "Observaciones", title: "Observaciones", content: "Monitorear fatiga y disponibilidad." },
  ],
  Volumen: [
    { type: "Campo", title: "Campo", content: "Sesión extensiva con foco en volumen." },
    { type: "Gimnasio", title: "Gimnasio", content: "Fuerza general y preventivos." },
  ],
  Tensión: [
    { type: "Campo", title: "Campo", content: "Espacios reducidos y estímulos neuromusculares." },
    { type: "Compensatorio", title: "Compensatorio", content: "Individual según minutos y disponibilidad." },
  ],
  Velocidad: [
    { type: "Campo", title: "Campo", content: "Aceleraciones, velocidad máxima y tareas tácticas." },
    { type: "Vuelta a la calma", title: "Vuelta a la calma", content: "Respiración, movilidad y elongación." },
  ],
  Activación: [
    { type: "Campo", title: "Activación", content: "Repaso táctico, ABP y activación corta." },
  ],
  Competencia: [
    { type: "Partido", title: "Partido", content: "Competencia oficial / amistoso." },
  ],
  Técnica: [
    { type: "Campo", title: "Técnica", content: "Técnica individual y tareas de baja carga." },
  ],
  Compensación: [
    { type: "Compensatorio", title: "Compensatorio", content: "Trabajos por grupos según carga previa." },
  ],
  Fuerza: [
    { type: "Gimnasio", title: "Gimnasio", content: "Fuerza estructural y preventivos." },
  ],
  Resistencia: [
    { type: "Campo", title: "Campo", content: "Bloques metabólicos e intermitentes." },
  ],
  Táctica: [
    { type: "Campo", title: "Táctica", content: "Modelo de juego, fases y pelota parada." },
  ],
  Intermitente: [
    { type: "Campo", title: "Intermitente", content: "Tareas intermitentes y control de volumen." },
  ],
};