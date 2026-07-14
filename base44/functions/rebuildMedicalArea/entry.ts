import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // 1. Eliminar episodios provenientes de la planilla para evitar duplicados históricos
    const sheetEpisodes = await base44.asServiceRole.entities.MedicalEpisode.filter({}, '-created_date', 5000);
    const fromSheet = sheetEpisodes.filter((e) => !!e.source_sheet_row_id);
    let duplicatesRemoved = 0;
    for (const ep of fromSheet) {
      await base44.asServiceRole.entities.MedicalEpisode.delete(ep.id);
      duplicatesRemoved++;
    }

    // 2. Reimportar episodios desde Google Sheets (esto también recalcula MedicalCurrentStatus)
    const syncRes = await base44.functions.invoke('syncMedicalFromSheet', {});
    const syncData = syncRes.data || {};

    // 3. Estado final
    const currentStatuses = await base44.asServiceRole.entities.MedicalCurrentStatus.list('-updated_at', 3000);
    const lesionesActivas = currentStatuses.filter((s) => s.current_status === 'lesionado').length;

    return Response.json({
      success: true,
      filas_leidas: syncData.rows_read || 0,
      episodios_creados: syncData.created || 0,
      episodios_actualizados: syncData.updated || 0,
      jugadores_vinculados: syncData.linked || 0,
      jugadores_sin_vincular: syncData.unlinked || 0,
      lesiones_activas_actuales: lesionesActivas,
      duplicados_eliminados: duplicatesRemoved,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});