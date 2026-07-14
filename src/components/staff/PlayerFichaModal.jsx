import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Plus, Trash2, Tag, Copy, Check, AlertCircle, User, GitMerge, Activity } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";
import PlayerPhoto from "@/components/player/PlayerPhoto";
import "moment/locale/es";
moment.locale("es");

const ALIAS_SOURCES = ["Catapult", "CSV GPS", "Wellness", "Minutos", "Manual", "Excel", "Otro"];

const SOURCE_COLORS = {
  "Catapult":  "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "CSV GPS":   "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Wellness":  "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "Minutos":   "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "Manual":    "bg-zinc-700/60 text-zinc-300 border-zinc-600",
  "Excel":     "bg-green-500/20 text-green-300 border-green-500/30",
  "Otro":      "bg-purple-500/20 text-purple-300 border-purple-500/30",
};

const STATUS_COLORS = {
  "Disponible":       "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "Lesionado":        "bg-red-500/20 text-red-300 border-red-500/30",
  "En recuperación":  "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "Suspendido":       "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Permiso":          "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Selección":        "bg-violet-500/20 text-violet-300 border-violet-500/30",
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button onClick={handleCopy} className="ml-1 p-0.5 rounded text-zinc-600 hover:text-zinc-300 transition-colors">
      {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
    </button>
  );
}

function InfoRow({ label, value }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-zinc-800/50 last:border-0 gap-3">
      <span className="text-xs text-zinc-500 shrink-0 w-36">{label}</span>
      <span className="text-sm text-white text-right font-medium">{value}</span>
    </div>
  );
}

const TABS = [
  { id: "datos", label: "Datos personales", icon: User },
  { id: "identidad", label: "Identidad y cruces", icon: Tag },
  { id: "disponibilidad", label: "Disponibilidad", icon: Activity },
];

export default function PlayerFichaModal({ player, onClose, onEdit }) {
  const [activeTab, setActiveTab] = useState("datos");
  const [aliases, setAliases] = useState([]);
  const [loadingAliases, setLoadingAliases] = useState(true);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [minutesRecords, setMinutesRecords] = useState([]);
  const [loadingAvail, setLoadingAvail] = useState(true);
  const [aliasInput, setAliasInput] = useState("");
  const [aliasSource, setAliasSource] = useState("Manual");
  const { toast } = useToast();

  const age = player.birth_date ? moment().diff(moment(player.birth_date), "years") : null;

  useEffect(() => {
    loadAliases();
  }, [player.id]);

  useEffect(() => {
    if (activeTab === "disponibilidad") loadAvailabilityData();
  }, [activeTab, player.id]);

  async function loadAliases() {
    setLoadingAliases(true);
    const result = await base44.entities.PlayerAlias.filter({ player_id: player.id }, "-created_date", 100);
    setAliases(result);
    setLoadingAliases(false);
  }

  async function loadAvailabilityData() {
    setLoadingAvail(true);
    const [med, mins] = await Promise.all([
      base44.entities.MedicalRecord.filter({ player_id: player.id }, "-injury_date", 20),
      base44.entities.MinutesRecord.filter({ player_id: player.id }, "-match_date", 50),
    ]);
    setMedicalRecords(med);
    setMinutesRecords(mins);
    setLoadingAvail(false);
  }

  async function handleAddAlias(e) {
    e.preventDefault();
    if (!aliasInput.trim()) return;
    const normalized = aliasInput.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[,\.]/g, "").replace(/\s+/g, " ").trim();
    const created = await base44.entities.PlayerAlias.create({
      player_id: player.id,
      player_name: player.full_name || "",
      alias_name: aliasInput.trim(),
      normalized_alias: normalized,
      source: aliasSource,
      confidence_score: 1,
    });
    setAliases(prev => [created, ...prev]);
    setAliasInput("");
    toast({ title: "Alias agregado" });
  }

  async function handleDeleteAlias(id) {
    await base44.entities.PlayerAlias.delete(id);
    setAliases(prev => prev.filter(a => a.id !== id));
    toast({ title: "Alias eliminado" });
  }

  // Agrupar alias por fuente
  const aliasBySource = {};
  aliases.forEach(a => {
    if (!aliasBySource[a.source]) aliasBySource[a.source] = [];
    aliasBySource[a.source].push(a);
  });

  const statusClass = STATUS_COLORS[player.status] || "bg-zinc-700 text-zinc-300 border-zinc-600";
  const totalMinutes = minutesRecords.reduce((s, r) => s + (r.minutes || 0), 0);
  const matchesPlayed = minutesRecords.filter(r => (r.minutes || 0) > 0).length;
  const lastSync = aliases.length > 0
    ? moment(aliases[0].created_date).format("DD/MM/YYYY HH:mm")
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl" style={{ maxHeight: "92vh" }}>

        {/* Header */}
        <div className="flex items-center gap-4 px-6 pt-5 pb-4 border-b border-zinc-800 shrink-0">
          <PlayerPhoto
            player={player}
            className="w-16 h-16 rounded-full object-cover border-2 border-zinc-700 shrink-0"
            fallbackClassName="w-16 h-16 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center shrink-0"
            textClassName="text-xl font-bold text-zinc-400"
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white leading-tight">{player.full_name}</h2>
            <p className="text-sm text-zinc-500 mt-0.5">{player.position}{player.jersey_number ? ` · #${player.jersey_number}` : ""}</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mt-1 ${statusClass}`}>
              {player.status || "Sin estado"}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onEdit && (
              <button onClick={() => { onEdit(player); onClose(); }}
                className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors">
                Editar
              </button>
            )}
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 shrink-0 px-4">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 -mb-px transition-all ${
                activeTab === id ? "border-white text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ── Tab: Datos personales ── */}
          {activeTab === "datos" && (
            <div className="space-y-5">
              {/* ID oficial */}
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-3">ID oficial del sistema</p>
                <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                  <span className="text-xs font-mono text-zinc-300 flex-1 break-all">{player.id}</span>
                  <CopyButton text={player.id} />
                </div>
                <p className="text-[10px] text-zinc-600 mt-1.5">Este es el player_id utilizado en todos los registros GPS, minutos y médicos.</p>
              </div>

              {/* Datos personales */}
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-3">Datos personales</p>
                <div className="bg-zinc-900 rounded-xl px-4 divide-y divide-zinc-800/50">
                  <InfoRow label="Nombre completo" value={player.full_name} />
                  <InfoRow label="DNI" value={player.dni || player.document_number} />
                  <InfoRow label="Fecha de nacimiento" value={player.birth_date ? moment(player.birth_date).format("DD/MM/YYYY") : null} />
                  <InfoRow label="Edad" value={age !== null ? `${age} años` : null} />
                  <InfoRow label="Pierna hábil" value={player.dominant_leg} />
                  <InfoRow label="Altura" value={player.height ? `${player.height} cm` : null} />
                  <InfoRow label="Peso" value={player.weight ? `${player.weight} kg` : null} />
                </div>
              </div>

              {/* Datos del plantel */}
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-3">Plantel</p>
                <div className="bg-zinc-900 rounded-xl px-4 divide-y divide-zinc-800/50">
                  <InfoRow label="Equipo / División" value={player.division} />
                  <InfoRow label="Categoría" value={player.category} />
                  <InfoRow label="Posición" value={player.position} />
                  <InfoRow label="N° camiseta" value={player.jersey_number ? `#${player.jersey_number}` : null} />
                  <InfoRow label="Estado" value={player.status} />
                  <InfoRow label="Activo" value={player.active === false ? "Inactivo" : "Activo"} />
                </div>
              </div>

              {player.notes && (
                <div className="bg-zinc-900 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Notas</p>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{player.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Identidad y cruces ── */}
          {activeTab === "identidad" && (
            <div className="space-y-5">
              {/* Resumen */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-900 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-white">{aliases.length}</p>
                  <p className="text-xs text-zinc-500 mt-1">Alias totales</p>
                </div>
                <div className="bg-zinc-900 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-white">{Object.keys(aliasBySource).length}</p>
                  <p className="text-xs text-zinc-500 mt-1">Fuentes vinculadas</p>
                </div>
                <div className="bg-zinc-900 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-white leading-tight">{lastSync || "—"}</p>
                  <p className="text-xs text-zinc-500 mt-1">Última sincronización</p>
                </div>
              </div>

              {/* Agregar alias */}
              <form onSubmit={handleAddAlias} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Agregar alias</p>
                <div className="flex gap-2">
                  <input
                    value={aliasInput}
                    onChange={e => setAliasInput(e.target.value)}
                    placeholder="Nombre tal como viene en el CSV..."
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                  />
                  <select
                    value={aliasSource}
                    onChange={e => setAliasSource(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none"
                  >
                    {ALIAS_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button type="submit"
                    className="px-3 py-2 bg-white text-zinc-900 rounded-lg text-sm font-semibold hover:bg-zinc-200 transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
              </form>

              {/* Lista de alias por fuente */}
              {loadingAliases ? (
                <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" /></div>
              ) : aliases.length === 0 ? (
                <div className="text-center py-8 text-zinc-600 text-sm">Sin alias registrados</div>
              ) : (
                <div className="space-y-4">
                  {ALIAS_SOURCES.filter(src => aliasBySource[src]?.length > 0).map(src => (
                    <div key={src}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${SOURCE_COLORS[src]}`}>{src}</span>
                        <span className="text-xs text-zinc-600">{aliasBySource[src].length} alias</span>
                      </div>
                      <div className="space-y-1.5">
                        {aliasBySource[src].map(a => (
                          <div key={a.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate">{a.alias_name}</p>
                              {a.normalized_alias && a.normalized_alias !== a.alias_name.toLowerCase() && (
                                <p className="text-xs text-zinc-600 font-mono truncate">{a.normalized_alias}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              {a.confidence_score != null && (
                                <span className={`text-xs font-mono ${a.confidence_score >= 0.9 ? "text-emerald-400" : "text-yellow-400"}`}>
                                  {Math.round(a.confidence_score * 100)}%
                                </span>
                              )}
                              <button onClick={() => handleDeleteAlias(a.id)}
                                className="p-1 text-zinc-600 hover:text-red-400 transition-colors">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Disponibilidad ── */}
          {activeTab === "disponibilidad" && (
            <div className="space-y-5">
              {loadingAvail ? (
                <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" /></div>
              ) : (
                <>
                  {/* Estado actual */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-3">Estado actual</p>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${statusClass}`}>
                        {player.status || "Sin estado"}
                      </span>
                      <span className={`text-sm ${player.active === false ? "text-zinc-500" : "text-emerald-400"}`}>
                        {player.active === false ? "Inactivo en el plantel" : "Activo en el plantel"}
                      </span>
                    </div>
                  </div>

                  {/* Minutos */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-3">Resumen de minutos</p>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-400">{totalMinutes}</p>
                        <p className="text-xs text-zinc-500 mt-1">Total minutos</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-400">{matchesPlayed}</p>
                        <p className="text-xs text-zinc-500 mt-1">Partidos</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">{matchesPlayed ? Math.round(totalMinutes / matchesPlayed) : 0}'</p>
                        <p className="text-xs text-zinc-500 mt-1">Promedio</p>
                      </div>
                    </div>
                    {minutesRecords.length > 0 && (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {minutesRecords.slice(0, 8).map(r => (
                          <div key={r.id} className="flex items-center justify-between text-xs">
                            <span className="text-zinc-400">{r.rival || r.match_label || "—"}</span>
                            <span className="text-zinc-500">{r.match_date ? moment(r.match_date).format("DD/MM") : ""}</span>
                            <span className="text-white font-semibold w-12 text-right">{r.minutes || 0}'</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Historial médico reciente */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                      <AlertCircle size={12} className="text-red-400" /> Historial médico reciente
                    </p>
                    {medicalRecords.length === 0 ? (
                      <p className="text-zinc-600 text-sm text-center py-3">Sin registros médicos</p>
                    ) : (
                      <div className="space-y-2">
                        {medicalRecords.slice(0, 5).map(r => (
                          <div key={r.id} className="flex items-start gap-3 bg-zinc-800/40 rounded-lg p-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white font-medium">{r.diagnosis}</p>
                              <p className="text-xs text-zinc-500 mt-0.5">
                                {r.injury_date ? moment(r.injury_date).format("DD/MM/YYYY") : "Fecha no registrada"}
                                {r.expected_return ? ` → ${moment(r.expected_return).format("DD/MM/YYYY")}` : ""}
                              </p>
                            </div>
                            {r.status && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-300 shrink-0">{r.status}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}