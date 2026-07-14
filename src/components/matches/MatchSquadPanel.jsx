import React, { useState, useEffect } from "react";
import { Clock, Save, X, Edit2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";
import TransparentPlayerPhoto from "@/components/player/PlayerPhoto";

function PlayerPhoto({ player }) {
  return (
    <TransparentPlayerPhoto
      player={player}
      className="w-8 h-8 rounded-full object-cover border border-zinc-700 shrink-0"
      fallbackClassName="w-8 h-8 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center shrink-0"
      textClassName="text-xs font-bold text-zinc-400"
    />
  );
}

function getTournament(match) {
  const comp = match.competition || "";
  if (comp.includes("Apertura")) return "Proyección Apertura";
  if (comp.includes("Clausura")) return "Clausura";
  if (comp === "Amistosos") return "Amistosos";
  return "Proyección Apertura";
}

// ── Vista de lectura: Titulares / Suplentes ingresados / Suplentes sin ingresar ──
function ReadRow({ player, right, hasGps }) {
  return (
    <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-zinc-700/20 transition-colors">
      <PlayerPhoto player={player} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{player?.full_name || "Jugador"}</p>
        <p className="text-xs text-zinc-500 truncate">{player?.position || ""}</p>
      </div>
      {!hasGps && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-500 shrink-0">Sin GPS cargado</span>
      )}
      {right}
    </div>
  );
}

function ReadOnlyView({ starters, subsIn, subsNotIn, hasGps }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">Titulares ({starters.length})</p>
        <div className="space-y-0.5">
          {starters.length === 0 && <p className="text-zinc-600 text-xs py-1.5">Sin titulares cargados</p>}
          {starters.map(({ player, record }) => (
            <ReadRow key={player?.id || record.id} player={player} hasGps={hasGps}
              right={
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-zinc-500 font-mono w-6 text-center">{player?.jersey_number || player?.number || "—"}</span>
                  <span className="text-sm text-white font-semibold w-12 text-right">{record.minutes ?? 0}'</span>
                </div>
              } />
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">Suplentes que ingresaron ({subsIn.length})</p>
        <div className="space-y-0.5">
          {subsIn.length === 0 && <p className="text-zinc-600 text-xs py-1.5">Ninguno</p>}
          {subsIn.map(({ player, record }) => (
            <ReadRow key={player?.id || record.id} player={player} hasGps={hasGps}
              right={
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-teal-400">min. {record.sub_in_minute ?? "—"}'</span>
                  <span className="text-sm text-white font-semibold w-12 text-right">{record.minutes ?? 0}'</span>
                </div>
              } />
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">Suplentes sin ingresar ({subsNotIn.length})</p>
        <div className="space-y-0.5">
          {subsNotIn.length === 0 && <p className="text-zinc-600 text-xs py-1.5">Ninguno</p>}
          {subsNotIn.map(({ player, record }) => (
            <ReadRow key={player?.id || record.id} player={player} hasGps={hasGps}
              right={
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700/50 text-zinc-400 border border-zinc-600">No ingresó</span>
                  <span className="text-sm text-zinc-500 w-8 text-right">0'</span>
                </div>
              } />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MatchSquadPanel({ match, players, onMatchUpdated, squadId }) {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [minutesMap, setMinutesMap] = useState({}); // player_id -> { minutes, is_starter, sub_in_minute }
  const [existingRecords, setExistingRecords] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [squadIds, setSquadIds] = useState(match.squad_called || []);
  const [showAddPanel, setShowAddPanel] = useState(false);

  const convocados = players.filter(p => squadIds.includes(p.id));
  const available = players.filter(p => !squadIds.includes(p.id));
  const hasGps = !!match.csv_url;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const records = await base44.entities.MinutesRecord.filter({ match_id: match.id }, "-created_date", 200);
        setExistingRecords(records);
        const map = {};
        records.forEach(r => {
          if (r.player_id && !(r.player_id in map)) {
            // Registros antiguos no tienen el campo is_starter guardado (undefined).
            // Para esos, se infiere titular si jugó más de 45 minutos.
            const hasExplicitStarter = Object.prototype.hasOwnProperty.call(r, "is_starter") && r.is_starter !== null && r.is_starter !== undefined;
            const isStarter = hasExplicitStarter ? !!r.is_starter : (r.minutes || 0) > 45;
            map[r.player_id] = {
              minutes: r.minutes ?? "",
              is_starter: isStarter,
              sub_in_minute: r.sub_in_minute ?? "",
            };
          }
        });
        setMinutesMap(map);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [match.id, match.date]);

  function toggleSquadPlayer(player) {
    const already = squadIds.includes(player.id);
    setSquadIds(ids => already ? ids.filter(id => id !== player.id) : [...ids, player.id]);
  }

  function updateField(playerId, field, value) {
    setMinutesMap(m => ({ ...m, [playerId]: { ...(m[playerId] || {}), [field]: value } }));
  }

  async function saveAll() {
    setSaving(true);
    try {
      const matchLabel = `vs ${match.rival} ${moment(match.date).format("DD/MM/YY")}`;
      const tournament = getTournament(match);
      const existingMap = {};
      existingRecords.forEach(r => { if (r.player_id && !(r.player_id in existingMap)) existingMap[r.player_id] = r; });
      const duplicates = existingRecords.filter(r => r.player_id && existingMap[r.player_id]?.id !== r.id);
      for (const dup of duplicates) {
        await base44.entities.MinutesRecord.delete(dup.id);
      }

      for (const player of convocados) {
        const entry = minutesMap[player.id] || {};
        const existing = existingMap[player.id];
        const minutesVal = entry.minutes !== "" && entry.minutes !== undefined ? Number(entry.minutes) : 0;
        const isStarter = !!entry.is_starter;
        const subInMinute = !isStarter && minutesVal > 0 && entry.sub_in_minute !== "" && entry.sub_in_minute !== undefined
          ? Number(entry.sub_in_minute) : null;
        const payload = {
          minutes: minutesVal,
          is_starter: isStarter,
          sub_in_minute: subInMinute,
          tournament,
          match_id: match.id,
          squad_id: squadId,
          competition_id: match.competition_id || null,
        };
        if (existing) {
          await base44.entities.MinutesRecord.update(existing.id, payload);
        } else {
          await base44.entities.MinutesRecord.create({
            player_id: player.id,
            player_name: player.full_name,
            player_number: player.jersey_number || player.number,
            match_label: matchLabel,
            match_date: match.date,
            rival: match.rival,
            ...payload,
          });
        }
      }

      const newNames = convocados.map(p => p.full_name || p.name);
      await base44.entities.MatchReport.update(match.id, { squad_called: squadIds, squad_names: newNames });
      onMatchUpdated?.(match.id, { squad_called: squadIds, squad_names: newNames });

      toast({ title: "Cambios guardados correctamente" });
      setEditMode(false);
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4 flex justify-center">
      <div className="w-4 h-4 border border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  );

  // Agrupar para vista de lectura
  const grouped = convocados.map(player => ({
    player,
    record: {
      minutes: minutesMap[player.id]?.minutes || 0,
      is_starter: minutesMap[player.id]?.is_starter,
      sub_in_minute: minutesMap[player.id]?.sub_in_minute,
      id: player.id,
    },
  }));
  const starters = grouped.filter(g => g.record.is_starter);
  const subsIn = grouped.filter(g => !g.record.is_starter && Number(g.record.minutes) > 0);
  const subsNotIn = grouped.filter(g => !g.record.is_starter && !(Number(g.record.minutes) > 0));

  return (
    <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <Clock size={14} className="text-yellow-400" /> Convocados ({convocados.length})
        </p>
        {editMode ? (
          <div className="flex items-center gap-2">
            <button onClick={() => setEditMode(false)} className="text-xs text-zinc-500 hover:text-white transition-colors px-2 py-1.5">
              Cancelar
            </button>
            <button
              onClick={saveAll}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? <div className="w-3 h-3 border border-yellow-400 border-t-transparent rounded-full animate-spin" /> : <Save size={12} />}
              Guardar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-700/50 border border-zinc-600 text-zinc-300 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <Edit2 size={12} /> Editar
          </button>
        )}
      </div>

      {!editMode ? (
        <ReadOnlyView starters={starters} subsIn={subsIn} subsNotIn={subsNotIn} hasGps={hasGps} />
      ) : (
        <>
          <div className="space-y-1.5 max-h-96 overflow-y-auto mb-3">
            {convocados.map(player => {
              const entry = minutesMap[player.id] || {};
              const isStarter = !!entry.is_starter;
              const minutesVal = Number(entry.minutes) || 0;
              return (
                <div key={player.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-700/30 transition-colors group flex-wrap">
                  <PlayerPhoto player={player} />
                  <span className="text-xs text-zinc-400 font-mono w-5 text-center shrink-0">{player.jersey_number || player.number || "—"}</span>
                  <span className="text-sm text-white flex-1 min-w-[100px] truncate">{player.full_name}</span>
                  <span className="text-xs text-zinc-500 shrink-0">{player.position?.split(" ")[0] || ""}</span>
                  <label className="flex items-center gap-1 text-[11px] text-zinc-400 shrink-0 cursor-pointer">
                    <input type="checkbox" checked={isStarter} onChange={e => updateField(player.id, "is_starter", e.target.checked)} />
                    Titular
                  </label>
                  {!isStarter && minutesVal > 0 && (
                    <input
                      type="number" min="0" max="120" placeholder="min. ingr."
                      value={entry.sub_in_minute ?? ""}
                      onChange={e => updateField(player.id, "sub_in_minute", e.target.value)}
                      title="Minuto de ingreso"
                      className="w-16 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-teal-500/50 shrink-0"
                    />
                  )}
                  <input
                    type="number" min="0" max="120" placeholder="min"
                    value={entry.minutes ?? ""}
                    onChange={e => updateField(player.id, "minutes", e.target.value)}
                    className="w-16 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-yellow-500/50 shrink-0"
                  />
                  <button
                    onClick={() => toggleSquadPlayer(player)}
                    title="Quitar de convocados"
                    className="p-1 rounded text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>

          {convocados.length === 0 && (
            <p className="text-zinc-500 text-sm text-center mb-3">Sin convocados</p>
          )}

          <div>
            <button
              onClick={() => setShowAddPanel(!showAddPanel)}
              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
            >
              {showAddPanel ? "▼" : "▶"} {showAddPanel ? "Cerrar" : "+ Agregar jugador"}
            </button>
            {showAddPanel && (
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto border-t border-zinc-800 pt-2">
                {available.length === 0 ? (
                  <p className="text-xs text-zinc-600 py-2">Todos los jugadores están convocados</p>
                ) : (
                  available.map(p => (
                    <button
                      key={p.id}
                      onClick={() => toggleSquadPlayer(p)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-700/30 transition-colors text-left"
                    >
                      <span className="font-mono w-5 text-center shrink-0">{p.jersey_number || p.number || "—"}</span>
                      <span className="flex-1 truncate">{p.full_name || p.name}</span>
                      <span className="text-zinc-600">{p.position?.split(" ")[0] || ""}</span>
                      <span className="text-zinc-600">+</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}