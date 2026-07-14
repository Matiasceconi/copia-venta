import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, CheckCircle, AlertCircle, Link, Search, Users, Database, X, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PlayerPhoto from "@/components/player/PlayerPhoto";

function normalize(str) {
  return (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function ScoreBadge({ score }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? "text-emerald-400 bg-emerald-900/40 border-emerald-700/50"
    : pct >= 50 ? "text-yellow-400 bg-yellow-900/40 border-yellow-700/50"
    : "text-red-400 bg-red-900/40 border-red-700/50";
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${color}`}>{pct}%</span>;
}

export default function GpsReconciliationTool() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [data, setData] = useState(null);
  const [assignments, setAssignments] = useState({}); // csvName → player_id
  const [filter, setFilter] = useState("unmatched"); // "all" | "matched" | "unmatched"
  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    base44.entities.Player.list("", 500).then(setPlayers).catch(() => {});
  }, []);

  async function analyze() {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("reconcileGpsPlayers", { action: "analyze" });
      setData(res.data);
      // Pre-fill assignments for unmatched with top suggestion if score >= 0.7
      const auto = {};
      (res.data.unmatched || []).forEach(entry => {
        if (entry.suggestions?.[0]?.score >= 0.7) {
          auto[entry.csvName] = entry.suggestions[0].player_id;
        }
      });
      setAssignments(auto);
    } catch (e) {
      toast({ title: "Error al analizar", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function applyAssignments() {
    const toApply = Object.entries(assignments)
      .filter(([, pid]) => !!pid)
      .map(([csvName, player_id]) => ({ csvName, player_id }));

    if (!toApply.length) {
      toast({ title: "No hay asignaciones pendientes" });
      return;
    }

    setApplying(true);
    try {
      const res = await base44.functions.invoke("reconcileGpsPlayers", {
        action: "apply",
        assignments: toApply,
      });
      toast({ title: `✓ ${res.data.updated?.length || 0} nombre(s) reconciliados` });
      setAssignments({});
      await analyze();
    } catch (e) {
      toast({ title: "Error al aplicar", description: e.message, variant: "destructive" });
    } finally {
      setApplying(false);
    }
  }

  const displayedEntries = () => {
    if (!data) return [];
    let list = filter === "unmatched" ? data.unmatched
      : filter === "matched" ? data.matched
      : [...(data.unmatched || []), ...(data.matched || [])];
    if (search) {
      const q = normalize(search);
      list = list.filter(e => normalize(e.csvName).includes(q) || normalize(e.playerName || "").includes(q));
    }
    return list;
  };

  const pendingCount = Object.values(assignments).filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Link size={18} className="text-blue-400" /> Reconciliación GPS ↔ Jugadores
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">Cruzá los nombres CSV con los IDs de la base de datos</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              onClick={applyAssignments}
              disabled={applying}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {applying
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Check size={15} />}
              Aplicar {pendingCount} asignación{pendingCount !== 1 ? "es" : ""}
            </button>
          )}
          <button
            onClick={analyze}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <RefreshCw size={15} />}
            Analizar
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Nombres únicos", value: data.summary.total, icon: Database, color: "text-blue-400" },
            { label: "Reconciliados", value: data.summary.matched, icon: CheckCircle, color: "text-emerald-400" },
            { label: "Sin resolver", value: data.summary.unmatched, icon: AlertCircle, color: "text-red-400" },
            { label: "Registros totales", value: data.summary.totalRecords, icon: Users, color: "text-zinc-400" },
          ].map(s => (
            <div key={s.label} className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3 flex items-center gap-3">
              <s.icon size={20} className={s.color} />
              <div>
                <p className="text-xl font-bold text-white leading-none">{s.value}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters + search */}
      {data && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-lg p-1">
            {[
              { id: "unmatched", label: `Sin resolver (${data.summary.unmatched})` },
              { id: "matched",   label: `Reconciliados (${data.summary.matched})` },
              { id: "all",       label: `Todos (${data.summary.total})` },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filter === f.id ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 flex-1 min-w-[180px]">
            <Search size={13} className="text-zinc-500 shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar nombre CSV..."
              className="bg-transparent text-white text-xs outline-none placeholder-zinc-600 w-full" />
            {search && <button onClick={() => setSearch("")}><X size={13} className="text-zinc-500 hover:text-white" /></button>}
          </div>
        </div>
      )}

      {/* Entry list */}
      {!data && !loading && (
        <div className="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-xl">
          <Link size={32} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">Presioná <strong className="text-white">Analizar</strong> para escanear todos los registros GPS</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 bg-zinc-900 border border-zinc-800 rounded-xl">
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-blue-400 rounded-full animate-spin" />
          <span className="text-zinc-500 text-sm ml-3">Analizando registros...</span>
        </div>
      )}

      {data && (
        <div className="space-y-2">
          {displayedEntries().length === 0 && (
            <div className="text-center py-10 text-zinc-600 text-sm">
              {filter === "unmatched" ? "¡Todos los registros están reconciliados! ✓" : "Sin resultados"}
            </div>
          )}
          {displayedEntries().map(entry => (
            <EntryRow
              key={entry.csvName}
              entry={entry}
              players={players}
              assigned={assignments[entry.csvName] || entry.player_id || ""}
              onAssign={(pid) => setAssignments(prev => ({ ...prev, [entry.csvName]: pid }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EntryRow({ entry, players, assigned, onAssign }) {
  const [open, setOpen] = useState(false);
  const assignedPlayer = players.find(p => p.id === assigned);
  const isNew = assigned && assigned !== entry.player_id;

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${
      entry.isMatched && !isNew ? "border-emerald-800/40 bg-emerald-900/10"
      : isNew ? "border-blue-700/50 bg-blue-900/15"
      : "border-zinc-700 bg-zinc-900"
    }`}>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Status icon */}
        <div className="shrink-0">
          {entry.isMatched && !isNew
            ? <CheckCircle size={16} className="text-emerald-400" />
            : isNew
            ? <Link size={16} className="text-blue-400" />
            : <AlertCircle size={16} className="text-red-400" />}
        </div>

        {/* CSV name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{entry.csvName}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {entry.recordCount} registro{entry.recordCount !== 1 ? "s" : ""}
            {entry.dates.length > 0 && <> · {entry.dates[entry.dates.length - 1]}</>}
          </p>
        </div>

        {/* Player selector */}
        <div className="flex items-center gap-2 shrink-0">
          {assignedPlayer && (
            <div className="flex items-center gap-1.5">
              <PlayerPhoto
                player={assignedPlayer}
                className="w-6 h-6 rounded-full object-cover border border-zinc-600"
                fallbackClassName="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center"
                textClassName="text-[9px] font-bold text-zinc-400"
              />
              <span className={`text-xs font-medium ${isNew ? "text-blue-300" : "text-emerald-300"}`}>
                {assignedPlayer.full_name || assignedPlayer.name}
              </span>
            </div>
          )}
          <select
            value={assigned || ""}
            onChange={e => onAssign(e.target.value || null)}
            className="bg-zinc-800 border border-zinc-600 text-white text-[10px] rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 max-w-[180px]"
          >
            <option value="" className="bg-zinc-900">— Asignar jugador —</option>
            {players.map(p => (
              <option key={p.id} value={p.id} className="bg-zinc-900">
                {p.full_name || p.name} ({p.position || "—"})
              </option>
            ))}
          </select>
        </div>

        {/* Suggestions toggle */}
        {entry.suggestions?.length > 0 && !entry.isMatched && (
          <button onClick={() => setOpen(!open)}
            className="text-[10px] text-zinc-500 hover:text-white transition-colors shrink-0 underline">
            {open ? "cerrar" : `${entry.suggestions.length} sugerencia${entry.suggestions.length !== 1 ? "s" : ""}`}
          </button>
        )}
      </div>

      {/* Suggestions panel */}
      {open && entry.suggestions?.length > 0 && (
        <div className="border-t border-zinc-700/50 px-4 py-2 flex flex-wrap gap-2">
          {entry.suggestions.map(s => (
            <button key={s.player_id}
              onClick={() => { onAssign(s.player_id); setOpen(false); }}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors">
              <ScoreBadge score={s.score} />
              <span className="text-xs text-white">{s.full_name}</span>
              <span className="text-[9px] text-zinc-500">{s.position}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}