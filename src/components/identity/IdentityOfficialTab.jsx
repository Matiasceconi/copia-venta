import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Search, Tag, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Fingerprint } from "lucide-react";

const POSITIONS = [
  "Arquero","Defensor Central","Lateral Derecho","Lateral Izquierdo",
  "Mediocampista Central","Volante Interno","Extremo","Delantero Centro"
];
const STATUSES = [
  "Disponible","Lesionado","En recuperación","Suspendido",
  "Permiso","Selección","Subio a primera","Bajo a juveniles","Subieron de juveniles","Sparring"
];
const LEGS = ["Derecha","Izquierda","Ambidiestro"];

const EMPTY = {
  first_name:"", last_name:"", dni:"", birth_date:"", category:"",
  division:"", position:"Defensor Central", dominant_leg:"", height:"",
  weight:"", status:"Disponible", active:true, jersey_number:"", notes:""
};

function norm(str) {
  return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[,.]/g,"").replace(/\s+/g," ").trim();
}

function PlayerForm({ player, onSave, onCancel }) {
  const [form, setForm] = useState(player ? { ...EMPTY, ...player } : { ...EMPTY });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form };
    payload.full_name = `${form.first_name} ${form.last_name}`.trim();
    payload.normalized_name = norm(payload.full_name);
    if (form.height) payload.height = Number(form.height);
    if (form.weight) payload.weight = Number(form.weight);
    if (form.jersey_number) payload.jersey_number = Number(form.jersey_number);
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
          <input value={form.category} onChange={e => set("category", e.target.value)} placeholder="ej: 2006, Sub-20"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">División</label>
          <input value={form.division} onChange={e => set("division", e.target.value)} placeholder="ej: Reserva, Primera"
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
          <label className="text-xs text-zinc-400 mb-1 block">N° camiseta</label>
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
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">Cancelar</button>
        <button type="submit" className="px-4 py-2 rounded-lg text-sm bg-white text-zinc-900 font-semibold hover:bg-zinc-200 transition-colors">Guardar</button>
      </div>
    </form>
  );
}

export default function IdentityOfficialTab({ players, aliases, onPlayersChanged, toast }) {
  const [search, setSearch] = useState("");
  const [filterDivision, setFilterDivision] = useState("");
  const [filterActive, setFilterActive] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const divisions = [...new Set(players.map(p => p.division).filter(Boolean))].sort();

  async function handleSave(data) {
    if (editingPlayer) {
      await base44.entities.Player.update(editingPlayer.id, data);
      onPlayersChanged(players.map(p => p.id === editingPlayer.id ? { ...p, ...data } : p));
      toast({ title: "Jugador actualizado" });
    } else {
      const created = await base44.entities.Player.create(data);
      onPlayersChanged([created, ...players]);
      toast({ title: "Jugador creado" });
    }
    setShowForm(false);
    setEditingPlayer(null);
  }

  async function handleDelete(player) {
    if (!confirm(`¿Eliminar a ${player.full_name}? Esta acción no se puede deshacer.`)) return;
    await base44.entities.Player.delete(player.id);
    onPlayersChanged(players.filter(p => p.id !== player.id));
    toast({ title: "Jugador eliminado" });
  }

  async function handleToggleActive(player) {
    const newVal = !player.active;
    await base44.entities.Player.update(player.id, { active: newVal });
    onPlayersChanged(players.map(p => p.id === player.id ? { ...p, active: newVal } : p));
  }

  const filtered = players.filter(p => {
    if (filterActive === "active" && !p.active) return false;
    if (filterActive === "inactive" && p.active !== false) return false;
    if (filterDivision && p.division !== filterDivision) return false;
    if (search) {
      const q = search.toLowerCase();
      return (p.full_name || "").toLowerCase().includes(q) || (p.dni || "").includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre o DNI..."
              className="bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-sm text-white w-48 focus:outline-none focus:border-zinc-600" />
          </div>
          <select value={filterDivision} onChange={e => setFilterDivision(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
            <option value="">Todos los equipos</option>
            {divisions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 gap-0.5">
            {[["all","Todos"],["active","Activos"],["inactive","Inactivos"]].map(([val, label]) => (
              <button key={val} onClick={() => setFilterActive(val)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterActive === val ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}>
                {label}
              </button>
            ))}
          </div>
          <span className="text-xs text-zinc-600">{filtered.length} jugadores</span>
        </div>
        <button onClick={() => { setEditingPlayer(null); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-white text-zinc-900 rounded-lg text-sm font-semibold hover:bg-zinc-200 transition-colors">
          <Plus size={14} /> Nuevo jugador
        </button>
      </div>

      {/* Form inline */}
      {showForm && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 shadow-xl">
          <h3 className="text-white font-semibold mb-4">{editingPlayer ? "Editar jugador" : "Nuevo jugador"}</h3>
          <PlayerForm player={editingPlayer} onSave={handleSave} onCancel={() => { setShowForm(false); setEditingPlayer(null); }} />
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {filtered.map(player => {
          const aliasCount = aliases.filter(a => a.player_id === player.id).length;
          const isInactive = player.active === false;
          const isExpanded = expandedId === player.id;

          return (
            <div key={player.id} className={`bg-zinc-900 border rounded-xl transition-all ${isInactive ? "border-zinc-800 opacity-60" : "border-zinc-800 hover:border-zinc-700"}`}>
              <div className="flex items-center gap-3 p-3">
                {player.photo_url ? (
                  <img src={player.photo_url} alt={player.full_name} className="w-10 h-10 rounded-full object-cover border border-zinc-700 shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-zinc-500">{(player.full_name || "?").charAt(0)}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{player.full_name || `${player.first_name} ${player.last_name}`}</span>
                    {player.jersey_number && <span className="text-xs text-zinc-500 font-mono">#{player.jersey_number}</span>}
                    {player.dni && <span className="text-xs text-zinc-600 font-mono">DNI {player.dni}</span>}
                    {isInactive && <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700">Inactivo</span>}
                    {player.status && player.status !== "Disponible" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">{player.status}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    {player.position && <span className="text-xs text-zinc-500">{player.position}</span>}
                    {player.division && <span className="text-xs text-zinc-600">· {player.division}</span>}
                    {player.category && <span className="text-xs text-zinc-600">· {player.category}</span>}
                  </div>
                  {/* ID oficial */}
                  <div className="flex items-center gap-1 mt-1">
                    <Fingerprint size={10} className="text-zinc-700" />
                    <span className="text-[10px] text-zinc-700 font-mono">{player.id}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setExpandedId(isExpanded ? null : player.id)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors ${isExpanded ? "bg-violet-500/20 text-violet-300" : "text-zinc-500 hover:text-white hover:bg-zinc-800"}`}>
                    <Tag size={12} /> {aliasCount}
                    {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>
                  <button onClick={() => handleToggleActive(player)} title={isInactive ? "Activar" : "Desactivar"}
                    className={`p-1.5 rounded-lg transition-colors ${isInactive ? "text-zinc-600 hover:text-emerald-400" : "text-emerald-400 hover:bg-zinc-800"}`}>
                    {isInactive ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
                  </button>
                  <button onClick={() => { setEditingPlayer(player); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(player)} className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Aliases expandidos inline */}
              {isExpanded && (
                <div className="border-t border-zinc-800 px-4 py-3">
                  <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">Alias registrados</p>
                  {aliases.filter(a => a.player_id === player.id).length === 0 ? (
                    <p className="text-xs text-zinc-700 italic">Sin alias — importá un CSV para generarlos automáticamente</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {aliases.filter(a => a.player_id === player.id).map(a => (
                        <span key={a.id} className="flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-full px-2.5 py-0.5 text-xs text-zinc-300">
                          <span className="text-zinc-600 text-[10px]">[{a.source}]</span> {a.alias_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}