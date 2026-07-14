import React, { useMemo, useState } from "react";
import { Filter, X } from "lucide-react";
import moment from "moment";
import { resolvePositionGroup } from "@/components/squad/squadConstants";

const STATUS_OPTIONS = [["incluidos", "Incluidos"], ["excluidos", "Excluidos"], ["diferenciado", "Diferenciados"], ["kinesiologia", "Kinesiología"]];
const TYPE_OPTIONS = [["campo", "Campo"], ["arqueros", "Arqueros"]];
const RANGE_OPTIONS = [["current", "Microciclo actual"], ["previous", "Microciclo anterior"], ["last7", "Últimos 7 días"], ["last14", "Últimos 14 días"], ["last4weeks", "Últimas 4 semanas"], ["custom", "Entre fechas"]];
const MD_OPTIONS = ["MD-6", "MD-5", "MD-4", "MD-3", "MD-2", "MD-1", "MD", "MD+1", "MD+2", "MD+3", "MD+4"];
const WEEKDAYS = [["1", "Lunes"], ["2", "Martes"], ["3", "Miércoles"], ["4", "Jueves"], ["5", "Viernes"], ["6", "Sábado"], ["7", "Domingo"]];

function SelectField({ label, value, onChange, options, allLabel }) {
  return <label className="space-y-1"><span className="text-xs font-semibold text-zinc-400">{label}</span><select value={value || ""} onChange={(e) => onChange(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"><option value="">{allLabel || "Todos"}</option>{options.map((opt) => Array.isArray(opt) ? <option key={opt[0]} value={opt[0]}>{opt[1]}</option> : <option key={opt} value={opt}>{opt}</option>)}</select></label>;
}
function DateField({ label, value, onChange }) { return <label className="space-y-1"><span className="text-xs font-semibold text-zinc-400">{label}</span><input type="date" value={value || ""} onChange={(e) => onChange(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" /></label>; }
function TextField({ label, value, onChange, placeholder }) { return <label className="space-y-1"><span className="text-xs font-semibold text-zinc-400">{label}</span><input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" /></label>; }
function ToggleGrid({ label, options, values = [], onChange }) { function toggle(value) { onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]); } return <div className="space-y-2"><p className="text-xs font-semibold text-zinc-400">{label}</p><div className="flex flex-wrap gap-2">{options.map(([value, text]) => <button key={value} type="button" onClick={() => toggle(value)} className={`px-3 py-1.5 rounded-full border text-xs font-bold ${values.includes(value) ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200" : "bg-zinc-900 border-zinc-800 text-zinc-400"}`}>{text}</button>)}</div></div>; }

export function getMicrocycleFilterLabels(filters, { players = [], sessions = [], metrics = [] }) {
  const labels = [];
  const player = players.find((p) => p.id === filters.playerId);
  const session = sessions.find((s) => s.id === filters.sessionId);
  const metric = metrics.find((m) => m.key === filters.metricKey);
  if (filters.rangePreset) labels.push(RANGE_OPTIONS.find((o) => o[0] === filters.rangePreset)?.[1] || filters.rangePreset);
  if (player) labels.push(player.full_name || `${player.first_name || ""} ${player.last_name || ""}`.trim());
  if (filters.position) labels.push(filters.position);
  if (filters.positionGroup) labels.push(filters.positionGroup);
  if (filters.playerType) labels.push(filters.playerType === "arqueros" ? "Arqueros" : "Campo");
  if (filters.status) labels.push(STATUS_OPTIONS.find((o) => o[0] === filters.status)?.[1] || filters.status);
  if (filters.md) labels.push(filters.md);
  if (filters.objective) labels.push(filters.objective);
  if (filters.sessionType) labels.push(filters.sessionType);
  if (filters.squadId) labels.push(`Plantel ${filters.squadId}`);
  if (filters.rival) labels.push(`Rival: ${filters.rival}`);
  if (filters.season) labels.push(`Temporada ${filters.season}`);
  if (session) labels.push(session.title || "Sesión");
  if (filters.date) labels.push(moment(filters.date).format("DD/MM/YYYY"));
  if (filters.dateFrom || filters.dateTo) labels.push(`${filters.dateFrom ? moment(filters.dateFrom).format("DD/MM/YYYY") : "inicio"} → ${filters.dateTo ? moment(filters.dateTo).format("DD/MM/YYYY") : "fin"}`);
  if (filters.selectedWeekdays?.length) labels.push(filters.selectedWeekdays.map((d) => WEEKDAYS.find((w) => w[0] === d)?.[1]).filter(Boolean).join(", "));
  if (filters.selectedDates?.length) labels.push(filters.selectedDates.map((d) => moment(d).format("DD/MM")).join(", "));
  if (metric) labels.push(metric.label);
  return labels;
}

export default function GpsMicrocycleFiltersPanel({ filters, onApply, players, sessions, cycleDays, metrics }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters || {});
  const sortedPlayers = useMemo(() => [...players].filter(Boolean).sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "")), [players]);
  const positions = useMemo(() => [...new Set(sortedPlayers.map((p) => p.position).filter(Boolean))].sort(), [sortedPlayers]);
  const positionGroups = useMemo(() => [...new Set(sortedPlayers.map((p) => p.position_group || resolvePositionGroup(p.position)).filter(Boolean))].sort(), [sortedPlayers]);
  const cycleDates = useMemo(() => new Set((cycleDays || []).map((d) => d.date)), [cycleDays]);
  const dateOptions = useMemo(() => [...cycleDates].filter(Boolean).sort(), [cycleDates]);
  const objectives = useMemo(() => [...new Set(sessions.map((s) => s.session_objective).filter(Boolean))].sort(), [sessions]);
  const sessionTypes = useMemo(() => [...new Set(sessions.map((s) => s.session_type).filter(Boolean))].sort(), [sessions]);
  const squads = useMemo(() => [...new Map(sessions.filter((s) => s.squad_id).map((s) => [s.squad_id, s.squad_name || s.squad_id])).entries()], [sessions]);
  const seasons = useMemo(() => [...new Set(sessions.map((s) => s.season_id).filter(Boolean))].sort().reverse(), [sessions]);
  const cycleSessions = useMemo(() => sessions.filter((s) => cycleDates.has(s.date)).sort((a, b) => (a.date || "").localeCompare(b.date || "")), [sessions, cycleDates]);
  function update(key, value) { setDraft((prev) => ({ ...prev, [key]: value })); }
  function clear() { setDraft({}); onApply({}); setOpen(false); }
  function apply() { onApply(draft); setOpen(false); }

  return <><button onClick={() => { setDraft(filters || {}); setOpen(true); }} className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-950/80 px-4 text-sm font-semibold text-zinc-200 hover:border-zinc-600 hover:text-white"><Filter size={16} />Filtros</button>{open && <div className="fixed inset-0 z-50 bg-black/70 flex justify-end"><div className="w-full max-w-lg h-full bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col"><div className="p-5 border-b border-zinc-800 flex items-center justify-between"><div><h3 className="text-white font-bold text-lg">Filtros históricos de carga</h3><p className="text-zinc-500 text-sm">Combiná período, MD, objetivo, tipo, plantel, rival y temporada.</p></div><button onClick={() => setOpen(false)} className="p-2 text-zinc-400 hover:text-white"><X size={18} /></button></div><div className="p-5 space-y-4 overflow-y-auto flex-1"><SelectField label="Período" value={draft.rangePreset} onChange={(v) => update("rangePreset", v)} allLabel="Microciclo visible" options={RANGE_OPTIONS} /><div className="grid grid-cols-2 gap-3"><DateField label="Desde" value={draft.dateFrom} onChange={(v) => update("dateFrom", v)} /><DateField label="Hasta" value={draft.dateTo} onChange={(v) => update("dateTo", v)} /></div><div className="grid grid-cols-2 gap-3"><SelectField label="Código del día" value={draft.md} onChange={(v) => update("md", v)} options={MD_OPTIONS} /><SelectField label="Objetivo físico" value={draft.objective} onChange={(v) => update("objective", v)} options={objectives} /></div><div className="grid grid-cols-2 gap-3"><SelectField label="Tipo de sesión" value={draft.sessionType} onChange={(v) => update("sessionType", v)} options={sessionTypes} /><SelectField label="Temporada" value={draft.season} onChange={(v) => update("season", v)} options={seasons} /></div><SelectField label="Plantel" value={draft.squadId} onChange={(v) => update("squadId", v)} options={squads} /><TextField label="Rival" value={draft.rival} onChange={(v) => update("rival", v)} placeholder="Buscar rival..." /><ToggleGrid label="Días específicos" options={WEEKDAYS} values={draft.selectedWeekdays || []} onChange={(v) => update("selectedWeekdays", v)} /><ToggleGrid label="Fechas exactas" options={dateOptions.map((d) => [d, moment(d).format("DD/MM")])} values={draft.selectedDates || []} onChange={(v) => update("selectedDates", v)} /><SelectField label="Jugador" value={draft.playerId} onChange={(v) => update("playerId", v)} allLabel="Todos los jugadores" options={sortedPlayers.map((p) => [p.id, p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim()])} /><div className="grid grid-cols-2 gap-3"><SelectField label="Posición" value={draft.position} onChange={(v) => update("position", v)} options={positions} /><SelectField label="Grupo de posición" value={draft.positionGroup} onChange={(v) => update("positionGroup", v)} options={positionGroups} /></div><div className="grid grid-cols-2 gap-3"><SelectField label="Campo / Arqueros" value={draft.playerType} onChange={(v) => update("playerType", v)} options={TYPE_OPTIONS} /><SelectField label="Incluidos / Excluidos" value={draft.status} onChange={(v) => update("status", v)} options={STATUS_OPTIONS} /></div><SelectField label="Sesión" value={draft.sessionId} onChange={(v) => update("sessionId", v)} allLabel="Todas las sesiones" options={cycleSessions.map((s) => [s.id, `${s.date || ""} · ${s.title || "Sesión"}`])} /><SelectField label="Fecha" value={draft.date} onChange={(v) => update("date", v)} options={dateOptions} /><SelectField label="Variable GPS" value={draft.metricKey} onChange={(v) => update("metricKey", v)} allLabel="Todas las variables" options={metrics.map((m) => [m.key, m.label])} /></div><div className="p-5 border-t border-zinc-800 flex gap-2"><button onClick={clear} className="flex-1 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-xl text-sm font-bold">Limpiar filtros</button><button onClick={apply} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold">Aplicar filtros</button></div></div></div>}</>;
}