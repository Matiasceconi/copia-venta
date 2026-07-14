// Configuración compartida de colores y etiquetas para el estado médico (MedicalEpisode.medical_status)

export const STATUS_LABELS = {
  lesionado: "Lesionado",
  en_recuperacion: "En recuperación",
  kinesiologia: "Kinesiología",
  consulta: "Consulta",
  alta: "Alta médica",
};

// Colores tipo "badge"
export const STATUS_BADGE = {
  lesionado: "bg-red-500/15 text-red-400 border-red-500/30",
  en_recuperacion: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  kinesiologia: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  consulta: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  alta: "bg-green-500/15 text-green-400 border-green-500/30",
};

// Colores de fila estilo planilla (réplica de la codificación del Google Sheets):
// 🟦 Consulta  |  🟩 Alta (disponible)  |  🟥 Lesionado en tratamiento (no disponible)
export function getRowColorClasses(status) {
  if (status === "consulta") return "bg-blue-500/10 border-l-4 border-blue-500";
  if (status === "alta") return "bg-green-500/10 border-l-4 border-green-500";
  return "bg-red-500/10 border-l-4 border-red-500"; // lesionado, en_recuperacion, kinesiologia
}