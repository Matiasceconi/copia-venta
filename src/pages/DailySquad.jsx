import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import moment from "moment";
import "moment/locale/es";
import { useToast } from "@/components/ui/use-toast";
import DailySquadHeader from "@/components/squad/DailySquadHeader";
import DailySquadSummary from "@/components/squad/DailySquadSummary";
import DailySquadGrid from "@/components/squad/DailySquadGrid";
import DailySquadFilters from "@/components/squad/DailySquadFilters";
import DailySquadWhatsApp from "@/components/squad/DailySquadWhatsApp";
import { ALL_TAGS, STATUS_LABELS, STATUS_COLORS, POSITION_GROUPS, isGoalkeeper } from "@/components/squad/squadConstants";
import { ensureDailyStatusForDate } from "@/lib/dailySquadUtils";
import { useWorkspace } from "@/lib/WorkspaceContext";
export { ALL_TAGS, STATUS_LABELS, STATUS_COLORS, POSITION_GROUPS };
moment.locale("es");

export default function DailySquad() {
  const [selectedDate, setSelectedDate] = useState(moment().format("YYYY-MM-DD"));
  const [squads, setSquads] = useState([]);
  const [selectedSquadId, setSelectedSquadId] = useState(""); // "" = sin filtro
  const [players, setPlayers] = useState([]);         // todos los jugadores activos
  const [memberships, setMemberships] = useState([]); // SquadMembership activos
  const [statusMap, setStatusMap] = useState({});     // player_id -> DailySquadStatus record
  const [pendingChanges, setPendingChanges] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [filters, setFilters] = useState({ team: "", category: "", position: "", status: "", tag: "", search: "" });
  const { toast } = useToast();
  const { activeSquadId } = useWorkspace();

  // Load squads once — por defecto entra al plantel activo del workspace
  useEffect(() => {
    base44.entities.Squad.list("name", 100).then(sq => {
      const active = sq.filter(s => s.active !== false);
      setSquads(active);
      if (!selectedSquadId) {
        if (activeSquadId && active.some(s => s.id === activeSquadId)) {
          setSelectedSquadId(activeSquadId);
        } else if (active.length > 0) {
          setSelectedSquadId(active[0].id);
        }
      }
    });
  }, [activeSquadId]);

  const load = useCallback(async () => {
    setLoading(true);
    const [allPlayers, mb, dayStatuses] = await Promise.all([
      base44.entities.Player.list("-created_date", 500),
      base44.entities.SquadMembership.list("-effective_from", 1000),
      ensureDailyStatusForDate(selectedDate),
    ]);

    setPlayers(allPlayers.filter(p => p.active !== false));
    setMemberships(mb.filter(m => m.status === "activo"));

    const map = {};
    dayStatuses.forEach(s => { map[s.player_id] = s; });
    setStatusMap(map);
    setPendingChanges({});
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => { load(); }, [load]);

  // ── Compute which players belong to the selected squad for today ───────────
  // A player appears if:
  // A) Has active SquadMembership for selectedSquadId (within date range)
  // B) Has a DailySquadStatus with target_squad_id = selectedSquadId, active_in_target_squad = true, for today
  const squadPlayers = (() => {
    if (!selectedSquadId) return players; // no filter = show all

    const today = selectedDate;

    // A) Stable members
    const stableMemberIds = new Set(
      memberships.filter(m => {
        if (m.squad_id !== selectedSquadId) return false;
        if (m.effective_from && m.effective_from > today) return false;
        if (m.effective_to && m.effective_to < today) return false;
        return true;
      }).map(m => m.player_id)
    );

    // B) Temporary visitors from DailySquadStatus (already saved)
    const temporaryIds = new Set(
      Object.values(statusMap).filter(ds =>
        ds.target_squad_id === selectedSquadId &&
        ds.active_in_target_squad === true &&
        ds.temporary === true
      ).map(ds => ds.player_id)
    );

    // Also check pending changes for temporary visitors being set right now
    Object.entries(pendingChanges).forEach(([pid, ch]) => {
      if (ch.target_squad_id === selectedSquadId && ch.active_in_target_squad === true && ch.temporary === true) {
        temporaryIds.add(pid);
      }
    });

    return players.filter(p => stableMemberIds.has(p.id) || temporaryIds.has(p.id));
  })();

  function getEffectiveStatus(player) {
    const pending = pendingChanges[player.id];
    const saved = statusMap[player.id];

    // Find player's base squad from membership
    const mem = memberships.find(m => m.player_id === player.id);
    const baseSquadId = mem?.squad_id || "";
    const baseSquadName = squads.find(s => s.id === baseSquadId)?.name || "";

    return {
      status: pending?.status ?? saved?.status ?? "disponible",
      tags: pending?.tags ?? saved?.tags ?? [],
      notes: pending?.notes ?? saved?.notes ?? "",
      category: pending?.category ?? saved?.category ?? player.category ?? "",
      position: pending?.position ?? saved?.position ?? player.position ?? "",
      base_squad_id: baseSquadId,
      base_squad_name: baseSquadName,
      target_squad_id: pending?.target_squad_id ?? saved?.target_squad_id ?? baseSquadId,
      target_squad_name: pending?.target_squad_name ?? saved?.target_squad_name ?? baseSquadName,
      movement_type: pending?.movement_type ?? saved?.movement_type ?? "normal",
      temporary: pending?.temporary ?? saved?.temporary ?? false,
      active_in_target_squad: pending?.active_in_target_squad ?? saved?.active_in_target_squad ?? true,
      valid_until: pending?.valid_until ?? saved?.valid_until ?? "",
    };
  }

  function applyChange(playerId, changes) {
    setPendingChanges(prev => ({
      ...prev,
      [playerId]: { ...(prev[playerId] || {}), ...changes }
    }));
  }

  // ── Quick movement actions ─────────────────────────────────────────────────
  function applyMovement(player, targetSquadId, movementType, status) {
    const mem = memberships.find(m => m.player_id === player.id);
    const baseSquadId = mem?.squad_id || "";
    const baseSquadName = squads.find(s => s.id === baseSquadId)?.name || "";
    const targetSquad = squads.find(s => s.id === targetSquadId);

    applyChange(player.id, {
      status,
      movement_type: movementType,
      temporary: targetSquadId !== baseSquadId,
      active_in_target_squad: true,
      base_squad_id: baseSquadId,
      base_squad_name: baseSquadName,
      target_squad_id: targetSquadId,
      target_squad_name: targetSquad?.name || "",
    });
  }

  function endTemporaryMovement(player) {
    applyChange(player.id, {
      temporary: false,
      active_in_target_squad: false,
      movement_type: "normal",
      status: "disponible",
    });
  }

  async function saveAll() {
    setSaving(true);
    const now = new Date().toISOString();
    const entries = Object.entries(pendingChanges);
    for (const [playerId, changes] of entries) {
      const existing = statusMap[playerId];
      const player = players.find(p => p.id === playerId);
      const effective = getEffectiveStatus(player || { id: playerId });
      // target_squad_id defaults to selectedSquadId (the squad being edited right now)
      // so Dashboard can always filter by squad correctly
      const currentSquad = squads.find(s => s.id === selectedSquadId);
      const fallbackTargetId = effective.target_squad_id || selectedSquadId;
      const fallbackTargetName = effective.target_squad_name || currentSquad?.name || "";

      const payload = {
        date: selectedDate,
        player_id: playerId,
        player_name: player?.full_name || "",
        position: player?.position || "",
        category: player?.category || "",
        updated_at: now,
        base_squad_id: effective.base_squad_id || selectedSquadId,
        base_squad_name: effective.base_squad_name || currentSquad?.name || "",
        target_squad_id: fallbackTargetId,
        target_squad_name: fallbackTargetName,
        movement_type: effective.movement_type,
        temporary: effective.temporary,
        active_in_target_squad: effective.active_in_target_squad,
        valid_until: effective.valid_until,
        ...changes,
      };
      if (existing) {
        await base44.entities.DailySquadStatus.update(existing.id, payload);
        setStatusMap(prev => ({ ...prev, [playerId]: { ...existing, ...payload } }));
      } else {
        const created = await base44.entities.DailySquadStatus.create(payload);
        setStatusMap(prev => ({ ...prev, [playerId]: created }));
      }
    }
    setPendingChanges({});
    setSaving(false);
    toast({ title: `✓ ${entries.length} estado(s) guardados` });
  }

  async function copyYesterday() {
    const yesterday = moment(selectedDate).subtract(1, "day").format("YYYY-MM-DD");
    const prevStatuses = await base44.entities.DailySquadStatus.filter({ date: yesterday }, "-updated_at", 500);
    if (prevStatuses.length === 0) {
      toast({ title: "Sin estados del día anterior", variant: "destructive" }); return;
    }
    const changes = {};
    prevStatuses.forEach(s => {
      changes[s.player_id] = {
        status: s.status, tags: s.tags, notes: s.notes,
        base_squad_id: s.base_squad_id, base_squad_name: s.base_squad_name,
        target_squad_id: s.target_squad_id, target_squad_name: s.target_squad_name,
        movement_type: s.movement_type, temporary: s.temporary,
        active_in_target_squad: s.active_in_target_squad,
      };
    });
    setPendingChanges(prev => ({ ...prev, ...changes }));
    toast({ title: `Copiados ${prevStatuses.length} estados de ayer` });
  }

  function markAllAvailable() {
    const changes = {};
    squadPlayers.forEach(p => { changes[p.id] = { status: "disponible", tags: [], notes: "" }; });
    setPendingChanges(prev => ({ ...prev, ...changes }));
    toast({ title: "Todos marcados como disponibles" });
  }

  function exportSummary() {
    const rows = squadPlayers.map(p => {
      const s = getEffectiveStatus(p);
      return `${p.full_name} | ${p.position} | ${STATUS_LABELS[s.status] || s.status} | ${(s.tags || []).join(", ")} | ${s.notes || ""}`;
    });
    const squadName = squads.find(s => s.id === selectedSquadId)?.name || "plantel";
    const text = `Estado del Plantel ${squadName} — ${moment(selectedDate).format("DD/MM/YYYY")}\n\n` + rows.join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `plantel-${selectedDate}.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  const hasPending = Object.keys(pendingChanges).length > 0;

  // Filtered players (within squadPlayers)
  const filteredPlayers = squadPlayers.filter(p => {
    const s = getEffectiveStatus(p);
    if (filters.category && s.category !== filters.category) return false;
    if (filters.position && p.position !== filters.position) return false;
    if (filters.status && s.status !== filters.status) return false;
    if (filters.tag && !(s.tags || []).includes(filters.tag)) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!(p.full_name || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const gkPlayers    = squadPlayers.filter(p => isGoalkeeper(p));
  const fieldPlayers = squadPlayers.filter(p => !isGoalkeeper(p));

  const summaryData = {
    total: squadPlayers.length,
    disponibles: squadPlayers.filter(p => getEffectiveStatus(p).status === "disponible").length,
    lesionados: squadPlayers.filter(p => getEffectiveStatus(p).status === "lesionado").length,
    molestias: squadPlayers.filter(p => getEffectiveStatus(p).status === "molestia").length,
    diferenciados: squadPlayers.filter(p => getEffectiveStatus(p).status === "diferenciado").length,
    suspendidos: squadPlayers.filter(p => getEffectiveStatus(p).status === "suspendido").length,
    bajan: squadPlayers.filter(p => getEffectiveStatus(p).status === "bajó").length,
    suben: squadPlayers.filter(p => getEffectiveStatus(p).status === "subió").length,
    convocados: squadPlayers.filter(p => getEffectiveStatus(p).status === "convocado").length,
    ausentes: squadPlayers.filter(p => getEffectiveStatus(p).status === "ausente").length,
    // Goalkeeper breakdown
    gk_total: gkPlayers.length,
    gk_disponibles: gkPlayers.filter(p => getEffectiveStatus(p).status === "disponible").length,
    gk_lesionados: gkPlayers.filter(p => ["lesionado", "molestia"].includes(getEffectiveStatus(p).status)).length,
    gk_diferenciados: gkPlayers.filter(p => getEffectiveStatus(p).status === "diferenciado").length,
    gk_ausentes: gkPlayers.filter(p => ["ausente", "suspendido"].includes(getEffectiveStatus(p).status)).length,
    gk_convocados: gkPlayers.filter(p => getEffectiveStatus(p).status === "convocado").length,
    field_total: fieldPlayers.length,
    field_disponibles: fieldPlayers.filter(p => getEffectiveStatus(p).status === "disponible").length,
  };

  const selectedSquad = squads.find(s => s.id === selectedSquadId);

  return (
    <div className="space-y-5">
      <DailySquadHeader
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        hasPending={hasPending}
        saving={saving}
        onSave={saveAll}
        onCopyYesterday={copyYesterday}
        onMarkAllAvailable={markAllAvailable}
        onExport={exportSummary}
        onWhatsApp={() => setShowWhatsApp(true)}
        squads={squads}
        selectedSquadId={selectedSquadId}
        onSquadChange={setSelectedSquadId}
      />

      {!loading && <DailySquadSummary data={summaryData} />}

      <DailySquadFilters
        players={squadPlayers}
        filters={filters}
        setFilters={setFilters}
        getEffectiveStatus={getEffectiveStatus}
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
        </div>
      ) : (
        <DailySquadGrid
          players={filteredPlayers}
          getEffectiveStatus={getEffectiveStatus}
          applyChange={applyChange}
          pendingChanges={pendingChanges}
          selectedDate={selectedDate}
          squads={squads}
          selectedSquadId={selectedSquadId}
          onApplyMovement={applyMovement}
          onEndTemporaryMovement={endTemporaryMovement}
        />
      )}

      {showWhatsApp && (
        <DailySquadWhatsApp
          players={squadPlayers}
          getEffectiveStatus={getEffectiveStatus}
          selectedDate={selectedDate}
          onClose={() => setShowWhatsApp(false)}
        />
      )}
    </div>
  );
}