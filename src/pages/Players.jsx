import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Pencil, Download, Plus, IdCard, X, Camera, Trash2 } from "lucide-react";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { usePlayerCard360 } from "@/components/player/PlayerCard360Context";
import { resolvePlayerType, resolvePositionGroup } from "@/components/squad/squadConstants";
import { useToast } from "@/components/ui/use-toast";
import PlayerPhoto from "@/components/player/PlayerPhoto";

const POSITIONS = ["Arquero", "Defensor Central", "Lateral Derecho", "Lateral Izquierdo", "Mediocampista Central", "Volante Interno", "Extremo", "Delantero Centro"];
const STATUSES = ["Disponible", "Lesionado", "En recuperación", "Suspendido", "Permiso", "Selección", "Subio a primera", "Bajo a juveniles", "Subieron de juveniles", "Bajo de primera", "Sparring"];
const EMPTY_PLAYER = { first_name: "", last_name: "", dni: "", birth_date: "", position: "Defensor Central", status: "Disponible", photo_url: "" };

function normalizeName(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function ageFromBirth(date) {
  if (!date) return "—";
  const birth = new Date(date);
  if (Number.isNaN(birth.getTime())) return "—";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

function PlayerEditor({ player, onClose, onSave }) {
  const [form, setForm] = useState(player ? { ...EMPTY_PLAYER, ...player, dni: player.dni || player.document_number || "" } : EMPTY_PLAYER);
  const [uploading, setUploading] = useState(false);
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  async function uploadPhoto(file) {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setField("photo_url", file_url);
    setUploading(false);
  }

  function submit(event) {
    event.preventDefault();
    const fullName = `${form.first_name || ""} ${form.last_name || ""}`.trim();
    const payload = {
      ...form,
      full_name: fullName,
      normalized_name: normalizeName(fullName),
      player_type: resolvePlayerType(form.position),
      position_group: resolvePositionGroup(form.position),
      document_number: form.dni || "",
    };
    Object.keys(payload).forEach((key) => { if (payload[key] === "") delete payload[key]; });
    onSave(payload);
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 w-full max-w-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold">{player ? "Editar jugador" : "Nuevo jugador"}</h3>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-white"><X size={18} /></button>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center">
            {form.photo_url ? <img src={form.photo_url} alt="" className="w-full h-full object-cover" /> : <Camera size={20} className="text-zinc-600" />}
          </div>
          <label className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs cursor-pointer hover:bg-zinc-700">
            {uploading ? "Subiendo..." : "Subir foto"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadPhoto(e.target.files?.[0])} />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs text-zinc-400">Nombre *<input required value={form.first_name || ""} onChange={(e) => setField("first_name", e.target.value)} className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white" /></label>
          <label className="text-xs text-zinc-400">Apellido *<input required value={form.last_name || ""} onChange={(e) => setField("last_name", e.target.value)} className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white" /></label>
          <label className="text-xs text-zinc-400">DNI<input value={form.dni || ""} onChange={(e) => setField("dni", e.target.value)} className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white" /></label>
          <label className="text-xs text-zinc-400">Fecha nacimiento<input type="date" value={form.birth_date || ""} onChange={(e) => setField("birth_date", e.target.value)} className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white" /></label>
          <label className="text-xs text-zinc-400">Posición<select value={form.position || "Defensor Central"} onChange={(e) => setField("position", e.target.value)} className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white">{POSITIONS.map((position) => <option key={position} value={position}>{position}</option>)}</select></label>
          <label className="text-xs text-zinc-400">Estado<select value={form.status || "Disponible"} onChange={(e) => setField("status", e.target.value)} className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white">{STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm">Cancelar</button>
          <button type="submit" className="px-4 py-2 rounded-lg bg-white text-zinc-900 font-semibold text-sm">Guardar</button>
        </div>
      </form>
    </div>
  );
}

export default function Players() {
  const { mySquads, activeSquadId, activeSquadName, can, canSeePath, isAdmin } = useWorkspace();
  const { openCard } = usePlayerCard360();
  const { toast } = useToast();
  const [players, setPlayers] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [squadFilter, setSquadFilter] = useState(activeSquadId || "all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState(null);

  const canCreate = can("create", "/players");
  const canEdit = can("edit", "/players");
  const canDelete = can("delete", "/players");
  const canExport = can("export", "/players");
  const allowedSquadIds = useMemo(() => new Set(mySquads.map((squad) => squad.id)), [mySquads]);
  const squadNameById = useMemo(() => Object.fromEntries(mySquads.map((squad) => [squad.id, squad.name])), [mySquads]);

  useEffect(() => { setSquadFilter(activeSquadId || "all"); }, [activeSquadId]);
  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [playerRows, membershipRows] = await Promise.all([
      base44.entities.Player.list("last_name", 1000),
      base44.entities.SquadMembership.list("-effective_from", 1000),
    ]);
    setPlayers(playerRows);
    setMemberships(membershipRows.filter((membership) => !membership.effective_to && membership.status !== "fuera_del_plantel" && membership.status !== "inactivo"));
    setLoading(false);
  }

  function currentMembership(player) {
    return memberships.find((membership) => membership.player_id === player.id) || null;
  }

  const visiblePlayers = players.filter((player) => {
    const membership = currentMembership(player);
    const squadId = membership?.squad_id || "";
    const fallbackAllowed = !membership && mySquads.some((squad) => squad.name === player.division);
    if (!isAdmin && !allowedSquadIds.has(squadId) && !fallbackAllowed) return false;
    if (squadFilter !== "all") {
      if (squadId && squadId !== squadFilter) return false;
      if (!squadId && player.division !== squadNameById[squadFilter]) return false;
    }
    if (positionFilter !== "all" && player.position !== positionFilter) return false;
    if (statusFilter !== "all" && player.status !== statusFilter) return false;
    if (search) {
      const query = search.toLowerCase();
      const haystack = `${player.first_name || ""} ${player.last_name || ""} ${player.full_name || ""} ${player.dni || ""} ${player.document_number || ""} ${player.id}`.toLowerCase();
      return haystack.includes(query);
    }
    return true;
  });

  async function savePlayer(data) {
    const dni = data.dni || data.document_number || "";
    const duplicate = players.find((player) => dni && (player.dni === dni || player.document_number === dni) && player.id !== editing?.id);
    if (duplicate) {
      toast({ title: "Ya existe un jugador con ese DNI", variant: "destructive" });
      return;
    }
    if (editing?.id) await base44.entities.Player.update(editing.id, data);
    else {
      const created = await base44.entities.Player.create({ ...data, division: activeSquadName || data.division || "" });
      if (activeSquadId) await base44.entities.SquadMembership.create({ player_id: created.id, player_name: created.full_name || `${created.first_name || ""} ${created.last_name || ""}`.trim(), squad_id: activeSquadId, squad_name: activeSquadName || "", status: "activo", effective_from: new Date().toISOString().slice(0, 10) });
    }
    setEditing(null);
    await load();
    toast({ title: "Jugador guardado" });
  }

  async function deletePlayer(player) {
    if (!window.confirm(`¿Eliminar a ${player.full_name || player.first_name}? Esta acción no se puede deshacer.`)) return;
    await base44.entities.SquadMembership.deleteMany({ player_id: player.id });
    await base44.entities.Player.delete(player.id);
    await load();
    toast({ title: "Jugador eliminado" });
  }

  function exportCsv() {
    const rows = visiblePlayers.map((player) => {
      const membership = currentMembership(player);
      return {
        player_id: player.id,
        nombre: player.first_name || "",
        apellido: player.last_name || "",
        dni: player.dni || player.document_number || "",
        fecha_nacimiento: player.birth_date || "",
        edad: ageFromBirth(player.birth_date),
        posicion: player.position || "",
        tipo: player.player_type || resolvePlayerType(player.position),
        plantel: membership?.squad_name || player.division || "",
        estado: player.status || "",
      };
    });
    const headers = ["player_id", "nombre", "apellido", "dni", "fecha_nacimiento", "edad", "posicion", "tipo", "plantel", "estado"];
    const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => `"${String(row[header]).replaceAll('"', '""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "jugadores.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!canSeePath("/players")) return <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">No tenés permiso para ver Jugadores.</div>;
  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Base de Jugadores</h1>
          <p className="text-zinc-500 text-sm mt-1">Módulo operativo independiente · {visiblePlayers.length} jugadores visibles</p>
        </div>
        <div className="flex gap-2">
          {canExport && <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-800"><Download size={15} /> Exportar</button>}
          {canCreate && <button onClick={() => setEditing({})} className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-900 rounded-lg text-sm font-semibold hover:bg-zinc-200"><Plus size={15} /> Nuevo jugador</button>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar jugador, DNI o player_id..." className="bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white w-72 focus:outline-none focus:border-zinc-600" />
        </div>
        <select value={squadFilter} onChange={(e) => setSquadFilter(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white"><option value="all">Todos mis planteles</option>{mySquads.map((squad) => <option key={squad.id} value={squad.id}>{squad.name}</option>)}</select>
        <select value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white"><option value="all">Todas las posiciones</option>{POSITIONS.map((position) => <option key={position} value={position}>{position}</option>)}</select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white"><option value="all">Todos los estados</option>{STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-zinc-950/60 text-zinc-500 text-xs"><th className="text-left p-3">Jugador</th><th className="text-left p-3">DNI</th><th className="text-left p-3">Nacimiento</th><th className="text-left p-3">Edad</th><th className="text-left p-3">Posición</th><th className="text-left p-3">Tipo</th><th className="text-left p-3">Plantel actual</th><th className="text-left p-3">Estado</th><th className="text-left p-3">player_id</th><th className="p-3"></th></tr></thead>
          <tbody>
            {visiblePlayers.map((player) => {
              const membership = currentMembership(player);
              return (
                <tr key={player.id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                  <td className="p-3"><div className="flex items-center gap-3"><PlayerPhoto player={player} className="w-10 h-10 rounded-full object-cover border border-zinc-700" fallbackClassName="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center" textClassName="text-zinc-500 font-bold" /><div><p className="text-white font-semibold">{player.first_name || "—"} {player.last_name || ""}</p><p className="text-xs text-zinc-500">{player.full_name || ""}</p></div></div></td>
                  <td className="p-3 text-zinc-300">{player.dni || player.document_number || "—"}</td>
                  <td className="p-3 text-zinc-300">{player.birth_date || "—"}</td>
                  <td className="p-3 text-zinc-300">{ageFromBirth(player.birth_date)}</td>
                  <td className="p-3 text-zinc-300">{player.position || "—"}</td>
                  <td className="p-3 text-zinc-300">{player.player_type || resolvePlayerType(player.position)}</td>
                  <td className="p-3 text-zinc-300">{membership?.squad_name || player.division || "—"}</td>
                  <td className="p-3"><span className="px-2 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-xs text-zinc-300">{player.status || "—"}</span></td>
                  <td className="p-3 text-zinc-500 font-mono text-xs">{player.id}</td>
                  <td className="p-3"><div className="flex items-center justify-end gap-1"><button onClick={() => openCard(player)} title="Abrir Carta 360" className="p-2 rounded-lg text-zinc-500 hover:text-yellow-400 hover:bg-yellow-500/10"><IdCard size={15} /></button>{canEdit && <button onClick={() => setEditing(player)} title="Editar" className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800"><Pencil size={15} /></button>}{canDelete && <button onClick={() => deletePlayer(player)} title="Eliminar" className="p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={15} /></button>}</div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visiblePlayers.length === 0 && <div className="p-10 text-center text-zinc-500 text-sm">No hay jugadores para los filtros seleccionados.</div>}
      </div>

      {editing && <PlayerEditor player={editing.id ? editing : null} onClose={() => setEditing(null)} onSave={savePlayer} />}
    </div>
  );
}