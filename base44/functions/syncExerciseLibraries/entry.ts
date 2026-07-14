import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function normalize(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
function num(value) { const n = Number(value); return Number.isFinite(n) ? n : undefined; }
function today() { return new Date().toISOString().slice(0, 10); }
function strip(record) { const { id, created_date, updated_date, created_by_id, ...rest } = record; return rest; }
function area(ex) {
  const length = num(ex.length_m); const width = num(ex.width_m); const players = num(ex.players_count);
  const total_area = length && width ? Number((length * width).toFixed(1)) : undefined;
  const eii = total_area && players ? Number((total_area / players).toFixed(2)) : undefined;
  return { total_area, eii };
}
function fieldPayload(ex, session, existing = {}) {
  const derived = area(ex);
  return {
    name: ex.name || existing.name,
    normalized_name: normalize(ex.name || existing.name),
    type: ex.type || existing.type,
    objective: ex.objective || existing.objective,
    description: ex.description || existing.description,
    length_m: num(ex.length_m) ?? existing.length_m,
    width_m: num(ex.width_m) ?? existing.width_m,
    players_count: num(ex.players_count) ?? existing.players_count,
    total_area: derived.total_area ?? existing.total_area,
    eii: derived.eii ?? existing.eii,
    duration_min: num(ex.duration_min) ?? existing.duration_min,
    blocks: num(ex.blocks) ?? existing.blocks,
    work_time: ex.work_time || existing.work_time,
    rest_time: ex.rest_time || existing.rest_time,
    image_url: ex.image_url || existing.image_url,
    video_url: ex.video_url || existing.video_url,
    notes: ex.notes || existing.notes,
    tags: Array.isArray(ex.tags) ? ex.tags : existing.tags || [],
    squad_id: session?.squad_id || existing.squad_id,
    squad_name: session?.squad_name || existing.squad_name,
    global: existing.global === true ? true : false,
    created_from_session_id: existing.created_from_session_id || ex.session_id,
  };
}
function fieldSignature(ex) {
  return [normalize(ex.name), normalize(ex.objective), normalize(ex.type), Number(ex.length_m || 0), Number(ex.width_m || 0)].join('|');
}
function strengthPayload(st, session, existing = {}) {
  const name = st.exercise_name || st.name || existing.name;
  return {
    name,
    normalized_name: normalize(name),
    method: st.method || existing.method,
    exercise_type: st.exercise_type || existing.exercise_type,
    description: st.description || existing.description,
    volume: st.volume || existing.volume,
    image_url: st.image_url || existing.image_url,
    video_url: st.video_url || existing.video_url,
    restore_exercise: st.restore_exercise || existing.restore_exercise,
    compensate_exercise: st.compensate_exercise || existing.compensate_exercise,
    sets: st.sets || existing.sets,
    reps: st.reps || existing.reps,
    time: st.time || existing.time,
    rest_time: st.rest_time || existing.rest_time,
    rir: st.rir || existing.rir,
    objective: st.objective || existing.objective,
    muscle_group: st.muscle_group || existing.muscle_group,
    vector_pattern: st.vector_pattern || existing.vector_pattern,
    notes: st.notes || existing.notes,
    tags: Array.isArray(st.tags) ? st.tags : existing.tags || [],
    squad_id: session?.squad_id || existing.squad_id,
    squad_name: session?.squad_name || existing.squad_name,
    global: existing.global === true ? true : false,
    created_from_session_id: existing.created_from_session_id || st.session_id,
  };
}
function strengthSignature(ex) { return [normalize(ex.name || ex.exercise_name), normalize(ex.method), normalize(ex.exercise_type)].join('|'); }
function gpsSummary(rows) {
  const metrics = ['total_distance', 'm_min', 'distance_19_8', 'distance_25', 'sprints', 'acc_3', 'dec_3', 'player_load', 'smax'];
  const summary = { records: rows.length, sessions: new Set(rows.map(r => r.session_id).filter(Boolean)).size };
  for (const key of metrics) {
    const values = rows.map(r => Number(r[key] || 0)).filter(v => v > 0);
    summary[`avg_${key}`] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    summary[`max_${key}`] = values.length ? Math.max(...values) : null;
  }
  return summary;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const dryRun = Boolean((await req.json().catch(() => ({}))).dry_run);
    const service = base44.asServiceRole.entities;
    const [sessions, fieldExercises, fieldLibrary, strengthStations, strengthLibrary, exerciseGps, libraryGps] = await Promise.all([
      service.TrainingSession.list('-date', 5000),
      service.SessionExercise.list('-created_date', 5000),
      service.FieldExerciseLibrary.list('-times_used', 5000),
      service.StrengthStation.list('-created_date', 5000),
      service.StrengthExerciseLibrary.list('-times_used', 5000),
      service.ExerciseGPSData.list('-created_date', 5000),
      service.LibraryExerciseGPSData.list('-created_date', 5000),
    ]);
    const sessionById = Object.fromEntries(sessions.map(s => [s.id, s]));
    const fieldById = Object.fromEntries(fieldLibrary.map(e => [e.id, e]));
    const strengthById = Object.fromEntries(strengthLibrary.map(e => [e.id, e]));
    const report = { field_linked: 0, field_created: 0, field_updated: 0, field_duplicates: 0, strength_linked: 0, strength_created: 0, strength_updated: 0, strength_duplicates: 0, gps_synced: 0, orphan_deleted: 0, dry_run: dryRun };

    const fieldSigMap = new Map();
    for (const lib of fieldLibrary) {
      const sig = fieldSignature(lib);
      if (fieldSigMap.has(sig)) report.field_duplicates += 1; else fieldSigMap.set(sig, lib);
    }
    const strengthSigMap = new Map();
    for (const lib of strengthLibrary) {
      const sig = strengthSignature(lib);
      if (strengthSigMap.has(sig)) report.strength_duplicates += 1; else strengthSigMap.set(sig, lib);
    }

    for (const ex of fieldExercises) {
      if (!ex.name) continue;
      const session = sessionById[ex.session_id] || {};
      let libId = ex.library_exercise_id;
      let lib = libId ? fieldById[libId] : null;
      if (!lib) {
        lib = fieldSigMap.get(fieldSignature(ex));
        if (lib) {
          libId = lib.id;
          report.field_linked += 1;
          if (!dryRun) await service.SessionExercise.update(ex.id, { library_exercise_id: libId });
        } else {
          const payload = { ...fieldPayload(ex, session), times_used: 1, first_created_at: today(), last_used_at: today() };
          report.field_created += 1;
          if (!dryRun) {
            lib = await service.FieldExerciseLibrary.create(payload);
            libId = lib.id;
            fieldById[libId] = lib;
            fieldSigMap.set(fieldSignature(lib), lib);
            await service.SessionExercise.update(ex.id, { library_exercise_id: libId });
          }
        }
      }
      if (libId && lib) {
        const payload = fieldPayload(ex, session, lib);
        report.field_updated += 1;
        if (!dryRun) await service.FieldExerciseLibrary.update(libId, { ...payload, last_used_at: today() });
      }
    }

    const gpsByExercise = new Map();
    for (const row of exerciseGps) {
      if (!gpsByExercise.has(row.exercise_id)) gpsByExercise.set(row.exercise_id, []);
      gpsByExercise.get(row.exercise_id).push(row);
    }
    const libGpsByExercise = new Map();
    for (const row of libraryGps) {
      if (!libGpsByExercise.has(row.exercise_id)) libGpsByExercise.set(row.exercise_id, []);
      libGpsByExercise.get(row.exercise_id).push(row);
    }
    for (const ex of fieldExercises) {
      const libId = ex.library_exercise_id;
      const rows = gpsByExercise.get(ex.id) || [];
      if (!libId || !rows.length) continue;
      const prev = libGpsByExercise.get(ex.id) || [];
      report.gps_synced += rows.length;
      if (!dryRun) {
        for (const old of prev) await service.LibraryExerciseGPSData.delete(old.id);
        const session = sessionById[ex.session_id] || {};
        await service.LibraryExerciseGPSData.bulkCreate(rows.map(row => ({ ...strip(row), library_exercise_id: libId, session_title: session.title || '', session_date: session.date || '', exercise_name: ex.name || '' })));
      }
    }

    const allLibGps = dryRun ? libraryGps : await service.LibraryExerciseGPSData.list('-created_date', 5000);
    const gpsByLib = new Map();
    for (const row of allLibGps) {
      if (!gpsByLib.has(row.library_exercise_id)) gpsByLib.set(row.library_exercise_id, []);
      gpsByLib.get(row.library_exercise_id).push(row);
    }
    for (const [libId, rows] of gpsByLib.entries()) {
      if (!dryRun) await service.FieldExerciseLibrary.update(libId, { historical_gps_summary: gpsSummary(rows), external_load_summary: gpsSummary(rows), last_gps_sync_at: new Date().toISOString() });
    }

    for (const st of strengthStations) {
      const name = st.exercise_name || '';
      if (!name) continue;
      const session = sessionById[st.session_id] || {};
      let libId = st.library_strength_exercise_id || st.library_exercise_id;
      let lib = libId ? strengthById[libId] : null;
      if (!lib) {
        lib = strengthSigMap.get(strengthSignature(st));
        if (lib) {
          libId = lib.id;
          report.strength_linked += 1;
          if (!dryRun) await service.StrengthStation.update(st.id, { library_exercise_id: libId, library_strength_exercise_id: libId });
        } else {
          const payload = { ...strengthPayload(st, session), times_used: 1, first_created_at: today(), last_used_at: today() };
          report.strength_created += 1;
          if (!dryRun) {
            lib = await service.StrengthExerciseLibrary.create(payload);
            libId = lib.id;
            strengthById[libId] = lib;
            strengthSigMap.set(strengthSignature(lib), lib);
            await service.StrengthStation.update(st.id, { library_exercise_id: libId, library_strength_exercise_id: libId });
          }
        }
      }
      if (libId && lib) {
        report.strength_updated += 1;
        if (!dryRun) await service.StrengthExerciseLibrary.update(libId, { ...strengthPayload(st, session, lib), last_used_at: today() });
      }
    }

    const linkedFieldIds = new Set(fieldExercises.map(ex => ex.library_exercise_id).filter(Boolean));
    const linkedStrengthIds = new Set(strengthStations.flatMap(st => [st.library_strength_exercise_id, st.library_exercise_id]).filter(Boolean));
    for (const lib of fieldLibrary) {
      if (lib.created_from_session_id && !sessionById[lib.created_from_session_id] && !linkedFieldIds.has(lib.id)) {
        report.orphan_deleted += 1;
        if (!dryRun) await service.FieldExerciseLibrary.delete(lib.id);
      }
    }
    for (const lib of strengthLibrary) {
      if (lib.created_from_session_id && !sessionById[lib.created_from_session_id] && !linkedStrengthIds.has(lib.id)) {
        report.orphan_deleted += 1;
        if (!dryRun) await service.StrengthExerciseLibrary.delete(lib.id);
      }
    }

    return Response.json({ success: true, summary: `Campo: ${report.field_linked} vinculados, ${report.field_created} creados, ${report.field_updated} actualizados. Fuerza: ${report.strength_linked} vinculados, ${report.strength_created} creados, ${report.strength_updated} actualizados. GPS: ${report.gps_synced} registros sincronizados.`, ...report });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});