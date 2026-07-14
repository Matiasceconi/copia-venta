import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Entidades operativas que pertenecen a un club y deben vaciarse en el reset.
// Ordenado de hijos → padres para un borrado seguro.
const OPERATIONAL_ENTITIES = [
  "SessionPlayer",
  "SessionExercise",
  "SessionGPSData",
  "SessionGPSSummary",
  "SessionVideoLink",
  "ExerciseGPSData",
  "PlayerExerciseLog",
  "StrengthStation",
  "StrengthWorkBlock",
  "StrengthSession",
  "MatchCallup",
  "MatchPlayerMinutes",
  "MinutesRecord",
  "GPSRecord",
  "CatapultReport",
  "PlayerMicrocycleGPSProfile",
  "TeamGPSMicrocycleProfile",
  "PlayerGPSProfile",
  "TeamGPSProfile",
  "DayEvent",
  "MicrocycleSummary",
  "WeeklyPlan",
  "TournamentStanding",
  "CompetitionAliases",
  "Competitions",
  "RivalClub",
  "MedicalEpisode",
  "MedicalCurrentStatus",
  "MedicalRecord",
  "NutritionInterpretation",
  "NutritionAssessment",
  "NutritionRecord",
  "PhysicalObjective",
  "DailySquadStatus",
  "RecoveryBackup",
  "TrainingSession",
  "MatchReport",
  "PlayerCompetitionProfile",
  "PlayerNameMapping",
  "PlayerAlias",
  "SquadMembership",
  "Player",
  "FieldExercise",
  "FieldExerciseLibrary",
  "StrengthExercise",
  "StrengthExerciseLibrary",
  "StaffMember",
  "Division",
  "Squad",
  "UserAccess",
  "AppRole",
  "OrganizationMember",
  "Organization"
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'dry_run';
    const appId = Deno.env.get('BASE44_APP_ID');

    // ── dry_run: inventario completo sin modificar nada ──────────────────
    if (mode === 'dry_run') {
      const counts = {};
      for (const name of OPERATIONAL_ENTITIES) {
        try {
          const list = await base44.asServiceRole.entities[name].list('-created_date', 1000);
          counts[name] = Array.isArray(list) ? list.length : 0;
        } catch (e) {
          counts[name] = { error: String(e.message || e).slice(0, 100) };
        }
      }
      const totalToDelete = Object.values(counts).reduce(
        (acc, v) => acc + (typeof v === 'number' ? v : 0), 0
      );
      return Response.json({
        mode: 'dry_run',
        app_id: appId,
        app_name: 'PerformancePitch (clon comercial)',
        entities: counts,
        total_records_to_delete: totalToDelete,
        users_preserved: 'El usuario propietario del clon se conserva (no se eliminan usuarios de la plataforma).',
        note: 'No se realiza ningún borrado en modo dry_run.'
      });
    }

    // ── execute: borrado definitivo con validaciones estrictas ───────────
    if (mode === 'execute') {
      // 1. Solo admin de plataforma o owner
      if (user.role !== 'admin') {
        return Response.json({ error: 'Solo un administrador de plataforma puede ejecutar el vaciado.' }, { status: 403 });
      }
      // 2. app_id escrito manualmente debe coincidir
      if (body.app_id !== appId) {
        return Response.json({ error: 'app_id no coincide con la aplicación actual.', expected: appId, received: body.app_id }, { status: 400 });
      }
      // 3. Texto exacto de confirmación
      if (body.confirm_text !== 'VACIAR CLON COMERCIAL') {
        return Response.json({ error: 'Confirmación textual incorrecta. Se requiere exactamente: VACIAR CLON COMERCIAL' }, { status: 400 });
      }
      // 4. Confirmar que no es la app original
      if (body.is_original_app === true || body.confirm_not_original !== true) {
        return Response.json({ error: 'Debe confirmar que esta NO es la aplicación original (confirm_not_original: true).' }, { status: 400 });
      }

      const deleted = {};
      const errors = {};
      for (const name of OPERATIONAL_ENTITIES) {
        try {
          // deleteMany con query amplio: elimina todos los registros de la entidad
          const res = await base44.asServiceRole.entities[name].deleteMany({});
          deleted[name] = 'ok';
        } catch (e) {
          errors[name] = String(e.message || e).slice(0, 150);
        }
      }

      return Response.json({
        mode: 'execute',
        app_id: appId,
        deleted,
        errors,
        message: 'Vaciado completado. Limpieza de claves locales (activeSquadId, activeOrganizationId) debe realizarse en el cliente.'
      });
    }

    return Response.json({ error: 'Modo inválido. Usar "dry_run" o "execute".' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});