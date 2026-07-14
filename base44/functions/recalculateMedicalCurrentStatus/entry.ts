import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const STATUS_PRIORITY = ['lesionado', 'en_recuperacion', 'kinesiologia', 'consulta'];

const PLAYER_STATUS_MAP = {
  lesionado: 'Lesionado',
  en_recuperacion: 'En recuperación',
  alta: 'Disponible',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const episodes = await base44.asServiceRole.entities.MedicalEpisode.filter({ linked: true }, '-fecha_inicio_tto', 5000);

    const byPlayer = {};
    episodes.forEach((e) => {
      if (!e.player_id) return;
      if (!byPlayer[e.player_id]) byPlayer[e.player_id] = [];
      byPlayer[e.player_id].push(e);
    });

    const existingStatuses = await base44.asServiceRole.entities.MedicalCurrentStatus.list('-updated_at', 3000);
    const statusByPlayer = {};
    existingStatuses.forEach((s) => { statusByPlayer[s.player_id] = s; });

    let lesionadosCount = 0;
    let seguimientoCount = 0;
    let upserted = 0;

    for (const [playerId, eps] of Object.entries(byPlayer)) {
      const sorted = [...eps].sort((a, b) => (b.fecha_inicio_tto || '').localeCompare(a.fecha_inicio_tto || ''));
      const active = sorted.filter((e) => !e.fecha_final_tto && e.medical_status !== 'alta');

      let currentStatus = 'alta';
      let activeEpisode = null;
      for (const key of STATUS_PRIORITY) {
        const found = active.find((e) => e.medical_status === key);
        if (found) {
          currentStatus = key === 'consulta' ? 'seguimiento' : key;
          activeEpisode = found;
          break;
        }
      }
      if (!activeEpisode && active.length > 0) {
        currentStatus = 'seguimiento';
        activeEpisode = active[0];
      }
      if (!activeEpisode) {
        currentStatus = 'alta';
        activeEpisode = sorted[0] || null;
      }

      if (currentStatus === 'lesionado') lesionadosCount++;
      if (currentStatus === 'en_recuperacion' || currentStatus === 'seguimiento') seguimientoCount++;

      const payload = {
        player_id: playerId,
        current_status: currentStatus,
        active_episode_id: activeEpisode ? activeEpisode.id : '',
        updated_at: new Date().toISOString(),
      };

      const existing = statusByPlayer[playerId];
      if (existing) {
        await base44.asServiceRole.entities.MedicalCurrentStatus.update(existing.id, payload);
      } else {
        await base44.asServiceRole.entities.MedicalCurrentStatus.create(payload);
      }
      upserted++;

      const playerStatusUpdate = PLAYER_STATUS_MAP[currentStatus];
      if (playerStatusUpdate) {
        await base44.asServiceRole.entities.Player.update(playerId, { status: playerStatusUpdate });
      }
    }

    return Response.json({
      success: true,
      players_processed: upserted,
      lesionados_actuales: lesionadosCount,
      en_seguimiento: seguimientoCount,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});