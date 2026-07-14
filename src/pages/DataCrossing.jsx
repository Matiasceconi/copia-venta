import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, CheckCircle2, AlertTriangle, XCircle, RefreshCw, ChevronDown, ChevronUp, Link2, UserCheck, Save, Merge } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const STATUS_CONFIG = {
  linked:       { label: "Vinculado",     color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  review:       { label: "Revisar",       color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/20",  icon: AlertTriangle },
  unrecognized: { label: "No reconocido", color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20",        icon: XCircle },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unrecognized;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
      <Icon size={10} /> {cfg.label}
    </span>
  );
}

function ConfidenceBar({ value }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 90 ? "bg-emerald-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-zinc-500">{pct}%</span>
    </div>
  );
}

// ── Row de una entrada ──
function EntryRow({ entry, players, onConfirm }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(entry.player_id || "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const isLinked = entry.status === "linked";

  async function handleConfirm() {
    if (!selectedPlayer) return;
    setSaving(true);
    await onConfirm(entry.csv_name, selectedPlayer, entry.confidence);
    setSaving(false);
    toast({ title: `Alias guardado para ${entry.csv_name}` });
  }

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${isLinked ? "border-zinc-800 bg-zinc-900/40" : "border-zinc-700 bg-zinc-900"}`}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => !isLinked && setExpanded(e => !e)}>
        {/* Nombre CSV */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-mono text-zinc-300 truncate">{entry.csv_name}</span>
            <StatusBadge status={entry.status} />
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-zinc-600">{entry.count} registro{entry.count !== 1 ? "s" : ""}</span>
            {entry.dates?.length > 0 && (
              <span className="text-xs text-zinc-700">Último: {entry.dates[entry.dates.length - 1]}</span>
            )}
          </div>
        </div>

        {/* Jugador vinculado o sugerencia */}
        <div className="flex-1 min-w-0 hidden sm:block">
          {isLinked ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
              <span className="text-sm text-white font-medium">{entry.player_name}</span>
            </div>
          ) : entry.candidates?.length > 0 ? (
            <div>
              <span className="text-xs text-zinc-500">Sugerencia: </span>
              <span className="text-sm text-yellow-300">{entry.candidates[0].player_name}</span>
              <ConfidenceBar value={entry.candidates[0].confidence} />
            </div>
          ) : (
            <span className="text-xs text-zinc-600 italic">Sin coincidencias</span>
          )}
        </div>

        {!isLinked && (
          <ChevronDown size={15} className={`text-zinc-500 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
        )}
      </div>

      {/* Panel expandido */}
      {!isLinked && expanded && (
        <div className="border-t border-zinc-800 px-4 py-3 space-y-3 bg-zinc-950/40">
          {/* Candidatos */}
          {entry.candidates?.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 mb-2 font-semibold uppercase tracking-wider">Candidatos sugeridos</p>
              <div className="space-y-1">
                {entry.candidates.map(c => (
                  <button
                    key={c.player_id}
                    onClick={() => setSelectedPlayer(c.player_id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all ${
                      selectedPlayer === c.player_id
                        ? "border-white/30 bg-white/10"
                        : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                    }`}
                  >
                    <div>
                      <span className="text-sm text-white font-medium">{c.player_name}</span>
                      {c.position && <span className="text-xs text-zinc-500 ml-2">{c.position}</span>}
                    </div>
                    <ConfidenceBar value={c.confidence} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selector manual si no hay candidatos */}
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">O seleccioná manualmente:</p>
            <select
              value={selectedPlayer}
              onChange={e => setSelectedPlayer(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
            >
              <option value="">— Seleccionar jugador —</option>
              {players.map(p => (
                <option key={p.id} value={p.id}>{p.full_name || `${p.first_name} ${p.last_name}`}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleConfirm}
              disabled={!selectedPlayer || saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-white text-zinc-900 font-semibold hover:bg-zinc-200 disabled:opacity-40 transition-colors"
            >
              {saving ? <div className="w-3 h-3 border border-zinc-400 border-t-zinc-900 rounded-full animate-spin" /> : <Save size={13} />}
              Confirmar y guardar alias
            </button>
            <button onClick={() => setExpanded(false)} className="px-3 py-2 text-xs text-zinc-500 hover:text-white transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Panel de duplicados ──
function DuplicatesPanel({ players }) {
  const [duplicates, setDuplicates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(null);
  const { toast } = useToast();

  async function detect() {
    setLoading(true);
    const res = await base44.functions.invoke("resolvePlayerNames", { action: "detect_duplicates" });
    setDuplicates(res.data.duplicates || []);
    setLoading(false);
  }

  async function handleMerge(keepId, discardId, keepName) {
    if (!confirm(`¿Fusionar jugadores? Se conservará "${keepName}" y se eliminará el duplicado.`)) return;
    setMerging(discardId);
    await base44.functions.invoke("resolvePlayerNames", { action: "merge", keep_id: keepId, discard_id: discardId });
    setDuplicates(prev => prev.filter(d => d.playerA.id !== discardId && d.playerB.id !== discardId));
    setMerging(null);
    toast({ title: "Jugadores fusionados correctamente" });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">Detecta jugadores con nombres similares que podrían ser duplicados.</p>
        <button onClick={detect} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50">
          {loading ? <div className="w-3 h-3 border border-zinc-500 border-t-white rounded-full animate-spin" /> : <Search size={14} />}
          Detectar duplicados
        </button>
      </div>

      {duplicates === null && !loading && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
          <Search size={28} className="text-zinc-700 mx-auto mb-2" />
          <p className="text-zinc-500 text-sm">Hacé click en "Detectar duplicados" para analizar el plantel</p>
        </div>
      )}

      {duplicates?.length === 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
          <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-2" />
          <p className="text-emerald-300 text-sm font-medium">No se detectaron duplicados</p>
        </div>
      )}

      {duplicates?.map((d, i) => (
        <div key={i} className="bg-zinc-900 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="bg-zinc-800 rounded-lg px-3 py-2 flex-1">
                  <p className="text-xs text-zinc-500 mb-0.5">Jugador A</p>
                  <p className="text-sm font-semibold text-white">{d.playerA.full_name}</p>
                  {d.playerA.division && <p className="text-xs text-zinc-600">{d.playerA.division}</p>}
                  <p className="text-xs text-zinc-700 font-mono mt-0.5">{d.playerA.id}</p>
                </div>
                <div className="text-center shrink-0">
                  <p className="text-xs text-zinc-500">Similitud</p>
                  <p className="text-lg font-bold text-yellow-400">{Math.round(d.score * 100)}%</p>
                </div>
                <div className="bg-zinc-800 rounded-lg px-3 py-2 flex-1">
                  <p className="text-xs text-zinc-500 mb-0.5">Jugador B</p>
                  <p className="text-sm font-semibold text-white">{d.playerB.full_name}</p>
                  {d.playerB.division && <p className="text-xs text-zinc-600">{d.playerB.division}</p>}
                  <p className="text-xs text-zinc-700 font-mono mt-0.5">{d.playerB.id}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <p className="text-xs text-zinc-500 self-center flex-1">Conservar como oficial:</p>
            <button
              onClick={() => handleMerge(d.playerA.id, d.playerB.id, d.playerA.full_name)}
              disabled={merging === d.playerB.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 transition-colors disabled:opacity-40"
            >
              {merging === d.playerB.id ? <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" /> : <Merge size={12} />}
              Conservar A
            </button>
            <button
              onClick={() => handleMerge(d.playerB.id, d.playerA.id, d.playerB.full_name)}
              disabled={merging === d.playerA.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-violet-600/20 text-violet-300 border border-violet-500/30 hover:bg-violet-600/30 transition-colors disabled:opacity-40"
            >
              {merging === d.playerA.id ? <div className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" /> : <Merge size={12} />}
              Conservar B
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main ──
export default function DataCrossing() {
  const [entries, setEntries] = useState([]);
  const [players, setPlayers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("crossing"); // "crossing" | "duplicates"
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const ps = await base44.entities.Player.list("", 500);
    setPlayers(ps);
    await analyze();
    setLoading(false);
  }

  async function analyze() {
    const res = await base44.functions.invoke("resolvePlayerNames", { action: "analyze_all" });
    setEntries(res.data.entries || []);
    setSummary(res.data.summary || null);
  }

  async function handleConfirm(csvName, playerId, confidence) {
    await base44.functions.invoke("resolvePlayerNames", {
      action: "confirm",
      assignments: [{ csv_name: csvName, player_id: playerId, confidence }],
      source: "Catapult",
    });
    // actualizar entrada localmente
    const player = players.find(p => p.id === playerId);
    setEntries(prev => prev.map(e =>
      e.csv_name === csvName
        ? { ...e, status: "linked", player_id: playerId, player_name: player?.full_name || null, confidence: 1.0 }
        : e
    ));
    if (summary) setSummary(s => ({ ...s, linked: s.linked + 1, review: Math.max(0, s.review - 1), unrecognized: Math.max(0, s.unrecognized - 1) }));
  }

  const filtered = entries.filter(e => {
    if (filterStatus !== "all" && e.status !== filterStatus) return false;
    if (search && !e.csv_name.toLowerCase().includes(search.toLowerCase()) && !e.player_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Cruce de Datos</h1>
          <p className="text-zinc-500 text-sm mt-1">Vinculación de nombres CSV con jugadores oficiales del plantel</p>
        </div>
        <button onClick={() => { setLoading(true); analyze().finally(() => setLoading(false)); }}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualizar análisis
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
        {[["crossing","Cruce de nombres"],["duplicates","Duplicados"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === key ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "crossing" && (
        <>
          {/* Summary cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total nombres CSV", value: summary.total, color: "text-white" },
                { label: "Vinculados", value: summary.linked, color: "text-emerald-400" },
                { label: "Para revisar", value: summary.review, color: "text-yellow-400" },
                { label: "No reconocidos", value: summary.unrecognized, color: "text-red-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-zinc-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filtros */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar nombre..."
                className="bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-sm text-white w-48 focus:outline-none focus:border-zinc-600" />
            </div>
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 gap-0.5">
              {[["all","Todos"],["linked","Vinculados"],["review","Revisar"],["unrecognized","No reconocidos"]].map(([val, label]) => (
                <button key={val} onClick={() => setFilterStatus(val)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterStatus === val ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}>
                  {label}
                </button>
              ))}
            </div>
            <span className="text-xs text-zinc-600">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Lista */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
              <UserCheck size={32} className="text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">No hay entradas que coincidan con los filtros</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(entry => (
                <EntryRow key={entry.csv_name} entry={entry} players={players} onConfirm={handleConfirm} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "duplicates" && <DuplicatesPanel players={players} />}
    </div>
  );
}