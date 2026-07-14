function normalizeText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

function toMatchFromDay(day = {}) {
  return {
    date: day.date,
    md: day.md || day.match_day_code || "",
    rival: firstValue(day.rival, day.opponent, day.proximo_rival),
    rival_logo_url: firstValue(day.rival_logo_url, day.rival_shield_url, day.shield_url),
    home_away: firstValue(day.home_away, day.location, day.condicion),
    time: firstValue(day.time, day.start_time, day.match_time),
    competition: firstValue(day.competition, day.competencia),
    match_id: firstValue(day.match_id, day.partido_id),
    source: "weekly_plan",
  };
}

function toMatchFromEvent(event = {}) {
  return {
    date: event.date,
    rival: firstValue(event.rival),
    rival_logo_url: firstValue(event.rival_logo_url),
    home_away: firstValue(event.home_away, event.location),
    time: firstValue(event.start_time, event.time),
    competition: firstValue(event.competition),
    match_id: firstValue(event.match_id),
    title: event.title,
    source: "calendar",
  };
}

function toMatchFromReport(report = {}) {
  return {
    date: report.date,
    rival: firstValue(report.rival, report.rival_name_backup),
    rival_logo_url: firstValue(report.rival_logo_url),
    home_away: firstValue(report.location),
    time: firstValue(report.match_time),
    competition: firstValue(report.competition),
    match_id: firstValue(report.id),
    title: report.rival ? `vs. ${report.rival}` : "Partido",
    source: "match_report",
  };
}

function mergeMatches(...parts) {
  return parts.reduce((acc, part) => {
    Object.entries(part || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== "") acc[key] = value;
    });
    return acc;
  }, {});
}

export function resolveDayMatch(day = {}, calendarEvents = [], matchReports = []) {
  const date = day.date;
  const event = calendarEvents.find((item) => item.date === date && [item.event_type, item.type].some((value) => normalizeText(value) === "partido"));
  const eventMatchId = event?.match_id || day.match_id;
  const linkedReport = eventMatchId ? matchReports.find((report) => report.id === eventMatchId) : null;
  const sameDateReport = matchReports.find((report) => report.date === date);
  const isMd = (day.md || day.match_day_code) === "MD";
  const hasMatch = isMd || Boolean(event || linkedReport || sameDateReport || day.rival || day.match_id);
  if (!hasMatch) return null;
  const merged = mergeMatches(
    toMatchFromDay(day),
    toMatchFromReport(sameDateReport),
    toMatchFromReport(linkedReport),
    toMatchFromEvent(event)
  );
  return {
    ...merged,
    isMatch: true,
    rival: merged.rival || merged.title || "Rival no definido",
    home_away: merged.home_away || "",
    time: merged.time || "",
    competition: merged.competition || "",
    match_id: merged.match_id || "",
  };
}

export function resolveMicrocycleMatch(days = [], calendarEvents = [], matchReports = []) {
  return days.map((day) => resolveDayMatch(day, calendarEvents, matchReports)).find(Boolean) || null;
}