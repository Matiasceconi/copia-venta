import { base44 } from "@/api/base44Client";
import moment from "moment";

/**
 * Asegura que exista un Estado del Plantel para `date`.
 * Si NO hay ningún registro para esa fecha, copia (crea) los del día anterior como punto de partida.
 * Si YA existen registros para `date`, los devuelve tal cual — nunca los sobrescribe.
 */
export async function ensureDailyStatusForDate(date) {
  const existing = await base44.entities.DailySquadStatus.filter({ date }, "-updated_at", 500);
  if (existing.length > 0) return existing;

  const yesterday = moment(date).subtract(1, "day").format("YYYY-MM-DD");
  const prev = await base44.entities.DailySquadStatus.filter({ date: yesterday }, "-updated_at", 500);
  if (prev.length === 0) return [];

  const now = new Date().toISOString();
  const toCreate = prev.map(({ id, created_date, updated_date, created_by_id, ...rest }) => ({
    ...rest,
    date,
    updated_at: now,
  }));
  return base44.entities.DailySquadStatus.bulkCreate(toCreate);
}