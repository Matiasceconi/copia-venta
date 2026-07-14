import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Plus, Trash2, AlertCircle, User, Activity, Zap, MapPin, Home, FileText, Calendar, Shield, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import moment from "moment";
import "moment/locale/es";
moment.locale("es");

const medicalStatuses = ["Lesionado", "En recuperación", "Seguimiento", "Alta médica"];

const TABS = [
  { id: "consolidado", label: "Vista consolidada", icon: User },
  { id: "rendimiento", label: "Rendimiento", icon: Activity },
  { id: "carga", label: "Carga externa", icon: Zap },
];

const statusColors = {
  "Lesionado": "bg-red-500/20 text-red-300 border-red-500/30",
  "En recuperación": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "Seguimiento": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Alta médica": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

function StatCard({ label, value, sub, color = "text-white" }) {
  return (
    <div className="bg-zinc-800/60 rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value ?? "—"}</p>
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function InfoRow({ label, value, icon: Icon }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-zinc-800/60 last:border-0">
      {Icon && <Icon size={15} className="text-zinc-600 mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="text-sm text-white font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// Tab: Vista Consolidada (Info + GPS resumen)
function TabConsolidado({ player, medicalRecords, loadingRecords, gpsRecords, loadingGps, showMedicalForm, setShowMedicalForm, medicalForm, setMedicalForm, handleAddMedical, deleteMedical, selectedMedicalRecords, toggleSelectMedical, deleteMultipleMedical, showDeleteConfirm, setShowDeleteConfirm }) {
  const age = player.birth_date ? moment().diff(moment(player.birth_date), "years") : null;
  const avgGps = (field) => {
    const vals = gpsRecords.filter(r => r[field] > 0).map(r => r[field]);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };

  return (
    <div className="space-y-6">
      {/* 2-col grid: Info personal + Métricas GPS */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Columna izquierda: Info personal */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Datos personales</h3>
            <div className="bg-zinc-800/30 rounded-xl px-4 divide-y divide-zinc-800/60">
              <InfoRow label="Edad" value={age !== null ? `${age} años` : null} icon={Calendar} />
              <InfoRow label="Fecha de nacimiento" value={player.birth_date ? moment(player.birth_date).format("DD/MM/YYYY") : null} icon={Calendar} />
              <InfoRow label="DNI / Documento" value={player.document_number} icon={FileText} />
              <InfoRow label="Lugar de nacimiento" value={player.birth_place} icon={MapPin} />
              <InfoRow label="Residencia actual" value={player.current_residence} icon={Home} />
              <InfoRow label="Pierna hábil" value={player.dominant_foot} icon={Activity} />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Datos del club</h3>
            <div className="bg-zinc-800/30 rounded-xl px-4 divide-y divide-zinc-800/60">
              <InfoRow label="Categoría" value={player.category} icon={Shield} />
              <InfoRow label="División" value={player.division} icon={Shield} />
              <InfoRow label="Período de temporada" value={player.season_period} icon={Calendar} />
              <InfoRow label="Pensión del club" value={player.club_housing ? "Sí" : "No"} icon={Home} />
              <InfoRow label="Contrato" value={player.has_contract ? "Sí" : "No"} icon={FileText} />
            </div>
          </div>
        </div>

        {/* Columna derecha: Resumen GPS */}
        {loadingGps ? (
          <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" /></div>
        ) : gpsRecords.length === 0 ? (
          <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-6 text-center">
            <Zap size={24} className="text-zinc-700 mx-auto mb-2" />
            <p className="text-zinc-500 text-sm">Sin registros GPS</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">GPS — Promedios últimos 30 días</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Dist. total prom." value={avgGps("total_distance") ? `${(avgGps("total_distance") / 1000).toFixed(2)} km` : "—"} color="text-blue-400" />
              <StatCard label="Vel. máx. prom." value={avgGps("max_velocity") ? `${avgGps("max_velocity")} km/h` : "—"} color="text-orange-400" />
              <StatCard label="HSR prom." value={avgGps("distance_hsr") ? `${Math.round(avgGps("distance_hsr"))} m` : "—"} color="text-purple-400" />
              <StatCard label="Player Load prom." value={avgGps("player_load") ?? "—"} color="text-emerald-400" />
            </div>
          </div>
        )}
      </div>

      {/* Historial médico */}
       <div className="lg:col-span-2">
         <div className="flex items-center justify-between mb-3">
           <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
             <AlertCircle size={13} className="text-red-400" /> Historial médico
           </h3>
           <div className="flex items-center gap-2">
             {selectedMedicalRecords.size > 0 && (
               <button
                 onClick={() => setShowDeleteConfirm(true)}
                 className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-lg transition-colors font-medium"
               >
                 <Trash2 size={13} />
                 Eliminar {selectedMedicalRecords.size}
               </button>
             )}
             <button
               onClick={() => setShowMedicalForm(!showMedicalForm)}
               className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded-lg transition-colors font-medium"
             >
               <Plus size={13} /> Nuevo
             </button>
           </div>
         </div>

        {showMedicalForm && (
          <form onSubmit={handleAddMedical} className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 mb-4 space-y-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Diagnóstico *</label>
              <Input value={medicalForm.diagnosis} onChange={(e) => setMedicalForm((f) => ({ ...f, diagnosis: e.target.value }))} placeholder="Ej: Desgarro muscular" required className="bg-zinc-900 border-zinc-600 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Fecha de lesión</label>
                <Input type="date" value={medicalForm.injury_date} onChange={(e) => setMedicalForm((f) => ({ ...f, injury_date: e.target.value }))} className="bg-zinc-900 border-zinc-600 text-white" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Retorno estimado</label>
                <Input type="date" value={medicalForm.expected_return} onChange={(e) => setMedicalForm((f) => ({ ...f, expected_return: e.target.value }))} className="bg-zinc-900 border-zinc-600 text-white" />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Estado</label>
              <Select value={medicalForm.status} onValueChange={(v) => setMedicalForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger className="bg-zinc-900 border-zinc-600 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {medicalStatuses.map((s) => <SelectItem key={s} value={s} className="text-white">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Notas</label>
              <Textarea value={medicalForm.notes} onChange={(e) => setMedicalForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="bg-zinc-900 border-zinc-600 text-white resize-none" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm">Guardar</Button>
              <Button type="button" onClick={() => setShowMedicalForm(false)} className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white text-sm">Cancelar</Button>
            </div>
          </form>
        )}

        {loadingRecords ? (
          <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" /></div>
        ) : medicalRecords.length === 0 ? (
          <div className="bg-zinc-800/30 border border-zinc-800 rounded-lg p-5 text-center">
            <p className="text-zinc-500 text-sm">Sin registros médicos</p>
          </div>
        ) : (
           <div className="space-y-2">
             {medicalRecords.map((record) => (
               <div key={record.id} className={`border rounded-lg p-3 flex items-start gap-3 ${statusColors[record.status] || "bg-zinc-800/50 border-zinc-700"}`}>
                 <Checkbox 
                   checked={selectedMedicalRecords.has(record.id)}
                   onCheckedChange={() => toggleSelectMedical(record.id)}
                   className="shrink-0 mt-0.5"
                 />
                 <div className="flex-1 min-w-0">
                   <p className="font-semibold text-sm">{record.diagnosis}</p>
                   <p className="text-xs opacity-75 mt-0.5">{record.injury_date ? moment(record.injury_date).format("DD/MM/YYYY") : "Fecha no registrada"}</p>
                   {record.expected_return && <p className="text-xs opacity-75">Retorno: {moment(record.expected_return).format("DD/MM/YYYY")}</p>}
                   {record.notes && <p className="text-xs opacity-60 italic mt-1">"{record.notes}"</p>}
                 </div>
                 <button onClick={() => deleteMedical(record.id)} className="p-1.5 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors shrink-0">
                   <Trash2 size={13} />
                 </button>
               </div>
             ))}
           </div>
         )}
      </div>
    </div>
  );
}

// Tab: Rendimiento
function TabRendimiento({ player }) {
  const [minutesRecords, setMinutesRecords] = useState([]);
  const [gpsRecords, setGpsRecords] = useState([]); // CatapultReport (sesiones)
  const [matchGpsRecords, setMatchGpsRecords] = useState([]); // CatapultReport de partidos
  const [gpsSource, setGpsSource] = useState("all"); // "all" | "sessions" | "matches"
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [mins, catapult, matchReports] = await Promise.all([
          base44.entities.MinutesRecord.filter({ player_id: player.id }, "-match_date", 50),
          base44.entities.CatapultReport.filter({ player_id: player.id }, "-date", 300),
          base44.entities.MatchReport.list("-date", 100),
        ]);
        setMinutesRecords(mins);

        // Classify by session_id: if session_id matches a MatchReport.id → partido, else → entrenamiento
        const matchIdSet = new Set(matchReports.map(m => m.id));

        // Deduplicate by session_id (keep one record per session/match per player)
        const dedupedBySession = {};
        catapult.forEach(r => {
          if (!r.session_id) return;
          if (!dedupedBySession[r.session_id] || new Date(r.updated_date) > new Date(dedupedBySession[r.session_id].updated_date)) {
            dedupedBySession[r.session_id] = r;
          }
        });
        const allGps = Object.values(dedupedBySession).sort((a, b) => new Date(b.date) - new Date(a.date));

        const matchGps = allGps.filter(r => matchIdSet.has(r.session_id));
        const sessionGps = allGps.filter(r => !matchIdSet.has(r.session_id));

        setMatchGpsRecords(matchGps);
        setGpsRecords(sessionGps);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [player.id]);

  if (loading) return <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" /></div>;

  const totalMinutes = minutesRecords.reduce((s, r) => s + (r.minutes || 0), 0);
  const matchesPlayed = minutesRecords.filter(r => (r.minutes || 0) > 0).length;
  const avgMinutes = matchesPlayed ? Math.round(totalMinutes / matchesPlayed) : 0;

  // Combined GPS for averages based on filter
  const activeGps = gpsSource === "all"
    ? [...gpsRecords, ...matchGpsRecords]
    : gpsSource === "sessions" ? gpsRecords : matchGpsRecords;

  const avgGps = (field) => {
    const vals = activeGps.filter(r => r[field] != null && r[field] > 0).map(r => r[field]);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };

  const minutesChartData = [...minutesRecords].reverse().slice(-10).map(r => ({
    label: r.rival ? r.rival.slice(0, 6) : moment(r.match_date).format("DD/MM"),
    min: r.minutes || 0,
  }));

  const gpsChartData = [...activeGps].slice(0, 10).reverse().map(r => ({
    label: moment(r.date).format("DD/MM"),
    dist: Math.round((r.total_distance || 0) / 1000 * 10) / 10,
    isMatch: matchGpsRecords.some(m => m.date === r.date),
  }));

  const totalSessionsWithGps = gpsRecords.length;
  const totalMatchesWithGps = matchGpsRecords.length;

  return (
    <div className="space-y-6">
      {/* Minutos */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Minutos oficiales</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <StatCard label="Total minutos" value={totalMinutes} color="text-yellow-400" />
          <StatCard label="Partidos jugados" value={matchesPlayed} color="text-blue-400" />
          <StatCard label="Prom. por partido" value={avgMinutes ? `${avgMinutes}'` : "—"} color="text-white" />
        </div>
        {minutesChartData.length > 0 ? (
          <div className="bg-zinc-800/40 rounded-xl p-3">
            <p className="text-xs text-zinc-500 mb-3">Últimos partidos (minutos)</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={minutesChartData} barSize={20}>
                <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide domain={[0, 90]} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }} labelStyle={{ color: "#fff" }} itemStyle={{ color: "#facc15" }} formatter={(v) => [`${v}'`, "Minutos"]} />
                <Bar dataKey="min" fill="#facc15" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-zinc-600 text-sm text-center py-4">Sin registros de minutos</p>
        )}
      </div>

      {/* GPS resumen — fuente unificada: CatapultReport (sesiones + partidos) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">GPS — Promedios generales</h3>
          <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-0.5">
            {[
              { id: "all", label: `Todo (${totalSessionsWithGps + totalMatchesWithGps})` },
              { id: "sessions", label: `Sesiones (${totalSessionsWithGps})` },
              { id: "matches", label: `Partidos (${totalMatchesWithGps})` },
            ].map(opt => (
              <button key={opt.id} onClick={() => setGpsSource(opt.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${gpsSource === opt.id ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {activeGps.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-6">Sin registros GPS</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatCard label="Dist. total prom." value={avgGps("total_distance") ? `${(avgGps("total_distance") / 1000).toFixed(2)} km` : "—"} color="text-blue-400" />
              <StatCard label="Vel. máx. prom." value={avgGps("max_velocity") ? `${avgGps("max_velocity")} km/h` : "—"} color="text-orange-400" />
              <StatCard label="HSR prom." value={avgGps("distance_hsr") ? `${Math.round(avgGps("distance_hsr"))} m` : "—"} color="text-purple-400" />
              <StatCard label="Player Load prom." value={avgGps("player_load") ?? "—"} color="text-emerald-400" />
            </div>
            <div className="bg-zinc-800/40 rounded-xl p-3">
              <p className="text-xs text-zinc-500 mb-3">Distancia total por sesión/partido (km)</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={gpsChartData} barSize={18}>
                  <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }} labelStyle={{ color: "#fff" }} formatter={(v, name, props) => [`${v} km`, props?.payload?.isMatch ? "Partido" : "Sesión"]} />
                  <Bar dataKey="dist" radius={[3, 3, 0, 0]}>
                    {gpsChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.isMatch ? "#f97316" : "#60a5fa"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Tab: Carga Externa GPS — filtrado por player_id en CatapultReport
function TabCarga({ player }) {
  const [catapultReports, setCatapultReports] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [reports, sessList] = await Promise.all([
          base44.entities.CatapultReport.filter({ player_id: player.id }, "-date", 200),
          base44.entities.TrainingSession.list("-date", 200),
        ]);
        // Deduplicar por session_id
        const deduped = {};
        reports.forEach(r => {
          if (!r.session_id) return;
          if (!deduped[r.session_id] || new Date(r.updated_date) > new Date(deduped[r.session_id].updated_date)) {
            deduped[r.session_id] = r;
          }
        });
        setCatapultReports(Object.values(deduped));
        setSessions(sessList);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [player.id]);

  if (loading) return <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" /></div>;

  const sessionIdsWithData = new Set(catapultReports.map(r => r.session_id).filter(Boolean));
  const sessionsWithCsv = sessions.filter(s => s.csv_url);

  const sessionsByYearMonth = {};
  sessionsWithCsv.forEach(s => {
    const yr = moment(s.date).format("YYYY");
    const mo = moment(s.date).format("MMM").toUpperCase();
    const key = `${yr}__${mo}`;
    if (!sessionsByYearMonth[key]) sessionsByYearMonth[key] = { year: yr, month: mo, sessions: [] };
    sessionsByYearMonth[key].sessions.push(s);
  });
  const groupKeys = Object.keys(sessionsByYearMonth).sort((a, b) => b.localeCompare(a));

  const selectedSession = sessions.find(s => s.id === selectedSessionId) || null;
  const selectedDate = selectedSession?.date || null;
  const playerRow = catapultReports.find(r => r.session_id === selectedSessionId) || null;
  const getF = (field) => playerRow?.[field] ?? null;

  const filteredGroups = groupKeys.map(key => {
    const group = sessionsByYearMonth[key];
    const filteredSessions = group.sessions.filter(s => {
      if (!searchQuery) return true;
      const label = `${moment(s.date).format("DD/MM/YYYY")} ${s.title || ""}`.toLowerCase();
      return label.includes(searchQuery.toLowerCase());
    });
    return { ...group, sessions: filteredSessions };
  }).filter(g => g.sessions.length > 0);

  return (
    <div className="flex gap-4 h-full">
      {/* Panel selector de sesión */}
      <div className="w-44 shrink-0 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
        <div className="p-2 border-b border-zinc-800">
          <div className="flex items-center gap-1.5 bg-zinc-800 rounded-lg px-2 py-1.5">
            <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar..." className="bg-transparent text-white text-xs outline-none placeholder-zinc-600 w-full" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {sessionsWithCsv.length === 0 ? (
            <p className="text-zinc-600 text-xs text-center p-4">Sin sesiones con GPS</p>
          ) : filteredGroups.map(({ year, month, sessions: groupSessions }) => (
            <div key={`${year}-${month}`}>
              <div className="px-3 pt-3 pb-1">
                <p className="text-white text-base font-bold">{year}</p>
                <p className="text-zinc-500 text-xs font-semibold tracking-wider">{month}</p>
              </div>
              <div className="space-y-1 px-2 pb-2">
                {groupSessions.map(s => {
                  const m = moment(s.date);
                  const dayAbbr = m.format("dd").charAt(0).toUpperCase() + m.format("dd").slice(1, 2);
                  const isSelected = selectedSessionId === s.id;
                  const hasData = sessionIdsWithData.has(s.id);
                  return (
                    <button key={s.id} onClick={() => setSelectedSessionId(s.id)}
                      className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-left transition-all border ${isSelected ? "bg-zinc-700 border-zinc-500" : "bg-zinc-900 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/60"}`}>
                      <span className="text-xs font-semibold">
                        <span className="text-zinc-400">{dayAbbr} </span>
                        <span className="text-white">{m.format("D")}</span>
                      </span>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${hasData ? (isSelected ? "bg-blue-500 border-blue-500" : "border-zinc-600 bg-zinc-800") : "border-zinc-700 bg-zinc-900"}`}>
                        {hasData && isSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        {hasData && !isSelected && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel de datos GPS */}
      <div className="flex-1 min-w-0">
        {!selectedSessionId ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center h-full flex flex-col items-center justify-center">
            <Zap size={32} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">Seleccioná una sesión para ver los datos GPS</p>
          </div>
        ) : !playerRow ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <p className="text-zinc-600 text-sm font-semibold">{selectedDate ? moment(selectedDate).format("dddd DD/MM/YYYY") : ""}</p>
            {selectedSession && <p className="text-zinc-500 text-xs mt-1">{selectedSession.title}</p>}
            <Zap size={28} className="text-zinc-700 mx-auto mt-4 mb-2" />
            <p className="text-zinc-500 text-sm">Sin datos GPS para {player.full_name} en esta sesión</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-white font-semibold text-sm">{selectedDate ? moment(selectedDate).format("dddd DD [de] MMMM YYYY") : ""}</p>
              {selectedSession && (
                <p className="text-zinc-500 text-xs mt-0.5">
                  {selectedSession.title}
                  {selectedSession.match_day_code && <span className="ml-2 text-violet-400 font-mono font-bold">{selectedSession.match_day_code}</span>}
                  {selectedSession.session_type && <span className="ml-2 text-zinc-600">· {selectedSession.session_type}</span>}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {getF("total_distance") != null && <StatCard label="Distancia total" value={`${(getF("total_distance") / 1000).toFixed(2)} km`} color="text-blue-400" />}
              {getF("player_load") != null && <StatCard label="Player Load" value={Math.round(getF("player_load"))} color="text-emerald-400" />}
              {getF("max_velocity") != null && <StatCard label="Vel. máxima" value={`${getF("max_velocity")} km/h`} color="text-yellow-400" />}
              {getF("distance_hsr") != null && <StatCard label="19.8-25 km/h" value={`${Math.round(getF("distance_hsr"))} m`} color="text-purple-400" />}
              {getF("sprint_distance") != null && <StatCard label="+25 km/h (sprint)" value={`${Math.round(getF("sprint_distance"))} m`} color="text-orange-400" />}
              {getF("accelerations") != null && <StatCard label="Aceleraciones" value={Math.round(getF("accelerations"))} color="text-pink-400" />}
              {getF("decelerations") != null && <StatCard label="Desaceleraciones" value={Math.round(getF("decelerations"))} color="text-cyan-400" />}
              {getF("sprint_efforts") != null && <StatCard label="Sprint Efforts" value={Math.round(getF("sprint_efforts"))} color="text-red-400" />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main component
export default function PlayerProfileDetail({ player, onClose, onEdit }) {
  const [activeTab, setActiveTab] = useState("consolidado");
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [gpsRecords, setGpsRecords] = useState([]);
  const [loadingGps, setLoadingGps] = useState(true);
  const [showMedicalForm, setShowMedicalForm] = useState(false);
  const [selectedMedicalRecords, setSelectedMedicalRecords] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [medicalForm, setMedicalForm] = useState({
    diagnosis: "", status: "Lesionado",
    injury_date: moment().format("YYYY-MM-DD"),
    expected_return: "", treatment: "", notes: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadMedicalRecords();
    loadGpsData();
    // Debounced subscribers para evitar rate limit
    let medicalTimer;
    const unsubMedical = base44.entities.MedicalRecord.subscribe((event) => {
      if (event.data?.player_id === player.id || event.old_data?.player_id === player.id) {
        clearTimeout(medicalTimer);
        medicalTimer = setTimeout(() => loadMedicalRecords(), 2000);
      }
    });
    return () => {
      unsubMedical();
      clearTimeout(medicalTimer);
    };
  }, [player.id]);

  async function loadMedicalRecords() {
    setLoadingRecords(true);
    const records = await base44.entities.MedicalRecord.filter({ player_id: player.id }, "-injury_date", 100);
    setMedicalRecords(records);
    setLoadingRecords(false);
  }

  async function loadGpsData() {
    setLoadingGps(true);
    try {
      const reports = await base44.entities.CatapultReport.filter({ player_id: player.id }, "-date", 200);
      // Deduplicate by date
      const deduped = {};
      reports.forEach(r => {
        if (r.date && (!deduped[r.date] || new Date(r.updated_date) > new Date(deduped[r.date].updated_date))) {
          deduped[r.date] = r;
        }
      });
      setGpsRecords(Object.values(deduped).sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (e) {
      setGpsRecords([]);
    } finally {
      setLoadingGps(false);
    }
  }

  async function handleAddMedical(e) {
    e.preventDefault();
    try {
      await base44.entities.MedicalRecord.create({ ...medicalForm, player_id: player.id, player_name: player.full_name });
      toast({ title: "Registro médico agregado" });
      setShowMedicalForm(false);
      setMedicalForm({ diagnosis: "", status: "Lesionado", injury_date: moment().format("YYYY-MM-DD"), expected_return: "", treatment: "", notes: "" });
      await loadMedicalRecords();
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  }

  async function deleteMedical(id) {
    if (!confirm("¿Eliminar este registro médico?")) return;
    await base44.entities.MedicalRecord.delete(id);
    setMedicalRecords((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Registro eliminado" });
  }

  function toggleSelectMedical(id) {
    setSelectedMedicalRecords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteMultipleMedical() {
    try {
      const count = selectedMedicalRecords.size;
      const ids = Array.from(selectedMedicalRecords);
      for (const id of ids) {
        await base44.entities.MedicalRecord.delete(id);
      }
      setMedicalRecords((prev) => prev.filter((r) => !ids.includes(r.id)));
      setSelectedMedicalRecords(new Set());
      setShowDeleteConfirm(false);
      toast({ title: `${count} registro(s) eliminado(s)` });
    } catch (error) {
      console.error("Error al eliminar registros:", error);
      toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-4">
            {player.photo_url ? (
               <img src={player.photo_url} alt={player.full_name} className="w-14 h-14 rounded-full object-cover border-2 border-zinc-700" />
             ) : (
               <div className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center">
                 <span className="text-lg font-bold text-zinc-500">{player.full_name?.charAt(0)}</span>
               </div>
             )}
             <div>
               <h2 className="text-xl font-bold text-white">{player.full_name}</h2>
              <p className="text-sm text-zinc-500">{player.position}{player.number ? ` · #${player.number}` : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button onClick={() => onEdit(player)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors" title="Editar jugador">
                <Pencil size={18} />
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0 border-b border-zinc-800 shrink-0 px-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${
                activeTab === id
                  ? "border-white text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Tab content — scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "consolidado" && (
            <TabConsolidado
              player={player}
              medicalRecords={medicalRecords}
              loadingRecords={loadingRecords}
              gpsRecords={gpsRecords}
              loadingGps={loadingGps}
              showMedicalForm={showMedicalForm}
              setShowMedicalForm={setShowMedicalForm}
              medicalForm={medicalForm}
              setMedicalForm={setMedicalForm}
              handleAddMedical={handleAddMedical}
              deleteMedical={deleteMedical}
              selectedMedicalRecords={selectedMedicalRecords}
              toggleSelectMedical={toggleSelectMedical}
              deleteMultipleMedical={deleteMultipleMedical}
              showDeleteConfirm={showDeleteConfirm}
              setShowDeleteConfirm={setShowDeleteConfirm}
            />
          )}
          {activeTab === "rendimiento" && <TabRendimiento player={player} />}
          {activeTab === "carga" && <TabCarga player={player} />}
          </div>

          <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent className="bg-zinc-900 border-zinc-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Eliminar {selectedMedicalRecords.size} registro(s) médico(s)</AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400">
                Esta acción no se puede deshacer. Los registros seleccionados serán eliminados permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={deleteMultipleMedical}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Eliminar
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
          </AlertDialog>
          </div>
          </div>
          );
          }