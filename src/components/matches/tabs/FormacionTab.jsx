import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Download, Eraser, RefreshCw, Save, Search, Shield, Users, X } from "lucide-react";

import { base44 } from "@/api/base44Client";
import PlayerPhoto from "@/components/player/PlayerPhoto";
import FormationPoster from "@/components/matches/tabs/FormationPoster";
import { useToast } from "@/components/ui/use-toast";
import { getPlayerName, getPlayerNumber, loadMatchCallupState } from "@/lib/matchCallupUtils";
import { buildFormationSlots, compatibilityScore, nearestSlotForPosition, shortPosition } from "@/components/matches/tabs/formationSlots";

const SYSTEMS = ["4-2-3-1", "4-3-3", "4-4-2", "3-5-2", "3-4-3", "5-3-2", "4-1-4-1"];
const EXPORTS = {
  horizontal: { label: "Imagen horizontal", width: 1600, height: 900 },
  whatsapp: { label: "WhatsApp", width: 1080, height: 1350 },
  story: { label: "Historia vertical", width: 1080, height: 1920 },
};

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

function normalizeFormationPosition(raw, slots) {
  const nearest = raw?.slot_key ? slots.find((slot) => slot.slot_key === raw.slot_key) : nearestSlotForPosition(raw, slots);
  return {
    ...(nearest || {}),
    x: Number(raw?.x ?? nearest?.x ?? 50),
    y: Number(raw?.y ?? nearest?.y ?? 50),
    slot_key: raw?.slot_key || nearest?.slot_key || "",
    position_group: raw?.position_group || nearest?.position_group || "",
    preferred_positions: raw?.preferred_positions || nearest?.preferred_positions || [],
  };
}

export default function FormacionTab({ match, players = [], onRegisterSave, onMatchUpdated, onCallupsUpdated }) {
  const { toast } = useToast();
  const fieldRef = useRef(null);
  const exportRef = useRef(null);
  const [callups, setCallups] = useState([]);
  const [playerMap, setPlayerMap] = useState(new Map());
  const [system, setSystem] = useState(match.tactical_system || "4-3-3");
  const [positions, setPositions] = useState({});
  const [roleOverrides, setRoleOverrides] = useState({});
  const [captainPlayerId, setCaptainPlayerId] = useState(match.captain_player_id || "");
  const [activePlayerId, setActivePlayerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const formationSlots = useMemo(() => buildFormationSlots(system), [system]);

  async function loadFormation() {
    setLoading(true);
    const state = await loadMatchCallupState(match, players);
    const active = state.savedCallups || [];
    const activeSystem = match.tactical_system || system;
    const slots = buildFormationSlots(activeSystem);
    const next = {};
    const matchPositions = new Map((match.formation_positions || []).map((item) => [item.player_id, item]));

    active.forEach((callup) => {
      const saved = matchPositions.get(callup.player_id);
      const x = Number(callup.formation_x ?? saved?.x);
      const y = Number(callup.formation_y ?? saved?.y);
      if (callup.lineup_role === "titular" && Number.isFinite(x) && Number.isFinite(y)) {
        next[callup.player_id] = normalizeFormationPosition({ ...saved, x, y }, slots);
      }
    });

    const starterWithoutCoords = active.filter((callup) => callup.lineup_role === "titular" && !next[callup.player_id]).slice(0, 11);
    starterWithoutCoords.forEach((callup, index) => { next[callup.player_id] = normalizeFormationPosition(slots[index] || { x: 50, y: 50 }, slots); });

    setSystem(activeSystem);
    setCallups(active);
    setPlayerMap(state.playerMap);
    setPositions(next);
    setRoleOverrides({});
    setCaptainPlayerId(match.captain_player_id || "");
    setActivePlayerId("");
    setDirty(false);
    setLoading(false);
  }

  useEffect(() => { loadFormation(); }, [match.id]);

  useEffect(() => {
    function onKeyDown(event) { if (event.key === "Escape") setActivePlayerId(""); }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const calledPlayers = useMemo(() => callups.map((callup) => ({ callup, player: playerMap.get(callup.player_id) })).filter((item) => item.player), [callups, playerMap]);
  const starterIds = useMemo(() => Object.keys(positions), [positions]);
  const starterSet = useMemo(() => new Set(starterIds), [starterIds]);
  const calledSet = useMemo(() => new Set(callups.map((callup) => callup.player_id)), [callups]);
  const titulares = calledPlayers.filter(({ callup }) => starterSet.has(callup.player_id));
  const suplentes = calledPlayers.filter(({ callup }) => !starterSet.has(callup.player_id) && (roleOverrides[callup.player_id] === "suplente" || callup.lineup_role !== "pendiente"));
  const sinAsignar = calledPlayers.filter(({ callup }) => !starterSet.has(callup.player_id) && roleOverrides[callup.player_id] !== "suplente" && callup.lineup_role === "pendiente");
  const activeSlot = activePlayerId ? positions[activePlayerId] : null;
  const captainInvalid = captainPlayerId && !starterSet.has(captainPlayerId);

  const selectorOptions = useMemo(() => {
    return [...calledPlayers].sort((a, b) => {
      if (a.player.id === activePlayerId) return -1;
      if (b.player.id === activePlayerId) return 1;
      const scoreDiff = compatibilityScore(a.player, activeSlot) - compatibilityScore(b.player, activeSlot);
      if (scoreDiff !== 0) return scoreDiff;
      const roleDiff = Number(!starterSet.has(a.player.id)) - Number(!starterSet.has(b.player.id));
      if (roleDiff !== 0) return roleDiff;
      return String(getPlayerNumber(a.player) || 999).localeCompare(String(getPlayerNumber(b.player) || 999), undefined, { numeric: true });
    });
  }, [activePlayerId, activeSlot, calledPlayers, starterSet]);

  function arrange(ids, nextSystem = system) {
    const slots = buildFormationSlots(nextSystem);
    const next = {};
    ids.slice(0, 11).forEach((id, index) => { next[id] = normalizeFormationPosition(slots[index] || { x: 50, y: 50 }, slots); });
    setPositions(next);
    setDirty(true);
  }

  function changeSystem(value) {
    setSystem(value);
    arrange(starterIds, value);
  }

  function autoArrange() {
    const ids = starterIds.length ? starterIds : callups.filter((callup) => callup.lineup_role === "titular").map((callup) => callup.player_id);
    if (!ids.length) return toast({ title: "Primero ubicá titulares en el campo" });
    arrange(ids, system);
  }

  function addToField(playerId) {
    if (positions[playerId]) return;
    if (!playerMap.has(playerId) || !calledSet.has(playerId)) return;
    if (starterIds.length >= 11) return toast({ title: "La formación ya tiene 11 titulares", variant: "destructive" });
    const nextSpot = formationSlots[starterIds.length] || { x: 50, y: 50 };
    setPositions((current) => ({ ...current, [playerId]: normalizeFormationPosition(nextSpot, formationSlots) }));
    setRoleOverrides((current) => ({ ...current, [playerId]: "titular" }));
    setDirty(true);
  }

  function removeFromField(playerId) {
    setPositions((current) => {
      const next = { ...current };
      delete next[playerId];
      return next;
    });
    setRoleOverrides((current) => ({ ...current, [playerId]: "suplente" }));
    if (captainPlayerId === playerId) toast({ title: "El capitán salió del XI. Elegí otro capitán antes de guardar.", variant: "destructive" });
    setDirty(true);
  }

  function dropOnField(event) {
    event.preventDefault();
    const playerId = event.dataTransfer.getData("text/plain");
    if (!playerId || !playerMap.has(playerId) || !calledSet.has(playerId)) return;
    if (!positions[playerId] && starterIds.length >= 11) return toast({ title: "La formación ya tiene 11 titulares", variant: "destructive" });
    const rect = fieldRef.current.getBoundingClientRect();
    const x = Math.max(6, Math.min(94, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(6, Math.min(94, ((event.clientY - rect.top) / rect.height) * 100));
    setPositions((current) => ({ ...current, [playerId]: normalizeFormationPosition({ x, y }, formationSlots) }));
    setRoleOverrides((current) => ({ ...current, [playerId]: "titular" }));
    setDirty(true);
  }

  function chooseReplacement(newPlayerId) {
    if (!activePlayerId || !playerMap.has(newPlayerId)) return;
    if (newPlayerId === activePlayerId) { setActivePlayerId(""); return; }
    setPositions((current) => {
      const originPos = current[activePlayerId];
      if (!originPos) return current;
      const selectedPos = current[newPlayerId];
      const next = { ...current };
      if (selectedPos) {
        next[activePlayerId] = selectedPos;
        next[newPlayerId] = originPos;
      } else {
        delete next[activePlayerId];
        next[newPlayerId] = originPos;
      }
      return next;
    });
    setRoleOverrides((current) => ({ ...current, [newPlayerId]: "titular", [activePlayerId]: positions[newPlayerId] ? "titular" : "suplente" }));
    if (captainPlayerId === activePlayerId && !positions[newPlayerId]) toast({ title: "El capitán salió del XI. Elegí otro capitán antes de guardar.", variant: "destructive" });
    setActivePlayerId("");
    setDirty(true);
  }

  function setCaptain(playerId) {
    if (!playerId) {
      setCaptainPlayerId("");
      setDirty(true);
      return;
    }
    if (!starterSet.has(playerId)) return toast({ title: "El capitán debe ser titular", variant: "destructive" });
    setCaptainPlayerId(playerId);
    setDirty(true);
  }

  async function saveFormation() {
    if (starterIds.length > 11) return toast({ title: "No puede haber más de 11 titulares", variant: "destructive" });
    if (captainPlayerId && !starterSet.has(captainPlayerId)) return toast({ title: "Elegí un capitán titular antes de guardar", variant: "destructive" });
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const updates = callups.map((callup) => {
        const pos = positions[callup.player_id];
        return {
          id: callup.id,
          lineup_role: pos ? "titular" : "suplente",
          formation_x: pos ? Number(pos.x) : null,
          formation_y: pos ? Number(pos.y) : null,
          updated_at: now,
        };
      });
      if (updates.length) await base44.entities.MatchCallup.bulkUpdate(updates);
      const formationPositions = starterIds.map((playerId) => ({
        player_id: playerId,
        x: Number(positions[playerId].x),
        y: Number(positions[playerId].y),
        slot_key: positions[playerId].slot_key || "",
        position_group: positions[playerId].position_group || "",
        preferred_positions: positions[playerId].preferred_positions || [],
      }));
      const savedCaptainId = captainPlayerId || "";
      const patch = { tactical_system: system, formation_positions: formationPositions, formation_updated_at: now, captain_player_id: savedCaptainId };
      await base44.entities.MatchReport.update(match.id, patch);
      onMatchUpdated?.(patch);
      onCallupsUpdated?.();
      await loadFormation();
      setCaptainPlayerId(savedCaptainId);
      toast({ title: "Formación guardada y sincronizada con Convocados" });
    } catch (error) {
      toast({ title: error.message || "No se pudo guardar la formación", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    onRegisterSave?.({ action: saveFormation, disabled: !dirty || saving, pending: dirty, label: "formación" });
  }, [dirty, saving, system, positions, callups, captainPlayerId]);

  async function exportImage(kind) {
    if (!exportRef.current) return;
    const size = EXPORTS[kind];
    const canvas = await html2canvas(exportRef.current, { backgroundColor: "#002b06", scale: 2, useCORS: true });
    const output = document.createElement("canvas");
    output.width = size.width;
    output.height = size.height;
    const ctx = output.getContext("2d");
    ctx.fillStyle = "#002b06";
    ctx.fillRect(0, 0, size.width, size.height);
    const ratio = Math.min(size.width / canvas.width, size.height / canvas.height);
    ctx.drawImage(canvas, (size.width - canvas.width * ratio) / 2, (size.height - canvas.height * ratio) / 2, canvas.width * ratio, canvas.height * ratio);
    downloadDataUrl(output.toDataURL("image/png"), `formacion-${match.rival || "partido"}-${kind}.png`);
  }

  async function exportPdf() {
    if (!exportRef.current) return;
    const canvas = await html2canvas(exportRef.current, { backgroundColor: "#002b06", scale: 2, useCORS: true });
    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [canvas.width, canvas.height] });
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save(`formacion-${match.rival || "partido"}.pdf`);
  }

  if (loading) return <StateCard title="Cargando formación…" />;
  if (!calledPlayers.length) return <StateCard title="Sin convocados" description="Primero cargá la convocatoria del partido para armar la formación." />;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Shield size={16} className="text-yellow-400" /> Formación del equipo</h2>
            <p className="mt-1 text-xs text-zinc-500">Tocá un jugador del campo para reemplazarlo, intercambiarlo o quitarlo del XI.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={system} onChange={(e) => changeSystem(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-yellow-500">{SYSTEMS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <select value={captainPlayerId && starterSet.has(captainPlayerId) ? captainPlayerId : ""} onChange={(e) => setCaptain(e.target.value)} className="rounded-lg border border-yellow-500/30 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-yellow-500"><option value="">Capitán: sin definir</option>{titulares.map(({ player }) => <option key={player.id} value={player.id}>Capitán: {getPlayerName(player)}</option>)}</select>
            <div className={`rounded-lg border px-3 py-2 text-sm font-black ${starterIds.length === 11 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"}`}>{starterIds.length}/11 titulares</div>
            <button onClick={saveFormation} disabled={!dirty || saving} className="rounded-lg bg-yellow-500 px-3 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-yellow-400 disabled:opacity-50"><Save size={13} className="mr-1 inline" /> {saving ? "Guardando…" : "Guardar formación"}</button>
            <button onClick={() => { setRoleOverrides((current) => ({ ...current, ...Object.fromEntries(starterIds.map((id) => [id, "suplente"])) })); setPositions({}); setDirty(true); }} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"><Eraser size={13} className="mr-1 inline" /> Limpiar</button>
            <button onClick={autoArrange} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"><RefreshCw size={13} className="mr-1 inline" /> Ordenar</button>
          </div>
        </div>
        {captainInvalid && <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200">El capitán actual no está en el XI. Elegí otro capitán antes de guardar.</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <FormationPoster containerRef={exportRef} fieldRef={fieldRef} match={match} system={system} positions={positions} playerMap={playerMap} suplentes={suplentes} captainPlayerId={captainPlayerId} onDrop={dropOnField} onPlayerClick={setActivePlayerId} onCaptainChange={setCaptain} />

        <div className="space-y-3">
          <Panel title="Sin asignar" items={sinAsignar} onAdd={addToField} />
          <Panel title="Titulares" items={titulares} onAdd={addToField} onOpen={setActivePlayerId} />
          <Panel title="Suplentes" items={suplentes} onAdd={addToField} />
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">Exportar</h3>
            <div className="grid grid-cols-1 gap-2">
              <button onClick={exportPdf} className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300 hover:bg-yellow-500/20"><Download size={13} className="mr-1 inline" /> PDF A4</button>
              {Object.entries(EXPORTS).map(([key, item]) => <button key={key} onClick={() => exportImage(key)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">{item.label}</button>)}
            </div>
          </div>
        </div>
      </div>

      {activePlayerId && <PlayerSelector activePlayerId={activePlayerId} activeSlot={activeSlot} options={selectorOptions} starterSet={starterSet} captainPlayerId={captainPlayerId} onClose={() => setActivePlayerId("")} onChoose={chooseReplacement} onRemove={() => { removeFromField(activePlayerId); setActivePlayerId(""); }} />}
    </div>
  );
}

function StateCard({ title, description }) {
  return <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center"><h2 className="text-lg font-semibold text-white">{title}</h2>{description && <p className="mt-2 text-sm text-zinc-500">{description}</p>}</div>;
}

function Panel({ title, items, onAdd, onOpen }) {
  return <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-white">{title}</h3><span className="text-xs text-zinc-500">{items.length}</span></div><div className="space-y-2">{items.length === 0 ? <p className="rounded-xl border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-500">Sin jugadores.</p> : items.map(({ player }) => <div key={player.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", player.id)} className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-2"><PlayerPhoto player={player} className="h-9 w-9 rounded-full border border-zinc-700 object-cover" fallbackClassName="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800" textClassName="text-xs text-zinc-400" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-white">{getPlayerName(player)}</p><p className="text-[11px] text-zinc-500">#{getPlayerNumber(player)} · {player.position || "Sin posición"}</p></div>{onOpen && <button onClick={() => onOpen(player.id)} className="rounded-lg border border-zinc-700 px-2 py-1 text-[11px] text-zinc-400">Cambiar</button>}<button onClick={() => onAdd?.(player.id)} className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 text-[11px] text-yellow-300">Al campo</button></div>)}</div></div>;
}

function PlayerSelector({ activePlayerId, activeSlot, options, starterSet, captainPlayerId, onClose, onChoose, onRemove }) {
  const currentName = getPlayerName(options.find(({ player }) => player.id === activePlayerId)?.player || {});
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onMouseDown={onClose}>
      <div className="max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-zinc-800 p-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Cambiar jugador</h3>
            <p className="text-xs text-zinc-500">Puesto tocado: <b className="text-yellow-300">{activeSlot?.slot_key || "—"}</b> · Actual: {currentName || "—"}</p>
          </div>
          <button onClick={onClose} className="rounded-lg border border-zinc-700 p-2 text-zinc-300 hover:bg-zinc-900"><X size={16} /></button>
        </div>
        <div className="border-b border-zinc-800 p-3">
          <button onClick={onRemove} className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20">Quitar del XI</button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-3">
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-500"><Search size={13} /> Ordenado por compatibilidad con {activeSlot?.slot_key || "el puesto"}</div>
          <div className="space-y-2">
            {options.map(({ player }) => {
              const isCurrent = player.id === activePlayerId;
              const isStarter = starterSet.has(player.id);
              const isCaptain = captainPlayerId === player.id;
              return <button key={player.id} onClick={() => onChoose(player.id)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${isCurrent ? "border-yellow-400 bg-yellow-500/15" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"}`}><PlayerPhoto player={player} className="h-12 w-12 rounded-full border border-zinc-700 object-cover" fallbackClassName="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800" textClassName="text-sm text-zinc-400" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded bg-yellow-500/10 px-2 py-0.5 text-xs font-black text-yellow-300">#{getPlayerNumber(player) || "—"}</span><p className="truncate text-sm font-semibold text-white">{getPlayerName(player)}</p>{isCaptain && <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-black text-zinc-950">C</span>}{isCurrent && <span className="rounded-full border border-yellow-400/40 px-2 py-0.5 text-[10px] font-bold text-yellow-300">Actual</span>}</div><p className="mt-1 text-xs text-zinc-500">{player.position || "Sin posición"} · {shortPosition(player)}</p></div><span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${isStarter ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-zinc-700 bg-zinc-950 text-zinc-300"}`}>{isStarter ? "Titular" : "Suplente"}</span></button>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}