import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const [library, sessions] = await Promise.all([
      base44.asServiceRole.entities.StrengthExerciseLibrary.list('-created_date', 3000),
      base44.asServiceRole.entities.TrainingSession.list('-created_date', 3000),
    ]);

    const validSessionIds = new Set(sessions.map(s => s.id));

    const orphanIds = library
      .filter(ex => ex.created_from_session_id && !validSessionIds.has(ex.created_from_session_id))
      .map(ex => ex.id);

    for (const id of orphanIds) {
      await base44.asServiceRole.entities.StrengthExerciseLibrary.delete(id);
    }

    return Response.json({
      summary: `${orphanIds.length} ejercicios huérfanos eliminados de la Biblioteca de Fuerza`,
      deleted_count: orphanIds.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});