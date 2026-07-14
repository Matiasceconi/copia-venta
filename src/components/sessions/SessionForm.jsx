import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, CheckSquare, Square, Search } from "lucide-react";
import { isGoalkeeper } from "@/components/squad/squadConstants";
import moment from "moment";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { getMicrocycleDefaults, SESSION_MD_CODES } from "@/components/planning/microcycleSync";

const MD_CODES = SESSION_MD_CODES;
const OBJECTIVE_OPTS = ["Tensión", "Volumen", "Activación", "Velocidad", "Recuperación", "Otro"];
const PERIOD_OPTIONS = ["Pretemporada", "Competencia", "Transición"];

const AVAILABLE_STATUSES = ["disponible", "subió", "convocado"];
const KINESIO_STATUSES = ["lesionado", "reintegro"];
const UNAVAILABLE_STATUSES = ["molestia", "diferenciado", "suspendido", "ausente", "bajó"];

const STATUS_LABELS = {
  disponible: "Disponible", lesionado: "Lesionado", molestia: "Molestia",
  diferenciado: "Diferenciado", suspendido: "Suspendido", ausente: "Ausente",
  "bajó": "Bajó", "subió": "Subió", convocado: "Convocado",
  reintegro: "Reintegro", descanso: "Descanso",
};

export default function SessionForm({ onCreated, onCancel, nextSessionNumber }) {
  const { activeSquadId, activeSeasonId } = useWorkspace();
  const [squads, setSquads] = useState([]);
  const [form, setForm] = useState({
    title: "", session_number: nextSessionNumber || "", date: moment().format("YYYY-MM-DD"),
    squad_id: activeSquadId || "", period: "Competencia", match_day_code: "MD-1",
    duration_minutes: 60, location: "", session_objective: "Volumen",
  });
  const [squadPlayers, setSquadPlayers] = useState([]); // {player, ds}
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("");
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [planDefaults, setPlanDefaults] = useState(null);
  const [physicalObjectives, setPhysicalObjectives] = useState([]);
  const [manualMeta, setManualMeta] = useState({ md: false, objective: false });

  useEffect(() => {
    base44.entities.Squad.list("name", 100).then(sq => {
      const active = sq.filter(s => s.active !== false);
      setSquads(active);
      // Pre-select active squad from context, fallback to first
      const defaultId = activeSquadId || (active.length > 0 ? active[0].id : "");
      setForm(f => ({ ...f, squad_id: defaultId }));
    });
  }, [activeSquadId]);

  useEffect(() => {
    base44.entities.PhysicalObjective.list("order", 100).then(rows => {
      setPhysicalObjectives(rows.filter(o => o.active !== false && o.hidden !== true).map(o => o.name).filter(Boolean));
    });
  }, []);

  // Load players whenever date or squad changes
  useEffect(() => {
    if (!form.squad_id || !form.date) return;
    loadSquadPlayers(form.squad_id, form.date);
  }, [form.squad_id, form.date]);

  useEffect(() => {
    let cancelled = false;
    async function loadMicrocycleDefaults() {
      if (!form.squad_id || !form.date) return;
      const squad = squads.find(s => s.id === form.squad_id);
      const match = await getMicrocycleDefaults({ date: form.date, squadId: form.squad_id, seasonId: activeSeasonId || squad?.season });
      if (cancelled) return;
      const defaults = match?.values || null;
      setPlanDefaults(defaults);
      if (defaults) {
        setForm(prev => ({
          ...prev,
          match_day_code: manualMeta.md ? prev.match_day_code : (defaults.match_day_code || prev.match_day_code),
          microcycle_day: manualMeta.md ? prev.microcycle_day : (defaults.microcycle_day || defaults.match_day_code || prev.microcycle_day),
          session_objective: manualMeta.objective ? prev.session_objective : (defaults.session_objective || prev.session_objective),
        }));
      }
    }
    loadMicrocycleDefaults();
    return () => { cancelled = true; };
  }, [form.squad_id, form.date, squads.length, activeSeasonId, manualMeta.md, manualMeta.objective]);

  async function loadSquadPlayers(squadId, date) {
    setLoadingPlayers(true);
    const [allPlayers, memberships, dayStatuses] = await Promise.all([
      base44.entities.Player.list("-created_date", 500),
      base44.entities.SquadMembership.filter({ squad_id: squadId, status: "activo" }, "-effective_from", 500),
      base44.entities.DailySquadStatus.filter({ date }, "-updated_at", 500),
    ]);

    const playerMap = {};
    allPlayers.filter(p => p.active !== false).forEach(p => { playerMap[p.id] = p; });

    const statusById = {};
    dayStatuses.forEach(ds => { statusById[ds.player_id] = ds; });

    // Stable members valid on this date
    const stableIds = new Set(
      memberships.filter(m => {
        if (m.effective_from && m.effective_from > date) return false;
        if (m.effective_to && m.effective_to < date) return false;
        return true;
      }).map(m => m.player_id)
    );

    const result = [];
    const seen = new Set();

    stableIds.forEach(pid => {
      const player = playerMap[pid];
      if (!player) return;
      const ds = statusById[pid];
      // Skip if temporarily moved out to another squad
      if (ds && ds.temporary && ds.active_in_target_squad && ds.target_squad_id && ds.target_squad_id !== squadId) return;
      result.push({ player, ds: ds || null });
      seen.add(pid);
    });

    // Temporary visitors
    dayStatuses.forEach(ds => {
      if (ds.temporary && ds.active_in_target_squad && ds.target_squad_id === squadId && !seen.has(ds.player_id)) {
        const player = playerMap[ds.player_id];
        if (player) { result.push({ player, ds }); seen.add(ds.player_id); }
      }
    });

    setSquadPlayers(result);

    // Auto-select available players
    const autoSelect = new Set(
      result
        .filter(({ ds }) => {
          const st = ds?.status || "disponible";
          return AVAILABLE_STATUSES.includes(st);
        })
        .map(({ player }) => player.id)
    );
    setSelectedIds(autoSelect);
    setLoadingPlayers(false);
  }

  function togglePlayer(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAllAvailable() {
    const ids = squadPlayers
      .filter(({ ds }) => AVAILABLE_STATUSES.includes(ds?.status || "disponible"))
      .map(({ player }) => player.id);
    setSelectedIds(new Set(ids));
  }

  function selectOnlyField() {
    const ids = squadPlayers
      .filter(({ ds, player }) => AVAILABLE_STATUSES.includes(ds?.status || "disponible") && !isGoalkeeper(player))
      .map(({ player }) => player.id);
    setSelectedIds(new Set(ids));
  }

  function selectOnlyGK() {
    const ids = squadPlayers
      .filter(({ ds, player }) => AVAILABLE_STATUSES.includes(ds?.status || "disponible") && isGoalkeeper(player))
      .map(({ player }) => player.id);
    setSelectedIds(new Set(ids));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.squad_id) return;
    setSaving(true);

    const squad = squads.find(s => s.id === form.squad_id);
    const available = squadPlayers.filter(({ ds }) => AVAILABLE_STATUSES.includes(ds?.status || "disponible"));
    const unavailable = squadPlayers.filter(({ ds }) => !AVAILABLE_STATUSES.includes(ds?.status || "disponible"));

    const sessionNumber = Number(form.session_number || nextSessionNumber || 1);
    const session = await base44.entities.TrainingSession.create({
      ...form,
      title: `Sesión ${sessionNumber}`,
      session_number: sessionNumber,
      microcycle_day: form.match_day_code,
      md_manual_override: manualMeta.md,
      physical_objective_manual_override: manualMeta.objective,
      squad_name: squad?.name || "",
      season_id: activeSeasonId || squad?.season || "",
      players_available: available.length,
      players_selected: selectedIds.size,
      players_absent: unavailable.filter(({ ds }) => ds?.status === "ausente").length,
      players_differentiated: unavailable.filter(({ ds }) => ds?.status === "diferenciado").length,
    });

    // Save SessionPlayer snapshot for each member
    const spRecords = squadPlayers.map(({ player, ds }) => {
      const status = ds?.status || "disponible";
      const attendance = KINESIO_STATUSES.includes(status)
        ? "kinesiologia"
        : selectedIds.has(player.id)
          ? (UNAVAILABLE_STATUSES.includes(status) ? "diferenciado" : "presente")
          : "ausente";
      return {
        session_id: session.id,
        player_id: player.id,
        player_name: player.full_name || "",
        position: player.position || "",
        squad_name: ds?.base_squad_name || squad?.name || "",
        status_at_session: status,
        attendance,
        minutes: attendance === "presente" ? (form.duration_minutes || 60) : 0,
      };
    });

    if (spRecords.length > 0) await base44.entities.SessionPlayer.bulkCreate(spRecords);

    setSaving(false);
    onCreated(session);
  }

  const allPositions = [...new Set(squadPlayers.map(({ player }) => player.position).filter(Boolean))];

  const filtered = squadPlayers.filter(({ player }) => {
    if (search && !(player.full_name || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (posFilter && player.position !== posFilter) return false;
    return true;
  });

  const availableFiltered = filtered.filter(({ ds }) => AVAILABLE_STATUSES.includes(ds?.status || "disponible"));
  const unavailableFiltered = filtered.filter(({ ds }) => !AVAILABLE_STATUSES.includes(ds?.status || "disponible"));
  const kinesioFiltered = unavailableFiltered.filter(({ ds }) => KINESIO_STATUSES.includes(ds?.status));
  const diferenciadosFiltered = unavailableFiltered.filter(({ ds }) => ds?.status === "diferenciado");
  const otherUnavailableFiltered = unavailableFiltered.filter(({ ds }) => !KINESIO_STATUSES.includes(ds?.status) && ds?.status !== "diferenciado");

  // Split counts by type
  const availableField = availableFiltered.filter(({ player }) => !isGoalkeeper(player));
  const availableGK    = availableFiltered.filter(({ player }) => isGoalkeeper(player));
  const selectedField  = [...selectedIds].filter(id => {
    const p = squadPlayers.find(({ player }) => player.id === id)?.player;
    return p && !isGoalkeeper(p);
  }).length;
  const selectedGK = [...selectedIds].filter(id => {
    const p = squadPlayers.find(({ player }) => player.id === id)?.player;
    return p && isGoalkeeper(p);
  }).length;

  const objectiveOptions = [...new Set([...OBJECTIVE_OPTS, ...physicalObjectives, planDefaults?.session_objective, form.session_objective].filter(Boolean))];

  function setF(key, val) { setForm(f => ({ ...f, [key]: val })); }
  function setDateOrSquad(key, val) {
    setManualMeta({ md: false, objective: false });
    setF(key, val);
  }
  function setManualMd(value) {
    setManualMeta(prev => ({ ...prev, md: true }));
    setForm(f => ({ ...f, match_day_code: value, microcycle_day: value }));
  }
  function setManualObjective(value) {
    setManualMeta(prev => ({ ...prev, objective: true }));
    setF("session_objective", value);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Session details */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Datos de la sesión</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs text-zinc-400 mb-1 block">Número de sesión *</label>
            <input required type="number" min={1} value={form.session_number || ""} onChange={e => setF("session_number", e.target.value)}
              placeholder="Ej: 99"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
            <p className="mt-1 text-[10px] text-zinc-500">Se mostrará automáticamente como “SESIÓN {form.session_number || nextSessionNumber || "—"}”.</p>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Fecha *</label>
            <input required type="date" value={form.date} onChange={e => setDateOrSquad("date", e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Plantel *</label>
            <select required value={form.squad_id} onChange={e => setDateOrSquad("squad_id", e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
              {squads.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Período</label>
            <select value={form.period} onChange={e => setF("period", e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
              {PERIOD_OPTIONS.map(period => <option key={period}>{period}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">MD</label>
            <select value={form.match_day_code} onChange={e => setManualMd(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
              {MD_CODES.map(m => <option key={m}>{m}</option>)}
            </select>
            <p className="mt-1 text-[10px] text-zinc-500">{planDefaults?.match_day_code && !manualMeta.md ? "Desde Plan Semanal" : "Excepción manual"}</p>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Duración (min)</label>
            <input type="number" value={form.duration_minutes} onChange={e => setF("duration_minutes", parseInt(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Objetivo físico</label>
            <select value={form.session_objective} onChange={e => setManualObjective(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
              {objectiveOptions.map(i => <option key={i}>{i}</option>)}
            </select>
            <p className="mt-1 text-[10px] text-zinc-500">{planDefaults?.session_objective && !manualMeta.objective ? "Desde Plan Semanal" : "Excepción manual"}</p>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Lugar</label>
            <input value={form.location} onChange={e => setF("location", e.target.value)}
              placeholder="Campo 1, Gimnasio..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
          </div>

        </div>
      </div>

      {/* Player selection */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 flex-wrap">
            <Users size={15} className="text-zinc-400" />
            Jugadores
            <span className="text-xs text-zinc-500 font-normal">
              {squadPlayers.length} del plantel
            </span>
            <span className="text-xs text-emerald-400 font-medium">
              Campo: {selectedField} · <span className="text-yellow-400">ARQ: {selectedGK}</span> · Total: {selectedIds.size}
            </span>
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={selectAllAvailable}
              className="text-xs px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-lg hover:bg-emerald-500/25 transition-colors">
              Seleccionar todos los disponibles
            </button>
            <button type="button" onClick={selectOnlyField}
              className="text-xs px-3 py-1.5 bg-sky-500/15 border border-sky-500/30 text-sky-300 rounded-lg hover:bg-sky-500/25 transition-colors">
              Solo campo
            </button>
            <button type="button" onClick={selectOnlyGK}
              className="text-xs px-3 py-1.5 bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 rounded-lg hover:bg-yellow-500/25 transition-colors">
              Solo arqueros
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar jugador..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white focus:outline-none" />
          </div>
          <select value={posFilter} onChange={e => setPosFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none">
            <option value="">Todas las posiciones</option>
            {allPositions.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>

        {loadingPlayers ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Available */}
            <div>
              <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-2">
                Disponibles para entrenar ({availableFiltered.length})
                <span className="text-zinc-500 font-normal ml-2 normal-case">
                  Campo: {availableField.length} · <span className="text-yellow-400">ARQ: {availableGK.length}</span>
                </span>
              </p>
              {availableFiltered.length === 0
                ? <p className="text-zinc-600 text-xs">Sin jugadores disponibles</p>
                : <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {availableFiltered.map(({ player, ds }) => (
                      <PlayerSelectRow key={player.id} player={player} ds={ds}
                        selected={selectedIds.has(player.id)} onToggle={() => togglePlayer(player.id)} />
                    ))}
                  </div>}
            </div>

            {/* Diferenciados */}
            {diferenciadosFiltered.length > 0 && (
              <div>
                <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-2">
                  Diferenciados ({diferenciadosFiltered.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {diferenciadosFiltered.map(({ player, ds }) => (
                    <PlayerSelectRow key={player.id} player={player} ds={ds}
                      selected={selectedIds.has(player.id)} onToggle={() => togglePlayer(player.id)} />
                  ))}
                </div>
              </div>
            )}

            {/* Trabajaron en kinesiología */}
            {kinesioFiltered.length > 0 && (
              <div>
                <p className="text-xs text-sky-400 font-semibold uppercase tracking-wider mb-2">
                  Trabajarán en kinesiología ({kinesioFiltered.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {kinesioFiltered.map(({ player, ds }) => (
                    <div key={player.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-sky-500/10 border-sky-500/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{player.full_name}</p>
                        <p className="text-[10px] text-zinc-500 truncate">{player.position}</p>
                      </div>
                      <span className="text-[10px] font-semibold shrink-0 text-sky-300">
                        {STATUS_LABELS[ds?.status] || ds?.status}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-600 mt-1">No entrenan normal ni cuentan como ausentes: quedan registrados en la sesión como kinesiología.</p>
              </div>
            )}

            {/* Ausentes / no disponibles */}
            {otherUnavailableFiltered.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">
                  Ausentes / No disponibles ({otherUnavailableFiltered.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {otherUnavailableFiltered.map(({ player, ds }) => (
                    <PlayerSelectRow key={player.id} player={player} ds={ds}
                      selected={selectedIds.has(player.id)} onToggle={() => togglePlayer(player.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={saving || !form.squad_id}
          className="px-5 py-2 rounded-lg bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50">
          {saving ? "Creando..." : "Crear sesión"}
        </button>
      </div>
    </form>
  );
}

function PlayerSelectRow({ player, ds, selected, onToggle }) {
  const status = ds?.status || "disponible";
  const statusColors = {
    disponible: "text-emerald-400", lesionado: "text-red-400", molestia: "text-orange-400",
    diferenciado: "text-amber-400", suspendido: "text-purple-400", ausente: "text-zinc-500",
    "bajó": "text-orange-400", "subió": "text-sky-400", convocado: "text-blue-400",
    reintegro: "text-teal-400",
  };
  return (
    <button type="button" onClick={onToggle}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${
        selected
          ? "bg-emerald-500/10 border-emerald-500/30"
          : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
      }`}>
      {selected ? <CheckSquare size={14} className="text-emerald-400 shrink-0" /> : <Square size={14} className="text-zinc-600 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white truncate">{player.full_name}</p>
        <p className="text-[10px] text-zinc-500 truncate">{player.position}</p>
      </div>
      <span className={`text-[10px] font-semibold shrink-0 ${statusColors[status] || "text-zinc-400"}`}>
        {STATUS_LABELS[status] || status}
      </span>
    </button>
  );
}