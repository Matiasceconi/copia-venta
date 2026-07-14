import React, { useEffect, useMemo, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, ChevronLeft, ChevronRight, Download, Printer, Save, Settings, Sparkles } from "lucide-react";
import moment from "moment";
import "moment/locale/es";
import { useToast } from "@/components/ui/use-toast";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { CLUB_BRAND } from "@/lib/clubBrand";
import { MICROCycle_TEMPLATES } from "@/components/planning/microcycleTemplates";
import MicrocycleTopSummary from "@/components/planning/MicrocycleTopSummary";
import MicrocycleAreaLegend from "@/components/planning/MicrocycleAreaLegend";
import MicrocycleDayColumn from "@/components/planning/MicrocycleDayColumn";
import PlannerSettingsModal from "@/components/planning/PlannerSettingsModal";
import { MD_OPTIONS, WORK_BLOCKS, dayNameEs, getBlockAutoContent, inferSessionForBlock, isFreeDay, objectiveStyle } from "@/components/planning/microcyclePlanUtils";
import { syncSessionsWithWeeklyPlan } from "@/components/planning/microcycleSync";

moment.locale("es");

const GRAPH_TYPES = [{ id: "barras", label: "Barras" }, { id: "linea", label: "Línea" }, { id: "area", label: "Área" }, { id: "radar", label: "Radar" }];
const BLOCK_COLORS = {
  "Objetivo físico": "#16a34a",
  "Objetivo táctico": "#7c3aed",
  Campo: "#16a34a",
  Gimnasio: "#2563eb",
  Compensatorio: "#ea580c",
  "Vuelta a la calma": "#0891b2",
  Recuperación: "#8b5cf6",
  Partido: "#14532d",
  Personalizado: "#52525b",
};

function uid() { return Math.random().toString(36).slice(2, 10); }
function dayName(date) { return dayNameEs(date); }
function defaultMeta(startDate) {
  const start = moment(startDate);
  const end = start.clone().add(6, "days");
  return {
    week_number: String(start.isoWeek()),
    range_label: `${start.format("DD/MM/YYYY")} - ${end.format("DD/MM/YYYY")}`,
    next_match: "",
    current_md: "MD-5",
    week_type: "Normal",
  };
}
function emptyBlock(type = "Campo", content = "") {
  return { id: uid(), type, title: WORK_BLOCKS.find((item) => item.type === type)?.label || type, content, color: BLOCK_COLORS[type] || BLOCK_COLORS.Personalizado, session_id: "", auto_sync: true };
}
function emptyDay(date, index = 0) {
  return { date, md: MD_OPTIONS[Math.min(index, 7)] || "MD-5", physical_objective: "Mixto", blocks: WORK_BLOCKS.map((item) => emptyBlock(item.type)) };
}
function normalizeDay(day, fallbackDate, index) {
  if (Array.isArray(day?.blocks)) return { ...emptyDay(fallbackDate, index), ...day, md: MD_OPTIONS.includes(day?.md) ? day.md : emptyDay(fallbackDate, index).md, blocks: day.blocks.map(b => ({ ...emptyBlock(b.type || "Personalizado"), ...b, id: b.id || uid() })) };
  const blocks = [];
  if (day?.objetivo && day.objetivo !== "—") blocks.push(emptyBlock("Objetivo físico", day.objetivo));
  if (day?.sesionGimnasio) blocks.push(emptyBlock("Gimnasio", day.sesionGimnasio));
  if (day?.trabajoCompensatorio && day.trabajoCompensatorio !== "—") blocks.push(emptyBlock("Compensatorio", day.trabajoCompensatorio));
  if ((day?.vueltaCalma || []).length) blocks.push(emptyBlock("Vuelta a la calma", day.vueltaCalma.join("\n")));
  if ((day?.tareasTecnico || []).some(Boolean)) blocks.push(emptyBlock("Objetivo táctico", day.tareasTecnico.filter(Boolean).join("\n")));
  return { ...emptyDay(fallbackDate, index), ...day, physical_objective: day?.physical_objective || day?.objetivo_fisico || day?.objetivo || "Mixto", blocks: blocks.length ? blocks : emptyDay(fallbackDate, index).blocks };
}
function normalizeText(value) { return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function sessionSignature(session) { return [session?.session_type, session?.session_objective || session?.objective, session?.microcycle_day].map(v => normalizeText(v)).join("|"); }
function fallbackSessionLoad(session) {
  const duration = Number(session?.duration_minutes || 60);
  const type = `${session?.session_type || ""} ${session?.objective || ""} ${session?.session_objective || ""}`.toLowerCase();
  const multiplier = type.includes("partido") ? 1.8 : type.includes("velocidad") ? 1.35 : type.includes("fuerza") ? 0.75 : type.includes("regener") ? 0.45 : 1;
  return {
    total_distance: Math.round(duration * 78 * multiplier),
    distance_19_8: Math.round(duration * 7.5 * multiplier),
    distance_25: Math.round(duration * 2.2 * multiplier),
    acc_3: Math.round(duration * 0.26 * multiplier),
    dec_3: Math.round(duration * 0.24 * multiplier),
    player_load: Math.round(duration * 7.8 * multiplier),
  };
}
function sessionLoad(session, historicalAverages) {
  return historicalAverages?.[sessionSignature(session)] || fallbackSessionLoad(session);
}
function isFreeCalendarEvent(ev) {
  const text = normalizeText(`${ev.title || ""} ${ev.event_type || ""} ${ev.type || ""}`);
  return text.includes("libre") || text.includes("descanso") || text.includes("sin actividad");
}
function isMatchEvent(ev) {
  return normalizeText(`${ev.title || ""} ${ev.event_type || ""} ${ev.type || ""}`).includes("partido");
}
function isTravelEvent(ev) {
  const text = normalizeText(`${ev.title || ""} ${ev.event_type || ""} ${ev.type || ""}`);
  return text.includes("viaje") || text.includes("traslado") || text.includes("salida");
}
function eventTime(ev) { return ev?.time || ev?.start_time || "Horario sin definir"; }
function eventCompetition(ev) {
  const notes = String(ev?.notes || "");
  return ev?.competition || ev?.competencia || notes.match(/competencia\s*:?\s*([^\n·|]+)/i)?.[1] || "Competencia sin definir";
}
function addLoads(a, b) {
  return Object.fromEntries(["total_distance", "distance_19_8", "distance_25", "acc_3", "dec_3", "player_load"].map(k => [k, (a[k] || 0) + (b[k] || 0)]));
}
function compactNumber(value) { return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(Math.round(value || 0)); }
function blockSession(block, sessionsById) { return block.auto_sync === false && block.session_snapshot ? block.session_snapshot : sessionsById[block.session_id]; }

function MicrocycleExportView({ days, meta, dayLoads, summary, sessionDetails, sessionsById, sessionLibrary, calendarEvents, physicalObjectives, showChart, onExit }) {
  return <div className="min-h-screen bg-white text-zinc-950 p-6 print:p-0">
    <style>{`@media print { .no-print { display: none !important; } body { background: white !important; } .break-inside-avoid { break-inside: avoid; } }`}</style>
    <div className="no-print flex justify-end gap-2 mb-4">
      <button onClick={() => window.print()} className="px-3 py-2 bg-zinc-900 text-white rounded-lg text-sm flex items-center gap-2"><Printer size={15} /> Imprimir / PDF</button>
      <button onClick={onExit} className="px-3 py-2 bg-zinc-200 rounded-lg text-sm">Volver</button>
    </div>
    <div className="rounded-2xl border-b-4 pb-4 mb-5 p-4 flex justify-between items-start" style={{ borderColor: CLUB_BRAND.colors.green, background: `linear-gradient(135deg, ${CLUB_BRAND.colors.panel}, #ffffff 62%, ${CLUB_BRAND.colors.yellow}22)` }}>
      <div className="flex items-center gap-4">
        <img src={CLUB_BRAND.logoUrl} alt={CLUB_BRAND.name} className="w-16 h-16 object-contain" />
        <div><p className="text-xs font-bold uppercase" style={{ color: CLUB_BRAND.colors.greenDark }}>{CLUB_BRAND.name}</p><h1 className="text-3xl font-black">Planificación de Microciclo</h1><p className="text-sm text-zinc-600">Semana {meta.week_number} · {meta.range_label}</p></div>
      </div>
      <div className="text-right text-sm"><p className="font-black uppercase" style={{ color: CLUB_BRAND.colors.greenDeep }}>{meta.week_type}</p><p>{meta.next_match}</p></div>
    </div>
    <div className="grid gap-2 mb-5" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
      {days.map((day, idx) => {
        const dayEvents = calendarEvents.filter((ev) => ev.date === day.date);
        const match = dayEvents.find(isMatchEvent);
        const travel = dayEvents.find(isTravelEvent);
        const special = match || travel;
        const free = !special && isFreeDay(day);
        const objStyle = objectiveStyle(day.physical_objective || "Mixto", physicalObjectives);
        return <div key={idx} className={`border rounded-xl overflow-hidden break-inside-avoid ${free ? "bg-blue-50 border-blue-200" : special ? "bg-emerald-50 border-emerald-700" : "bg-white border-zinc-200"}`}>
          <div className="p-2 text-center border-b border-zinc-100">
            <p className="text-[10px] font-black text-zinc-500 tracking-widest">{dayName(day.date)}</p>
            <p className="text-sm font-black text-zinc-900">{moment(day.date).format("DD/MM")}</p>
            <p className={`text-2xl font-black mt-1 ${free ? "text-blue-700" : "text-slate-950"}`}>{free ? "Libre" : day.md}</p>
            {!free && !special && <p className="mt-1 rounded-lg px-2 py-1 text-[9px] font-black" style={{ backgroundColor: objStyle.bg, color: objStyle.text }}>{day.physical_objective || "Mixto"}</p>}
          </div>
          {special ? <div className="min-h-[260px] p-3 flex flex-col items-center justify-center text-center">
            {match?.rival_logo_url && <img src={match.rival_logo_url} alt="Escudo rival" className="w-14 h-14 object-contain mb-3" />}
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">{match ? "Partido" : "Viaje"}</p>
            <p className="text-lg font-black mt-1">{match ? `vs ${match.rival || match.title || "Rival"}` : travel.title || "Viaje"}</p>
            {match && <p className="text-[10px] font-bold text-zinc-600 mt-2">{eventCompetition(match)} · {match.home_away || "Condición"} · {eventTime(match)}</p>}
            {travel && <p className="text-[10px] font-bold text-zinc-600 mt-2">{eventTime(travel)}</p>}
          </div> : free ? <div className="min-h-[260px] flex flex-col items-center justify-center text-blue-700"><p className="text-3xl">☾</p><p className="text-lg font-black mt-2">DÍA LIBRE</p></div> : <div className="p-2 space-y-2 min-h-[260px]">
            {WORK_BLOCKS.map((config) => {
              const existing = (day.blocks || []).find((item) => item.type === config.type);
              if (config.type === "Compensatorio" && !existing) return null;
              const block = existing || { type: config.type };
              const session = block.auto_sync === false ? null : block.session_id ? blockSession(block, sessionsById) : inferSessionForBlock(day, config.type, sessionLibrary);
              const content = getBlockAutoContent(block, session, sessionDetails[block.session_id || session?.id]);
              return <div key={config.type} className="rounded-lg bg-zinc-50 border border-zinc-100 p-2">
                <p className="text-[9px] font-black uppercase" style={{ color: config.color }}>{config.label}</p>
                <p className="text-[10px] whitespace-pre-wrap mt-1 leading-relaxed text-zinc-700">{content || "—"}</p>
              </div>;
            })}
          </div>}
        </div>;
      })}
    </div>
    <div className={showChart ? "grid grid-cols-3 gap-3" : "grid grid-cols-1 gap-3"}><div className="border rounded-xl p-3" style={{ borderColor: CLUB_BRAND.colors.line }}><p className="text-xs font-black uppercase" style={{ color: CLUB_BRAND.colors.greenDark }}>Resumen automático</p><p className="text-sm mt-2 whitespace-pre-wrap">{summary}</p></div>{showChart && <div className="border rounded-xl p-3 col-span-2" style={{ borderColor: CLUB_BRAND.colors.line }}><LoadChart data={dayLoads} type="barras" clean /></div>}</div>
  </div>;
}

function LoadChart({ data, type, clean = false }) {
  const chartData = data.map(d => ({ day: d.day, Carga: Math.round(d.player_load || 0), Distancia: Math.round((d.total_distance || 0) / 100) }));
  const text = clean ? "#111827" : "#a1a1aa";
  if (type === "radar") return <ResponsiveContainer width="100%" height={260}><RadarChart data={chartData}><PolarGrid stroke={CLUB_BRAND.colors.line} /><PolarAngleAxis dataKey="day" tick={{ fill: text, fontSize: 10 }} /><Radar dataKey="Carga" stroke={CLUB_BRAND.colors.green} fill={CLUB_BRAND.colors.green} fillOpacity={0.35} /></RadarChart></ResponsiveContainer>;
  const common = <><CartesianGrid strokeDasharray="3 3" stroke={clean ? "#e5e7eb" : "#27272a"} /><XAxis dataKey="day" tick={{ fill: text, fontSize: 11 }} /><YAxis tick={{ fill: text, fontSize: 10 }} /><Tooltip /></>;
  if (type === "linea") return <ResponsiveContainer width="100%" height={260}><LineChart data={chartData}>{common}<Line type="monotone" dataKey="Carga" stroke={CLUB_BRAND.colors.green} strokeWidth={3} /></LineChart></ResponsiveContainer>;
  if (type === "area") return <ResponsiveContainer width="100%" height={260}><AreaChart data={chartData}>{common}<Area type="monotone" dataKey="Carga" stroke={CLUB_BRAND.colors.green} fill={CLUB_BRAND.colors.green} fillOpacity={0.28} /></AreaChart></ResponsiveContainer>;
  return <ResponsiveContainer width="100%" height={260}><BarChart data={chartData}>{common}<Bar dataKey="Carga" fill={CLUB_BRAND.colors.green} radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>;
}

export default function WeeklyPlannerBoard() {
  const { toast } = useToast();
  const { activeSquadId, activeSquad, activeSeasonId } = useWorkspace();
  const aiInputRef = useRef(null);
  const [startDate, setStartDate] = useState(moment().startOf("isoWeek").format("YYYY-MM-DD"));
  const [days, setDays] = useState(() => Array.from({ length: 7 }, (_, i) => emptyDay(moment().startOf("isoWeek").add(i, "days").format("YYYY-MM-DD"), i)));
  const [dayCount, setDayCount] = useState(7);
  const [meta, setMeta] = useState(defaultMeta(moment().startOf("isoWeek").format("YYYY-MM-DD")));
  const [graphType, setGraphType] = useState("barras");
  const [recordId, setRecordId] = useState(null);
  const [sessionLibrary, setSessionLibrary] = useState([]);
  const [sessionDetails, setSessionDetails] = useState({});
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [physicalObjectives, setPhysicalObjectives] = useState([]);
  const [cooldownOptions, setCooldownOptions] = useState([]);
  const [gpsRows, setGpsRows] = useState([]);
  const [savedPlans, setSavedPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showLoadChart, setShowLoadChart] = useState(false);
  const [exportPromptOpen, setExportPromptOpen] = useState(false);
  const [exportWithChart, setExportWithChart] = useState(true);
  const [exportMode, setExportMode] = useState(false);

  async function refreshPhysicalObjectives() {
    const rows = await base44.entities.PhysicalObjective.list("order", 100);
    setPhysicalObjectives(rows.filter((item) => item.active !== false));
  }

  async function refreshCooldownOptions() {
    const rows = await base44.entities.PlannerDropdownOption.filter({ group: "cooldown" }, "order", 100);
    setCooldownOptions(rows.filter((item) => item.active !== false));
  }

  useEffect(() => { refreshPhysicalObjectives(); refreshCooldownOptions(); }, []);

  useEffect(() => {
    async function loadPlans() {
      const all = await base44.entities.WeeklyPlan.list("-week_start", 100);
      setSavedPlans(activeSquadId ? all.filter(r => r.squad_id === activeSquadId && (!r.season_id || !activeSeasonId || r.season_id === activeSeasonId)) : all);
    }
    loadPlans();
  }, [activeSquadId, activeSeasonId, recordId]);

  useEffect(() => {
    async function loadPlan() {
      setLoading(true);
      const all = await base44.entities.WeeklyPlan.filter({ week_start: startDate });
      const records = activeSquadId ? all.filter(r => r.squad_id === activeSquadId && (!r.season_id || !activeSeasonId || r.season_id === activeSeasonId)) : all;
      const rec = records[0];
      if (rec) {
        setRecordId(rec.id);
        setMeta({ ...defaultMeta(startDate), ...(rec.microcycle_meta || {}) });
        setGraphType(rec.graph_type || "barras");
        const loaded = (rec.days_data || []).map((d, i) => normalizeDay(d, moment(startDate).add(i, "days").format("YYYY-MM-DD"), i));
        setDayCount(loaded.length || dayCount);
        setDays(loaded.length ? loaded : Array.from({ length: dayCount }, (_, i) => emptyDay(moment(startDate).add(i, "days").format("YYYY-MM-DD"), i)));
      } else {
        setRecordId(null);
        setMeta(defaultMeta(startDate));
        setGraphType("barras");
        setDays(Array.from({ length: dayCount }, (_, i) => emptyDay(moment(startDate).add(i, "days").format("YYYY-MM-DD"), i)));
      }
      setLoading(false);
    }
    loadPlan();
  }, [startDate, activeSquadId, activeSeasonId]);

  useEffect(() => {
    async function loadSessions() {
      const all = await base44.entities.TrainingSession.list("-date", 300);
      setSessionLibrary(all.filter(s => (!activeSquadId || s.squad_id === activeSquadId) && (!activeSeasonId || !s.season_id || s.season_id === activeSeasonId)));
    }
    loadSessions();
  }, [activeSquadId, activeSeasonId]);

  useEffect(() => {
    async function loadCalendarEvents() {
      const all = await base44.entities.DayEvent.list("date", 500);
      setCalendarEvents(all.filter(ev => (!activeSquadId || ev.squad_id === activeSquadId) && (!activeSeasonId || !ev.season_id || ev.season_id === activeSeasonId)));
    }
    loadCalendarEvents();
  }, [activeSquadId, activeSeasonId, startDate]);

  useEffect(() => {
    async function loadGpsRows() {
      const rows = await base44.entities.SessionGPSData.list("-created_date", 2000);
      setGpsRows(rows.filter(r => r.include_in_session_average !== false));
    }
    loadGpsRows();
  }, [activeSquadId, activeSeasonId]);

  useEffect(() => {
    const refreshCalendar = async () => {
      const all = await base44.entities.DayEvent.list("date", 500);
      setCalendarEvents(all.filter(ev => (!activeSquadId || ev.squad_id === activeSquadId) && (!activeSeasonId || !ev.season_id || ev.season_id === activeSeasonId)));
    };
    const refreshSessions = async () => {
      const all = await base44.entities.TrainingSession.list("-date", 300);
      setSessionLibrary(all.filter(s => (!activeSquadId || s.squad_id === activeSquadId) && (!activeSeasonId || !s.season_id || s.season_id === activeSeasonId)));
    };
    const refreshGps = async () => {
      const rows = await base44.entities.SessionGPSData.list("-created_date", 2000);
      setGpsRows(rows.filter(r => r.include_in_session_average !== false));
    };
    const unsubDayEvent = base44.entities.DayEvent.subscribe(refreshCalendar);
    const unsubTrainingSession = base44.entities.TrainingSession.subscribe(refreshSessions);
    const unsubGps = base44.entities.SessionGPSData.subscribe(refreshGps);
    return () => { unsubDayEvent?.(); unsubTrainingSession?.(); unsubGps?.(); };
  }, [activeSquadId, activeSeasonId]);

  const sessionsById = useMemo(() => Object.fromEntries(sessionLibrary.map(s => [s.id, s])), [sessionLibrary]);
  const linkedSessionIds = useMemo(() => [...new Set(days.flatMap(day => {
    const dayEvents = calendarEvents.filter((ev) => ev.date === day.date);
    if (isFreeDay(day) || dayEvents.some(isMatchEvent) || dayEvents.some(isTravelEvent)) return [];
    const explicit = (day.blocks || []).map(block => block.session_id).filter(Boolean);
    const inferred = WORK_BLOCKS.map((config) => {
      const existing = (day.blocks || []).find((item) => item.type === config.type);
      if (config.type === "Compensatorio" && !existing) return null;
      const block = existing || { type: config.type };
      return block.auto_sync === false ? null : inferSessionForBlock(day, config.type, sessionLibrary)?.id;
    }).filter(Boolean);
    return [...explicit, ...inferred];
  }))], [days, sessionLibrary, calendarEvents]);
  const nextMatch = useMemo(() => calendarEvents.filter(ev => isMatchEvent(ev) && ev.date >= moment().format("YYYY-MM-DD")).sort((a, b) => `${a.date} ${a.time || a.start_time || ""}`.localeCompare(`${b.date} ${b.time || b.start_time || ""}`))[0] || null, [calendarEvents]);

  const historicalAverages = useMemo(() => {
    const gpsBySession = gpsRows.reduce((acc, row) => {
      if (!row.session_id) return acc;
      acc[row.session_id] = acc[row.session_id] || [];
      acc[row.session_id].push(row);
      return acc;
    }, {});
    const metricKeys = ["total_distance", "distance_19_8", "distance_25", "acc_3", "dec_3", "player_load"];
    const grouped = {};
    sessionLibrary.forEach(session => {
      const rows = gpsBySession[session.id] || [];
      if (!rows.length) return;
      const sessionAvg = Object.fromEntries(metricKeys.map(key => [key, rows.reduce((sum, row) => sum + Number(row[key] || 0), 0) / rows.length]));
      const signature = sessionSignature(session);
      grouped[signature] = grouped[signature] || [];
      grouped[signature].push(sessionAvg);
    });
    return Object.fromEntries(Object.entries(grouped).map(([signature, values]) => [signature, Object.fromEntries(metricKeys.map(key => [key, values.reduce((sum, row) => sum + Number(row[key] || 0), 0) / values.length]))]));
  }, [gpsRows, sessionLibrary]);

  useEffect(() => {
    if (nextMatch) setMeta(prev => ({ ...prev, next_match: nextMatch.rival ? `vs ${nextMatch.rival}` : nextMatch.title || "Partido" }));
  }, [nextMatch]);

  useEffect(() => {
    setDays(prev => {
      let changed = false;
      const next = prev.map((day, index) => {
        const dayEvents = calendarEvents.filter(ev => ev.date === day.date);
        const hasFree = dayEvents.some(isFreeCalendarEvent);
        const hasWork = dayEvents.some(ev => !isFreeCalendarEvent(ev));
        const isDefaultEmpty = (day.blocks || []).every(b => !b.content && !b.session_id && WORK_BLOCKS.some((item) => item.type === b.type));
        if (hasFree && !hasWork && (day.auto_free || isDefaultEmpty)) {
          if (day.auto_free && day.md === "Libre") return day;
          changed = true;
          return { ...day, md: "Libre", auto_free: true, blocks: [] };
        }
        if (!hasFree && day.auto_free) {
          changed = true;
          return emptyDay(day.date, index);
        }
        return day;
      });
      return changed ? next : prev;
    });
  }, [calendarEvents, days.map(d => d.date).join("|")]);

  useEffect(() => {
    async function loadDetails() {
      const entries = await Promise.all(linkedSessionIds.map(async id => {
        const [strength, strengthBlocks, exercises, field] = await Promise.all([
          base44.entities.StrengthStation.filter({ session_id: id }, "order"),
          base44.entities.StrengthWorkBlock.filter({ session_id: id }, "order"),
          base44.entities.SessionExercise.filter({ session_id: id }, "order"),
          base44.entities.FieldExercise.filter({ session_id: id }, "order"),
        ]);
        return [id, { strength, strengthBlocks, exercises, field }];
      }));
      setSessionDetails(Object.fromEntries(entries));
    }
    if (linkedSessionIds.length) loadDetails(); else setSessionDetails({});
  }, [linkedSessionIds.join("|")]);

  const dayLoads = useMemo(() => days.map(day => {
    const dayEvents = calendarEvents.filter((ev) => ev.date === day.date);
    if (isFreeDay(day) || dayEvents.some(isMatchEvent) || dayEvents.some(isTravelEvent)) return { day: dayName(day.date).slice(0, 3), date: day.date };
    const load = WORK_BLOCKS.reduce((acc, config) => {
      const existing = (day.blocks || []).find((item) => item.type === config.type);
      if (config.type === "Compensatorio" && !existing) return acc;
      const block = existing || { type: config.type };
      const session = block.auto_sync === false ? null : block.session_id ? blockSession(block, sessionsById) : inferSessionForBlock(day, config.type, sessionLibrary);
      return session ? addLoads(acc, sessionLoad(session, historicalAverages)) : acc;
    }, {});
    return { ...load, day: dayName(day.date).slice(0, 3), date: day.date };
  }), [days, calendarEvents, sessionsById, sessionLibrary, historicalAverages]);

  const summary = useMemo(() => {
    const total = dayLoads.reduce((sum, d) => sum + (d.player_load || 0), 0);
    const peak = dayLoads.reduce((a, b) => (b.player_load || 0) > (a.player_load || 0) ? b : a, dayLoads[0] || {});
    const recovery = days.find(d => isFreeDay(d) || (d.blocks || []).some(b => ["Compensatorio", "Vuelta a la calma"].includes(b.type) && b.session_id)) || days[dayLoads.findIndex(d => (d.player_load || 0) === Math.min(...dayLoads.map(x => x.player_load || 0)))] || days[0];
    const activeDays = days.filter(d => {
      const dayEvents = calendarEvents.filter((ev) => ev.date === d.date);
      return !isFreeDay(d) && !dayEvents.some(isMatchEvent) && !dayEvents.some(isTravelEvent);
    });
    const field = activeDays.filter(day => {
      const block = (day.blocks || []).find(b => b.type === "Campo") || { type: "Campo" };
      return block.auto_sync === false ? Boolean(block.content) : block.session_id || inferSessionForBlock(day, "Campo", sessionLibrary);
    }).length;
    const gym = activeDays.filter(day => {
      const block = (day.blocks || []).find(b => b.type === "Gimnasio") || { type: "Gimnasio" };
      return block.auto_sync === false ? Boolean(block.content) : block.session_id || inferSessionForBlock(day, "Gimnasio", sessionLibrary);
    }).length;
    const status = total > 3500 ? "Alta demanda" : total < 1600 ? "Descarga / baja carga" : "Equilibrada";
    return { total, peak, recovery, field, gym, status };
  }, [days, dayLoads, sessionLibrary, calendarEvents]);

  const autoText = `La semana queda estructurada como ${meta.week_type}. El pico principal aparece el ${summary.peak?.day || "—"}. Se planifican ${summary.field} bloques de campo y ${summary.gym} bloques de gimnasio. El día de recuperación queda ubicado en ${summary.recovery?.date ? dayName(summary.recovery.date) : "—"}. Estado general: ${summary.status}.`;

  function updateDay(idx, patch) { setDays(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d)); }
  function updateBlock(dayIdx, blockId, patch) {
    setDays(prev => prev.map((d, i) => i !== dayIdx ? d : { ...d, blocks: d.blocks.map(b => b.id === blockId ? { ...b, ...patch } : b) }));
  }
  function addBlock(dayIdx, type = "Campo") { updateDay(dayIdx, { blocks: [...days[dayIdx].blocks, emptyBlock(type)] }); }
  function duplicateBlock(dayIdx, block) { updateDay(dayIdx, { blocks: [...days[dayIdx].blocks, { ...block, id: uid(), title: `${block.title} copia` }] }); }
  function deleteBlock(dayIdx, blockId) { updateDay(dayIdx, { blocks: days[dayIdx].blocks.filter(b => b.id !== blockId) }); }
  function onDragEnd(result) {
    if (!result.destination) return;
    const from = Number(result.source.droppableId);
    const to = Number(result.destination.droppableId);
    const next = [...days];
    const [moved] = next[from].blocks.splice(result.source.index, 1);
    next[to].blocks.splice(result.destination.index, 0, moved);
    setDays(next);
  }
  function syncSessionFromDay(dayIdx, sessionId) {
    const session = sessionsById[sessionId];
    const day = days[dayIdx];
    if (session && day) {
      const patch = {};
      if (!session.md_manual_override && day.md && session.match_day_code !== day.md) {
        patch.match_day_code = day.md;
        patch.microcycle_day = day.md;
      }
      if (!session.physical_objective_manual_override && day.physical_objective && session.session_objective !== day.physical_objective) {
        patch.session_objective = day.physical_objective;
      }
      if (Object.keys(patch).length) {
        base44.entities.TrainingSession.update(session.id, patch).then((updated) => {
          setSessionLibrary(prev => prev.map(item => item.id === updated.id ? updated : item));
        });
      }
    }
  }
  function selectSession(dayIdx, blockId, sessionId) {
    const session = sessionsById[sessionId];
    syncSessionFromDay(dayIdx, sessionId);
    updateBlock(dayIdx, blockId, { session_id: sessionId, session_snapshot: session ? { title: session.title, duration_minutes: session.duration_minutes, objective: session.objective, session_type: session.session_type } : null });
  }
  function addDay() { setDays(prev => [...prev, emptyDay(moment(prev[prev.length - 1]?.date || startDate).add(1, "days").format("YYYY-MM-DD"), prev.length)]); }
  function removeDay() { if (days.length > 1) setDays(prev => prev.slice(0, -1)); }
  function setMicrocycleLength(length) {
    const safeLength = Math.max(1, Math.min(10, Number(length) || 7));
    setDayCount(safeLength);
    const endDate = moment(startDate).add(safeLength - 1, "days");
    setMeta(prev => ({ ...prev, range_label: `${moment(startDate).format("DD/MM/YYYY")} - ${endDate.format("DD/MM/YYYY")}` }));
    setDays(prev => Array.from({ length: safeLength }, (_, i) => prev[i] || emptyDay(moment(startDate).add(i, "days").format("YYYY-MM-DD"), i)));
  }
  function shiftWeek(delta) { setStartDate(moment(startDate).add(delta * days.length, "days").format("YYYY-MM-DD")); }
  function applyTemplate(id) {
    const tpl = MICROCycle_TEMPLATES.find(t => t.id === id);
    if (!tpl) return;
    setDayCount(tpl.days.length);
    setMeta(prev => ({ ...prev, week_type: tpl.type, range_label: `${moment(startDate).format("DD/MM/YYYY")} - ${moment(startDate).add(tpl.days.length - 1, "days").format("DD/MM/YYYY")}` }));
    setDays(tpl.days.map((md, i) => {
      const rawObjective = tpl.objectives[i] || "Mixto";
      const physicalObjective = rawObjective === "Volumen" ? "Duración metabólica" : rawObjective === "Táctica" || rawObjective === "Partido" ? "Mixto" : rawObjective;
      return { ...emptyDay(moment(startDate).add(i, "days").format("YYYY-MM-DD"), i), md, physical_objective: physicalObjective };
    }));
  }
  async function save() {
    setSaving(true);
    const payload = { week_start: startDate, squad_id: activeSquadId || null, squad_name: activeSquad?.name || "", season_id: activeSeasonId || activeSquad?.season || "", microcycle_meta: meta, graph_type: graphType, template_type: meta.week_type, days_data: days, notes: autoText };
    const savedPlan = recordId ? await base44.entities.WeeklyPlan.update(recordId, payload) : await base44.entities.WeeklyPlan.create(payload);
    if (!recordId) setRecordId(savedPlan.id);
    const syncedCount = await syncSessionsWithWeeklyPlan({ ...payload, id: savedPlan.id });
    setSaving(false);
    toast({ title: syncedCount ? `Microciclo guardado · ${syncedCount} sesiones sincronizadas` : "Microciclo guardado correctamente" });
  }
  async function handleAiFile(file) {
    if (!file) return;
    setAiLoading(true);
    try {
      const upload = await base44.integrations.Core.UploadFile({ file });
      const output = await base44.integrations.Core.InvokeLLM({
        file_urls: [upload.file_url],
        response_json_schema: { type: "object", properties: { week_type: { type: "string" }, next_match: { type: "string" }, days: { type: "array", items: { type: "object", properties: { date: { type: "string" }, md: { type: "string" }, blocks: { type: "array", items: { type: "object", properties: { type: { type: "string" }, title: { type: "string" }, content: { type: "string" } } } } } } } } },
        prompt: `Interpretá este cronograma o plan semanal deportivo y generá un microciclo editable. Usá fechas YYYY-MM-DD, días MD, objetivos físicos/tácticos, campo, gimnasio, preventivos y recuperación. Fecha de inicio esperada: ${startDate}.`,
      });
      if (output.week_type || output.next_match) setMeta(prev => ({ ...prev, week_type: output.week_type || prev.week_type, next_match: output.next_match || prev.next_match }));
      if (Array.isArray(output.days) && output.days.length) setDays(output.days.map((d, i) => normalizeDay(d, d.date || moment(startDate).add(i, "days").format("YYYY-MM-DD"), i)));
    } catch {
      toast({ title: "No se pudo crear el microciclo con IA", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  }

  if (exportMode) return <MicrocycleExportView days={days} meta={meta} dayLoads={dayLoads} summary={autoText} sessionDetails={sessionDetails} sessionsById={sessionsById} sessionLibrary={sessionLibrary} calendarEvents={calendarEvents} physicalObjectives={physicalObjectives} showChart={exportWithChart} onExit={() => setExportMode(false)} />;
  if (loading) return <div className="h-64 flex items-center justify-center"><div className="w-7 h-7 border-2 border-zinc-700 border-t-white rounded-full animate-spin" /></div>;

  return <div className="min-h-screen w-full min-w-0 text-zinc-950 space-y-3" style={{ background: CLUB_BRAND.colors.panel }}>
    <input ref={aiInputRef} type="file" className="hidden" accept=".pdf,.xlsx,.xls,.doc,.docx,.csv,.png,.jpg,.jpeg" onChange={e => handleAiFile(e.target.files?.[0])} />
    <PlannerSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} physicalObjectives={physicalObjectives} onRefreshObjectives={refreshPhysicalObjectives} cooldownOptions={cooldownOptions} onRefreshCooldown={refreshCooldownOptions} />
    {exportPromptOpen && <div className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-sm flex items-center justify-center p-4"><div className="w-full max-w-md rounded-3xl bg-white border border-zinc-200 shadow-2xl p-5"><p className="text-xs font-black uppercase tracking-widest text-emerald-700">Exportar microciclo</p><h3 className="text-xl font-black text-zinc-950 mt-1">Elegí el formato</h3><p className="text-sm text-zinc-500 mt-1">La vista de exportación se abrirá lista para imprimir o guardar como PDF.</p><div className="grid grid-cols-1 gap-2 mt-5"><button onClick={() => { setExportWithChart(true); setExportPromptOpen(false); setExportMode(true); }} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left"><b className="text-sm text-emerald-900">Exportar con gráfico de carga</b><p className="text-xs text-emerald-700 mt-1">Incluye distribución de carga externa.</p></button><button onClick={() => { setExportWithChart(false); setExportPromptOpen(false); setExportMode(true); }} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left"><b className="text-sm text-zinc-900">Exportar sin gráfico de carga</b><p className="text-xs text-zinc-500 mt-1">Versión más limpia y compacta.</p></button></div><button onClick={() => setExportPromptOpen(false)} className="mt-4 w-full rounded-xl bg-zinc-100 px-4 py-2 text-xs font-black text-zinc-600">Cancelar</button></div></div>}

    <header className="border rounded-xl shadow-sm px-4 py-3 flex items-center justify-between gap-3 flex-wrap overflow-hidden" style={{ borderColor: CLUB_BRAND.colors.line, background: `linear-gradient(135deg, ${CLUB_BRAND.colors.white} 0%, ${CLUB_BRAND.colors.panel} 72%, ${CLUB_BRAND.colors.yellow}26 100%)` }}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-white border flex items-center justify-center shadow-sm p-1.5" style={{ borderColor: CLUB_BRAND.colors.green }}><img src={CLUB_BRAND.logoUrl} alt={CLUB_BRAND.name} className="w-full h-full object-contain" /></div>
        <div><p className="text-[10px] font-black uppercase tracking-widest" style={{ color: CLUB_BRAND.colors.greenDark }}>{CLUB_BRAND.name}</p><h1 className="text-lg font-black tracking-tight">PLANIFICADOR DE MICROCICLO</h1><p className="text-xs text-zinc-500">{activeSquad?.name || "Plantel"} · {activeSeasonId || activeSquad?.season || "Temporada"}</p></div>
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <button onClick={() => shiftWeek(-1)} className="p-2 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50"><ChevronLeft size={16} /></button>
        <button onClick={() => shiftWeek(1)} className="p-2 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50"><ChevronRight size={16} /></button>
        <select value={days.length} onChange={e => setMicrocycleLength(e.target.value)} className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-zinc-600 text-xs font-bold">{Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} días</option>)}</select>
        <select value="" onChange={e => { if (e.target.value) applyTemplate(e.target.value); e.target.value = ""; }} className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-zinc-600 text-xs font-bold"><option value="">Plantillas de microciclo</option>{MICROCycle_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        {savedPlans.length > 0 && <select value="" onChange={e => e.target.value && setStartDate(e.target.value)} className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-zinc-600 text-xs font-bold"><option value="">Planes guardados</option>{savedPlans.map(plan => <option key={plan.id} value={plan.week_start}>{moment(plan.week_start).format("DD/MM/YYYY")}</option>)}</select>}
        <button onClick={() => setSettingsOpen(true)} className="px-3 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-700 text-xs font-black flex items-center gap-2 shadow-sm"><Settings size={14} /> Configuración</button>
        <button onClick={() => setShowLoadChart(prev => !prev)} className="px-3 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-700 text-xs font-black flex items-center gap-2 shadow-sm"><BarChart3 size={14} /> {showLoadChart ? "Ocultar carga" : "Mostrar carga"}</button>
        <button onClick={() => aiInputRef.current?.click()} className="px-3 py-2 rounded-lg text-white text-xs font-black flex items-center gap-2 shadow-sm" style={{ backgroundColor: CLUB_BRAND.colors.green }}><Sparkles size={14} /> {aiLoading ? "Creando..." : "Crear con IA"}</button>
        <button onClick={save} disabled={saving} className="px-3 py-2 rounded-lg text-xs font-black flex items-center gap-2 shadow-sm" style={{ backgroundColor: CLUB_BRAND.colors.yellow, color: CLUB_BRAND.colors.greenDeep }}><Save size={14} /> {saving ? "Guardando..." : "Guardar"}</button>
        <button onClick={() => setExportPromptOpen(true)} className="px-3 py-2 rounded-lg text-white text-xs font-black flex items-center gap-2 shadow-sm" style={{ backgroundColor: CLUB_BRAND.colors.greenDark }}><Download size={14} /> Exportar / Compartir</button>
      </div>
    </header>

    <MicrocycleTopSummary meta={meta} activeSquad={activeSquad} activeSeasonId={activeSeasonId} startDateLabel={meta.range_label} nextMatch={nextMatch} dayCount={days.length} />

    <section className="grid min-w-0 grid-cols-1 gap-4 items-start xl:grid-cols-[180px_minmax(0,1fr)]">
      <MicrocycleAreaLegend objectives={physicalObjectives} />
      <div className="min-w-0 overflow-x-auto">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(170px, 1fr))` }}>
          {days.map((day, dayIdx) => <MicrocycleDayColumn key={dayIdx} day={day} dayIdx={dayIdx} sessionLibrary={sessionLibrary} sessionDetails={sessionDetails} blockSession={blockSession} sessionsById={sessionsById} updateDay={updateDay} onSelectSession={syncSessionFromDay} physicalObjectives={physicalObjectives} cooldownOptions={cooldownOptions} calendarEvents={calendarEvents.filter((ev) => ev.date === day.date)} />)}
        </div>
      </div>

    </section>

    {showLoadChart && <section className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2"><div><h3 className="font-black text-zinc-950">Carga externa</h3><p className="text-xs text-zinc-500">Distribución conectada a sesiones y cargas esperadas.</p></div><div className="flex gap-1 bg-zinc-100 rounded-lg p-1">{GRAPH_TYPES.map(g => <button key={g.id} onClick={() => setGraphType(g.id)} className={`px-3 py-1.5 rounded-md text-xs font-black ${graphType === g.id ? "bg-white text-emerald-700 shadow-sm" : "text-zinc-500"}`}>{g.label}</button>)}</div></div>
      <LoadChart data={dayLoads} type={graphType} clean />
    </section>}

    <footer className="text-xs text-zinc-500 px-2">ⓘ Planificación conectada con sesiones, ejercicios y cargas esperadas.</footer>
  </div>;
}