import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Tag, X, Plus, CheckCircle2, AlertTriangle, XCircle, Save, ChevronDown, ChevronUp } from "lucide-react";

const ALIAS_SOURCES = ["Catapult","CSV GPS","Wellness","Minutos","Manual","Excel","Otro"];

function norm(str) {
  const s = (str || "").trim();
  if (s.includes(",")) { const [l, f] = s.split(",").map(p => p.trim()); return `${f} ${l}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[,.]/g,"").replace(/\s+/g," ").trim(); }
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[,.]/g,"").replace(/\s+/g," ").trim();
}

function ConfidenceBar({ value }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 90 ? "bg-emerald-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-zinc-500">{pct}%</span>
    </div>
  );
}

// ── Panel de cruce de nombres CSV ──────────────────────────────────────────
function CrossingPanel({ players, aliases, onAliasesChanged, toast }) {
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  async function analyze() {
    setLoading(true);
    const res = await base44.functions.invoke("resolvePlayerNames", { action: "analyze_all" });
    setEntries(res.data.entries || []);
    setSummary(res.data.summary || null);
    setLoading(false);
  }

  async function handleConfirm(csvName, playerId, confidence) {
    await base44.functions.invoke("resolvePlayerNames", {
      action: "confirm",
      assignments: [{ csv_name: csvName, player_id: playerId, confidence }],
      source: "Catapult",
    });
    const player = players.find(p => p.id === playerId);
    // Actualizar aliases localmente
    const newAlias = {
      id: `tmp_${Date.now()}`,
      player_id: playerId,
      player_name: player?.full_name || "",
      alias_name: csvName,
      normalized_alias: norm(csvName),
      source: "Catapult",
      confidence_score: 1.0,
    };
    onAliasesChanged([...aliases, newAlias]);
    setEntries(prev => prev.map(e =>
      e.csv_name === csvName
        ? { ...e, status: "linked", player_id: playerId, player_name: player?.full_name || null, confidence: 1.0 }
        : e
    ));
    if (summary) setSummary(s => ({ ...s, linked: s.linked + 1, review: Math.max(0, s.review - 1), unrecognized: Math.max(0, s.unrecognized - 1) }));
    toast({ title: `Alias guardado: ${csvName} → ${player?.full_name}` });
  }

  const filtered = entries.filter(e => {
    if (filterStatus !== "all" && e.status !== filterStatus) return false;
    if (search && !e.csv_name.toLowerCase().includes(search.toLowerCase()) && !e.player_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-zinc-500">Analiza los nombres de CSV importados y permite vincularlos al jugador oficial.</p>
        <button onClick={analyze} disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50">
          {loading ? <div className="w-3 h-3 border border-zinc-500 border-t-white rounded-full animate-spin" /> : <Search size={14} />}
          Analizar nombres CSV
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total nombres", value: summary.total, color: "text-white" },
            { label: "Vinculados", value: summary.linked, color: "text-emerald-400" },
            { label: "Para revisar", value: summary.review, color: "text-yellow-400" },
            { label: "Sin vincular", value: summary.unrecognized, color: "text-red-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-zinc-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
                className="bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-sm text-white w-44 focus:outline-none focus:border-zinc-600" />
            </div>
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 gap-0.5">
              {[["all","Todos"],["linked","Vinculados"],["review","Revisar"],["unrecognized","Sin vincular"]].map(([val, label]) => (
                <button key={val} onClick={() => setFilterStatus(val)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterStatus === val ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {filtered.map(entry => (
              <EntryRow key={entry.csv_name} entry={entry} players={players} onConfirm={handleConfirm} />
            ))}
          </div>
        </>
      )}

      {entries.length === 0 && !loading && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
          <Tag size={28} className="text-zinc-700 mx-auto mb-2" />
          <p className="text-zinc-500 text-sm">Hacé clic en "Analizar nombres CSV" para ver los nombres importados</p>
        </div>
      )}
    </div>
  );
}

function EntryRow({ entry, players, onConfirm }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(entry.player_id || "");
  const [saving, setSaving] = useState(false);
  const isLinked = entry.status === "linked";

  const StatusIcon = isLinked ? CheckCircle2 : entry.status === "review" ? AlertTriangle : XCircle;
  const statusColor = isLinked ? "text-emerald-400" : entry.status === "review" ? "text-yellow-400" : "text-red-400";

  async function handleConfirm() {
    if (!selectedPlayer) return;
    setSaving(true);
    await onConfirm(entry.csv_name, selectedPlayer, entry.confidence);
    setSaving(false);
    setExpanded(false);
  }

  return (
    <div className={`border rounded-xl overflow-hidden ${isLinked ? "border-zinc-800 bg-zinc-900/40" : "border-zinc-700 bg-zinc-900"}`}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => !isLinked && setExpanded(e => !e)}>
        <StatusIcon size={14} className={`shrink-0 ${statusColor}`} />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-mono text-zinc-300">{entry.csv_name}</span>
          <span className="text-xs text-zinc-700 ml-2">{entry.count} reg.</span>
        </div>
        {isLinked ? (
          <span className="text-sm text-white font-medium hidden sm:block">{entry.player_name}</span>
        ) : entry.candidates?.length > 0 ? (
          <div className="hidden sm:block">
            <span className="text-xs text-zinc-500">Sugerencia: </span>
            <span className="text-sm text-yellow-300">{entry.candidates[0].player_name}</span>
          </div>
        ) : null}
        {!isLinked && <ChevronDown size={14} className={`text-zinc-600 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />}
      </div>

      {!isLinked && expanded && (
        <div className="border-t border-zinc-800 px-4 py-3 space-y-3 bg-zinc-950/40">
          {entry.candidates?.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-zinc-600 font-semibold uppercase tracking-wider">Candidatos</p>
              {entry.candidates.map(c => (
                <button key={c.player_id} onClick={() => setSelectedPlayer(c.player_id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all ${selectedPlayer === c.player_id ? "border-white/30 bg-white/10" : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"}`}>
                  <span className="text-sm text-white">{c.player_name} {c.position && <span className="text-zinc-500 text-xs">· {c.position}</span>}</span>
                  <ConfidenceBar value={c.confidence} />
                </button>
              ))}
            </div>
          )}
          <div>
            <p className="text-xs text-zinc-600 mb-1.5">Asignar manualmente:</p>
            <select value={selectedPlayer} onChange={e => setSelectedPlayer(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
              <option value="">— Seleccionar jugador —</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.full_name || `${p.first_name} ${p.last_name}`}</option>)}
            </select>
          </div>
          <button onClick={handleConfirm} disabled={!selectedPlayer || saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-white text-zinc-900 font-semibold hover:bg-zinc-200 disabled:opacity-40 transition-colors">
            {saving ? <div className="w-3 h-3 border border-zinc-400 border-t-zinc-900 rounded-full animate-spin" /> : <Save size={13} />}
            Confirmar alias
          </button>
        </div>
      )}
    </div>
  );
}

// ── Panel gestión manual de aliases ───────────────────────────────────────
function ManualAliasPanel({ players, aliases, onAliasesChanged, toast }) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [aliasInput, setAliasInput] = useState("");
  const [aliasSource, setAliasSource] = useState("Manual");

  async function handleAdd(player) {
    if (!aliasInput.trim()) return;
    const normalized_alias = norm(aliasInput.trim());
    const created = await base44.entities.PlayerAlias.create({
      player_id: player.id,
      player_name: player.full_name || "",
      alias_name: aliasInput.trim(),
      normalized_alias,
      source: aliasSource,
      confidence_score: 1.0,
    });
    onAliasesChanged([...aliases, created]);
    setAliasInput("");
    toast({ title: "Alias agregado" });
  }

  async function handleDelete(aliasId) {
    await base44.entities.PlayerAlias.delete(aliasId);
    onAliasesChanged(aliases.filter(a => a.id !== aliasId));
    toast({ title: "Alias eliminado" });
  }

  const filtered = players.filter(p =>
    !search || (p.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar jugador..."
          className="bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-sm text-white w-52 focus:outline-none focus:border-zinc-600" />
      </div>
      <div className="space-y-2">
        {filtered.map(player => {
          const playerAliases = aliases.filter(a => a.player_id === player.id);
          const isExpanded = expandedId === player.id;
          return (
            <div key={player.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : player.id)}>
                <span className="text-sm font-semibold text-white flex-1">{player.full_name}</span>
                <span className="text-xs text-zinc-600">{playerAliases.length} alias</span>
                <ChevronDown size={14} className={`text-zinc-600 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </div>
              {isExpanded && (
                <div className="border-t border-zinc-800 px-4 py-3 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {playerAliases.length === 0 && <span className="text-xs text-zinc-700 italic">Sin alias</span>}
                    {playerAliases.map(a => (
                      <span key={a.id} className="flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-full px-2.5 py-0.5 text-xs text-zinc-300">
                        <span className="text-zinc-600 text-[10px]">[{a.source}]</span> {a.alias_name}
                        <button onClick={() => handleDelete(a.id)} className="ml-0.5 text-zinc-600 hover:text-red-400 transition-colors"><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 items-center">
                    <input value={aliasInput} onChange={e => setAliasInput(e.target.value)} placeholder="Nuevo alias..."
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500" />
                    <select value={aliasSource} onChange={e => setAliasSource(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none">
                      {ALIAS_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={() => handleAdd(player)} disabled={!aliasInput.trim()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-zinc-700 text-white hover:bg-zinc-600 disabled:opacity-40 transition-colors">
                      <Plus size={11} /> Agregar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function IdentityAliasTab({ players, aliases, onAliasesChanged, toast }) {
  const [subTab, setSubTab] = useState("crossing");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
        <button onClick={() => setSubTab("crossing")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${subTab === "crossing" ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}>
          Cruce automático de CSV
        </button>
        <button onClick={() => setSubTab("manual")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${subTab === "manual" ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}>
          Gestión manual
        </button>
      </div>

      {subTab === "crossing" && <CrossingPanel players={players} aliases={aliases} onAliasesChanged={onAliasesChanged} toast={toast} />}
      {subTab === "manual" && <ManualAliasPanel players={players} aliases={aliases} onAliasesChanged={onAliasesChanged} toast={toast} />}
    </div>
  );
}