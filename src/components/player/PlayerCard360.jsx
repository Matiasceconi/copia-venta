import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { usePlayerCard360 } from "@/components/player/PlayerCard360Context";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";
import "moment/locale/es";
import {
  User, Shield, Activity, Zap, Heart, Award, Paperclip, Apple,
  BarChart2, CheckCircle, TrendingUp, Timer, History as HistoryIcon,
} from "lucide-react";

import PlayerCard360Header, { resolveBadge } from "@/components/player/PlayerCard360Header";
import PlayerSummaryCards from "@/components/player/PlayerSummaryCards";
import PlayerGPSProfileTab from "@/components/player/PlayerGPSProfileTab";
import PlayerResumen360Tab from "@/components/player/tabs/PlayerResumen360Tab";
import PlayerDatosPersonalesTab from "@/components/player/tabs/PlayerDatosPersonalesTab";
import PlayerGPSTab from "@/components/player/tabs/PlayerGPSTab";
import PlayerSessionsTab from "@/components/player/tabs/PlayerSessionsTab";
import PlayerMatchesTab from "@/components/player/tabs/PlayerMatchesTab";
import PlayerMinutesTab from "@/components/player/tabs/PlayerMinutesTab";
import PlayerMedicalTab from "@/components/player/tabs/PlayerMedicalTab";
import PlayerNutritionTab from "@/components/player/tabs/PlayerNutritionTab";
import PlayerHistoryTab from "@/components/player/tabs/PlayerHistoryTab";
import { getValidMinuteRecords } from "@/lib/minutesUtils";

moment.locale("es");

function EmptyState({ text = "Sin registros" }) {
  return <div className="text-center py-10 text-zinc-600 text-sm">{text}</div>;
}
function Spinner() {
  return <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" /></div>;
}

const TABS = [
  { id: "resumen",      label: "Resumen",        icon: CheckCircle },
  { id: "datos",        label: "Datos personales", icon: User },
  { id: "carga_externa",label: "Carga Externa",   icon: Zap },
  { id: "sesiones",     label: "Sesiones",        icon: Activity },
  { id: "partidos",     label: "Partidos",        icon: BarChart2 },
  { id: "minutos",      label: "Minutos",         icon: Timer },
  { id: "medico",       label: "Área médica",     icon: Heart },
  { id: "nutricion",    label: "Nutrición",       icon: Apple },
  { id: "wellness",     label: "Wellness",        icon: CheckCircle },
  { id: "evaluaciones", label: "Evaluaciones",    icon: Award },
  { id: "planteles",    label: "Planteles",       icon: Shield },
  { id: "archivos",     label: "Archivos",        icon: Paperclip },
  { id: "historial",    label: "Historial",       icon: HistoryIcon },
];

export default function PlayerCard360() {
  const { playerId, playerData: preloaded, closeCard } = usePlayerCard360();
  const { can, canAccessSquad, squads, userAccess, activeSquadId } = useWorkspace();
  const navigate = useNavigate();
  const canEdit = can("edit");
  const reservaSquad = squads.find(s => (s.name || "").trim().toLowerCase() === "reserva");
  const canUploadPhoto = canEdit || (reservaSquad && canAccessSquad(reservaSquad.id));
  const { toast } = useToast();

  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("resumen");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Core (loaded eagerly on open)
  const [activeMembership, setActiveMembership] = useState(null);
  const [dayStatus, setDayStatus] = useState(null);
  const [todaysAttendance, setTodaysAttendance] = useState(null);
  const [lastSession, setLastSession] = useState(null);
  const [nextSession, setNextSession] = useState(null);
  const [nextMatch, setNextMatch] = useState(null);
  const [gpsProfile, setGpsProfile] = useState(null);

  // Tab data
  const [memberships, setMemberships] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionPlayers, setSessionPlayers] = useState([]);
  const [gpsData, setGpsData] = useState([]);
  const [minutes, setMinutes] = useState([]);
  const [medical, setMedical] = useState([]);
  const [nutrition, setNutrition] = useState([]);
  const [matchReports, setMatchReports] = useState([]);
  const [loadedTabs, setLoadedTabs] = useState(new Set());
  const [tabLoading, setTabLoading] = useState(false);

  // ── Core load on open ─────────────────────────────────────────────────
  const loadCore = useCallback(async (id) => {
    const today = moment().format("YYYY-MM-DD");
    const [
      membershipsArr, dayStatusArr, medicalArr, nutritionArr, minutesArr, gpsArr, gpsProfileArr,
      sessionPlayersArr, todaysSessions, allSessions, allMatches,
    ] = await Promise.all([
      base44.entities.SquadMembership.filter({ player_id: id, status: "activo" }, "-effective_from", 1),
      base44.entities.DailySquadStatus.filter({ player_id: id, date: today }, "-created_date", 1),
      base44.entities.MedicalRecord.filter({ player_id: id }, "-injury_date", 30),
      base44.entities.NutritionAssessment.filter({ player_id: id }, "-fecha", 100),
      base44.entities.MinutesRecord.filter({ player_id: id }, "-match_date", 100),
      base44.entities.SessionGPSData.filter({ player_id: id }, "-created_date", 200),
      base44.entities.PlayerGPSProfile.filter({ player_id: id }, "-created_date", 1),
      base44.entities.SessionPlayer.filter({ player_id: id }, "-created_date", 100),
      base44.entities.TrainingSession.filter({ date: today }, "-created_date", 20),
      base44.entities.TrainingSession.list("date", 1000),
      base44.entities.MatchReport.list("date", 300),
    ]);

    const membership = membershipsArr[0] || null;
    setActiveMembership(membership);
    setDayStatus(dayStatusArr[0] || null);
    setMedical(medicalArr);
    setNutrition(nutritionArr);
    setMinutes(minutesArr);
    setGpsData(gpsArr);
    setGpsProfile(gpsProfileArr[0] || null);
    setSessionPlayers(sessionPlayersArr);
    setMatchReports(allMatches);

    const todaysSessionIds = new Set(todaysSessions.map(s => s.id));
    const todaysSp = sessionPlayersArr.find(sp => todaysSessionIds.has(sp.session_id));
    setTodaysAttendance(todaysSp?.attendance || null);

    const sessionMap = {};
    allSessions.forEach(s => { sessionMap[s.id] = s; });
    const attendedSessionIds = [...new Set(sessionPlayersArr.map(sp => sp.session_id))];
    const attendedSessions = attendedSessionIds.map(sid => sessionMap[sid]).filter(Boolean);
    setSessions(attendedSessions);

    const pastAttended = attendedSessions.filter(s => s.date <= today).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    setLastSession(pastAttended[0] || null);

    const futureSessions = allSessions.filter(s => s.date >= today && (!membership || s.squad_id === membership.squad_id));
    setNextSession(futureSessions[0] || null);

    const futureMatches = allMatches
      .filter(m => m.date >= today && (m.squad_called || []).includes(id))
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    setNextMatch(futureMatches[0] || null);
  }, []);

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    setActiveTab("resumen");
    setLoadedTabs(new Set());
    const finish = (p) => {
      setPlayer(p);
      setEditForm(p);
      loadCore(playerId).then(() => setLoading(false));
    };
    if (preloaded?.id === playerId) finish(preloaded);
    else base44.entities.Player.get(playerId).then(finish);
  }, [playerId, loadCore]);

  const loadTabData = useCallback(async (tab, pid) => {
    const id = pid || playerId;
    if (!id || loadedTabs.has(tab)) return;
    setTabLoading(true);

    if (tab === "planteles") {
      const mb = await base44.entities.SquadMembership.filter({ player_id: id }, "-effective_from", 50);
      setMemberships(mb);
    } else if (tab === "historial" && memberships.length === 0) {
      const mb = await base44.entities.SquadMembership.filter({ player_id: id }, "-effective_from", 50);
      setMemberships(mb);
    }

    setLoadedTabs(prev => new Set([...prev, tab]));
    setTabLoading(false);
  }, [playerId, loadedTabs, memberships.length]);

  function handleTabChange(tab) {
    setActiveTab(tab);
    loadTabData(tab);
  }

  async function handleSave() {
    setSaving(true);
    const updated = await base44.entities.Player.update(player.id, editForm);
    setPlayer(updated);
    setEditing(false);
    setSaving(false);
    toast({ title: "Jugador actualizado" });
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const updated = await base44.entities.Player.update(player.id, { photo_url: file_url });
    setPlayer(updated);
    setEditForm(f => ({ ...f, photo_url: file_url }));
    toast({ title: "Foto actualizada" });
  }

  function handleOpenSession(sessionId) {
    closeCard();
    navigate(`/sessions?session=${sessionId}`);
  }
  function handleOpenMatches() {
    closeCard();
    navigate(`/matches`);
  }

  if (!playerId) return null;

  if (loading) return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  );

  if (!player) return null;

  const badge = resolveBadge(dayStatus, todaysAttendance, player);
  const activeInjury = medical.find(m => ["Activa", "activa", "En tratamiento"].includes(m.status)) || null;

  // Solo se consideran válidos los minutos vinculados a un partido real, activo (no archivado),
  // del plantel activo y con minutes > 0 (los convocados con 0 minutos no cuentan como partido jugado)
  const validMinutes = getValidMinuteRecords(minutes, matchReports, { squadId: activeSquadId });
  const orphanMinutesCount = minutes.length - validMinutes.length;
  const totalMinutes = validMinutes.reduce((s, r) => s + (r.minutes || 0), 0);

  let weeklyLoadLabel = "Sin datos";
  if (gpsProfile?.weekly_avg > 0) {
    if (gpsProfile.load_7d > gpsProfile.weekly_avg * 1.15) weeklyLoadLabel = "Alta";
    else if (gpsProfile.load_7d < gpsProfile.weekly_avg * 0.85) weeklyLoadLabel = "Baja";
    else weeklyLoadLabel = "Normal";
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-start justify-center p-3 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl my-4">

        <PlayerCard360Header
          player={player}
          editing={editing}
          editForm={editForm}
          setEditForm={setEditForm}
          canEdit={canEdit}
          canUploadPhoto={canUploadPhoto}
          onEdit={() => setEditing(true)}
          onCancelEdit={() => { setEditing(false); setEditForm(player); }}
          onSave={handleSave}
          saving={saving}
          onPhotoUpload={handlePhotoUpload}
          onClose={closeCard}
          activeMembership={activeMembership}
          badge={badge}
        />

        {!editing && (
          <div className="px-4">
            <PlayerSummaryCards
              lastSession={lastSession}
              lastMatch={validMinutes[0]}
              totalMinutes={totalMinutes}
              activeInjury={activeInjury}
              weeklyLoadLabel={weeklyLoadLabel}
              lastGps={gpsData[0]}
              nextMatch={nextMatch}
              onNavigate={handleTabChange}
            />
          </div>
        )}

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="flex border-b border-zinc-800 overflow-x-auto shrink-0 mt-4">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => handleTabChange(id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition-all whitespace-nowrap shrink-0 ${
                activeTab === id ? "border-white text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}>
              <Icon size={11} /> {label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ────────────────────────────────────────────────── */}
        <div className="p-5 min-h-64">
          {tabLoading && <Spinner />}
          {!tabLoading && (
            <>
              {activeTab === "resumen" && (
                <PlayerResumen360Tab
                  badge={badge}
                  lastSession={lastSession}
                  lastMatch={validMinutes[0]}
                  weeklyLoadLabel={weeklyLoadLabel}
                  activeInjury={activeInjury}
                  lastGps={gpsData[0]}
                  nextSession={nextSession}
                  nextMatch={nextMatch}
                />
              )}
              {activeTab === "datos" && (
                <PlayerDatosPersonalesTab player={player} activeMembership={activeMembership} dayStatus={dayStatus} />
              )}
              {activeTab === "carga_externa" && (
                <div className="space-y-6">
                  <PlayerGPSProfileTab playerId={player.id} />
                  <div className="border-t border-zinc-800 pt-5">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-3">Registros GPS</p>
                    <PlayerGPSTab gpsData={gpsData} />
                  </div>
                </div>
              )}
              {activeTab === "sesiones" && (
                <PlayerSessionsTab sessions={sessions} sessionPlayers={sessionPlayers} gpsData={gpsData} onOpenSession={handleOpenSession} />
              )}
              {activeTab === "partidos" && (
                <PlayerMatchesTab minutes={validMinutes} matchReports={matchReports} onOpenMatches={handleOpenMatches} />
              )}
              {activeTab === "minutos" && <PlayerMinutesTab minutes={validMinutes} orphanCount={orphanMinutesCount} />}
              {activeTab === "medico" && <PlayerMedicalTab medical={medical} userRole={userAccess?.role} />}
              {activeTab === "nutricion" && <PlayerNutritionTab assessments={nutrition} />}
              {activeTab === "wellness" && (
                <div className="text-center py-12">
                  <p className="text-zinc-500 text-sm">Módulo Wellness próximamente</p>
                  <p className="text-zinc-600 text-xs mt-1">Sueño · Fatiga · Dolor muscular · Estrés · Ánimo</p>
                </div>
              )}
              {activeTab === "evaluaciones" && (
                <div className="text-center py-12">
                  <p className="text-zinc-500 text-sm">Módulo de Evaluaciones próximamente</p>
                  <p className="text-zinc-600 text-xs mt-1">CMJ · VALD · Antropometría · Fuerza · Historial</p>
                </div>
              )}
              {activeTab === "planteles" && (
                memberships.length === 0 ? <EmptyState /> : (
                  <div className="space-y-4">
                    {memberships.filter(m => m.status === "activo").length > 0 && (
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Plantel actual</p>
                        {memberships.filter(m => m.status === "activo").map(m => (
                          <div key={m.id} className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                            <p className="text-white font-semibold">{m.squad_name}</p>
                            <p className="text-xs text-zinc-500 mt-1">Desde {moment(m.effective_from).format("DD/MM/YYYY")} {m.reason ? `· ${m.reason}` : ""}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {memberships.filter(m => m.status !== "activo").length > 0 && (
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Historial de planteles</p>
                        <div className="space-y-2">
                          {memberships.filter(m => m.status !== "activo").map(m => (
                            <div key={m.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm text-white">{m.squad_name}</p>
                                <p className="text-xs text-zinc-500">{moment(m.effective_from).format("DD/MM/YYYY")} → {m.effective_to ? moment(m.effective_to).format("DD/MM/YYYY") : "vigente"}</p>
                              </div>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 shrink-0">{m.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}
              {activeTab === "archivos" && (
                !player.photo_url && !player.video_url ? <EmptyState text="Sin archivos vinculados" /> : (
                  <div className="space-y-3">
                    {player.photo_url && (
                      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Foto de perfil</p>
                        <img src={player.photo_url} alt={player.full_name} className="w-20 h-20 rounded-xl object-cover" />
                      </div>
                    )}
                    {player.video_url && (
                      <a href={player.video_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-600 transition-colors">
                        <Paperclip size={14} className="text-zinc-500 shrink-0" />
                        <span className="text-sm text-blue-400 truncate">{player.video_url}</span>
                      </a>
                    )}
                  </div>
                )
              )}
              {activeTab === "historial" && (
                <PlayerHistoryTab memberships={memberships} medical={medical} minutes={validMinutes} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}