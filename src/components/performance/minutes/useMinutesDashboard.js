import { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { getRecordMinutes, isFinishedMatch } from "@/lib/minutesUtils";

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function matchDateValue(match) {
  return String(match?.date || "");
}

function getMatchDuration(match) {
  const value = Number(match?.total_duration_minutes || 0);
  return Number.isFinite(value) ? value : 0;
}

function getMinuteKey(row) {
  return row.player_id || `name:${normalizeText(row.player_name)}`;
}

function getPlayerKey(player) {
  return player.id || player.player_id || `name:${normalizeText(player.full_name || player.player_name || `${player.first_name || ""} ${player.last_name || ""}`)}`;
}

function getLineupRole(row) {
  if (row.lineup_role) return row.lineup_role;
  if (row.started) return "titular";
  return "suplente";
}

function isFriendlyMatch(match, competition) {
  const type = normalizeText(competition?.competition_type || "");
  const name = normalizeText(match?.competition || competition?.name || "");
  return type === "amistoso" || name.includes("amistoso");
}

function buildAliasMap(aliases) {
  const map = {};
  (aliases || []).forEach((alias) => {
    const key = normalizeText(alias.alias || alias.normalized_alias);
    if (key && alias.competition_id && alias.active !== false) map[key] = alias.competition_id;
  });
  return map;
}

function resolveCompetition(match, competitionsById, aliasMap) {
  if (match?.competition_id && competitionsById[match.competition_id]) {
    return competitionsById[match.competition_id];
  }
  const raw = normalizeText(match?.competition || match?.competition_name || "");
  if (!raw) return null;
  const aliasId = aliasMap[raw];
  if (aliasId && competitionsById[aliasId]) return competitionsById[aliasId];
  return Object.values(competitionsById).find((competition) => {
    const names = [competition.name, competition.short_name, competition.normalized_name];
    return names.some((name) => normalizeText(name) === raw);
  }) || null;
}

function buildMinuteRowsByMatch(rows) {
  return (rows || []).reduce((acc, row) => {
    if (!row.match_id) return acc;
    acc[row.match_id] = acc[row.match_id] || [];
    acc[row.match_id].push(row);
    return acc;
  }, {});
}

function dedupeMinuteRows(rows) {
  const seen = new Set();
  return [...(rows || [])]
    .sort((a, b) => String(b.updated_at || b.updated_date || b.created_date || "").localeCompare(String(a.updated_at || a.updated_date || a.created_date || "")))
    .filter((row) => {
      const key = `${row.match_id}:${getMinuteKey(row)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function getMatchStatus(match) {
  const duration = getMatchDuration(match);
  const rows = dedupeMinuteRows(match.minuteRows || []);
  const positiveRows = rows.filter((row) => getRecordMinutes(row) > 0);
  const incompleteRows = rows.filter((row) => row.minutes_played == null || row.minutes_played === "" || !getLineupRole(row));
  const finished = match.finished;
  const pending = finished && (!duration || positiveRows.length === 0 || incompleteRows.length > 0);
  const complete = finished && duration > 0 && positiveRows.length > 0 && incompleteRows.length === 0;
  if (!finished) return { label: "No finalizado", tone: "text-zinc-300", badge: "border-zinc-700 bg-zinc-800/70" };
  if (complete) return { label: "Minutos completos", tone: "text-emerald-300", badge: "border-emerald-500/30 bg-emerald-500/10" };
  if (positiveRows.length === 0) return { label: "Sin minutos", tone: "text-red-300", badge: "border-red-500/30 bg-red-500/10" };
  return { label: "Información pendiente", tone: "text-yellow-300", badge: "border-yellow-500/30 bg-yellow-500/10" };
}

function buildPlayerPool(players, memberships, squadId) {
  if (!squadId || squadId === "all") return players || [];
  const memberIds = new Set((memberships || []).filter((membership) => membership.squad_id === squadId).map((membership) => membership.player_id));
  const fromMembership = (players || []).filter((player) => memberIds.has(player.id));
  if (fromMembership.length > 0) return fromMembership;
  return (players || []).filter((player) => player.squad_id === squadId);
}

function getDateRangeLabel(filters) {
  if (filters.dateRange === "last5") return "Últimos 5 partidos";
  if (filters.dateRange === "last10") return "Últimos 10 partidos";
  if (filters.dateRange === "custom") return filters.dateFrom && filters.dateTo ? `${filters.dateFrom} → ${filters.dateTo}` : "Rango personalizado";
  return "Toda la temporada";
}

export default function useMinutesDashboard() {
  const { activeSquadId, activeSeasonId, mySquads } = useWorkspace();
  const [filters, setFilters] = useState({
    squadId: activeSquadId || "all",
    seasonId: activeSeasonId || "all",
    competitionId: "all",
    matchType: "all",
    dateRange: "season",
    dateFrom: "",
    dateTo: "",
    search: "",
    sortBy: "minutes",
  });
  const [tab, setTab] = useState("summary");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ players: [], memberships: [], matches: [], minuteRows: [], competitions: [], aliases: [] });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [minuteRows, matches, players, competitions, aliases, memberships] = await Promise.all([
      base44.entities.MatchPlayerMinutes.list("-updated_date", 5000).catch(() => []),
      base44.entities.MatchReport.list("-date", 1000).catch(() => []),
      base44.entities.Player.list("full_name", 1000).catch(() => []),
      base44.entities.Competitions.list("name", 500).catch(() => []),
      base44.entities.CompetitionAliases.list("alias", 1000).catch(() => []),
      base44.entities.SquadMembership.filter({ status: "activo" }, "player_name", 2000).catch(() => []),
    ]);
    setData({ players, memberships, matches, minuteRows, competitions, aliases });
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    let timer;
    const reload = () => {
      clearTimeout(timer);
      timer = setTimeout(loadData, 500);
    };
    const unsubMinutes = base44.entities.MatchPlayerMinutes.subscribe(reload);
    const unsubMatches = base44.entities.MatchReport.subscribe(reload);
    const onFocus = () => loadData();
    const onVisible = () => { if (document.visibilityState === "visible") loadData(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      unsubMinutes?.();
      unsubMatches?.();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      clearTimeout(timer);
    };
  }, [loadData]);

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      squadId: current.squadId === "all" || current.squadId ? current.squadId : activeSquadId || "all",
      seasonId: current.seasonId === "all" || current.seasonId ? current.seasonId : activeSeasonId || "all",
    }));
  }, [activeSquadId, activeSeasonId]);

  const competitionsById = useMemo(() => Object.fromEntries((data.competitions || []).map((competition) => [competition.id, competition])), [data.competitions]);
  const aliasMap = useMemo(() => buildAliasMap(data.aliases), [data.aliases]);
  const minuteRowsByMatch = useMemo(() => buildMinuteRowsByMatch(data.minuteRows), [data.minuteRows]);

  const normalizedMatches = useMemo(() => {
    return (data.matches || [])
      .filter((match) => !["archivado", "cancelado"].includes(match.status))
      .map((match) => {
        const resolvedCompetition = resolveCompetition(match, competitionsById, aliasMap);
        const resolvedCompetitionId = resolvedCompetition?.id || match.competition_id || null;
        const displayCompetition = resolvedCompetition?.short_name || resolvedCompetition?.name || match.competition || "Sin competencia asignada";
        const finished = isFinishedMatch(match) || match.status === "finalizado";
        const minuteRows = minuteRowsByMatch[match.id] || [];
        const status = getMatchStatus({ ...match, finished, minuteRows });
        return {
          ...match,
          resolvedCompetition,
          resolvedCompetitionId,
          displayCompetition,
          matchType: isFriendlyMatch(match, resolvedCompetition) ? "amistoso" : "oficial",
          finished,
          minuteRows,
          status,
          duration: getMatchDuration(match),
        };
      })
      .sort((a, b) => matchDateValue(b).localeCompare(matchDateValue(a)));
  }, [data.matches, competitionsById, aliasMap, minuteRowsByMatch]);

  const squadOptions = useMemo(() => {
    const fromWorkspace = (mySquads || []).filter((squad) => squad.active !== false).map((squad) => ({ value: squad.id, label: squad.name }));
    const seen = new Set();
    return [{ value: "all", label: "Todos los planteles" }, ...fromWorkspace.filter((option) => {
      if (seen.has(option.value)) return false;
      seen.add(option.value);
      return true;
    })];
  }, [mySquads]);

  const seasonOptions = useMemo(() => {
    const relevantMatches = normalizedMatches.filter((match) => filters.squadId === "all" || match.squad_id === filters.squadId);
    const values = [...new Set(relevantMatches.map((match) => match.season_id).filter(Boolean))].sort((a, b) => String(b).localeCompare(String(a)));
    return [{ value: "all", label: "Todas las temporadas" }, ...values.map((season) => ({ value: season, label: season }))];
  }, [normalizedMatches, filters.squadId]);

  const competitionOptions = useMemo(() => {
    const relevantMatches = normalizedMatches.filter((match) => {
      if (filters.squadId !== "all" && match.squad_id !== filters.squadId) return false;
      if (filters.seasonId !== "all" && match.season_id !== filters.seasonId) return false;
      return !!match.resolvedCompetitionId;
    });
    const activeIds = new Set(relevantMatches.map((match) => match.resolvedCompetitionId));
    const items = (data.competitions || [])
      .filter((competition) => competition.active !== false && activeIds.has(competition.id))
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
      .map((competition) => ({ value: competition.id, label: competition.short_name || competition.name }));
    return [{ value: "all", label: "Todas las competencias" }, ...items];
  }, [normalizedMatches, data.competitions, filters.squadId, filters.seasonId]);

  useEffect(() => {
    if (!seasonOptions.some((option) => option.value === filters.seasonId)) {
      setFilters((current) => ({ ...current, seasonId: "all", competitionId: "all" }));
    }
  }, [seasonOptions, filters.seasonId]);

  useEffect(() => {
    if (!competitionOptions.some((option) => option.value === filters.competitionId)) {
      setFilters((current) => ({ ...current, competitionId: "all" }));
    }
  }, [competitionOptions, filters.competitionId]);

  const filteredMatches = useMemo(() => {
    let list = [...normalizedMatches];
    if (filters.squadId !== "all") list = list.filter((match) => match.squad_id === filters.squadId);
    if (filters.seasonId !== "all") list = list.filter((match) => match.season_id === filters.seasonId);
    if (filters.competitionId !== "all") list = list.filter((match) => match.resolvedCompetitionId === filters.competitionId);
    if (filters.matchType !== "all") list = list.filter((match) => match.matchType === filters.matchType);
    if (filters.dateRange === "custom" && filters.dateFrom && filters.dateTo) {
      list = list.filter((match) => match.date >= filters.dateFrom && match.date <= filters.dateTo);
    }
    if (filters.dateRange === "last5") list = list.slice(0, 5);
    if (filters.dateRange === "last10") list = list.slice(0, 10);
    return list;
  }, [normalizedMatches, filters]);

  const filteredFinishedMatches = useMemo(() => filteredMatches.filter((match) => match.finished), [filteredMatches]);

  const filteredMinuteRows = useMemo(() => {
    const allowedMatchIds = new Set(filteredFinishedMatches.map((match) => match.id));
    return dedupeMinuteRows(data.minuteRows)
      .filter((row) => allowedMatchIds.has(row.match_id))
      .filter((row) => getRecordMinutes(row) > 0);
  }, [data.minuteRows, filteredFinishedMatches]);

  const playerPool = useMemo(() => buildPlayerPool(data.players, data.memberships, filters.squadId), [data.players, data.memberships, filters.squadId]);

  const playerRows = useMemo(() => {
    const rowsByPlayer = filteredMinuteRows.reduce((acc, row) => {
      const key = getMinuteKey(row);
      acc[key] = acc[key] || [];
      acc[key].push(row);
      return acc;
    }, {});
    const availableMinutes = filteredFinishedMatches.reduce((sum, match) => sum + getMatchDuration(match), 0);
    const searchText = normalizeText(filters.search);
    const baseRows = playerPool.map((player) => {
      const key = getPlayerKey(player);
      const rows = rowsByPlayer[key] || [];
      const accumulatedMinutes = rows.reduce((sum, row) => sum + getRecordMinutes(row), 0);
      const matchesCount = new Set(rows.map((row) => row.match_id)).size;
      const starts = rows.filter((row) => getLineupRole(row) === "titular").length;
      const subEntries = rows.filter((row) => getLineupRole(row) === "suplente" && getRecordMinutes(row) > 0).length;
      return {
        player_id: player.id,
        player_name: player.full_name || `${player.first_name || ""} ${player.last_name || ""}`.trim(),
        position: player.position || "—",
        photo_url: player.photo_url || "",
        accumulatedMinutes,
        availableMinutes,
        percentage: availableMinutes > 0 ? accumulatedMinutes / availableMinutes : 0,
        matchesCount,
        starts,
        subEntries,
        detailRows: rows
          .map((row) => {
            const match = filteredFinishedMatches.find((item) => item.id === row.match_id);
            if (!match) return null;
            const duration = getMatchDuration(match);
            const minutes = getRecordMinutes(row);
            return {
              match_id: match.id,
              date: match.date,
              rival: match.rival,
              competition: match.displayCompetition,
              location: match.location || "—",
              lineup_role: getLineupRole(row),
              minutes,
              duration,
              percentage: duration > 0 ? minutes / duration : 0,
            };
          })
          .filter(Boolean)
          .sort((a, b) => String(b.date).localeCompare(String(a.date))),
      };
    });
    const rowsFromRecords = filteredMinuteRows
      .filter((row) => !baseRows.some((player) => player.player_id === row.player_id))
      .reduce((acc, row) => {
        const key = getMinuteKey(row);
        if (acc[key]) return acc;
        const rows = rowsByPlayer[key] || [];
        const availableMinutes = filteredFinishedMatches.reduce((sum, match) => sum + getMatchDuration(match), 0);
        acc[key] = {
          player_id: row.player_id || null,
          player_name: row.player_name,
          position: "—",
          photo_url: "",
          accumulatedMinutes: rows.reduce((sum, item) => sum + getRecordMinutes(item), 0),
          availableMinutes,
          percentage: availableMinutes > 0 ? rows.reduce((sum, item) => sum + getRecordMinutes(item), 0) / availableMinutes : 0,
          matchesCount: new Set(rows.map((item) => item.match_id)).size,
          starts: rows.filter((item) => getLineupRole(item) === "titular").length,
          subEntries: rows.filter((item) => getLineupRole(item) === "suplente" && getRecordMinutes(item) > 0).length,
          detailRows: rows.map((item) => {
            const match = filteredFinishedMatches.find((candidate) => candidate.id === item.match_id);
            if (!match) return null;
            const duration = getMatchDuration(match);
            const minutes = getRecordMinutes(item);
            return {
              match_id: match.id,
              date: match.date,
              rival: match.rival,
              competition: match.displayCompetition,
              location: match.location || "—",
              lineup_role: getLineupRole(item),
              minutes,
              duration,
              percentage: duration > 0 ? minutes / duration : 0,
            };
          }).filter(Boolean).sort((a, b) => String(b.date).localeCompare(String(a.date))),
        };
        return acc;
      }, {});
    const merged = [...baseRows, ...Object.values(rowsFromRecords)]
      .filter((row) => !searchText || normalizeText(row.player_name).includes(searchText));
    const sorted = [...merged].sort((a, b) => {
      if (filters.sortBy === "percentage") return b.percentage - a.percentage;
      if (filters.sortBy === "matches") return b.matchesCount - a.matchesCount;
      if (filters.sortBy === "starts") return b.starts - a.starts;
      if (filters.sortBy === "name") return String(a.player_name || "").localeCompare(String(b.player_name || ""));
      return b.accumulatedMinutes - a.accumulatedMinutes;
    });
    return sorted.map((row, index) => ({ ...row, rank: index + 1 }));
  }, [filteredMinuteRows, playerPool, filteredFinishedMatches, filters.search, filters.sortBy]);

  const visibleMatches = useMemo(() => {
    const searchText = normalizeText(filters.search);
    if (!searchText) return filteredMatches;
    const matchingKeys = new Set(playerRows.map((row) => row.player_id || `name:${normalizeText(row.player_name)}`));
    return filteredMatches.filter((match) => match.minuteRows.some((row) => matchingKeys.has(getMinuteKey(row)) && getRecordMinutes(row) > 0));
  }, [filteredMatches, filters.search, playerRows]);

  const pendingMatches = useMemo(() => filteredFinishedMatches.filter((match) => match.status.label !== "Minutos completos"), [filteredFinishedMatches]);
  const playersWithMinutesCount = useMemo(() => new Set(filteredMinuteRows.map((row) => getMinuteKey(row))).size, [filteredMinuteRows]);
  const availableMinutes = useMemo(() => filteredFinishedMatches.reduce((sum, match) => sum + getMatchDuration(match), 0), [filteredFinishedMatches]);

  const filterLabels = useMemo(() => ({
    squad: squadOptions.find((option) => option.value === filters.squadId)?.label || "Todos los planteles",
    season: seasonOptions.find((option) => option.value === filters.seasonId)?.label || "Todas las temporadas",
    competition: competitionOptions.find((option) => option.value === filters.competitionId)?.label || "Todas las competencias",
    type: filters.matchType === "oficial" ? "Oficiales" : filters.matchType === "amistoso" ? "Amistosos" : "Todos",
    range: getDateRangeLabel(filters),
  }), [filters, squadOptions, seasonOptions, competitionOptions]);

  const exportData = useMemo(() => ({
    filters: filterLabels,
    availableMinutes,
    includedMatches: filteredFinishedMatches.length,
    playersWithMinutes: playersWithMinutesCount,
    pendingMatches: pendingMatches.length,
    rows: playerRows,
  }), [filterLabels, availableMinutes, filteredFinishedMatches.length, playersWithMinutesCount, pendingMatches.length, playerRows]);

  const updateFilter = useCallback((key, value) => setFilters((current) => ({ ...current, [key]: value })), []);
  const resetFilters = useCallback(() => setFilters({
    squadId: activeSquadId || "all",
    seasonId: activeSeasonId || "all",
    competitionId: "all",
    matchType: "all",
    dateRange: "season",
    dateFrom: "",
    dateTo: "",
    search: "",
    sortBy: "minutes",
  }), [activeSquadId, activeSeasonId]);

  return {
    loading,
    tab,
    setTab,
    filters,
    updateFilter,
    resetFilters,
    reload: loadData,
    squadOptions,
    seasonOptions,
    competitionOptions,
    filteredMatches: visibleMatches,
    filteredFinishedMatches,
    pendingMatches,
    availableMinutes,
    playersWithMinutesCount,
    playerRows,
    exportData,
    filterLabels,
  };
}