import { base44 } from "@/api/base44Client";

export function normalizeText(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function getPlayerName(player) {
  return player?.full_name || [player?.first_name, player?.last_name].filter(Boolean).join(" ") || player?.name || "Jugador";
}

export function getPlayerNumber(player) {
  return player?.jersey_number || player?.number || "—";
}

export function getPlayerSquadLabel(player) {
  return player?.origin_squad_name || player?.squad_name || player?.division || player?.category || "Sin plantel";
}

export function getPositionGroup(position) {
  const normalized = normalizeText(position);
  if (["arquero", "portero", "goalkeeper", "gk"].some((value) => normalized.includes(value))) return "Arquero";
  if (["defensor", "central", "lateral", "back", "marcador"].some((value) => normalized.includes(value))) return "Defensor";
  if (["medioc", "volante", "medio", "midfielder", "interior"].some((value) => normalized.includes(value))) return "Mediocampista";
  if (["delanter", "punta", "extremo", "wing", "forward", "atacante"].some((value) => normalized.includes(value))) return "Delantero";
  return "Sin categoría";
}

export function isUnavailableStatus(status) {
  const normalized = normalizeText(status);
  return normalized.includes("lesion") || normalized.includes("no disponible") || normalized.includes("suspend");
}

function isActiveMembership(membership) {
  const status = normalizeText(membership?.status || "activo");
  return !["fuera del plantel", "fuera_del_plantel", "inactivo", "prestamo"].includes(status);
}

function sortPlayers(a, b) {
  const matchA = a.origin_squad_id && a.origin_squad_id === a.match_squad_id ? 0 : 1;
  const matchB = b.origin_squad_id && b.origin_squad_id === b.match_squad_id ? 0 : 1;
  if (matchA !== matchB) return matchA - matchB;
  const groupOrder = { "Arquero": 1, "Defensor": 2, "Mediocampista": 3, "Delantero": 4, "Sin categoría": 5 };
  const groupDiff = (groupOrder[getPositionGroup(a.position)] || 9) - (groupOrder[getPositionGroup(b.position)] || 9);
  if (groupDiff) return groupDiff;
  return Number(getPlayerNumber(a)) - Number(getPlayerNumber(b)) || getPlayerName(a).localeCompare(getPlayerName(b));
}

export function buildNameVariants(player) {
  const full = normalizeText(getPlayerName(player));
  const parts = full.split(" ").filter((part) => part.length > 2);
  return Array.from(new Set([full, parts.join(" "), parts.slice().reverse().join(" "), parts.slice(-2).join(" ").trim(), ...parts].filter(Boolean)));
}

function nameScore(detectedName, player) {
  const detected = normalizeText(detectedName);
  const detectedParts = new Set(detected.split(" ").filter((p) => p.length > 2));
  const variants = buildNameVariants(player);
  if (variants.includes(detected)) return 1;
  const playerParts = new Set(normalizeText(getPlayerName(player)).split(" ").filter((p) => p.length > 2));
  const shared = [...detectedParts].filter((part) => playerParts.has(part)).length;
  const total = Math.max(detectedParts.size, playerParts.size, 1);
  const coverage = shared / total;
  if (detected && variants.some((variant) => variant.includes(detected) || detected.includes(variant))) return Math.max(coverage, 0.88);
  return coverage;
}

export function matchDetectedPlayers(detectedRows, players) {
  return detectedRows.map((row) => {
    const ranked = players.map((player) => ({ player, confidence: nameScore(row.name, player) })).sort((a, b) => b.confidence - a.confidence);
    const best = ranked[0] || { player: null, confidence: 0 };
    const group = best.confidence >= 0.86 ? "matched" : best.confidence >= 0.55 ? "review" : "missing";
    return { ...row, matchedPlayerId: best.player?.id || "", matchedPlayer: best.player || null, confidence: Number(best.confidence.toFixed(2)), group };
  });
}

export async function loadMatchCallupState(match, fallbackPlayers = []) {
  const [callups, memberships, loadedPlayers] = await Promise.all([
    base44.entities.MatchCallup.filter({ match_id: match.id }, "created_date", 500).catch(() => []),
    base44.entities.SquadMembership.list("player_name", 1200).catch(() => []),
    fallbackPlayers.length ? Promise.resolve(fallbackPlayers) : base44.entities.Player.list("full_name", 1200),
  ]);

  const currentClubId = match.club_id || "defensa-y-justicia";
  const membershipByPlayer = new Map();
  (memberships || []).filter(isActiveMembership).forEach((membership) => {
    if (!membershipByPlayer.has(membership.player_id) || membership.squad_id === match.squad_id) membershipByPlayer.set(membership.player_id, membership);
  });

  const allPlayers = (loadedPlayers || []).filter((player) => {
    if (player.active === false) return false;
    return !player.club_id || player.club_id === currentClubId;
  }).map((player) => {
    const membership = membershipByPlayer.get(player.id);
    return {
      ...player,
      match_squad_id: match.squad_id || "",
      origin_squad_id: membership?.squad_id || player.squad_id || "",
      origin_squad_name: membership?.squad_name || player.squad_name || player.division || player.category || "Sin plantel",
    };
  });

  const playerMap = new Map(allPlayers.map((player) => [player.id, player]));
  const savedCallups = (callups || []).filter((callup) => callup.status !== "desconvocado" && callup.callup_status !== "desconvocado");
  savedCallups.forEach((callup) => {
    if (!playerMap.has(callup.player_id)) {
      const legacy = (loadedPlayers || []).find((player) => player.id === callup.player_id);
      if (legacy) playerMap.set(legacy.id, { ...legacy, origin_squad_name: legacy.squad_name || legacy.division || legacy.category || "Sin plantel", match_squad_id: match.squad_id || "" });
    }
  });

  const availablePlayers = Array.from(playerMap.values()).sort(sortPlayers);
  return {
    availablePlayers,
    savedCallups,
    selectedPlayerIds: Array.from(new Set(savedCallups.map((callup) => callup.player_id).filter(Boolean))),
    allCallups: callups || [],
    playerMap,
    squadOptions: Array.from(new Map(availablePlayers.map((player) => [player.origin_squad_name, { id: player.origin_squad_id || player.origin_squad_name, name: player.origin_squad_name }])).values()).filter((item) => item.name),
  };
}

export async function saveMatchCallups({ match, selectedPlayerIds, availablePlayers, allCallups, metaByPlayer = {}, replaceMissing = false }) {
  const selected = Array.from(new Set(selectedPlayerIds.filter(Boolean)));
  const selectedSet = new Set(selected);
  const now = new Date().toISOString();
  const playerMap = new Map(availablePlayers.map((player) => [player.id, player]));
  const grouped = {};
  (allCallups || []).forEach((callup) => {
    if (!grouped[callup.player_id]) grouped[callup.player_id] = [];
    grouped[callup.player_id].push(callup);
  });

  const updates = [];
  const creates = [];
  selected.forEach((playerId) => {
    const player = playerMap.get(playerId) || {};
    const meta = metaByPlayer[playerId] || {};
    const existing = grouped[playerId]?.[0];
    const payload = {
      match_id: match.id,
      player_id: playerId,
      squad_id: match.squad_id || "",
      club_id: match.club_id || "defensa-y-justicia",
      status: "convocado",
      callup_status: "convocado",
      callup_key: `${match.id}:${playerId}`,
      lineup_role: meta.lineup_role || existing?.lineup_role || "pendiente",
      shirt_number: meta.shirt_number != null ? Number(meta.shirt_number) : existing?.shirt_number || Number(getPlayerNumber(player)) || null,
      source: meta.source || existing?.source || "manual",
      source_file: meta.source_file || existing?.source_file || "",
      confidence: meta.confidence != null ? Number(meta.confidence) : existing?.confidence || null,
      detected_name: meta.detected_name || existing?.detected_name || "",
      detected_position: meta.detected_position || existing?.detected_position || "",
      player_name: getPlayerName(player),
      player_number: Number(getPlayerNumber(player)) || null,
      player_position: player.position || "",
      updated_at: now,
    };
    if (existing) updates.push({ id: existing.id, ...payload });
    else creates.push({ ...payload, created_at: now });
    (grouped[playerId] || []).slice(1).forEach((duplicate) => updates.push({ id: duplicate.id, status: "desconvocado", callup_status: "desconvocado", updated_at: now }));
  });

  if (replaceMissing) {
    Object.entries(grouped).forEach(([playerId, rows]) => {
      if (!selectedSet.has(playerId)) rows.forEach((row) => {
        if (row.status !== "desconvocado") updates.push({ id: row.id, status: "desconvocado", callup_status: "desconvocado", updated_at: now });
      });
    });
  }

  if (updates.length) await base44.entities.MatchCallup.bulkUpdate(updates);
  if (creates.length) await base44.entities.MatchCallup.bulkCreate(creates);

  const names = selected.map((id) => getPlayerName(playerMap.get(id))).filter(Boolean);
  await base44.entities.MatchReport.update(match.id, { squad_called: selected, squad_names: names });
  return loadMatchCallupState(match, availablePlayers);
}