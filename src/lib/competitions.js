export function normalizeCompetitionName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(torneo|campeonato|copa|liga|de|del|la|el|reserva)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function competitionDisplayName(match, competitionMap = {}) {
  const competition = match?.competition_id ? competitionMap[match.competition_id] : null;
  return competition?.short_name || competition?.name || match?.competition || "Sin competencia";
}

export function findCompetitionByAlias(rawName, aliases = [], competitions = []) {
  const normalized = normalizeCompetitionName(rawName);
  if (!normalized) return null;
  const alias = aliases.find((item) => item.active !== false && item.normalized_alias === normalized);
  if (alias) return competitions.find((competition) => competition.id === alias.competition_id) || null;
  return competitions.find((competition) => competition.normalized_name === normalized) || null;
}

export function buildUnlinkedCompetitionGroups(matches = []) {
  const groups = {};
  matches.forEach((match) => {
    if (match.competition_id) return;
    const raw = match.competition || "Sin etiqueta";
    const normalized = normalizeCompetitionName(raw) || "sin-etiqueta";
    if (!groups[normalized]) groups[normalized] = { normalized, rawNames: new Set(), matches: [] };
    groups[normalized].rawNames.add(raw);
    groups[normalized].matches.push(match);
  });
  return Object.values(groups).map((group) => ({ ...group, rawNames: Array.from(group.rawNames) }));
}