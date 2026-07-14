import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, ChevronDown, ChevronUp, Edit2, Trash2, Youtube, Users, FileText, X, Check, Upload, FileSpreadsheet, ExternalLink, Clock, Save, Trophy, SlidersHorizontal } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useWorkspace } from "@/lib/WorkspaceContext";
import moment from "moment";
import "moment/locale/es";

import MatchGpsReport from "@/components/matches/MatchGpsReport.jsx";
import MatchVideoPanel from "@/components/matches/MatchVideoPanel.jsx";
import MatchPlanPdfPanel from "@/components/matches/MatchPlanPdfPanel.jsx";
import MatchSquadPanel from "@/components/matches/MatchSquadPanel.jsx";
import MatchFiltersPanel from "@/components/matches/MatchFiltersPanel.jsx";
import RivalClubSearch from "@/components/clubs/RivalClubSearch";
import { eventPayloadFromMatch, isMatchEvent, matchPayloadFromEvent } from "@/lib/matchCalendarSync";
moment.locale("es");

const DYJ_LOGO = "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/4379a507a_defensa.png";

const CLUB_LOGOS = {
  "aldosivi": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/8996d21df_aldosivi.png",
  "argentinos": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/0e05a002a_argentinos.png",
  "argentinos juniors": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/0e05a002a_argentinos.png",
  "atletico tucuman": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/610e3b50e_atleticotucuman.png",
  "atlético tucumán": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/610e3b50e_atleticotucuman.png",
  "banfield": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/58c2bc7ed_banfield.png",
  "barracas": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/4fcdd62b6_barracas.png",
  "barracas central": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/4fcdd62b6_barracas.png",
  "belgrano": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/67af3c8f1_belgrano.png",
  "boca": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/276a7aa08_boca.png",
  "boca juniors": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/276a7aa08_boca.png",
  "central cordoba": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/e18f29c5d_centralcordoba.png",
  "central córdoba": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/e18f29c5d_centralcordoba.png",
  "defensa": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/4379a507a_defensa.png",
  "defensa y justicia": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/4379a507a_defensa.png",
  "estudiantes": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/3a3706975_estudiantes.png",
  "estudiantes lp": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/3a3706975_estudiantes.png",
  "estudiantes la plata": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/3a3706975_estudiantes.png",
  "estudiantes (lp)": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/075a5dfb0_estudiantes2.png",
  "estudiantes rc": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/82d92e869_estudiantesrc.png",
  "estudiantes rio cuarto": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/82d92e869_estudiantesrc.png",
  "gimnasia": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/6114df84b_gimnasia.png",
  "gimnasia lp": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/6114df84b_gimnasia.png",
  "gimnasia la plata": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/6114df84b_gimnasia.png",
  "gimnasia mendoza": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/9488b9e24_gimnasiamendoza.png",
  "godoy cruz": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/31d31622d_godoycruz.png",
  "huracan": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/933efb702_huracan.png",
  "huracán": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/933efb702_huracan.png",
  "independiente": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/a2a471da7_independiente.png",
  "independiente rivadavia": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/9fabf18c5_independienteriv.png",
  "instituto": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/a9ad926b0_instituto.png",
  "lanus": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/99213e3ca_lanus.png",
  "lanús": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/99213e3ca_lanus.png",
  "newells": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/9050b34cc_newells.png",
  "newell's": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/9050b34cc_newells.png",
  "newell's old boys": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/9050b34cc_newells.png",
  "platense": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/7ff5c5303_platense.png",
  "racing": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/e0d6a6146_racing.png",
  "racing club": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/e0d6a6146_racing.png",
  "riestra": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/d8ac90e42_riestra.png",
  "deportivo riestra": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/d8ac90e42_riestra.png",
  "river": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/7efeaf539_river.png",
  "river plate": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/7efeaf539_river.png",
  "rosario central": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/724bdfba3_rosariocentral.png",
  "san lorenzo": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/2b8112b77_sanlorenzo.png",
  "sarmiento": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/db1e161fb_sarmiento.png",
  "talleres": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/070c306fb_talleres.png",
  "tigre": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/913703796_tigre.png",
  "union": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/16e7a6924_union.png",
  "unión": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/16e7a6924_union.png",
  "union sf": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/16e7a6924_union.png",
  "velez": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/973c619a4_velez.png",
  "vélez": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/973c619a4_velez.png",
  "velez sarsfield": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/973c619a4_velez.png",
  "san martin": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/03e039b58_sanmartinsj.png",
  "san martín": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/03e039b58_sanmartinsj.png",
  "colon": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/c1bb33ec4_colon.png",
  "colón": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/c1bb33ec4_colon.png",
  "ferro": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/bed607ceb_ferro.png",
  "ferro carril oeste": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/bed607ceb_ferro.png",
  "quilmes": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/a2c70d41a_quilmes.png",
  "atletico rafaela": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/a105893ba_atleticorafaela.png",
  "atlético rafaela": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/a105893ba_atleticorafaela.png",
  "estudiantes de rio cuarto": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/82d92e869_estudiantesrc.png",
  "estudiantes de río cuarto": "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/82d92e869_estudiantesrc.png",
};

function normalizeStr(str) {
  return str.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, "");
}

function getLogoForRival(name) {
  if (!name) return null;
  const key = normalizeStr(name);
  // Try normalized keys
  for (const [k, v] of Object.entries(CLUB_LOGOS)) {
    if (normalizeStr(k) === key) return v;
  }
  return null;
}

// ── CSV Panel ─────────────────────────────────────────────────────────────────
function MatchCsvPanel({ match, onCsvSaved }) {
  const [csvUrl, setCsvUrl] = useState(match.csv_url || null);
  const [csvLabel, setCsvLabel] = useState(match.csv_label || null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.MatchReport.update(match.id, { csv_url: file_url, csv_label: file.name });
      setCsvUrl(file_url);
      setCsvLabel(file.name);
      onCsvSaved?.(file_url, file.name);
      toast({ title: "CSV cargado correctamente" });
    } catch {
      toast({ title: "Error al cargar el CSV", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function removeCsv() {
    await base44.entities.MatchReport.update(match.id, { csv_url: null, csv_label: null });
    setCsvUrl(null);
    setCsvLabel(null);
    onCsvSaved?.(null, null);
    toast({ title: "CSV eliminado" });
  }

  return (
    <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-white flex items-center gap-2">
            <FileSpreadsheet size={14} className="text-green-400" /> Datos GPS del partido
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">CSV Catapult del partido</p>
        </div>
        {csvUrl && (
          <div className="flex items-center gap-2">
            <a href={csvUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white p-1.5 rounded hover:bg-zinc-700 transition-colors">
              <ExternalLink size={13} />
            </a>
            <button onClick={removeCsv} className="text-zinc-600 hover:text-red-400 p-1.5 rounded hover:bg-zinc-700 transition-colors">
              <X size={13} />
            </button>
          </div>
        )}
      </div>
      {!csvUrl ? (
        <label className="cursor-pointer block">
          <div className={`flex items-center justify-center gap-2 border border-dashed border-zinc-700 rounded-xl px-4 py-6 text-sm text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
            {uploading ? <div className="w-4 h-4 border border-zinc-500 border-t-white rounded-full animate-spin" /> : <Upload size={16} />}
            {uploading ? "Subiendo..." : "Cargar CSV del partido"}
          </div>
          <input type="file" accept=".csv,.txt" onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      ) : (
        <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
          <FileSpreadsheet size={13} className="text-green-400 shrink-0" />
          <span className="text-xs text-zinc-300 flex-1 truncate">{csvLabel || "Archivo CSV"}</span>
          <label className="cursor-pointer">
            <span className={`text-xs text-zinc-500 hover:text-white transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
              {uploading ? "Subiendo..." : "Reemplazar"}
            </span>
            <input type="file" accept=".csv,.txt" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
      )}
    </div>
  );
}

// ── Logo helpers ──────────────────────────────────────────────────────────────
function ClubLogo({ url, name, size = 10 }) {
  const [err, setErr] = useState(false);
  const sizeClass = { 8: "w-8 h-8", 10: "w-10 h-10", 12: "w-12 h-12", 16: "w-16 h-16" }[size] || "w-10 h-10";
  if (!url || err) {
    return (
      <div className={`${sizeClass} rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0`}>
        <span className="text-[10px] font-bold text-zinc-400">{name?.charAt(0)}</span>
      </div>
    );
  }
  return <img src={url} alt={name} className={`${sizeClass} object-contain shrink-0`} onError={() => setErr(true)} />;
}

function YoutubeEmbed({ url, label }) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|\/v\/|embed\/)([A-Za-z0-9_-]{11})/);
  const id = m?.[1];
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-zinc-400 font-medium">{label}</p>
      {id ? (
        <div className="relative w-full rounded-xl overflow-hidden border border-zinc-700" style={{ paddingBottom: "56.25%" }}>
          <iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube.com/embed/${id}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm underline">
          <Youtube size={14} /> Ver video
        </a>
      )}
    </div>
  );
}

const COMPETITION_LABELS = {
  "Torneo Proyección Apertura 2026": "T.Proyección Apertura 2026",
  "Torneo Proyección Clausura 2026": "T.Proyección Clausura 2026",
  "Campeonato de Reserva": "T.Proyección Apertura 2026",
  "Amistosos": "Amistosos",
};

const DEFAULT_COMPETITION_OPTIONS = [
  "Torneo Proyección Apertura 2026",
  "Torneo Proyección Clausura 2026",
  "Amistosos",
];
const COMPETITION_TAGS_KEY = "matches_competition_tags";
function loadCompetitionTags() {
  try {
    const saved = JSON.parse(localStorage.getItem(COMPETITION_TAGS_KEY) || "[]");
    return saved.length ? saved : DEFAULT_COMPETITION_OPTIONS;
  } catch {
    return DEFAULT_COMPETITION_OPTIONS;
  }
}
function saveCompetitionTags(tags) {
  localStorage.setItem(COMPETITION_TAGS_KEY, JSON.stringify(tags));
}

// ── MatchCard ─────────────────────────────────────────────────────────────────
function MatchCard({ match, players, onEdit, onDelete, onMatchUpdated, squadId, competitions, competitionMap }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [matchData, setMatchData] = useState(match);
  const [editingCompetition, setEditingCompetition] = useState(false);

  useEffect(() => { setMatchData(match); }, [match]);
  const { toast } = useToast();
  const hasResult = match.our_score != null && match.rival_score != null;
  const won = match.our_score > match.rival_score;
  const drew = match.our_score === match.rival_score;
  const competition = competitionMap[matchData.competition_id];
  const competitionName = competition?.short_name || competition?.name || matchData.competition || "Sin competencia";
  const roundLabel = matchData.matchday_number ? `Fecha ${matchData.matchday_number}` : matchData.competition_round;
  const resultLetter = !hasResult ? "" : won ? "V" : drew ? "E" : "D";
  const resultClass = won ? "bg-emerald-500/20 text-emerald-300" : drew ? "bg-zinc-700 text-zinc-200" : "bg-red-500/20 text-red-300";
  const borderClass = won ? "border-l-emerald-500" : drew ? "border-l-zinc-500" : "border-l-red-500";

  async function saveCompetition(value) {
    const selected = competitionMap[value];
    const patch = { competition_id: value || null, competition: selected?.name || "" };
    await base44.entities.MatchReport.update(match.id, patch);
    setMatchData(m => ({ ...m, ...patch }));
    match.competition_id = patch.competition_id;
    match.competition = patch.competition;
    setEditingCompetition(false);
    toast({ title: "Competencia vinculada" });
  }

  const isLocal = match.location === "Local";
  const rivalLogo = match.rival_logo_url || getLogoForRival(match.rival);
  const leftLogo = isLocal ? DYJ_LOGO : rivalLogo;
  const rightLogo = isLocal ? rivalLogo : DYJ_LOGO;
  const leftName = isLocal ? "Defensa y Justicia" : match.rival;
  const rightName = isLocal ? match.rival : "Defensa y Justicia";
  const leftScore = isLocal ? match.our_score : match.rival_score;
  const rightScore = isLocal ? match.rival_score : match.our_score;
  const detailBadges = [
    match.squad_called?.length > 0 ? { label: "🟢 Convocatoria cargada", className: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" } : null,
    match.match_logistics ? { label: "📋 Logística", className: "bg-blue-500/10 border-blue-500/20 text-blue-300" } : null,
    match.squad_called?.length > 0 ? { label: "⏱ Minutos", className: "bg-yellow-500/10 border-yellow-500/20 text-yellow-300" } : null,
    match.csv_url ? { label: "📡 GPS", className: "bg-green-500/10 border-green-500/20 text-green-300" } : null,
    (match.match_video_url || match.match_plan_pdf_url) ? { label: "📹 Plan/Video", className: "bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-300" } : null,
  ].filter(Boolean);

  return (
    <div className={`bg-gradient-to-r from-zinc-900 to-zinc-900/80 border border-zinc-800 border-l-4 ${borderClass} rounded-xl overflow-hidden shadow-lg shadow-black/20`}>
      <div className="grid grid-cols-1 lg:grid-cols-[88px_1fr_100px_1fr_210px_94px] items-stretch cursor-pointer" onClick={() => { sessionStorage.setItem("matches_scroll", String(window.scrollY || 0)); navigate(`/matches/${match.id}?tab=convocados`); }}>
        <div className="bg-black/20 border-b lg:border-b-0 lg:border-r border-zinc-800 p-3 flex lg:flex-col items-center justify-between lg:justify-center gap-2">
          <div className="text-center leading-none">
            <p className="text-2xl font-black text-white tracking-tight">{moment(match.date).format("DD")}</p>
            <p className="text-xs font-bold text-white uppercase mt-1">{moment(match.date).format("MMM")}</p>
            <p className="text-[10px] text-zinc-500 mt-1">{moment(match.date).format("YYYY")}</p>
          </div>
          {roundLabel && <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 whitespace-nowrap">{roundLabel}</span>}
        </div>

        <div className="p-4 flex items-center gap-3 min-w-0">
          <ClubLogo url={leftLogo} name={leftName} size={10} />
          <div className="min-w-0">
            <p className="text-sm font-black text-white uppercase leading-tight truncate">{leftName}</p>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] uppercase tracking-wide text-zinc-500">
              {matchData.squad_name && <span className="flex items-center gap-1"><Users size={11} /> {matchData.squad_name}</span>}
              {roundLabel && <span className="flex items-center gap-1"><Clock size={11} /> {roundLabel}</span>}
              {matchData.location && <span>{matchData.location}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-3 py-4">
          {hasResult ? (
            <div className={`w-24 h-14 rounded-lg px-3 py-2 text-2xl font-black tracking-wide whitespace-nowrap leading-none flex items-center justify-center ${won ? "bg-emerald-500/10 text-emerald-300" : drew ? "bg-zinc-800 text-white" : "bg-red-500/10 text-red-300"}`}>
              {leftScore} - {rightScore}
            </div>
          ) : <div className="text-zinc-600 font-bold">VS</div>}
        </div>

        <div className="p-4 flex items-center gap-3 min-w-0">
          <ClubLogo url={rightLogo} name={rightName} size={10} />
          <div className="min-w-0">
            <p className="text-sm font-black text-white uppercase leading-tight truncate">{rightName}</p>
            {matchData.competition_stage && <p className="text-[10px] text-zinc-500 uppercase mt-2">{matchData.competition_stage}{matchData.group_name ? ` · ${matchData.group_name}` : ""}</p>}
          </div>
        </div>

        <div className="p-4 border-t lg:border-t-0 lg:border-l border-zinc-800/70 flex items-center gap-3 min-w-0">
          {competition?.logo ? <img src={competition.logo} alt={competitionName} className="w-10 h-10 object-contain shrink-0" /> : <div className="w-10 h-10 rounded-lg bg-blue-500/15 border border-blue-400/20 flex items-center justify-center shrink-0"><Trophy size={18} className="text-blue-300" /></div>}
          <div className="min-w-0 flex-1">
            {editingCompetition ? (
              <select autoFocus className="w-full text-xs bg-zinc-800 border border-zinc-600 rounded-lg px-2 py-1 text-white focus:outline-none focus:border-zinc-400" defaultValue={matchData.competition_id || ""} onBlur={() => setEditingCompetition(false)} onChange={e => saveCompetition(e.target.value)} onClick={e => e.stopPropagation()}>
                <option value="">— Sin competencia —</option>
                {competitions.map(o => <option key={o.id} value={o.id}>{o.short_name || o.name}</option>)}
              </select>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); setEditingCompetition(true); }} className="text-left w-full hover:opacity-80">
                <p className="text-xs font-black text-white uppercase leading-tight truncate">{competitionName}</p>
                <p className="text-[10px] text-zinc-500 mt-1">{match.squad_names?.length || 0} jugadores</p>
              </button>
            )}
          </div>
        </div>

        <div className="p-4 flex items-center justify-end gap-2">
          {hasResult && <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black ${resultClass}`}>{resultLetter}</span>}
          <button onClick={e => { e.stopPropagation(); onEdit(match); }} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"><Edit2 size={15} /></button>
          <button onClick={e => { e.stopPropagation(); onDelete(match.id); }} className="p-2 rounded-lg hover:bg-red-900/40 text-zinc-500 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>

        </div>
      </div>

      {detailBadges.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-zinc-800/60 px-4 py-3">
          {detailBadges.map((badge) => (
            <span key={badge.label} className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${badge.className}`}>{badge.label}</span>
          ))}
        </div>
      )}


    </div>
  );
}

// ── MatchForm ─────────────────────────────────────────────────────────────────
const EMPTY = {
  squad_id: "", squad_name: "", season_id: "", calendar_event_id: "", date: "", match_time: "", match_venue: "", rival: "", rival_club_id: "", competition: "", competition_id: "", competition_stage: "", competition_round: "", group_name: "", matchday_number: "", phase_label: "", location: "Local",
  our_score: "", rival_score: "", rival_logo_url: "",
};

function MatchForm({ initial, onSave, onCancel, competitions, squads, activeSquad, activeSeasonId, clubs, onClubCreated }) {
  const [form, setForm] = useState({ ...EMPTY, ...(initial || {}), squad_id: initial?.squad_id || activeSquad?.id || "", squad_name: initial?.squad_name || activeSquad?.name || "", season_id: initial?.season_id || activeSeasonId || "" });
  useEffect(() => {
    setForm({ ...EMPTY, ...(initial || {}), squad_id: initial?.squad_id || activeSquad?.id || "", squad_name: initial?.squad_name || activeSquad?.name || "", season_id: initial?.season_id || activeSeasonId || "" });
  }, [initial, activeSquad?.id, activeSeasonId]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const selectedCompetition = competitions.find((competition) => competition.id === form.competition_id);
  const phases = selectedCompetition?.phase_config || [];
  const groups = selectedCompetition?.groups || [];
  function setCompetition(value) {
    const competition = competitions.find((item) => item.id === value);
    const defaultPhase = competition?.phase_config?.[0]?.name || "";
    setForm((current) => ({ ...current, competition_id: value, competition: competition?.name || "", competition_stage: current.competition_stage || defaultPhase }));
  }


  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-4">
      <p className="text-white font-semibold">{initial?.id ? "Editar partido" : "Nuevo partido"}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Plantel</label>
          <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" value={form.squad_id || ""} onChange={e => {
            const squad = squads.find((item) => item.id === e.target.value);
            setForm((current) => ({ ...current, squad_id: squad?.id || "", squad_name: squad?.name || "", season_id: squad?.season || current.season_id || "" }));
          }}>
            <option value="">Seleccionar plantel</option>
            {squads.map((squad) => <option key={squad.id} value={squad.id}>{squad.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Temporada</label>
          <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" placeholder="2026" value={form.season_id || ""} onChange={e => set("season_id", e.target.value)} />
        </div>
        <div>
          <RivalClubSearch clubs={clubs} value={form.rival} selectedClubId={form.rival_club_id} onCreated={onClubCreated} onSelect={(_, patch) => setForm((current) => ({ ...current, ...patch }))} />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Fecha *</label>
          <input type="date" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" value={form.date} onChange={e => set("date", e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Hora</label>
          <input type="time" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" value={form.match_time || ""} onChange={e => set("match_time", e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Estadio / lugar</label>
          <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" placeholder="Estadio" value={form.match_venue || ""} onChange={e => set("match_venue", e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Competencia</label>
          <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" value={form.competition_id || ""} onChange={e => setCompetition(e.target.value)}>
            <option value="">— Sin competencia —</option>
            {competitions.map(option => <option key={option.id} value={option.id}>{option.short_name || option.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Fase / instancia</label>
          <input list="match-form-phases" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" placeholder="Fase regular" value={form.competition_stage || ""} onChange={e => set("competition_stage", e.target.value)} />
          <datalist id="match-form-phases">{phases.map((phase) => <option key={phase.name} value={phase.name} />)}</datalist>
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Fecha del torneo / jornada</label>
          <input type="number" min="1" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" placeholder="18" value={form.matchday_number || ""} onChange={e => set("matchday_number", e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Grupo / zona</label>
          <input list="match-form-groups" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" placeholder="Grupo A" value={form.group_name || ""} onChange={e => set("group_name", e.target.value)} />
          <datalist id="match-form-groups">{groups.map((group) => <option key={group} value={group} />)}</datalist>
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Etiqueta manual de etapa</label>
          <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" placeholder="Fecha 18 / Ida / Final" value={form.phase_label || ""} onChange={e => set("phase_label", e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Condición</label>
          <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" value={form.location} onChange={e => set("location", e.target.value)}>
            <option>Local</option><option>Visitante</option><option>Neutral</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Goles propios</label>
          <input type="number" min="0" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" placeholder="—" value={form.our_score} onChange={e => set("our_score", e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Goles del rival</label>
          <input type="number" min="0" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" placeholder="—" value={form.rival_score} onChange={e => set("rival_score", e.target.value)} />
        </div>
        {form.rival_logo_url && <div className="col-span-2 flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400"><img src={form.rival_logo_url} alt="Escudo rival" className="h-8 w-8 object-contain" /> Escudo vinculado desde el club rival</div>}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-1"><X size={14} /> Cancelar</button>
        <button onClick={() => onSave(form)} disabled={!form.rival || !form.date || !form.squad_id} className="px-4 py-2 rounded-lg text-sm bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-semibold disabled:opacity-40 transition-colors flex items-center gap-1"><Check size={14} /> Guardar</button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Matches() {
  const { activeSquadId, activeSquad, activeSeasonId, mySquads } = useWorkspace();
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [rivalClubs, setRivalClubs] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newChoiceOpen, setNewChoiceOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, minutesCount }
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState({ squad_id: activeSquadId || "" });
  const { toast } = useToast();

  function handleMatchUpdated(id, data) {
    setMatches(ms => ms.map(m => m.id === id ? { ...m, ...data } : m));
  }

  const competitionMap = useMemo(() => Object.fromEntries(competitions.map((competition) => [competition.id, competition])), [competitions]);
  const availableCalendarMatches = useMemo(() => calendarEvents.filter((event) => isMatchEvent(event) && !event.match_id && !matches.some((match) => match.calendar_event_id === event.id) && (!activeSquadId || event.squad_id === activeSquadId)).sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(0, 20), [calendarEvents, matches, activeSquadId]);
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => key !== "squad_id" && value);
  const visibleMatches = useMemo(() => matches.filter((match) => {
    if ((filters.squad_id || activeSquadId) && match.squad_id !== (filters.squad_id || activeSquadId)) return false;
    if (filters.season_id && match.season_id !== filters.season_id) return false;
    if (filters.competition_id && match.competition_id !== filters.competition_id) return false;
    if (filters.competition_stage && match.competition_stage !== filters.competition_stage) return false;
    if (filters.matchday_number && Number(match.matchday_number) !== Number(filters.matchday_number)) return false;
    if (filters.location && match.location !== filters.location) return false;
    if (filters.rival && !normalizeStr(match.rival || "").includes(normalizeStr(filters.rival))) return false;
    return true;
  }), [matches, filters, activeSquadId]);

  useEffect(() => { setFilters({ squad_id: activeSquadId || "" }); loadAll(); }, [activeSquadId]);
  useEffect(() => {
    const savedScroll = sessionStorage.getItem("matches_scroll");
    if (savedScroll) {
      setTimeout(() => window.scrollTo(0, Number(savedScroll)), 50);
      sessionStorage.removeItem("matches_scroll");
    }
  }, [loading]);

  async function loadAll() {
    setLoading(true);
    const [all, p, competitionRows, clubRows, eventRows] = await Promise.all([
      base44.entities.MatchReport.list("-date", 200),
      base44.entities.Player.list("-created_date", 400),
      base44.entities.Competitions.list("name", 200),
      base44.entities.RivalClub.list("official_name", 500).catch(() => []),
      base44.entities.DayEvent.list("date", 500).catch(() => []),
    ]);
    // Filtrar estrictamente por plantel activo (sin fallback a registros sin squad_id) y ocultar archivados
    const filtered = all.filter(x => (!activeSquadId || x.squad_id === activeSquadId) && x.status !== "archivado");
    setMatches(filtered);
    setPlayers(p.sort((a, b) => (a.jersey_number || a.number || 0) - (b.jersey_number || b.number || 0)));
    setCompetitions(competitionRows.filter((competition) => competition.active !== false));
    setRivalClubs(clubRows);
    setCalendarEvents(eventRows);
    setLoading(false);
  }

  async function save(form) {
    const selectedCompetition = competitions.find((competition) => competition.id === form.competition_id);
    const selectedSquad = mySquads.find((squad) => squad.id === (form.squad_id || activeSquadId)) || activeSquad;
    const matchdayNumber = form.matchday_number !== "" && form.matchday_number !== null && form.matchday_number !== undefined ? Number(form.matchday_number) : null;
    const data = {
      ...form,
      competition: selectedCompetition?.name || form.competition || "",
      squad_id: selectedSquad?.id || activeSquadId || undefined,
      squad_name: selectedSquad?.name || activeSquad?.name || undefined,
      season_id: form.season_id || selectedSquad?.season || activeSeasonId || undefined,
      matchday_number: matchdayNumber,
      competition_round: form.competition_round || (matchdayNumber ? `Fecha ${matchdayNumber}` : ""),
      phase_label: form.phase_label || (matchdayNumber ? `Fecha ${matchdayNumber}` : form.competition_stage || ""),
      our_score: form.our_score !== "" ? Number(form.our_score) : null,
      rival_score: form.rival_score !== "" ? Number(form.rival_score) : null,
      rival_name_backup: form.rival_name_backup || form.rival,
      status: form.rival && form.date && (form.squad_id || selectedSquad?.id) ? "activo" : "borrador",
      sync_source: "matches",
      sync_updated_at: new Date().toISOString(),
    };
    let savedMatch = null;
    if (editing?.id) {
      await base44.entities.MatchReport.update(editing.id, data);
      savedMatch = { ...editing, ...data };
      toast({ title: "Partido actualizado" });
    } else {
      savedMatch = await base44.entities.MatchReport.create(data);
      toast({ title: "Partido guardado" });
    }
    const eventPayload = eventPayloadFromMatch(savedMatch);
    if (savedMatch.calendar_event_id) {
      await base44.entities.DayEvent.update(savedMatch.calendar_event_id, eventPayload).catch(() => null);
    } else {
      const createdEvent = await base44.entities.DayEvent.create(eventPayload);
      await base44.entities.MatchReport.update(savedMatch.id, { calendar_event_id: createdEvent.id });
      await base44.entities.DayEvent.update(createdEvent.id, { match_id: savedMatch.id });
    }
    setShowForm(false);
    setEditing(null);
    loadAll();
  }

  function selectCalendarEvent(event) {
    setEditing({ ...EMPTY, ...matchPayloadFromEvent(event), calendar_event_id: event.id });
    setNewChoiceOpen(false);
    setShowForm(true);
  }

  function createManualMatch() {
    setEditing(null);
    setNewChoiceOpen(false);
    setShowForm(true);
  }

  async function remove(id) {
    const linkedMinutes = await base44.entities.MinutesRecord.filter({ match_id: id }, "-created_date", 500);
    if (linkedMinutes.length === 0) {
      if (!confirm("¿Eliminar este partido?")) return;
      await base44.entities.MatchReport.delete(id);
      toast({ title: "Partido eliminado" });
      loadAll();
      return;
    }
    setDeleteTarget({ id, minutesCount: linkedMinutes.length });
  }

  async function confirmDelete(option) {
    const target = deleteTarget;
    setDeleteTarget(null);
    if (!target || option === "cancel") return;
    if (option === "delete_minutes") {
      const linkedMinutes = await base44.entities.MinutesRecord.filter({ match_id: target.id }, "-created_date", 500);
      await Promise.all(linkedMinutes.map(r => base44.entities.MinutesRecord.delete(r.id)));
      await base44.entities.MatchReport.delete(target.id);
      toast({ title: "Partido y minutos asociados eliminados" });
    } else if (option === "archive") {
      // Se archiva el partido (no se borra) para conservar los minutos como histórico válido
      await base44.entities.MatchReport.update(target.id, { status: "archivado" });
      toast({ title: "Partido archivado, minutos conservados como histórico" });
    }
    loadAll();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Partidos</h1>
          {activeSquad && <p className="text-xs text-zinc-500 mt-0.5">{activeSquad.name} · {visibleMatches.length} partido{visibleMatches.length !== 1 ? "s" : ""}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${showFilters || hasActiveFilters ? "bg-blue-500/15 border-blue-500/30 text-blue-300" : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"}`}
          >
            <SlidersHorizontal size={15} /> {showFilters ? "Ocultar filtros" : "Mostrar filtros"}
          </button>
          <button
            onClick={() => setNewChoiceOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={15} /> Nuevo partido
          </button>
        </div>
      </div>

      {showFilters && (
        <MatchFiltersPanel filters={filters} setFilters={setFilters} activeSquad={activeSquad} activeSeasonId={activeSeasonId} competitions={competitions} matches={matches} />
      )}

      {newChoiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-700 bg-zinc-950 p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div><h2 className="text-lg font-semibold text-white">Nuevo partido</h2><p className="text-sm text-zinc-500">La opción recomendada es usar un partido ya cargado en Calendario.</p></div>
              <button onClick={() => setNewChoiceOpen(false)} className="text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                <p className="mb-3 text-sm font-semibold text-yellow-300">Usar partido del Calendario</p>
                {availableCalendarMatches.length === 0 ? <p className="text-sm text-zinc-500">No hay eventos próximos de tipo Partido sin vincular.</p> : <div className="space-y-2 max-h-72 overflow-y-auto">{availableCalendarMatches.map((event) => <button key={event.id} onClick={() => selectCalendarEvent(event)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-left hover:border-yellow-500/40"><div><p className="text-sm font-semibold text-white">{event.rival || event.title || "Partido"}</p><p className="text-xs text-zinc-500">{moment(event.date).format("DD/MM/YYYY")} · {event.time || event.start_time || "Sin horario"} · {event.competition || "Sin competencia"}</p><p className="text-xs text-zinc-600">{event.squad_name || "Sin plantel"} · {event.home_away || "Sin condición"}</p></div>{event.rival_logo_url && <img src={event.rival_logo_url} alt={event.rival} className="h-10 w-10 object-contain" />}</button>)}</div>}
              </div>
              <button onClick={createManualMatch} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-left text-sm text-zinc-200 hover:bg-zinc-800">Crear partido manualmente</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <MatchForm
          initial={editing}
          onSave={save}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          competitions={competitions}
          squads={mySquads}
          activeSquad={activeSquad}
          activeSeasonId={activeSeasonId}
          clubs={rivalClubs}
          onClubCreated={(club) => setRivalClubs((current) => [...current, club])}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 max-w-sm w-full space-y-3">
            <p className="text-white font-semibold">Este partido tiene minutos asociados</p>
            <p className="text-zinc-400 text-sm">¿Qué querés hacer con los {deleteTarget.minutesCount} registro{deleteTarget.minutesCount !== 1 ? "s" : ""} de minutos vinculados?</p>
            <div className="space-y-2 pt-1">
              <button onClick={() => confirmDelete("delete_minutes")}
                className="w-full text-left px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-sm hover:bg-red-500/25 transition-colors">
                Eliminar partido y eliminar minutos asociados
              </button>
              <button onClick={() => confirmDelete("archive")}
                className="w-full text-left px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors">
                Archivar partido y conservar minutos históricos <span className="text-xs text-zinc-500">(recomendado)</span>
              </button>
              <button onClick={() => confirmDelete("cancel")}
                className="w-full text-left px-3 py-2 rounded-lg text-zinc-500 text-sm hover:text-white transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {visibleMatches.length === 0 && !showForm ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <p className="text-zinc-500 text-sm">No hay partidos registrados para los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleMatches.map(m => (
            <MatchCard key={m.id} match={m} players={players} onEdit={m2 => { setEditing(m2); setShowForm(true); }} onDelete={remove} onMatchUpdated={handleMatchUpdated} squadId={activeSquadId} competitions={competitions} competitionMap={competitionMap} />
          ))}
        </div>
      )}
    </div>
  );
}