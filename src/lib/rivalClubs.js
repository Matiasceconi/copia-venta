export function normalizeClubText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\bclub\b|\batletico\b|\bdeportivo\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function clubDisplayName(club) {
  return club?.official_name || club?.short_name || "";
}

export function clubLogo(club) {
  return club?.shield_url || "";
}

export function clubMatchesQuery(club, query) {
  const q = normalizeClubText(query);
  if (!q) return false;
  const values = [club?.official_name, club?.short_name, ...(club?.aliases || [])].map(normalizeClubText);
  return values.some((value) => value.includes(q) || q.includes(value));
}

export function findSimilarClubs(clubs = [], name = "") {
  const n = normalizeClubText(name);
  if (!n) return [];
  return clubs.filter((club) => clubMatchesQuery(club, n) || normalizeClubText(club.official_name).split(" ").some((part) => part.length > 3 && n.includes(part))).slice(0, 5);
}

export function patchFromClub(club) {
  return {
    rival_club_id: club?.id || "",
    rival: clubDisplayName(club),
    rival_logo_url: clubLogo(club),
  };
}