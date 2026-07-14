import { base44 } from "@/api/base44Client";

export const SESSION_MD_CODES = ["MD-6", "MD-5", "MD-4", "MD-3", "MD-2", "MD-1", "MD", "MD+1", "MD+2", "MD+3", "MD+4", "Libre", "Otro"];

export function normalizePlanDay(day = {}) {
  return {
    match_day_code: day.md || "",
    microcycle_day: day.md || "",
    session_objective: day.physical_objective || day.objetivo_fisico || day.objetivo || "",
  };
}

function sameScope(plan, squadId, seasonId) {
  const sameSquad = !squadId || !plan.squad_id || plan.squad_id === squadId;
  const sameSeason = !seasonId || !plan.season_id || plan.season_id === seasonId;
  return sameSquad && sameSeason;
}

export function findPlanDay(plans = [], { date, squadId, seasonId }) {
  if (!date) return null;
  const candidates = plans
    .filter((plan) => sameScope(plan, squadId, seasonId))
    .filter((plan) => (plan.days_data || []).some((day) => day.date === date))
    .sort((a, b) => String(b.week_start || "").localeCompare(String(a.week_start || "")));
  const plan = candidates[0];
  const day = (plan?.days_data || []).find((item) => item.date === date);
  return day ? { plan, day, values: normalizePlanDay(day) } : null;
}

export async function getMicrocycleDefaults({ date, squadId, seasonId }) {
  if (!date) return null;
  const plans = squadId ? await base44.entities.WeeklyPlan.filter({ squad_id: squadId }, "-week_start", 100) : await base44.entities.WeeklyPlan.list("-week_start", 100);
  return findPlanDay(plans, { date, squadId, seasonId });
}

export function effectiveSessionMeta(session, planMatch) {
  const defaults = planMatch?.values || {};
  const md = session?.md_manual_override ? session.match_day_code : (defaults.match_day_code || session?.match_day_code || "");
  const objective = session?.physical_objective_manual_override ? session.session_objective : (defaults.session_objective || session?.session_objective || "");
  return { match_day_code: md, microcycle_day: md, session_objective: objective };
}

export async function syncSessionsWithWeeklyPlan(plan) {
  const days = plan?.days_data || [];
  if (!days.length) return 0;
  const dates = new Set(days.map((day) => day.date).filter(Boolean));
  const sessions = plan.squad_id ? await base44.entities.TrainingSession.filter({ squad_id: plan.squad_id }, "-date", 500) : await base44.entities.TrainingSession.list("-date", 500);
  const scoped = sessions.filter((session) => dates.has(session.date) && (!plan.season_id || !session.season_id || session.season_id === plan.season_id));
  let count = 0;
  await Promise.all(scoped.map(async (session) => {
    const day = days.find((item) => item.date === session.date);
    const values = normalizePlanDay(day);
    const patch = {};
    if (values.match_day_code && !session.md_manual_override && session.match_day_code !== values.match_day_code) {
      patch.match_day_code = values.match_day_code;
      patch.microcycle_day = values.microcycle_day;
    }
    if (values.session_objective && !session.physical_objective_manual_override && session.session_objective !== values.session_objective) {
      patch.session_objective = values.session_objective;
    }
    if (Object.keys(patch).length) {
      count += 1;
      await base44.entities.TrainingSession.update(session.id, patch);
    }
  }));
  return count;
}