import { syncToStrengthLibrary } from "@/components/sessions/exerciseLibrarySync";

export const METHOD_OPTIONS = ["Dinámicos", "Balísticos", "Biseries", "Triseries", "Contrastes", "Excéntricos", "Isométricos", "Preventivos"];
export const TYPE_OPTIONS = ["Esfuerzos repetidos", "Esfuerzos dinámicos", "Antagonistas", "Potencia", "Fuerza máxima", "Pliométrico", "Preventivo", "Movilidad"];

export async function syncToLibrary(stationData, sessionId, squadId, squadName, options = {}) {
  return syncToStrengthLibrary(stationData, sessionId, squadId, squadName, options);
}