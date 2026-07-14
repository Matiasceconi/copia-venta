export function isMatchEvent(event) {
  const type = event?.event_type || event?.type || "";
  return String(type).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("partido");
}

export function matchPayloadFromEvent(event) {
  const matchday = event.matchday_number === "" || event.matchday_number == null ? null : Number(event.matchday_number);
  return {
    calendar_event_id: event.id,
    squad_id: event.squad_id || null,
    squad_name: event.squad_name || "",
    season_id: event.season_id || "",
    date: event.date,
    match_time: event.start_time || event.time || "",
    match_venue: event.location || "",
    rival: event.rival || "Rival a confirmar",
    rival_name_backup: event.rival || "",
    rival_club_id: event.rival_club_id || "",
    rival_logo_url: event.rival_logo_url || "",
    location: event.home_away || "Local",
    competition: event.competition || "",
    competition_id: event.competition_id || "",
    competition_stage: event.competition_stage || "",
    competition_round: event.competition_round || (matchday ? `Fecha ${matchday}` : ""),
    matchday_number: matchday,
    phase_label: event.phase_label || (matchday ? `Fecha ${matchday}` : event.competition_stage || ""),
    notes: event.notes || "",
    status: event.rival && event.date && event.squad_id ? "activo" : "borrador",
    sync_source: "calendar",
    sync_updated_at: new Date().toISOString(),
  };
}

export function eventPayloadFromMatch(match) {
  return {
    match_id: match.id,
    squad_id: match.squad_id || null,
    squad_name: match.squad_name || "",
    season_id: match.season_id || "",
    date: match.date,
    time: match.match_time || "",
    start_time: match.match_time || "",
    title: match.rival ? `Partido vs ${match.rival}` : "Partido",
    type: "Partido",
    event_type: "Partido",
    color: "red",
    duration_minutes: 105,
    location: match.match_venue || "",
    notes: match.notes || "",
    rival: match.rival || "",
    rival_club_id: match.rival_club_id || "",
    rival_logo_url: match.rival_logo_url || "",
    home_away: match.location || "Local",
    competition: match.competition || "",
    competition_id: match.competition_id || "",
    competition_stage: match.competition_stage || "",
    competition_round: match.competition_round || "",
    matchday_number: match.matchday_number || null,
    phase_label: match.phase_label || "",
    sync_source: "matches",
    sync_updated_at: new Date().toISOString(),
  };
}