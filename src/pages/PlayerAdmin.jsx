import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Search, Users, Tag, X, Check, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, ArrowRightLeft, IdCard } from "lucide-react";
import { resolvePlayerType, resolvePositionGroup } from "@/components/squad/squadConstants";
import { useToast } from "@/components/ui/use-toast";
import PlayerFichaModal from "@/components/staff/PlayerFichaModal";

// ── Normalización ──
function normalizeName(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[,\.]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Constantes ──
const POSITIONS = [
  "Arquero","Defensor Central","Lateral Derecho","Lateral Izquierdo",
  "Mediocampista Central","Volante Interno","Extremo","Delantero Centro"
];
const STATUSES = [
  "Disponible","Lesionado","En recuperación","Suspendido",
  "Permiso","Selección","Subio a primera","Bajo a juveniles","Subieron de juveniles","Sparring"
];
const LEGS = ["Derecha","Izquierda","Ambidiestro"];
const ALIAS_SOURCES = ["Catapult","CSV GPS","Manual","Excel","Otro"];

const EMPTY_PLAYER = {
  first_name:"", last_name:"", dni:"", birth_date:"", category:"",
  division:"", position:"Defensor Central", dominant_leg:"", height:"",
  weight:"", status:"Disponible", active:true, jersey_number:"",
  photo_url:"", notes:""
};

// ── PlayerForm ──
function PlayerForm({ player, onSave, onCancel }) {
  const [form, setForm] = useState(player ? { ...EMPTY_PLAYER, ...player } : { ...EMPTY_PLAYER });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form };
    payload.full_name = `${form.first_name} ${form.last_name}`.trim();
    payload.normalized_name = normalizeName(payload.full_name);
    if (form.height) payload.height = Number(form.height);
    if (form.weight) payload.weight = Number(form.weight);
    if (form.jersey_number) payload.jersey_number = Number(form.jersey_number);
    // Auto-derive player_type and position_group from position
    if (payload.position) {
      payload.player_type = resolvePlayerType(payload.position);
      payload.position_group = resolvePositionGroup(payload.position);
    }
    Object.keys(payload).forEach(k => { if (payload[k] === "") delete payload[k]; });
    onSave(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Nombre *</label>
          <input required value={form.first_name} onChange={e => set("first_name", e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Apellido *</label>
          <input required value={form.last_name} onChange={e => set("last_name", e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">DNI</label>
          <input value={form.dni} onChange={e => set("dni", e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Fecha de nacimiento</label>
          <input type="date" value={form.birth_date} onChange={e => set("birth_date", e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Categoría</label>
          <input value={form.category} onChange={e => set("category", e.target.value)}
            placeholder="ej: 2006, Sub-20"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Equipo / División</label>
          <input value={form.division} onChange={e => set("division", e.target.value)}
            placeholder="ej: Reserva, Primera"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Posición *</label>
          <select required value={form.position} onChange={e => set("position", e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
            {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Pierna hábil</label>
          <select value={form.dominant_leg} onChange={e => set("dominant_leg", e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
            <option value="">—</option>
            {LEGS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Altura (cm)</label>
          <input type="number" value={form.height} onChange={e => set("height", e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Peso (kg)</label>
          <input type="number" value={form.weight} onChange={e => set("weight", e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Número de camiseta</label>
          <input type="number" value={form.jersey_number} onChange={e => set("jersey_number", e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Estado</label>
          <select value={form.status} onChange={e => set("status", e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="col-span-2 flex items-center gap-3">
          <label className="text-xs text-zinc-400">Activo en el plantel</label>
          <button type="button" onClick={() => set("active", !form.active)}
            className={`relative w-10 h-5 rounded-full transition-colors ${form.active ? "bg-emerald-500" : "bg-zinc-600"}`}>
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.active ? "translate-x-5" : ""}`} />
          </button>
          <span className={`text-xs font-medium ${form.active ? "text-emerald-400" : "text-zinc-500"}`}>{form.active ? "Activo" : "Inactivo"}</span>
        </div>
        <div className="col-span-2">
          <label className="text-xs text-zinc-400 mb-1 block">Notas</label>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500 resize-none" />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
          Cancelar
        </button>
        <button type="submit"
          className="px-4 py-2 rounded-lg text-sm bg-white text-zinc-900 font-semibold hover:bg-zinc-200 transition-colors">
          Guardar
        </button>
      </div>
    </form>
  );
}

// ── AliasPanel ──
function AliasPanel({ player, aliases, onAddAlias, onDeleteAlias }) {
  const [aliasInput, setAliasInput] = useState("");
  const [source, setSource] = useState("Manual");
  const playerAliases = aliases.filter(a => a.player_id === player.id);

  function handleAdd(e) {
    e.preventDefault();
    if (!aliasInput.trim()) return;
    onAddAlias(player.id, aliasInput.trim(), source);
    setAliasInput("");
  }

  return (
    <div className="mt-3 bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
      <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Tag size={11} /> Alias ({playerAliases.length})
      </p>
      <div className="flex flex-wrap gap-1 mb-2">
        {playerAliases.length === 0 && <span className="text-xs text-zinc-700 italic">Sin alias registrados</span>}
        {playerAliases.map(a => (
          <span key={a.id} className="flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-full px-2.5 py-0.5 text-xs text-zinc-300">
            <span className="text-zinc-500 text-[10px]">[{a.source}]</span> {a.alias_name}
            <button onClick={() => onDeleteAlias(a.id)} className="ml-0.5 text-zinc-600 hover:text-red-400 transition-colors">
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <form onSubmit={handleAdd} className="flex gap-2 items-center">
        <input value={aliasInput} onChange={e => setAliasInput(e.target.value)}
          placeholder="Nuevo alias..."
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500" />
        <select value={source} onChange={e => setSource(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none">
          {ALIAS_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" className="px-3 py-1.5 rounded-lg text-xs bg-zinc-700 text-white hover:bg-zinc-600 transition-colors">
          + Agregar
        </button>
      </form>
    </div>
  );
}

// ── MoveModal ──
function MoveModal({ player, divisions, onMove, onClose }) {
  const [targetDivision, setTargetDivision] = useState("");
  const [custom, setCustom] = useState("");

  const finalDivision = targetDivision === "__custom__" ? custom : targetDivision;

  async function handleMove() {
    if (!finalDivision.trim()) return;
    await onMove(player, finalDivision.trim());
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-sm shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">Mover a otro plantel</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={16} /></button>
        </div>
        <p className="text-sm text-zinc-400">
          Jugador: <span className="text-white font-medium">{player.full_name}</span>
          <br />
          <span className="text-xs text-zinc-500">Plantel actual: {player.division || "Sin asignar"}</span>
        </p>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Plantel destino</label>
          <select
            value={targetDivision}
            onChange={e => setTargetDivision(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
          >
            <option value="">— Seleccionar —</option>
            {divisions.filter(d => d !== player.division).map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
            <option value="__custom__">Otro (escribir)</option>
          </select>
        </div>
        {targetDivision === "__custom__" && (
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Nombre del plantel</label>
            <input
              value={custom}
              onChange={e => setCustom(e.target.value)}
              placeholder="ej: Primera, Sub-20..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
            />
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleMove}
            disabled={!finalDivision.trim()}
            className="px-4 py-2 text-sm bg-white text-zinc-900 font-semibold rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-40"
          >
            Mover
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──
export default function PlayerAdmin() {
  const [players, setPlayers] = useState([]);
  const [aliases, setAliases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDivision, setFilterDivision] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPosition, setFilterPosition] = useState("");
  const [filterActive, setFilterActive] = useState("all"); // "all" | "active" | "inactive"
  const [showForm, setShowForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [expandedAliases, setExpandedAliases] = useState(new Set());
  const [movingPlayer, setMovingPlayer] = useState(null);
  const [fichaPlayer, setFichaPlayer] = useState(null);
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [ps, as] = await Promise.all([
      base44.entities.Player.list("-created_date", 300),
      base44.entities.PlayerAlias.list("-created_date", 500),
    ]);
    setPlayers(ps);
    setAliases(as);
    setLoading(false);
  }

  async function handleSave(data) {
    if (editingPlayer) {
      await base44.entities.Player.update(editingPlayer.id, data);
      setPlayers(prev => prev.map(p => p.id === editingPlayer.id ? { ...p, ...data } : p));
      toast({ title: "Jugador actualizado" });
    } else {
      const created = await base44.entities.Player.create(data);
      setPlayers(prev => [created, ...prev]);
      toast({ title: "Jugador creado" });
    }
    setShowForm(false);
    setEditingPlayer(null);
  }

  async function handleDelete(player) {
    if (!confirm(`¿Eliminar a ${player.full_name}? Esta acción no se puede deshacer.`)) return;
    await base44.entities.Player.delete(player.id);
    setPlayers(prev => prev.filter(p => p.id !== player.id));
    toast({ title: "Jugador eliminado" });
  }

  async function handleMovePlayer(player, newDivision) {
    await base44.entities.Player.update(player.id, { division: newDivision });
    setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, division: newDivision } : p));
    toast({ title: `${player.full_name} movido a ${newDivision}` });
  }

  async function handleToggleActive(player) {
    const newVal = !player.active;
    await base44.entities.Player.update(player.id, { active: newVal });
    setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, active: newVal } : p));
  }

  async function handleAddAlias(player_id, alias_name, source) {
    const player = players.find(p => p.id === player_id);
    const normalized_alias = normalizeName(alias_name);
    const created = await base44.entities.PlayerAlias.create({
      player_id,
      player_name: player?.full_name || "",
      alias_name,
      normalized_alias,
      source,
    });
    setAliases(prev => [created, ...prev]);
    toast({ title: "Alias agregado" });
  }

  async function handleDeleteAlias(aliasId) {
    await base44.entities.PlayerAlias.delete(aliasId);
    setAliases(prev => prev.filter(a => a.id !== aliasId));
    toast({ title: "Alias eliminado" });
  }

  function toggleAliases(playerId) {
    setExpandedAliases(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId); else next.add(playerId);
      return next;
    });
  }

  // Valores únicos para filtros
  const divisions = [...new Set(players.map(p => p.division).filter(Boolean))].sort();
  const categories = [...new Set(players.map(p => p.category).filter(Boolean))].sort();

  const filtered = players.filter(p => {
    if (filterActive === "active" && !p.active) return false;
    if (filterActive === "inactive" && p.active !== false) return false;
    if (filterDivision && p.division !== filterDivision) return false;
    if (filterCategory && p.category !== filterCategory) return false;
    if (filterPosition && p.position !== filterPosition) return false;
    if (search) {
      const q = search.toLowerCase();
      return (p.full_name || "").toLowerCase().includes(q) ||
             (p.dni || "").includes(q) ||
             (p.category || "").toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Administración del Plantel</h1>
          <p className="text-zinc-500 text-sm mt-1">Fuente oficial de jugadores · {players.length} registros</p>
        </div>
        <button onClick={() => { setEditingPlayer(null); setShowForm(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-white text-zinc-900 rounded-lg text-sm font-semibold hover:bg-zinc-200 transition-colors">
          <Plus size={15} /> Nuevo jugador
        </button>
      </div>

      {/* Formulario inline */}
      {showForm && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 shadow-xl">
          <h3 className="text-white font-semibold mb-4">{editingPlayer ? "Editar jugador" : "Nuevo jugador"}</h3>
          <PlayerForm
            player={editingPlayer}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingPlayer(null); }}
          />
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar nombre o DNI..."
            className="bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-sm text-white w-52 focus:outline-none focus:border-zinc-600" />
        </div>
        <select value={filterDivision} onChange={e => setFilterDivision(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600">
          <option value="">Todos los equipos</option>
          {divisions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600">
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterPosition} onChange={e => setFilterPosition(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600">
          <option value="">Todas las posiciones</option>
          {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 gap-0.5">
          {[["all","Todos"],["active","Activos"],["inactive","Inactivos"]].map(([val, label]) => (
            <button key={val} onClick={() => setFilterActive(val)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterActive === val ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}>
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-zinc-600">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Lista de jugadores */}
      {filtered.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <Users size={36} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">No hay jugadores que coincidan con los filtros</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(player => {
            const aliasCount = aliases.filter(a => a.player_id === player.id).length;
            const isExpanded = expandedAliases.has(player.id);
            const isInactive = player.active === false;
            return (
              <div key={player.id} className={`bg-zinc-900 border rounded-xl transition-all ${isInactive ? "border-zinc-800 opacity-60" : "border-zinc-800 hover:border-zinc-700"}`}>
                <div className="flex items-center gap-3 p-3">
                  {/* Foto / inicial */}
                  {player.photo_url ? (
                    <img src={player.photo_url} alt={player.full_name}
                      className="w-10 h-10 rounded-full object-cover border border-zinc-700 shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-zinc-500">{(player.full_name || "?").charAt(0)}</span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{player.full_name || `${player.first_name} ${player.last_name}`}</span>
                      {player.jersey_number && <span className="text-xs text-zinc-500 font-mono">#{player.jersey_number}</span>}
                      {player.dni && <span className="text-xs text-zinc-600">DNI: {player.dni}</span>}
                      {isInactive && <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700">Inactivo</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      {player.position === "Arquero" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 font-semibold">ARQ</span>
                      )}
                      {player.position && <span className="text-xs text-zinc-500">{player.position}</span>}
                      {player.division && <span className="text-xs text-zinc-600">· {player.division}</span>}
                      {player.category && <span className="text-xs text-zinc-600">· {player.category}</span>}
                      {player.status && player.status !== "Disponible" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">{player.status}</span>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setFichaPlayer(player)}
                      title="Ver ficha del jugador"
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors">
                      <IdCard size={14} />
                    </button>
                    <button
                      onClick={() => setMovingPlayer(player)}
                      title="Mover a otro plantel"
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
                      <ArrowRightLeft size={14} />
                    </button>
                    <button onClick={() => toggleAliases(player.id)}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors ${isExpanded ? "bg-violet-500/20 text-violet-300" : "text-zinc-500 hover:text-white hover:bg-zinc-800"}`}>
                      <Tag size={12} /> {aliasCount}
                      {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>
                    <button onClick={() => handleToggleActive(player)}
                      title={isInactive ? "Activar" : "Desactivar"}
                      className={`p-1.5 rounded-lg transition-colors ${isInactive ? "text-zinc-600 hover:text-emerald-400 hover:bg-emerald-500/10" : "text-emerald-400 hover:bg-zinc-800"}`}>
                      {isInactive ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
                    </button>
                    <button onClick={() => { setEditingPlayer(player); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(player)}
                      className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Panel de alias expandido */}
                {isExpanded && (
                  <div className="px-3 pb-3">
                    <AliasPanel
                      player={player}
                      aliases={aliases}
                      onAddAlias={handleAddAlias}
                      onDeleteAlias={handleDeleteAlias}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {fichaPlayer && (
        <PlayerFichaModal
          player={fichaPlayer}
          onClose={() => setFichaPlayer(null)}
          onEdit={(p) => { setFichaPlayer(null); setEditingPlayer(p); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        />
      )}

      {movingPlayer && (
        <MoveModal
          player={movingPlayer}
          divisions={divisions}
          onMove={handleMovePlayer}
          onClose={() => setMovingPlayer(null)}
        />
      )}
    </div>
  );
}