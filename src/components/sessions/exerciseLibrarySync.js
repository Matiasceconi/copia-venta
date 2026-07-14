import { base44 } from "@/api/base44Client";
import moment from "moment";

export function normalizeExerciseName(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function num(value) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function tags(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function calcArea(form) {
  const length = num(form.length_m);
  const width = num(form.width_m);
  const players = num(form.players_count);
  const total_area = length && width ? parseFloat((length * width).toFixed(1)) : undefined;
  const eii = total_area && players ? parseFloat((total_area / players).toFixed(2)) : undefined;
  return { total_area, eii };
}

export function buildFieldLibraryPayload(form, sessionId, squadId, squadName) {
  const { total_area, eii } = calcArea(form);
  return {
    name: form.name,
    normalized_name: normalizeExerciseName(form.name),
    type: form.type || undefined,
    category: form.category || undefined,
    objective: form.objective || undefined,
    description: form.description || undefined,
    length_m: num(form.length_m),
    width_m: num(form.width_m),
    total_area,
    eii,
    players_count: num(form.players_count),
    duration_min: num(form.duration_min),
    blocks: num(form.blocks),
    work_time: form.work_time || undefined,
    rest_time: form.rest_time || undefined,
    image_url: form.image_url || undefined,
    video_url: form.video_url || undefined,
    external_load_summary: form.external_load_summary || undefined,
    notes: form.notes || undefined,
    tags: tags(form.tags),
    squad_id: squadId || undefined,
    squad_name: squadName || undefined,
    global: false,
    created_from_session_id: sessionId,
  };
}

function sameFieldTemplate(item, form, squadId) {
  return (item.global === true || item.squad_id === squadId) &&
    normalizeExerciseName(item.name) === normalizeExerciseName(form.name) &&
    String(item.objective || "") === String(form.objective || "") &&
    String(item.type || "") === String(form.type || "") &&
    Number(item.length_m || 0) === Number(num(form.length_m) || 0) &&
    Number(item.width_m || 0) === Number(num(form.width_m) || 0);
}

export async function syncToFieldLibrary(form, sessionId, squadId, squadName, options = {}) {
  const today = moment().format("YYYY-MM-DD");
  const payload = buildFieldLibraryPayload(form, sessionId, squadId, squadName);
  if (options.updateExistingId) {
    const { global, squad_id, squad_name, created_from_session_id, ...updatePayload } = payload;
    await base44.entities.FieldExerciseLibrary.update(options.updateExistingId, { ...updatePayload, last_used_at: today });
    return options.updateExistingId;
  }
  const all = await base44.entities.FieldExerciseLibrary.list("-times_used", 500);
  const match = all.find((item) => sameFieldTemplate(item, form, squadId));
  if (match) {
    const matchUpdate = {
      times_used: (match.times_used || 1) + (options.incrementUsage === false ? 0 : 1),
      last_used_at: today,
    };
    if (!match.image_url && payload.image_url) matchUpdate.image_url = payload.image_url;
    // Propagate video_url: always write if incoming has a value, or clear if explicitly removed
    if (payload.video_url) {
      matchUpdate.video_url = payload.video_url;
    } else if (payload.video_url === undefined && form.video_url === "") {
      matchUpdate.video_url = null;
    }
    await base44.entities.FieldExerciseLibrary.update(match.id, matchUpdate);
    return match.id;
  }
  const created = await base44.entities.FieldExerciseLibrary.create({ ...payload, times_used: 1, first_created_at: today, last_used_at: today });
  return created.id;
}

export function fieldImportantChanged(original, form) {
  if (!original) return false;
  return ["name", "image_url", "video_url", "description", "external_load_summary"].some((key) => String(original[key] || "") !== String(form[key] || ""));
}

export function getVideoThumbnailUrl(url = "") {
  const youtubeId = String(url).match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/)?.[1];
  return youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : "";
}

export function canonicalExerciseName(value) {
  let text = normalizeExerciseName(value);
  if (text === "bulgara" || text === "sentadilla bulgara" || text === "sentadilla búlgara" || text === "split squat") return "sentadilla bulgara";
  text = text.replace(/\bsplit squat\b/g, "sentadilla bulgara");
  return text;
}

function similarityScore(a, b) {
  const left = new Set(canonicalExerciseName(a).split(" ").filter(Boolean));
  const right = new Set(canonicalExerciseName(b).split(" ").filter(Boolean));
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter(token => right.has(token)).length;
  return intersection / Math.max(left.size, right.size);
}

function sameStrengthTemplate(item, station, squadId) {
  const name = station.exercise_name || station.name || "";
  return (item.global === true || item.squad_id === squadId) && canonicalExerciseName(item.name) === canonicalExerciseName(name);
}

export async function findSimilarStrengthExercise(station, squadId) {
  const name = station.exercise_name || station.name || "";
  if (!normalizeExerciseName(name)) return null;
  const all = await base44.entities.StrengthExerciseLibrary.list("-times_used", 500);
  const visible = all.filter(item => item.global === true || item.squad_id === squadId);
  const exact = visible.find(item => canonicalExerciseName(item.name) === canonicalExerciseName(name));
  if (exact) return { type: "exact", exercise: exact };
  const similar = visible
    .map(item => ({ exercise: item, score: similarityScore(item.name, name) }))
    .filter(item => item.score >= 0.55)
    .sort((a, b) => b.score - a.score)[0];
  return similar ? { type: "similar", exercise: similar.exercise } : null;
}

export function buildStrengthLibraryPayload(station, sessionId, squadId, squadName) {
  const name = station.exercise_name || station.name || "";
  const thumbnail_url = getVideoThumbnailUrl(station.video_url) || station.thumbnail_url || station.image_url || undefined;
  return {
    name,
    normalized_name: canonicalExerciseName(name),
    aliases: [normalizeExerciseName(name)].filter(Boolean),
    method: station.method || undefined,
    exercise_type: station.exercise_type || undefined,
    description: station.description || undefined,
    volume: station.volume || undefined,
    image_url: station.image_url || undefined,
    video_url: station.video_url || undefined,
    thumbnail_url,
    restore_exercise: station.restore_exercise || undefined,
    compensate_exercise: station.compensate_exercise || undefined,
    sets: station.sets || undefined,
    reps: station.reps || undefined,
    time: station.time || undefined,
    rest_time: station.rest_time || undefined,
    rir: station.rir || undefined,
    objective: station.objective || undefined,
    muscle_group: station.muscle_group || undefined,
    vector_pattern: station.vector_pattern || undefined,
    notes: station.notes || undefined,
    tags: tags(station.tags),
    squad_id: squadId || undefined,
    squad_name: squadName || undefined,
    global: false,
    created_from_session_id: sessionId,
  };
}

function usageEntry(sessionId, options = {}) {
  return {
    session_id: sessionId,
    title: options.session?.title || options.session_title || "Sesión",
    date: options.session?.date || options.session_date || moment().format("YYYY-MM-DD"),
  };
}

function mergedUsage(existing, sessionId, options) {
  const sessions = Array.isArray(existing.usage_sessions) ? existing.usage_sessions : [];
  const entry = usageEntry(sessionId, options);
  const byId = new Map(sessions.filter(item => item?.session_id).map(item => [item.session_id, item]));
  if (entry.session_id) byId.set(entry.session_id, { ...byId.get(entry.session_id), ...entry });
  return [...byId.values()].sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))).slice(0, 80);
}

function buildStrengthLibraryUpdate(existing, payload, sessionId, options) {
  const usage_sessions = mergedUsage(existing, sessionId, options);
  const aliases = [...new Set([...(existing.aliases || []), ...(payload.aliases || [])].filter(Boolean))];
  const update = {
    method: payload.method || existing.method,
    exercise_type: payload.exercise_type || existing.exercise_type,
    description: payload.description || existing.description,
    volume: payload.volume || existing.volume,
    image_url: payload.image_url || existing.image_url,
    video_url: payload.video_url || existing.video_url,
    thumbnail_url: payload.thumbnail_url || existing.thumbnail_url,
    restore_exercise: payload.restore_exercise || existing.restore_exercise,
    compensate_exercise: payload.compensate_exercise || existing.compensate_exercise,
    sets: payload.sets || existing.sets,
    reps: payload.reps || existing.reps,
    time: payload.time || existing.time,
    rest_time: payload.rest_time || existing.rest_time,
    rir: payload.rir || existing.rir,
    objective: payload.objective || existing.objective,
    muscle_group: payload.muscle_group || existing.muscle_group,
    vector_pattern: payload.vector_pattern || existing.vector_pattern,
    notes: payload.notes || existing.notes,
    tags: payload.tags?.length ? payload.tags : existing.tags,
    aliases,
    usage_sessions,
    times_used: usage_sessions.length || existing.times_used || 1,
    last_used_at: usage_sessions[0]?.date || moment().format("YYYY-MM-DD"),
  };
  return update;
}

export async function syncToStrengthLibrary(station, sessionId, squadId, squadName, options = {}) {
  const today = moment().format("YYYY-MM-DD");
  const payload = buildStrengthLibraryPayload(station, sessionId, squadId, squadName);
  const linkedId = options.updateExistingId || station.library_strength_exercise_id || station.library_exercise_id;
  const all = await base44.entities.StrengthExerciseLibrary.list("-times_used", 500);
  const match = linkedId ? all.find(item => item.id === linkedId) : all.find(item => sameStrengthTemplate(item, station, squadId));
  if (match) {
    await base44.entities.StrengthExerciseLibrary.update(match.id, buildStrengthLibraryUpdate(match, payload, sessionId, options));
    return match.id;
  }
  const created = await base44.entities.StrengthExerciseLibrary.create({ ...payload, times_used: 1, usage_sessions: [usageEntry(sessionId, options)], first_created_at: today, last_used_at: today });
  return created.id;
}

export async function updateFieldLibraryGpsSummary(libraryExerciseId) {
  if (!libraryExerciseId) return;
  const rows = await base44.entities.LibraryExerciseGPSData.filter({ library_exercise_id: libraryExerciseId }, "-session_date", 1000);
  const metrics = ["total_distance", "m_min", "distance_19_8", "distance_25", "sprints", "acc_3", "dec_3", "player_load", "smax"];
  const summary = { records: rows.length, sessions: new Set(rows.map((row) => row.session_id).filter(Boolean)).size };
  metrics.forEach((key) => {
    const values = rows.map((row) => Number(row[key] || 0)).filter((value) => value > 0);
    summary[`avg_${key}`] = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    summary[`max_${key}`] = values.length ? Math.max(...values) : null;
  });
  await base44.entities.FieldExerciseLibrary.update(libraryExerciseId, {
    historical_gps_summary: summary,
    external_load_summary: summary,
    last_gps_sync_at: new Date().toISOString(),
  });
}