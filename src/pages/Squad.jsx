import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Users, Camera, Cake, ChevronDown, Search, Upload, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import PlayerStatusBadge from "@/components/staff/PlayerStatusBadge";
import PlayerProfileDetail from "@/components/staff/PlayerProfileDetail";
import PlayerImportDialog from "@/components/staff/PlayerImportDialog";
import PlayerFormModal from "@/components/staff/PlayerFormModal";
import moment from "moment";

const positions = ["Arquero", "Defensor Central", "Lateral Derecho", "Lateral Izquierdo", "Mediocampista Central", "Volante Interno", "Extremo", "Delantero Centro"];
const dominantFeet = ["Derecha", "Izquierda", "Ambidiestro"];
const seasonPeriods = ["En competencia", "Pretemporada", "Transitorio"];

const TABS = [
  { id: "reserva",   label: "Reserva" },
  { id: "primera",   label: "Primera" },
  { id: "cuarta",    label: "4ª División" },
  { id: "quinta",    label: "5ª División" },
];

const EMPTY_FORM = {
  first_name: "", last_name: "", number: "", position: "Defensor", status: "Disponible",
  division: "Primera",
  season_period: "",
  injury_detail: "", expected_return: "", photo_url: "",
  birth_date: "", category: "", document_number: "",
  dominant_foot: "", birth_place: "", current_residence: "", club_housing: false, has_contract: false,
};

function isBirthdayToday(birth_date) {
  if (!birth_date) return false;
  const today = moment();
  const bd = moment(birth_date);
  return bd.month() === today.month() && bd.date() === today.date();
}

function calcAge(birth_date) {
  if (!birth_date) return null;
  return moment().diff(moment(birth_date), "years");
}

export default function Squad() {
  const [players, setPlayers] = useState([]);
   const [divisions, setDivisions] = useState([]);
   const [statuses, setStatuses] = useState([]);
   const [loading, setLoading] = useState(true);
   const [showForm, setShowForm] = useState(false);
   const [editing, setEditing] = useState(null);
   const [deleteTarget, setDeleteTarget] = useState(null);
   const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [activeTab, setActiveTab] = useState("reserva");
  const [search, setSearch] = useState("");
  const [filterPosition, setFilterPosition] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showNewDivision, setShowNewDivision] = useState(false);
  const [newDivisionName, setNewDivisionName] = useState("");
  const [editingDivision, setEditingDivision] = useState(null);
  const [editingDivisionName, setEditingDivisionName] = useState("");
  const [showNewStatus, setShowNewStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [editingStatus, setEditingStatus] = useState(null);
  const [editingStatusName, setEditingStatusName] = useState("");
  const { toast } = useToast();

  useEffect(() => { loadPlayers(); loadDivisions(); loadStatuses(); }, []);

  async function loadPlayers() {
    const data = await base44.entities.Player.list("-created_date", 100);
    setPlayers(data);
    setLoading(false);
  }

  async function loadDivisions() {
    const data = await base44.entities.Division.list("order", 100);
    setDivisions(data);
  }

  async function loadStatuses() {
    const data = await base44.entities.Status.list("order", 100);
    setStatuses(data);
  }

  async function handleMoveDivision(divId, direction) {
    const index = divisions.findIndex((d) => d.id === divId);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= divisions.length) return;
    
    const div1 = divisions[index];
    const div2 = divisions[targetIndex];
    const newOrder1 = div2.order;
    const newOrder2 = div1.order;
    
    await Promise.all([
      base44.entities.Division.update(div1.id, { order: newOrder1 }),
      base44.entities.Division.update(div2.id, { order: newOrder2 })
    ]);
    await loadDivisions();
  }

  async function handleAddDivision(e) {
    e.preventDefault();
    if (!newDivisionName.trim()) return;
    await base44.entities.Division.create({ name: newDivisionName.trim() });
    toast({ title: "División creada" });
    setNewDivisionName("");
    setShowNewDivision(false);
    await loadDivisions();
  }

  async function handleEditDivision(e) {
    e.preventDefault();
    if (!editingDivisionName.trim()) return;
    await base44.entities.Division.update(editingDivision.id, { name: editingDivisionName.trim() });
    toast({ title: "División actualizada" });
    setEditingDivision(null);
    setEditingDivisionName("");
    await loadDivisions();
  }

  async function handleDeleteDivision(divisionId) {
    if (!confirm("¿Eliminar esta división?")) return;
    await base44.entities.Division.delete(divisionId);
    toast({ title: "División eliminada" });
    await loadDivisions();
  }

  async function handleAddStatus(e) {
    e.preventDefault();
    if (!newStatusName.trim()) return;
    await base44.entities.Status.create({ name: newStatusName.trim() });
    toast({ title: "Estado creado" });
    setNewStatusName("");
    setShowNewStatus(false);
    await loadStatuses();
  }

  async function handleEditStatus(e) {
    e.preventDefault();
    if (!editingStatusName.trim()) return;
    await base44.entities.Status.update(editingStatus.id, { name: editingStatusName.trim() });
    toast({ title: "Estado actualizado" });
    setEditingStatus(null);
    setEditingStatusName("");
    await loadStatuses();
  }

  async function handleDeleteStatus(statusId) {
    if (!confirm("¿Eliminar este estado?")) return;
    await base44.entities.Status.delete(statusId);
    toast({ title: "Estado eliminado" });
    await loadStatuses();
  }

  function openNew() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(p) {
    setEditing(p);
    setShowForm(true);
  }

  async function handleDeleteFromModal(playerId) {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await base44.entities.Player.delete(deleteTarget.id);
    toast({ title: "Jugador eliminado" });
    setDeleteTarget(null);
    setLoading(true);
    loadPlayers();
  }

  function filterByTab(tab) {
    const division = divisions.find((d) => d.id === tab);
    return players.filter((p) => p.division === (division?.name || "Reserva"));
  }

  const activePlayers = filterByTab(activeTab)
    .filter((p) => !search || p.full_name.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => !filterPosition || p.position === filterPosition);

  const groupedNoJuveniles = activePlayers.filter((p) => p.status !== "Subieron de juveniles");
  const grouped = positions.map((pos) => ({
    position: pos,
    players: groupedNoJuveniles.filter((p) => p.position === pos).sort((a, b) => (a.number || 0) - (b.number || 0)),
  }));

  const countByTab = (tab) => filterByTab(tab).length;
  const defaultTab = divisions.length > 0 ? divisions[0].id : null;
  const activeTabId = activeTab || defaultTab;

  useEffect(() => {
    if (defaultTab && !activeTab) setActiveTab(defaultTab);
  }, [defaultTab, activeTab]);

  const birthdayPlayers = players.filter((p) => isBirthdayToday(p.birth_date));
  const subioDJuvenilesPlayers = players.filter((p) => p.status === "Subieron de juveniles").sort((a, b) => (a.number || 0) - (b.number || 0));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Plantel</h1>
          <p className="text-zinc-500 text-sm mt-1">Estado de disponibilidad de los jugadores</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowImport(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Upload size={16} className="mr-1.5" /> Importar desde Excel
          </Button>
          <Button onClick={openNew} className="bg-white text-zinc-900 hover:bg-zinc-200">
            <Plus size={16} className="mr-1.5" /> Agregar jugador
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar jugador..."
          className="bg-zinc-900 border-zinc-800 text-white pl-9 w-full max-w-sm"
        />
      </div>

      {/* Tabs con reorden */}
      <div className="flex flex-wrap gap-2 items-center bg-zinc-900 border border-zinc-800 rounded-xl p-2 w-fit">
        {divisions.map(({ id, name }, idx) => (
          <div key={id} className="flex items-center gap-1 bg-zinc-800 rounded-lg px-2 py-1 group">
            <button onClick={() => setActiveTab(id)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${activeTab === id ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}>
              {name} ({countByTab(id)})
            </button>
            <div className="flex gap-0.5">
              <button onClick={() => { setEditingDivision({ id, name }); setEditingDivisionName(name); }}
                className="p-1 text-zinc-600 hover:text-yellow-400 transition-colors opacity-0 group-hover:opacity-100"
                title="Editar">
                <Pencil size={12} />
              </button>
              <button onClick={() => handleDeleteDivision(id)}
                className="p-1 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                title="Eliminar">
                <Trash2 size={12} />
              </button>
              <button onClick={() => handleMoveDivision(id, "up")} disabled={idx === 0}
                className="p-1 text-zinc-600 hover:text-white disabled:opacity-30 transition-colors">
                <ChevronUp size={14} />
              </button>
              <button onClick={() => handleMoveDivision(id, "down")} disabled={idx === divisions.length - 1}
                className="p-1 text-zinc-600 hover:text-white disabled:opacity-30 transition-colors">
                <ChevronDown size={14} />
              </button>
            </div>
          </div>
        ))}
        <button onClick={() => setShowNewDivision(true)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors">
          +
        </button>
      </div>

      {/* Editar división */}
      {editingDivision && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
          <form onSubmit={handleEditDivision} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-zinc-400 mb-1 block">Editar nombre de la división</label>
              <Input
                value={editingDivisionName}
                onChange={(e) => setEditingDivisionName(e.target.value)}
                placeholder="Nombre de la división"
                className="bg-zinc-900 border-zinc-700 text-white"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                Guardar
              </button>
              <button type="button" onClick={() => { setEditingDivision(null); setEditingDivisionName(""); }} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm font-medium transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Nueva división form */}
      {showNewDivision && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
          <form onSubmit={handleAddDivision} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-zinc-400 mb-1 block">Nombre de la división</label>
              <Input
                value={newDivisionName}
                onChange={(e) => setNewDivisionName(e.target.value)}
                placeholder="Ej: Sexta División"
                className="bg-zinc-900 border-zinc-700 text-white"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors">
                Crear
              </button>
              <button type="button" onClick={() => { setShowNewDivision(false); setNewDivisionName(""); }} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm font-medium transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Editar estado */}
      {editingStatus && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
          <form onSubmit={handleEditStatus} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-zinc-400 mb-1 block">Editar nombre del estado</label>
              <Input
                value={editingStatusName}
                onChange={(e) => setEditingStatusName(e.target.value)}
                placeholder="Nombre del estado"
                className="bg-zinc-900 border-zinc-700 text-white"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                Guardar
              </button>
              <button type="button" onClick={() => { setEditingStatus(null); setEditingStatusName(""); }} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm font-medium transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Nueva estado form */}
      {showNewStatus && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
          <form onSubmit={handleAddStatus} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-zinc-400 mb-1 block">Nombre del estado</label>
              <Input
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
                placeholder="Ej: Convalecencia"
                className="bg-zinc-900 border-zinc-700 text-white"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors">
                Crear
              </button>
              <button type="button" onClick={() => { setShowNewStatus(false); setNewStatusName(""); }} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm font-medium transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Estado manager tabs */}
      <div>
        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">Gestionar estados</p>
        <div className="flex flex-wrap gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
          {statuses.map(({ id, name }) => (
            <div key={id} className="flex items-center gap-1 bg-zinc-800 rounded-lg px-2 py-1 group">
              <span className="px-2 py-1 text-xs font-medium text-zinc-300">{name}</span>
              <div className="flex gap-0.5">
                <button onClick={() => { setEditingStatus({ id, name }); setEditingStatusName(name); }}
                  className="p-1 text-zinc-600 hover:text-yellow-400 transition-colors opacity-0 group-hover:opacity-100"
                  title="Editar">
                  <Pencil size={12} />
                </button>
                <button onClick={() => handleDeleteStatus(id)}
                  className="p-1 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  title="Eliminar">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          <button onClick={() => setShowNewStatus(true)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors">
            +
          </button>
        </div>
      </div>

      {/* Posición filter */}
      <div>
        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">Filtrar por posición</p>
        <div className="flex flex-wrap gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
          <button onClick={() => setFilterPosition(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!filterPosition ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"}`}>
            Todas
          </button>
          {positions.map((pos) => (
            <button key={pos} onClick={() => setFilterPosition(pos)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterPosition === pos ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"}`}>
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Birthday alert */}
      {birthdayPlayers.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <Cake size={20} className="text-yellow-400 shrink-0" />
          <div>
            <p className="text-yellow-300 font-semibold text-sm">
              🎉 ¡Hoy es el cumpleaños de {birthdayPlayers.map((p) => p.full_name).join(", ")}!
            </p>
            <p className="text-yellow-400/70 text-xs mt-0.5">
              {birthdayPlayers.map((p) => `${p.full_name} cumple ${calcAge(p.birth_date)} años`).join(" · ")}
            </p>
          </div>
        </div>
      )}

      {players.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <Users size={40} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">No hay jugadores en el plantel</p>
          <Button onClick={openNew} variant="outline" className="mt-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            Agregar primer jugador
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {subioDJuvenilesPlayers.length > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
              <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-3 px-1">✨ Subieron de juveniles — Nueva incorporación</p>
              <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-lg divide-y divide-emerald-500/10">

                {subioDJuvenilesPlayers.map((p) => {
                   const isToday = isBirthdayToday(p.birth_date);
                   const age = calcAge(p.birth_date);
                   return (
                     <div key={p.id} onClick={() => setSelectedPlayer(p)} className={`flex items-center gap-4 p-3 hover:bg-emerald-500/10 transition-colors cursor-pointer ${isToday ? "bg-yellow-500/5" : ""}`}>
                      <span className="text-zinc-600 text-sm font-mono w-8 text-center">{p.number}</span>
                      {p.photo_url ? (
                         <img src={p.photo_url} alt={p.full_name} className="w-9 h-9 rounded-full object-cover border border-zinc-700 shrink-0" />
                       ) : (
                         <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                           <span className="text-xs font-bold text-zinc-500">{p.full_name?.charAt(0)}</span>
                         </div>
                       )}
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2">
                           <p className="text-sm text-white font-medium">{p.full_name}</p>
                           {isToday && <Cake size={14} className="text-yellow-400" title="¡Cumpleaños hoy!" />}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {p.birth_date && <span className="text-xs text-zinc-600">{moment(p.birth_date).format("YYYY")}</span>}
                          {age !== null && <span className="text-xs text-zinc-500">{age} años</span>}
                          {p.position && <span className="text-xs text-zinc-600">{p.position}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={p.status || "Disponible"} onValueChange={async (v) => {
                          await base44.entities.Player.update(p.id, { status: v });
                          setPlayers((prev) => prev.map((pl) => pl.id === p.id ? { ...pl, status: v } : pl));
                        }}>
                          <SelectTrigger className="h-auto py-0.5 px-2 border-0 bg-transparent text-xs w-auto focus:ring-0 shadow-none gap-1">
                            <PlayerStatusBadge status={p.status || "Disponible"} />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-800 border-zinc-700">
                            {statuses.map((s) => <SelectItem key={s.id} value={s.name} className="text-white text-xs">{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-zinc-600 hover:text-white transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteTarget(p)} className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {grouped.map((g) =>
            g.players.length > 0 ? (
              <div key={g.position}>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800/50">
                  {g.players.map((p) => {
                    const isToday = isBirthdayToday(p.birth_date);
                    const age = calcAge(p.birth_date);
                    return (
                      <div key={p.id} onClick={() => setSelectedPlayer(p)} className={`flex items-center gap-4 p-3 hover:bg-zinc-800/30 transition-colors cursor-pointer ${isToday ? "bg-yellow-500/5" : ""}`}>
                        <span className="text-zinc-600 text-sm font-mono w-8 text-center">{p.number}</span>
                        {p.photo_url ? (
                           <img src={p.photo_url} alt={p.full_name} className="w-9 h-9 rounded-full object-cover border border-zinc-700 shrink-0" />
                         ) : (
                           <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                             <span className="text-xs font-bold text-zinc-500">{p.full_name?.charAt(0)}</span>
                           </div>
                         )}
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2">
                             <p className="text-sm text-white font-medium">{p.full_name}</p>
                             {isToday && <Cake size={14} className="text-yellow-400" title="¡Cumpleaños hoy!" />}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            {p.birth_date && <span className="text-xs text-zinc-600">{moment(p.birth_date).format("YYYY")}</span>}
                            {age !== null && <span className="text-xs text-zinc-500">{age} años</span>}
                            {p.dominant_foot && <span className="text-xs text-zinc-600">{p.dominant_foot}</span>}
                            {p.club_housing && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">Pensión</span>}
                            {p.has_contract && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-medium">Contrato</span>}
                            {p.injury_detail && <span className="text-xs text-zinc-500">{p.injury_detail}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={p.status || "Disponible"} onValueChange={async (v) => {
                            await base44.entities.Player.update(p.id, { status: v });
                            setPlayers((prev) => prev.map((pl) => pl.id === p.id ? { ...pl, status: v } : pl));
                          }}>
                            <SelectTrigger className="h-auto py-0.5 px-2 border-0 bg-transparent text-xs w-auto focus:ring-0 shadow-none gap-1">
                              <PlayerStatusBadge status={p.status || "Disponible"} />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700">
                              {statuses.map((s) => <SelectItem key={s.id} value={s.name} className="text-white text-xs">{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Select value={p.division || "Reserva"} onValueChange={async (v) => {
                            await base44.entities.Player.update(p.id, { division: v });
                            await loadPlayers();
                          }}>
                            <SelectTrigger className="h-auto py-0.5 px-2 border border-zinc-700 bg-zinc-800 text-xs text-white w-auto focus:ring-0 shadow-none">
                              {p.division || "Reserva"}
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700">
                              {divisions.map((d) => <SelectItem key={d.id} value={d.name} className="text-white text-xs">{d.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(p)} className="p-1.5 text-zinc-600 hover:text-white transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setDeleteTarget(p)} className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null
            )}
        </div>
      )}

      {/* FORM MODAL */}
      {showForm && (
        <PlayerFormModal
          player={editing}
          divisions={divisions}
          statuses={statuses}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={async (data) => {
            const payload = { ...data };
            if (data.first_name || data.last_name) {
              payload.full_name = `${data.first_name} ${data.last_name}`.trim();
            }
            Object.keys(payload).forEach((k) => { if (payload[k] === "") delete payload[k]; });
            if (editing) {
              await base44.entities.Player.update(editing.id, payload);
              setPlayers((prev) => prev.map((p) => p.id === editing.id ? { ...p, ...payload } : p));
              toast({ title: "Jugador actualizado" });
            } else {
              await base44.entities.Player.create(payload);
              toast({ title: "Jugador agregado" });
            }
            setShowForm(false);
            setEditing(null);
          }}
          onDelete={handleDeleteFromModal}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">¿Eliminar jugador?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Se eliminará a {deleteTarget?.full_name} del plantel. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedPlayer && (
        <PlayerProfileDetail
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          onEdit={(p) => openEdit(p)}
        />
      )}

      <PlayerImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        onSuccess={() => {
          setShowImport(false);
          setLoading(true);
          loadPlayers();
        }}
      />
    </div>
  );
}