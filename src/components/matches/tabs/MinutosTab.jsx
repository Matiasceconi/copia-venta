import React, { useEffect, useMemo, useState } from "react";
import moment from "moment";
import { AlertTriangle, Clock3, RefreshCw, Save, ShieldCheck, UserPlus } from "lucide-react";

import { base44 } from "@/api/base44Client";
import TransparentPlayerPhoto from "@/components/player/PlayerPhoto";
import { useToast } from "@/components/ui/use-toast";
import { getPlayerName, getPlayerNumber, loadMatchCallupState } from "@/lib/matchCallupUtils";

function normalizeMinute(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value).trim();
  if (!text) return null;
  const match = text.match(/^(\d+)(?:\s*\+\s*(\d+))?$/);
  if (!match) return NaN;
  return Number(match[1]) + Number(match[2] || 0);
}

function formatMinute(value) {
  return value == null ? "" : String(value);
}

function getTournament(match) {
  const competition = String(match.competition || "");
  if (competition.includes("Apertura")) return "Proyección Apertura";
  if (competition.includes("Clausura")) return "Clausura";
  if (competition.includes("Juvenil")) return "Juveniles";
  if (competition.includes("Amistoso")) return "Amistosos";
  return competition || "Otro";
}

function calcMinutes(entry, duration) {
  const total = Number(duration || 0);
  if (!total) return null;
  const out = normalizeMinute(entry.out_minute);
  if (entry.manual_override) return Math.max(0, Number(entry.manual_minutes || 0));
  if (entry.is_starter) return out == null ? total : Math.max(0, out);
  if (!entry.entered) return 0;
  const start = normalizeMinute(entry.in_minute);
  if (start == null || Number.isNaN(start)) return null;
  const end = out == null ? total : out;
  return Math.max(0, end - start);
}

function calcAutoMinutes(entry, duration) {
  return calcMinutes({ ...entry, manual_override: false }, duration);
}

export default function MinutosTab({ match, players = [], onRegisterSave, onMatchUpdated, refreshKey = 0 }) {
  const { toast } = useToast();
  const [calledPlayers, setCalledPlayers] = useState([]);
  const [entries, setEntries] = useState({});
  const [records, setRecords] = useState([]);
  const [legacyRecords, setLegacyRecords] = useState([]);
  const [duration, setDuration] = useState(String(match.total_duration_minutes || 90));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function loadMinutes() {
    setLoading(true);
    setLoadError("");
    try {
      const [callupState, minuteRows, oldRows] = await Promise.all([
        loadMatchCallupState(match, players),
        base44.entities.MatchPlayerMinutes.filter({ match_id: match.id }, "-created_date", 300).catch(() => []),
        base44.entities.MinutesRecord.filter({ match_id: match.id }, "-created_date", 300).catch(() => []),
      ]);
      const playerMap = callupState.playerMap;
      const callupPlayers = callupState.savedCallups.map((callup) => ({ player: playerMap.get(callup.player_id), callup })).filter((item) => item.player);
      setCalledPlayers(callupPlayers.map((item) => item.player));
      setRecords(minuteRows || []);
      setLegacyRecords(oldRows || []);
      setDuration(String(match.total_duration_minutes || minuteRows?.[0]?.match_duration_minutes || 90));
      const recordsMap = Object.fromEntries((minuteRows || []).map((row) => [row.player_id, row]));
      const legacyMap = Object.fromEntries((oldRows || []).map((row) => [row.player_id, row]));
      const nextEntries = {};
      callupPlayers.forEach(({ player, callup }) => {
        const record = recordsMap[player.id];
        const legacy = legacyMap[player.id];
        const isStarter = record ? !!record.started : legacy ? !!legacy.is_starter : callup.lineup_role === "titular";
        const entered = isStarter ? true : record ? !!record.entered : legacy ? Number(legacy.minutes || 0) > 0 : false;
        nextEntries[player.id] = {
          is_starter: isStarter,
          entered,
          in_minute: isStarter ? "" : (record?.entered_minute_label || (record?.entered_minute != null ? String(record.entered_minute) : legacy?.sub_in_minute != null ? String(legacy.sub_in_minute) : "")),
          out_minute: record?.exit_minute_label || (record?.exit_minute != null ? String(record.exit_minute) : ""),
          manual_override: !!record?.manual_override,
          manual_minutes: record?.manual_override ? record.minutes_played : record?.minutes_played ?? legacy?.minutes ?? 0,
          manual_reason: record?.manual_reason || "",
        };
      });
      setEntries(nextEntries);
      setDirty(false);
    } catch (error) {
      setLoadError(error.message || "No se pudieron cargar los minutos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadMinutes(); }, [match.id, refreshKey]);

  const totalDuration = Number(duration || 0);
  const starterCount = useMemo(() => Object.values(entries).filter((entry) => entry.is_starter).length, [entries]);
  const rows = useMemo(() => calledPlayers.map((player) => {
    const entry = entries[player.id] || { is_starter: false, entered: false, in_minute: "", out_minute: "", manual_override: false, manual_minutes: 0, manual_reason: "" };
    const minutes = calcMinutes(entry, totalDuration);
    const calculated = calcAutoMinutes(entry, totalDuration);
    const category = entry.is_starter ? "titulares" : entry.entered ? "suplentesConIngreso" : "suplentesSinMinutos";
    return { player, entry, minutes, calculated, category };
  }), [calledPlayers, entries, totalDuration]);

  const enteredSubs = rows.filter((row) => !row.entry.is_starter && row.entry.entered).length;
  const noEntrySubs = rows.filter((row) => !row.entry.is_starter && !row.entry.entered).length;
  const validation = useMemo(() => validateRows(rows, totalDuration, starterCount), [rows, totalDuration, starterCount]);
  const statusText = validation.errors.length === 0 && totalDuration > 0 ? "Minutos completos" : "Pendientes";

  useEffect(() => {
    onRegisterSave?.({ action: saveAll, disabled: !dirty || saving, pending: dirty, label: "minutos" });
  }, [dirty, onRegisterSave, saving, rows, duration]);

  function patchEntry(playerId, patch) {
    setEntries((current) => ({ ...current, [playerId]: { ...(current[playerId] || {}), ...patch } }));
    setDirty(true);
  }

  function changeDuration(value) {
    setDuration(value);
    setDirty(true);
  }

  function toggleStarter(playerId, value) {
    if (value && !entries[playerId]?.is_starter && starterCount >= 11) return toast({ title: "No puede haber más de 11 titulares", variant: "destructive" });
    patchEntry(playerId, { is_starter: value, entered: value ? true : entries[playerId]?.entered ?? false, in_minute: value ? "" : entries[playerId]?.in_minute || "" });
  }

  function setFullDurationToStarters() {
    const next = { ...entries };
    calledPlayers.forEach((player) => {
      if (next[player.id]?.is_starter && !next[player.id]?.out_minute) next[player.id] = { ...next[player.id], manual_override: false, manual_minutes: totalDuration };
    });
    setEntries(next);
    setDirty(true);
  }

  function markSubsWithoutEntry() {
    const next = { ...entries };
    calledPlayers.forEach((player) => { if (!next[player.id]?.is_starter) next[player.id] = { ...next[player.id], entered: false, in_minute: "", out_minute: "", manual_override: false, manual_minutes: 0, manual_reason: "" }; });
    setEntries(next);
    setDirty(true);
  }

  async function saveAll() {
    const currentValidation = validateRows(rows, totalDuration, starterCount);
    if (!totalDuration || totalDuration <= 0) return toast({ title: "Cargá la duración total del partido", variant: "destructive" });
    if (currentValidation.errors.length > 0) return toast({ title: currentValidation.errors[0], variant: "destructive" });
    setSaving(true);
    try {
      const existingByPlayer = records.reduce((acc, row) => ({ ...acc, [row.player_id]: [...(acc[row.player_id] || []), row] }), {});
      const legacyByPlayer = legacyRecords.reduce((acc, row) => ({ ...acc, [row.player_id]: [...(acc[row.player_id] || []), row] }), {});
      const matchLabel = `vs ${match.rival} ${moment(match.date).format("DD/MM/YY")}`;
      const tournament = getTournament(match);
      const durationPatch = {
        total_duration_minutes: totalDuration,
        duration_source: "manual",
        duration_confirmed_at: new Date().toISOString(),
        duration_review_status: "Duración manual",
      };
      await base44.entities.MatchReport.update(match.id, durationPatch);
      onMatchUpdated?.(durationPatch);
      for (const row of rows) {
        const enteredMinute = row.entry.is_starter ? null : normalizeMinute(row.entry.in_minute);
        const exitMinute = normalizeMinute(row.entry.out_minute);
        const minutesPlayed = row.minutes == null ? 0 : Math.max(0, Number(row.minutes));
        const basePayload = {
          player_id: row.player.id,
          player_name: getPlayerName(row.player),
          player_number: Number(getPlayerNumber(row.player)) || null,
          match_id: match.id,
          match_player_key: `${match.id}:${row.player.id}`,
          squad_id: match.squad_id || null,
          season_id: match.season_id || null,
          competition_id: match.competition_id || null,
          competition: match.competition || "",
          tournament,
          match_label: matchLabel,
          match_date: match.date,
          rival: match.rival,
          lineup_role: row.entry.is_starter ? "titular" : "suplente",
          started: !!row.entry.is_starter,
          entered: row.entry.is_starter ? true : !!row.entry.entered,
          entered_minute: Number.isNaN(enteredMinute) ? null : enteredMinute,
          entered_minute_label: row.entry.is_starter ? "" : row.entry.in_minute || "",
          exit_minute: Number.isNaN(exitMinute) ? null : exitMinute,
          exit_minute_label: row.entry.out_minute || "",
          match_duration_minutes: totalDuration,
          minutes_calculated: row.calculated == null ? 0 : Math.max(0, Number(row.calculated)),
          minutes_played: minutesPlayed,
          manual_override: !!row.entry.manual_override,
          manual_reason: row.entry.manual_reason || "",
          updated_at: new Date().toISOString(),
        };
        const existingRows = existingByPlayer[row.player.id] || [];
        if (existingRows.length > 0) {
          await base44.entities.MatchPlayerMinutes.update(existingRows[0].id, basePayload);
          await Promise.all(existingRows.slice(1).map((duplicate) => base44.entities.MatchPlayerMinutes.delete(duplicate.id)));
        } else await base44.entities.MatchPlayerMinutes.create(basePayload);

        const legacyPayload = { player_id: basePayload.player_id, player_name: basePayload.player_name, player_number: basePayload.player_number, match_id: match.id, match_label: matchLabel, match_date: match.date, rival: match.rival, minutes: minutesPlayed, is_starter: basePayload.started, sub_in_minute: basePayload.entered_minute, tournament, squad_id: match.squad_id || null, competition_id: match.competition_id || null };
        const legacyRows = legacyByPlayer[row.player.id] || [];
        if (legacyRows.length > 0) {
          await base44.entities.MinutesRecord.update(legacyRows[0].id, legacyPayload);
          await Promise.all(legacyRows.slice(1).map((duplicate) => base44.entities.MinutesRecord.delete(duplicate.id)));
        } else await base44.entities.MinutesRecord.create(legacyPayload);
      }
      const [refreshed, refreshedLegacy] = await Promise.all([
        base44.entities.MatchPlayerMinutes.filter({ match_id: match.id }, "-created_date", 300),
        base44.entities.MinutesRecord.filter({ match_id: match.id }, "-created_date", 300),
      ]);
      setRecords(refreshed || []);
      setLegacyRecords(refreshedLegacy || []);
      setDirty(false);
      toast({ title: "Minutos guardados correctamente" });
    } catch (error) {
      toast({ title: error.message || "No se pudieron guardar los minutos", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <StateCard title="Cargando convocatoria…" spinner />;
  if (loadError) return <StateCard title="No se pudo cargar la convocatoria" description={loadError} action={<button onClick={loadMinutes} className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-zinc-950"><RefreshCw size={14} className="mr-1 inline" /> Reintentar</button>} />;
  if (calledPlayers.length === 0) return <StateCard title="Sin convocados" description="Primero cargá la convocatoria del partido para poder registrar los minutos jugados." />;

  const sections = [
    { key: "titulares", title: "Titulares", badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", items: rows.filter((row) => row.category === "titulares") },
    { key: "suplentesConIngreso", title: "Suplentes que ingresaron", badge: "bg-blue-500/15 text-blue-300 border-blue-500/30", items: rows.filter((row) => row.category === "suplentesConIngreso") },
    { key: "suplentesSinMinutos", title: "Suplentes sin minutos", badge: "bg-zinc-800 text-zinc-300 border-zinc-700", items: rows.filter((row) => row.category === "suplentesSinMinutos") },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Clock3 size={16} className="text-yellow-400" /> Minutos jugados</h2>
            <label className="block max-w-xs space-y-1 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
              <span className="text-xs font-semibold text-yellow-200">Duración total del partido</span>
              <div className="flex items-center gap-2"><input type="number" min="1" value={duration} onChange={(e) => changeDuration(e.target.value)} className="w-24 rounded-lg border border-yellow-500/40 bg-zinc-950 px-3 py-2 text-lg font-black text-white outline-none focus:border-yellow-300" /><span className="text-sm text-yellow-100">minutos</span></div>
              <span className="text-[11px] text-yellow-100/80">Ingresá la duración real del partido, incluyendo el tiempo agregado.</span>
            </label>
          </div>
          <div className="flex flex-wrap gap-2"><button onClick={setFullDurationToStarters} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 transition hover:bg-emerald-500/20"><ShieldCheck size={13} className="mr-1 inline" /> Duración completa a titulares</button><button onClick={markSubsWithoutEntry} className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-300 transition hover:bg-blue-500/20"><UserPlus size={13} className="mr-1 inline" /> Marcar suplentes sin ingreso</button><button onClick={saveAll} disabled={!dirty || saving} className="rounded-lg bg-yellow-500 px-3 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"><Save size={13} className="mr-1 inline" /> {saving ? "Guardando..." : "Guardar todo"}</button></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500"><span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1">{calledPlayers.length} convocados</span><span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1">{starterCount} titulares</span><span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1">{enteredSubs} suplentes ingresaron</span><span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1">{noEntrySubs} no ingresaron</span><span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1">Estado: {statusText}</span></div>
        {validation.errors.length > 0 && <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"><AlertTriangle size={14} className="mr-1 inline" /> {validation.errors[0]}</div>}
      </div>
      {sections.map((section) => <div key={section.key} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><h3 className="text-sm font-semibold text-white">{section.title}</h3><span className={`rounded-full border px-2 py-1 text-[11px] ${section.badge}`}>{section.items.length}</span></div></div><div className="space-y-3">{section.items.length === 0 && <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-4 py-6 text-center text-sm text-zinc-500">Sin jugadores en esta categoría.</div>}{section.items.map(({ player, entry, minutes, calculated }) => <MinuteRow key={player.id} player={player} entry={entry} minutes={minutes} calculated={calculated} toggleStarter={toggleStarter} patchEntry={patchEntry} totalDuration={totalDuration} />)}</div></div>)}
    </div>
  );
}

function validateRows(rows, duration, starterCount) {
  const errors = [];
  if (starterCount > 11) errors.push("No puede haber más de 11 titulares.");
  rows.forEach(({ player, entry, minutes }) => {
    const name = getPlayerName(player);
    const input = entry.is_starter ? null : normalizeMinute(entry.in_minute);
    const output = normalizeMinute(entry.out_minute);
    if (!entry.is_starter && entry.entered && (input == null || Number.isNaN(input))) errors.push(`${name}: cargá un minuto de ingreso válido.`);
    if (Number.isNaN(output)) errors.push(`${name}: cargá un minuto de salida válido.`);
    if (input != null && !Number.isNaN(input) && input > duration) errors.push(`${name}: el minuto de ingreso supera la duración total.`);
    if (output != null && !Number.isNaN(output) && output > duration) errors.push(`${name}: el minuto de salida supera la duración total.`);
    if (input != null && output != null && !Number.isNaN(input) && !Number.isNaN(output) && output < input) errors.push(`${name}: la salida no puede ser anterior al ingreso.`);
    if (minutes != null && minutes < 0) errors.push(`${name}: los minutos no pueden ser negativos.`);
  });
  return { errors };
}

function StateCard({ title, description, action, spinner }) {
  return <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">{spinner && <div className="mx-auto mb-3 h-6 w-6 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />}<h2 className="text-lg font-semibold text-white">{title}</h2>{description && <p className="mt-2 text-sm text-zinc-500">{description}</p>}{action && <div className="mt-4">{action}</div>}</div>;
}

function MinuteRow({ player, entry, minutes, calculated, toggleStarter, patchEntry }) {
  const manualOpen = !!entry.manual_override;
  return <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"><div className="flex flex-col gap-4 xl:flex-row xl:items-start"><div className="flex min-w-0 flex-1 items-center gap-3"><TransparentPlayerPhoto player={player} className="h-12 w-12 rounded-full border border-zinc-700 object-cover" fallbackClassName="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800" textClassName="text-sm font-bold text-zinc-400" /><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold text-white">{getPlayerName(player)}</p><span className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300">#{getPlayerNumber(player)}</span></div><p className="text-xs text-zinc-500">{player.position || "Sin posición"}</p></div></div><div className={`grid flex-1 grid-cols-1 gap-3 md:grid-cols-2 ${entry.is_starter ? "xl:grid-cols-4" : "xl:grid-cols-6"}`}><label className="space-y-1"><span className="text-[11px] uppercase tracking-wide text-zinc-500">Rol</span><select value={entry.is_starter ? "starter" : "sub"} onChange={(e) => toggleStarter(player.id, e.target.value === "starter")} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-yellow-500"><option value="starter">Titular</option><option value="sub">Suplente</option></select></label>{!entry.is_starter && <label className="space-y-1"><span className="text-[11px] uppercase tracking-wide text-zinc-500">Ingresó</span><select value={entry.entered ? "si" : "no"} onChange={(e) => patchEntry(player.id, { entered: e.target.value === "si", in_minute: e.target.value === "si" ? entry.in_minute : "", out_minute: e.target.value === "si" ? entry.out_minute : "", manual_override: false })} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-yellow-500"><option value="si">Sí</option><option value="no">No</option></select></label>}{!entry.is_starter && <label className="space-y-1"><span className="text-[11px] uppercase tracking-wide text-zinc-500">Min. ingreso</span><input value={formatMinute(entry.in_minute)} onChange={(e) => patchEntry(player.id, { in_minute: e.target.value, entered: true })} disabled={!entry.entered} placeholder="60 o 45+2" className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-yellow-500 disabled:opacity-60" /></label>}<label className="space-y-1"><span className="text-[11px] uppercase tracking-wide text-zinc-500">Min. salida</span><input value={formatMinute(entry.out_minute)} onChange={(e) => patchEntry(player.id, { out_minute: e.target.value })} disabled={!entry.is_starter && !entry.entered} placeholder="75 o 90+5" className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-yellow-500 disabled:opacity-60" /></label><label className="space-y-1"><span className="text-[11px] uppercase tracking-wide text-zinc-500">Minutos jugados</span><div className="flex h-[42px] items-center rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-semibold text-white">{minutes == null ? "Pendiente" : `${minutes}'`}</div></label><div className="space-y-1"><span className="text-[11px] uppercase tracking-wide text-zinc-500">Corrección manual</span>{!manualOpen ? <button onClick={() => patchEntry(player.id, { manual_override: true, manual_minutes: minutes ?? calculated ?? 0 })} className="h-[42px] w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-left text-xs text-zinc-300 hover:bg-zinc-800">Editar minutos manualmente</button> : <div className="space-y-2"><input type="number" min="0" value={entry.manual_minutes ?? 0} onChange={(e) => patchEntry(player.id, { manual_minutes: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-yellow-500" /><input value={entry.manual_reason || ""} onChange={(e) => patchEntry(player.id, { manual_reason: e.target.value })} placeholder="Motivo opcional" className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-yellow-500" /><button onClick={() => patchEntry(player.id, { manual_override: false, manual_reason: "" })} className="text-xs text-zinc-500 hover:text-white">Quitar corrección</button></div>}</div></div></div>{entry.manual_override && <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs text-orange-300"><AlertTriangle size={13} /> Corregido manualmente · calculado: {calculated ?? 0}'</div>}</div>;
}