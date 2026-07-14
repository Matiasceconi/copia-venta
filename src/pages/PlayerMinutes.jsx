import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

const TOURNAMENTS = [
  "Proyección Apertura",
  "Clausura",
  "Copa Argentina",
  "Juveniles",
  "Amistosos",
  "Torneo Regional",
  "Otro",
];

const EMPTY_FORM = {
  player_id: "",
  player_name: "",
  player_number: "",
  tournament: "Proyección Apertura",
  rival: "",
  match_date: moment().format("YYYY-MM-DD"),
  minutes: "",
  notes: "",
};

// ── Add Match Modal ───────────────────────────────────────────────────────────
function AddMatchModal({ players, tournament, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, tournament });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function handlePlayerSelect(playerId) {
    const p = players.find((pl) => pl.id === playerId);
    set("player_id", playerId);
    if (p) { set("player_name", p.name); set("player_number", p.number || ""); }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-white font-semibold text-sm">Registrar minutos</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Jugador *</label>
            <select
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
              value={form.player_id}
              onChange={(e) => handlePlayerSelect(e.target.value)}
            >
              <option value="">Seleccionar jugador...</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>#{p.number} {p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Torneo *</label>
              <select
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                value={form.tournament}
                onChange={(e) => set("tournament", e.target.value)}
              >
                {TOURNAMENTS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Fecha *</label>
              <input type="date" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" value={form.match_date} onChange={(e) => set("match_date", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Rival</label>
              <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" placeholder="Ej: Independiente" value={form.rival} onChange={(e) => set("rival", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Minutos jugados *</label>
              <input type="number" min="0" max="120" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" placeholder="90" value={form.minutes} onChange={(e) => set("minutes", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Notas</label>
            <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" placeholder="Observaciones..." value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">Cancelar</button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.player_name || !form.minutes}
            className="px-4 py-2 rounded-lg text-sm bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-semibold disabled:opacity-40 transition-colors flex items-center gap-1"
          >
            <Check size={14} /> Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Planilla (spreadsheet view) ───────────────────────────────────────────────
function Planilla({ records, players, tournament, onDelete }) {
  // Get all unique matches (date + rival) sorted by date
  const matchKeys = [...new Map(
    records.map((r) => [`${r.match_date}||${r.rival || ""}`, { date: r.match_date, rival: r.rival || "" }])
  ).entries()]
    .map(([key, val]) => ({ key, ...val }))
    .sort((a, b) => a.date?.localeCompare(b.date));

  // Get all unique players sorted by number
  const playerNames = [...new Set(records.map((r) => r.player_name))]
    .map((name) => {
      const rec = records.find((r) => r.player_name === name);
      return { name, number: rec?.player_number || 99 };
    })
    .sort((a, b) => a.number - b.number);

  // Index: playerName -> matchKey -> record
  const index = {};
  records.forEach((r) => {
    const key = `${r.match_date}||${r.rival || ""}`;
    if (!index[r.player_name]) index[r.player_name] = {};
    index[r.player_name][key] = r;
  });

  if (matchKeys.length === 0) return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
      <p className="text-zinc-500 text-sm">No hay registros para {tournament === "all" ? "ningún torneo" : tournament}</p>
      <p className="text-zinc-600 text-xs mt-1">Usá "Agregar partido" para cargar los minutos</p>
    </div>
  );

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-800 text-zinc-400">
              <th className="px-4 py-3 text-left font-semibold whitespace-nowrap border-b border-zinc-700 sticky left-0 bg-zinc-800 z-10 min-w-[160px]">
                Jugador
              </th>
              {matchKeys.map((m) => (
                <th key={m.key} className="px-3 py-3 text-center font-semibold whitespace-nowrap border-b border-zinc-700 min-w-[80px]">
                  <div className="text-zinc-300">{m.rival || "Partido"}</div>
                  <div className="text-zinc-600 font-normal">{moment(m.date).format("DD/MM")}</div>
                </th>
              ))}
              <th className="px-4 py-3 text-right font-semibold whitespace-nowrap border-b border-zinc-700 bg-zinc-800/80">
                Total min
              </th>
              <th className="px-4 py-3 text-right font-semibold whitespace-nowrap border-b border-zinc-700 bg-zinc-800/80">
                Partidos
              </th>
              <th className="px-4 py-3 text-right font-semibold whitespace-nowrap border-b border-zinc-700 bg-zinc-800/80">
                Prom.
              </th>
            </tr>
          </thead>
          <tbody>
            {playerNames.map(({ name, number }) => {
              const playerRecords = index[name] || {};
              const totalMin = Object.values(playerRecords).reduce((a, r) => a + (r.minutes || 0), 0);
              const totalMatches = Object.values(playerRecords).filter((r) => (r.minutes || 0) > 0).length;
              const avg = totalMatches > 0 ? Math.round(totalMin / totalMatches) : 0;

              return (
                <tr key={name} className="border-b border-zinc-800/60 hover:bg-zinc-800/20 transition-colors group">
                  <td className="px-4 py-2.5 sticky left-0 bg-zinc-900 group-hover:bg-zinc-800/20 z-10 border-r border-zinc-800">
                    <span className="text-zinc-500 font-mono text-xs mr-2">#{number}</span>
                    <span className="text-white font-medium">{name}</span>
                  </td>
                  {matchKeys.map((m) => {
                    const rec = playerRecords[m.key];
                    const min = rec?.minutes || 0;
                    const color = min >= 80 ? "text-green-400 bg-green-900/20"
                      : min >= 45 ? "text-yellow-400 bg-yellow-900/20"
                      : min > 0 ? "text-orange-400 bg-orange-900/20"
                      : "text-zinc-700";
                    return (
                      <td key={m.key} className={`px-3 py-2.5 text-center font-bold ${color}`}>
                        <div className="flex items-center justify-center gap-1">
                          <span>{min > 0 ? `${min}'` : "—"}</span>
                          {rec && (
                            <button
                              onClick={() => onDelete(rec.id)}
                              className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
                            >
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-4 py-2.5 text-right font-bold text-yellow-400 bg-zinc-800/30">{totalMin > 0 ? `${totalMin}'` : "—"}</td>
                  <td className="px-4 py-2.5 text-right text-zinc-300 bg-zinc-800/30">{totalMatches}</td>
                  <td className="px-4 py-2.5 text-right text-zinc-400 bg-zinc-800/30">{avg > 0 ? `${avg}'` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-zinc-800 flex items-center gap-4 text-xs text-zinc-600">
        <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-green-900/60 inline-block" /> 80'+ (titular)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-yellow-900/60 inline-block" /> 45–79' (ingreso)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-orange-900/60 inline-block" /> 1–44' (minutos)</span>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PlayerMinutes() {
  const [records, setRecords] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState("Proyección Apertura");
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [r, p] = await Promise.all([
      base44.entities.MinutesRecord.list("match_date", 1000),
      base44.entities.Player.list("number", 100),
    ]);
    setRecords(r);
    setPlayers(p);
    setLoading(false);
  }

  async function handleSave(form) {
    await base44.entities.MinutesRecord.create({
      ...form,
      minutes: Number(form.minutes) || 0,
      player_number: Number(form.player_number) || undefined,
    });
    toast({ title: "Minutos registrados" });
    setShowModal(false);
    loadAll();
  }

  async function handleDelete(id) {
    if (!confirm("¿Eliminar este registro?")) return;
    await base44.entities.MinutesRecord.delete(id);
    toast({ title: "Registro eliminado" });
    loadAll();
  }

  const filtered = selectedTournament === "all"
    ? records
    : records.filter((r) => r.tournament === selectedTournament);

  // Summary stats for selected tournament
  const totalMin = filtered.reduce((a, r) => a + (r.minutes || 0), 0);
  const uniqueMatches = new Set(filtered.map((r) => `${r.match_date}||${r.rival || ""}`)).size;

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {showModal && (
        <AddMatchModal
          players={players}
          tournament={selectedTournament !== "all" ? selectedTournament : "Proyección Apertura"}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Header + add */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-white">Planilla de Minutos</h2>
          {uniqueMatches > 0 && (
            <p className="text-zinc-500 text-xs mt-0.5">{uniqueMatches} partidos · {totalMin} min totales registrados</p>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={15} /> Agregar partido
        </button>
      </div>

      {/* Tournament filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedTournament("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedTournament === "all" ? "bg-white text-zinc-900" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}
        >
          Todos
        </button>
        {TOURNAMENTS.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedTournament(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedTournament === t ? "bg-white text-zinc-900" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Planilla */}
      <Planilla
        records={filtered}
        players={players}
        tournament={selectedTournament}
        onDelete={handleDelete}
      />
    </div>
  );
}