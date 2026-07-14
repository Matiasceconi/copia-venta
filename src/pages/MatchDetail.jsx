import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import moment from "moment";
import "moment/locale/es";
import { ArrowLeft, CalendarDays, Clock3, Edit2, MapPin, Save, Shield, Trophy, Users } from "lucide-react";

import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/lib/WorkspaceContext";
import ConvocadosTab from "@/components/matches/tabs/ConvocadosTab";
import FormacionTab from "@/components/matches/tabs/FormacionTab";
import MinutosTab from "@/components/matches/tabs/MinutosTab";
import GpsTab from "@/components/matches/tabs/GpsTab";
import PlanVideoTab from "@/components/matches/tabs/PlanVideoTab";
import LogisticaTab from "@/components/matches/tabs/LogisticaTab";
import { eventPayloadFromMatch } from "@/lib/matchCalendarSync";

moment.locale("es");

const DYJ_LOGO = "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/4379a507a_defensa.png";
const TAB_ALIASES = { plan: "plan-video", "plan-video": "plan-video", convocados: "convocados", formacion: "formacion", formation: "formacion", minutos: "minutos", gps: "gps", logistica: "logistica" };

function formatSpanishDate(date) {
  const value = moment(date).format("dddd DD [de] MMMM [de] YYYY");
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const EMPTY_FORM = {
  squad_id: "",
  squad_name: "",
  season_id: "",
  date: "",
  match_time: "",
  match_venue: "",
  rival: "",
  rival_logo_url: "",
  competition: "",
  competition_id: "",
  competition_stage: "",
  competition_round: "",
  group_name: "",
  matchday_number: "",
  phase_label: "",
  location: "Local",
  our_score: "",
  rival_score: "",

};

function LogoAvatar({ src, alt, club = false }) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className={`flex h-16 w-16 items-center justify-center rounded-full border ${club ? "border-yellow-500/40 bg-yellow-500/10" : "border-zinc-700 bg-zinc-900"}`}>
        <span className={`text-lg font-black uppercase ${club ? "text-yellow-300" : "text-zinc-400"}`}>
          {(alt || "?").trim().charAt(0) || "?"}
        </span>
      </div>
    );
  }

  return <img src={src} alt={alt} className="h-16 w-16 rounded-full object-contain" onError={() => setError(true)} />;
}

function MetaPill({ icon: Icon, children }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-[11px] text-zinc-300">
      <Icon size={12} className="text-zinc-500" />
      <span>{children}</span>
    </div>
  );
}

function MatchEditModal({ open, match, competitions, squads, activeSeasonId, onClose, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !match) return;
    setForm({
      ...EMPTY_FORM,
      ...match,
      matchday_number: match.matchday_number ?? "",
      our_score: match.our_score ?? "",
      rival_score: match.rival_score ?? "",
      season_id: match.season_id || activeSeasonId || "",
    });
  }, [open, match, activeSeasonId]);

  if (!open || !match) return null;

  const selectedCompetition = competitions.find((competition) => competition.id === form.competition_id);
  const phases = selectedCompetition?.phase_config || [];
  const groups = selectedCompetition?.groups || [];

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function handleSave() {
    setSaving(true);
    try {
      const selectedSquad = squads.find((item) => item.id === form.squad_id);
      const selectedCompetitionRow = competitions.find((item) => item.id === form.competition_id);
      const matchdayNumber = form.matchday_number === "" || form.matchday_number == null ? null : Number(form.matchday_number);
      const payload = {
        ...form,
        squad_id: selectedSquad?.id || form.squad_id || null,
        squad_name: selectedSquad?.name || form.squad_name || "",
        season_id: form.season_id || selectedSquad?.season || activeSeasonId || null,
        competition_id: form.competition_id || null,
        competition: selectedCompetitionRow?.name || form.competition || "",
        matchday_number: matchdayNumber,
        competition_round: form.competition_round || (matchdayNumber ? `Fecha ${matchdayNumber}` : ""),
        phase_label: form.phase_label || (matchdayNumber ? `Fecha ${matchdayNumber}` : form.competition_stage || ""),
        our_score: form.our_score === "" ? null : Number(form.our_score),
        rival_score: form.rival_score === "" ? null : Number(form.rival_score),
      };

      await base44.entities.MatchReport.update(match.id, payload);
      const syncMatch = { ...match, ...payload, id: match.id };
      const eventPayload = eventPayloadFromMatch(syncMatch);
      if (syncMatch.calendar_event_id) {
        await base44.entities.DayEvent.update(syncMatch.calendar_event_id, eventPayload).catch(() => null);
      } else {
        const createdEvent = await base44.entities.DayEvent.create(eventPayload);
        await base44.entities.MatchReport.update(match.id, { calendar_event_id: createdEvent.id });
        await base44.entities.DayEvent.update(createdEvent.id, { match_id: match.id });
        payload.calendar_event_id = createdEvent.id;
      }
      onSaved?.(payload);
      toast({ title: "Partido actualizado" });
      onClose?.();
    } catch {
      toast({ title: "No se pudo actualizar el partido", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl shadow-black/40">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-5 py-4 backdrop-blur">
          <div>
            <h2 className="text-lg font-semibold text-white">Editar partido</h2>
            <p className="text-xs text-zinc-500">Actualizá la ficha principal del encuentro.</p>
          </div>
          <button onClick={onClose} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-900 hover:text-white">
            Cerrar
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <Field label="Plantel">
            <select value={form.squad_id || ""} onChange={(e) => {
              const squad = squads.find((item) => item.id === e.target.value);
              setForm((current) => ({ ...current, squad_id: squad?.id || "", squad_name: squad?.name || "" }));
            }} className="input-dark">
              <option value="">Seleccionar plantel</option>
              {squads.map((squad) => <option key={squad.id} value={squad.id}>{squad.name}</option>)}
            </select>
          </Field>
          <Field label="Temporada">
            <input className="input-dark" value={form.season_id || ""} onChange={(e) => setField("season_id", e.target.value)} />
          </Field>
          <Field label="Rival *">
            <input className="input-dark" value={form.rival || ""} onChange={(e) => setField("rival", e.target.value)} />
          </Field>
          <Field label="Fecha *">
            <input type="date" className="input-dark" value={form.date || ""} onChange={(e) => setField("date", e.target.value)} />
          </Field>
          <Field label="Hora">
            <input type="time" className="input-dark" value={form.match_time || ""} onChange={(e) => setField("match_time", e.target.value)} />
          </Field>
          <Field label="Estadio / sede">
            <input className="input-dark" value={form.match_venue || ""} onChange={(e) => setField("match_venue", e.target.value)} />
          </Field>
          <Field label="Condición">
            <select className="input-dark" value={form.location || "Local"} onChange={(e) => setField("location", e.target.value)}>
              <option value="Local">Local</option>
              <option value="Visitante">Visitante</option>
              <option value="Neutral">Neutral</option>
            </select>
          </Field>
          <Field label="Competencia">
            <select className="input-dark" value={form.competition_id || ""} onChange={(e) => {
              const competition = competitions.find((item) => item.id === e.target.value);
              setForm((current) => ({
                ...current,
                competition_id: e.target.value,
                competition: competition?.name || "",
                competition_stage: current.competition_stage || competition?.phase_config?.[0]?.name || "",
              }));
            }}>
              <option value="">Sin competencia</option>
              {competitions.map((competition) => <option key={competition.id} value={competition.id}>{competition.short_name || competition.name}</option>)}
            </select>
          </Field>
          <Field label="Fase / instancia">
            <input list="match-detail-phases" className="input-dark" value={form.competition_stage || ""} onChange={(e) => setField("competition_stage", e.target.value)} />
            <datalist id="match-detail-phases">{phases.map((phase) => <option key={phase.name} value={phase.name} />)}</datalist>
          </Field>
          <Field label="Fecha / jornada">
            <input type="number" min="1" className="input-dark" value={form.matchday_number || ""} onChange={(e) => setField("matchday_number", e.target.value)} />
          </Field>
          <Field label="Grupo / zona">
            <input list="match-detail-groups" className="input-dark" value={form.group_name || ""} onChange={(e) => setField("group_name", e.target.value)} />
            <datalist id="match-detail-groups">{groups.map((group) => <option key={group} value={group} />)}</datalist>
          </Field>
          <Field label="Goles DYJ">
            <input type="number" min="0" className="input-dark" value={form.our_score} onChange={(e) => setField("our_score", e.target.value)} />
          </Field>
          <Field label="Goles rival">
            <input type="number" min="0" className="input-dark" value={form.rival_score} onChange={(e) => setField("rival_score", e.target.value)} />
          </Field>
          <Field label="Etiqueta de fase" className="md:col-span-2">
            <input className="input-dark" value={form.phase_label || ""} onChange={(e) => setField("phase_label", e.target.value)} />
          </Field>

        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-4">
          <button onClick={onClose} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-white">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || !form.rival || !form.date} className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, className = "", children }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-zinc-400">{label}</label>
      {children}
    </div>
  );
}

export default function MatchDetail() {
  const { id: matchId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeSeasonId, mySquads } = useWorkspace();

  const [match, setMatch] = useState(null);
  const [players, setPlayers] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => TAB_ALIASES[new URLSearchParams(window.location.search).get("tab")] || "convocados");
  const [editOpen, setEditOpen] = useState(false);
  const [headerSave, setHeaderSave] = useState({ action: null, disabled: true, pending: false, label: "" });
  const [headerSaving, setHeaderSaving] = useState(false);
  const [callupsVersion, setCallupsVersion] = useState(0);

  const loadMatch = useCallback(async () => {
    setLoading(true);
    try {
      const [matchRows, playersRows, competitionsRows] = await Promise.all([
        base44.entities.MatchReport.filter({ id: matchId }, "-created_date", 1),
        base44.entities.Player.list("-created_date", 400),
        base44.entities.Competitions.list("name", 200),
      ]);

      const loadedMatch = matchRows?.[0] || (await base44.entities.MatchReport.list("-date", 300)).find((item) => item.id === matchId);
      setMatch(loadedMatch || null);
      setPlayers(playersRows || []);
      setCompetitions((competitionsRows || []).filter((competition) => competition.active !== false));
    } catch {
      toast({ title: "No se pudo cargar el partido", variant: "destructive" });
      setMatch(null);
    } finally {
      setLoading(false);
    }
  }, [matchId, toast]);

  useEffect(() => {
    loadMatch();
  }, [loadMatch]);

  const handleMatchUpdated = useCallback((patch) => {
    setMatch((current) => current ? { ...current, ...patch } : current);
  }, []);

  const handleHeaderSave = useCallback(async () => {
    if (!headerSave.action || headerSave.disabled) return;
    setHeaderSaving(true);
    try {
      await headerSave.action();
    } finally {
      setHeaderSaving(false);
    }
  }, [headerSave]);

  function changeTab(tab) {
    setActiveTab(tab);
    const publicTab = tab === "plan-video" ? "plan" : tab;
    navigate(`/matches/${matchId}?tab=${publicTab}`, { replace: true });
  }

  const rivalLogo = match?.rival_logo_url || null;
  const hasResult = match?.our_score != null && match?.rival_score != null;
  const competition = useMemo(() => competitions.find((item) => item.id === match?.competition_id), [competitions, match?.competition_id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate("/matches")} className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white">
          <ArrowLeft size={14} /> Volver al listado
        </button>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <h1 className="text-lg font-semibold text-white">Partido no encontrado</h1>
          <p className="mt-2 text-sm text-zinc-500">El encuentro solicitado no está disponible o ya no existe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-30 -mx-4 border-b border-zinc-800 bg-zinc-950/95 px-4 pb-4 pt-2 backdrop-blur md:mx-0 md:rounded-2xl md:border md:px-5 md:pt-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/90 px-4 py-3 shadow-lg shadow-black/20">
                <div className="flex items-center gap-3">
                  <LogoAvatar src={DYJ_LOGO} alt="Defensa y Justicia" club />
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Defensa y Justicia</p>
                    <p className="text-xl font-black text-white">DYJ</p>
                  </div>
                </div>
                <div className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-1 text-sm font-black tracking-[0.24em] text-yellow-300">VS</div>
                <div className="flex items-center gap-3">
                  <LogoAvatar src={rivalLogo} alt={match.rival || "Rival"} />
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Rival</p>
                    <p className="text-xl font-black text-white">{match.rival || "Sin rival"}</p>
                  </div>
                </div>
              </div>

              {hasResult && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-center">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">Resultado</p>
                  <p className="text-3xl font-black text-white">{match.our_score} - {match.rival_score}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2.5">
              <MetaPill icon={CalendarDays}>{formatSpanishDate(match.date)}</MetaPill>
              {(match.match_time || match.match_logistics) && <MetaPill icon={Clock3}>{match.match_time || "Horario a confirmar"}</MetaPill>}
              {(match.match_venue || match.match_logistics) && <MetaPill icon={MapPin}>{match.match_venue || "Sede a confirmar"}</MetaPill>}
              {match.location && <MetaPill icon={Shield}>{match.location}</MetaPill>}
              {(competition?.short_name || competition?.name || match.competition) && <MetaPill icon={Trophy}>{competition?.short_name || competition?.name || match.competition}</MetaPill>}
              {(match.matchday_number || match.competition_round) && <MetaPill icon={CalendarDays}>{match.matchday_number ? `Fecha ${match.matchday_number}` : match.competition_round}</MetaPill>}
              {match.squad_name && <MetaPill icon={Users}>{match.squad_name}</MetaPill>}
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-2 xl:min-w-[240px]">
            <button onClick={() => setEditOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-200 transition hover:bg-zinc-800 hover:text-white">
              <Edit2 size={14} /> Editar partido
            </button>
            <button onClick={handleHeaderSave} disabled={headerSave.disabled || headerSaving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-yellow-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50">
              <Save size={14} /> {headerSaving ? "Guardando..." : "Guardar"}
            </button>
            <button onClick={() => navigate("/matches")} className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white">
              <ArrowLeft size={14} /> Volver al listado
            </button>
            <div className="px-1 text-right text-[11px] text-zinc-500">
              {headerSave.pending ? `Hay cambios pendientes en ${headerSave.label || "la pestaña activa"}.` : "Los archivos GPS/video se guardan desde cada módulo."}
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={changeTab} className="space-y-4">
        <TabsList className="h-auto flex w-full flex-wrap justify-start gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-2">
          <TabsTrigger value="convocados" className="rounded-xl px-4 py-2 text-sm data-[state=active]:bg-yellow-500 data-[state=active]:text-zinc-950">Convocados</TabsTrigger>
          <TabsTrigger value="formacion" className="rounded-xl px-4 py-2 text-sm data-[state=active]:bg-yellow-500 data-[state=active]:text-zinc-950">Formación del equipo</TabsTrigger>
          <TabsTrigger value="minutos" className="rounded-xl px-4 py-2 text-sm data-[state=active]:bg-yellow-500 data-[state=active]:text-zinc-950">Minutos jugados</TabsTrigger>
          <TabsTrigger value="gps" className="rounded-xl px-4 py-2 text-sm data-[state=active]:bg-yellow-500 data-[state=active]:text-zinc-950">GPS</TabsTrigger>
          <TabsTrigger value="plan-video" className="rounded-xl px-4 py-2 text-sm data-[state=active]:bg-yellow-500 data-[state=active]:text-zinc-950">Plan y video</TabsTrigger>
          <TabsTrigger value="logistica" className="rounded-xl px-4 py-2 text-sm data-[state=active]:bg-yellow-500 data-[state=active]:text-zinc-950">Logística</TabsTrigger>
        </TabsList>

        <TabsContent value="convocados" className="mt-0">
          <ConvocadosTab match={match} players={players} refreshKey={callupsVersion} onMatchUpdated={handleMatchUpdated} onRegisterSave={setHeaderSave} onCallupsUpdated={() => setCallupsVersion((value) => value + 1)} />
        </TabsContent>
        <TabsContent value="formacion" className="mt-0">
          <FormacionTab match={match} players={players} onMatchUpdated={handleMatchUpdated} onRegisterSave={setHeaderSave} onCallupsUpdated={() => setCallupsVersion((value) => value + 1)} />
        </TabsContent>
        <TabsContent value="minutos" className="mt-0">
          <MinutosTab match={match} players={players} onRegisterSave={setHeaderSave} onMatchUpdated={handleMatchUpdated} refreshKey={callupsVersion} />
        </TabsContent>
        <TabsContent value="gps" className="mt-0">
          <GpsTab match={match} onMatchUpdated={handleMatchUpdated} onRegisterSave={setHeaderSave} />
        </TabsContent>
        <TabsContent value="plan-video" className="mt-0">
          <PlanVideoTab match={match} onMatchUpdated={handleMatchUpdated} onRegisterSave={setHeaderSave} />
        </TabsContent>
        <TabsContent value="logistica" className="mt-0">
          <LogisticaTab match={match} onMatchUpdated={handleMatchUpdated} onRegisterSave={setHeaderSave} />
        </TabsContent>
      </Tabs>

      <MatchEditModal
        open={editOpen}
        match={match}
        competitions={competitions}
        squads={mySquads || []}
        activeSeasonId={activeSeasonId}
        onClose={() => setEditOpen(false)}
        onSaved={handleMatchUpdated}
      />

      <style>{`.input-dark{width:100%;border-radius:0.75rem;border:1px solid rgb(63 63 70);background:rgb(24 24 27);padding:0.625rem 0.875rem;font-size:0.875rem;color:white;outline:none}.input-dark:focus{border-color:rgb(250 204 21)}`}</style>
    </div>
  );
}