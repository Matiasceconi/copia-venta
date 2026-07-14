import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { isGoalkeeper } from "@/components/squad/squadConstants";
import { useToast } from "@/components/ui/use-toast";
import { classifyGpsInclusion } from "@/components/performance/externalGpsLoadUtils";
import { sortPlayers } from "./sessionPlayerUtils";
import SessionPlayerCard from "./SessionPlayerCard";

export default function SessionPlayerTable({ sessionPlayers, sessionId, onPlayersUpdate }) {
  const [rows, setRows] = useState(sessionPlayers.map(sp => ({ ...sp })));
  const [playerPhotos, setPlayerPhotos] = useState({});
  const { toast } = useToast();

  useEffect(() => { setRows(sessionPlayers.map(sp => ({ ...sp }))); }, [sessionPlayers]);

  useEffect(() => {
    const ids = new Set(sessionPlayers.map(sp => sp.player_id));
    if (ids.size === 0) return;
    base44.entities.Player.list("-created_date", 500).then(players => {
      const map = {};
      players.forEach(p => { if (ids.has(p.id)) map[p.id] = p.photo_url; });
      setPlayerPhotos(map);
    });
  }, [sessionPlayers]);

  // Si el jugador tiene GPS cargado en esta sesión, recalcula su inclusión en el promedio grupal
  async function syncGps(playerId, updatedSp) {
    const gpsRows = await base44.entities.SessionGPSData.filter({ session_id: sessionId, player_id: playerId });
    if (gpsRows.length === 0) return;
    const cls = classifyGpsInclusion(updatedSp);
    await Promise.all(gpsRows.map(r => base44.entities.SessionGPSData.update(r.id, {
      include_in_session_average: cls.include, gps_group: cls.group, exclusion_reason: cls.reason,
    })));
  }

  async function handleAction(sp, action) {
    if (action === "remove") {
      await base44.entities.SessionPlayer.delete(sp.id);
      const next = rows.filter(r => r.id !== sp.id);
      setRows(next);
      onPlayersUpdate?.(next);
      toast({ title: `${sp.player_name} quitado de la sesión` });
      return;
    }
    await base44.entities.SessionPlayer.update(sp.id, { attendance: action });
    const updatedSp = { ...sp, attendance: action };
    const next = rows.map(r => r.id === sp.id ? updatedSp : r);
    setRows(next);
    onPlayersUpdate?.(next);
    await syncGps(sp.player_id, updatedSp);
  }

  async function handleStatusChange(sp, newStatus) {
    await base44.entities.SessionPlayer.update(sp.id, { status_at_session: newStatus });
    const playerStatusMap = {
      disponible: "Disponible", lesionado: "Lesionado", molestia: "En recuperación",
      suspendido: "Suspendido", reintegro: "Disponible",
    };
    if (playerStatusMap[newStatus] && sp.player_id) {
      await base44.entities.Player.update(sp.player_id, { status: playerStatusMap[newStatus] });
    }
    const next = rows.map(r => r.id === sp.id ? { ...r, status_at_session: newStatus } : r);
    setRows(next);
    onPlayersUpdate?.(next);
    toast({ title: `Estado actualizado: ${sp.player_name}` });
  }

  async function handleSaveDetails(sp, data) {
    await base44.entities.SessionPlayer.update(sp.id, data);
    const next = rows.map(r => r.id === sp.id ? { ...r, ...data } : r);
    setRows(next);
    onPlayersUpdate?.(next);
    toast({ title: "✓ Guardado" });
  }

  const present = rows.filter(r => r.attendance === "presente");
  const fieldPresent = sortPlayers(present.filter(r => !isGoalkeeper({ position: r.position })));
  const gkPresent = sortPlayers(present.filter(r => isGoalkeeper({ position: r.position })));
  const diferenciados = sortPlayers(rows.filter(r => r.attendance === "diferenciado"));
  const kinesiologia = sortPlayers(rows.filter(r => r.attendance === "kinesiologia"));
  const noDisponibles = sortPlayers(rows.filter(r => r.attendance === "ausente" || r.attendance === "no_entrena"));

  function Section({ title, list, colorClass }) {
    if (list.length === 0) return null;
    return (
      <div>
        <p className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${colorClass}`}>{title} ({list.length})</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {list.map(sp => (
            <SessionPlayerCard key={sp.id} sp={sp} photoUrl={playerPhotos[sp.player_id]} onAction={handleAction} onSaveDetails={handleSaveDetails} onStatusChange={handleStatusChange} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Section title="Jugadores de campo presentes" list={fieldPresent} colorClass="text-emerald-400" />
      <Section title="Arqueros presentes" list={gkPresent} colorClass="text-yellow-400" />
      <Section title="Diferenciados" list={diferenciados} colorClass="text-amber-400" />
      <Section title="Trabajaron en kinesiología" list={kinesiologia} colorClass="text-sky-400" />
      <Section title="No disponibles" list={noDisponibles} colorClass="text-zinc-500" />
      {rows.length === 0 && <p className="text-zinc-600 text-sm text-center py-6">Sin jugadores en esta sesión</p>}
    </div>
  );
}