import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Printer, Calendar, Clock, Users, MapPin, Dumbbell, Goal, LocateFixed, Video } from "lucide-react";
import { CLUB_BRAND } from "@/lib/clubBrand";
import { isGoalkeeper } from "@/components/squad/squadConstants";
import moment from "moment";

const periodClass = {
  Pretemporada: "bg-blue-100 text-blue-800 border-blue-200",
  Competencia: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Transición: "bg-amber-100 text-amber-800 border-amber-200",
};

function Metric({ label, value, icon: Icon }) {
  return <div className="rounded-xl border border-zinc-200 bg-white p-3"><div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase">{Icon && <Icon size={13} />}{label}</div><p className="mt-1 text-xl font-black text-zinc-950">{value}</p></div>;
}

function Section({ title, children }) {
  return <section className="break-inside-avoid rounded-2xl border border-zinc-200 bg-white p-4"><h2 className="text-sm font-black uppercase tracking-wide mb-3" style={{ color: CLUB_BRAND.colors.greenDeep }}>{title}</h2>{children}</section>;
}

export default function SessionPDFExport({ session, sessionPlayers, onClose }) {
  const [data, setData] = useState({ exercises: [], gpsRows: [], videoLinks: [], strengthStations: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.SessionExercise.filter({ session_id: session.id }, "order", 100),
      base44.entities.SessionGPSData.filter({ session_id: session.id }, "player_name", 200),
      base44.entities.SessionVideoLink.filter({ session_id: session.id }, "-created_date", 100),
      base44.entities.StrengthStation.filter({ session_id: session.id }, "order", 100),
    ]).then(([exercises, gpsRows, videoLinks, strengthStations]) => {
      setData({ exercises, gpsRows, videoLinks, strengthStations });
      setLoading(false);
    });
  }, [session.id]);

  const stats = useMemo(() => {
    const presentes = sessionPlayers.filter(sp => sp.attendance === "presente");
    return {
      field: presentes.filter(sp => !isGoalkeeper({ position: sp.position })).length,
      gk: presentes.filter(sp => isGoalkeeper({ position: sp.position })).length,
      diff: sessionPlayers.filter(sp => sp.attendance === "diferenciado").length,
      kin: sessionPlayers.filter(sp => sp.attendance === "kinesiologia").length,
    };
  }, [sessionPlayers]);

  async function printView() {
    if (!session.pdf_exported) await base44.entities.TrainingSession.update(session.id, { pdf_exported: true });
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 bg-white text-zinc-950 overflow-y-auto">
      <style>{`@page { size: A4; margin: 10mm; } @media print { .no-print { display:none!important; } body { background:white!important; } .break-inside-avoid { break-inside: avoid; } }`}</style>
      <div className="no-print sticky top-0 z-10 bg-zinc-950 border-b border-zinc-800 px-5 py-3 flex justify-end gap-2">
        <button onClick={printView} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500 text-zinc-950 text-sm font-black disabled:opacity-50"><Printer size={15} /> Imprimir / PDF</button>
        <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-sm"><X size={15} /> Volver</button>
      </div>

      <main className="max-w-6xl mx-auto p-6 print:p-0 space-y-5">
        <header className="rounded-3xl border-b-4 p-5 flex items-start justify-between gap-5" style={{ borderColor: CLUB_BRAND.colors.green, background: `linear-gradient(135deg, ${CLUB_BRAND.colors.panel}, #ffffff 62%, ${CLUB_BRAND.colors.yellow}22)` }}>
          <div className="flex items-center gap-4">
            <img src={CLUB_BRAND.logoUrl} alt={CLUB_BRAND.name} className="w-16 h-16 object-contain" />
            <div><p className="text-xs font-black uppercase" style={{ color: CLUB_BRAND.colors.greenDeep }}>{CLUB_BRAND.name} · PerformancePitch</p><h1 className="text-3xl font-black">SESIÓN {session.session_number || "—"}</h1><p className="text-sm text-zinc-600">{session.squad_name || "Plantel"}</p></div>
          </div>
          <div className="text-right space-y-1"><span className={`inline-block px-3 py-1 rounded-full border text-xs font-black ${periodClass[session.period] || periodClass.Competencia}`}>{session.period || "Competencia"}</span><p className="text-xs text-zinc-500">Vista imprimible · {moment().format("DD/MM/YYYY HH:mm")}</p></div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="Fecha" value={moment(session.date).format("DD/MM/YYYY")} icon={Calendar} />
          <Metric label="Duración" value={`${session.duration_minutes || 60} min`} icon={Clock} />
          <Metric label="Jugadores" value={session.players_selected || sessionPlayers.length || 0} icon={Users} />
          <Metric label="Lugar" value={session.location || "—"} icon={MapPin} />
        </div>

        <div className="grid md:grid-cols-4 gap-3">
          <Metric label="Campo" value={stats.field} icon={Users} />
          <Metric label="Arqueros" value={stats.gk} icon={Users} />
          <Metric label="Diferenciados" value={stats.diff} icon={Users} />
          <Metric label="Kinesiología" value={stats.kin} icon={Users} />
        </div>

        {loading ? <div className="text-center py-12 text-zinc-500">Cargando vista previa...</div> : (
          <div className="space-y-5">
            <Section title="Jugadores">
              <div className="grid md:grid-cols-2 gap-2 text-xs">
                {sessionPlayers.map(sp => <div key={sp.id} className="flex justify-between gap-3 rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2"><span className="font-bold text-zinc-800">{sp.player_name}</span><span className="text-zinc-500">{sp.attendance}</span></div>)}
              </div>
            </Section>

            <Section title="Ejercicios de campo">
              {data.exercises.length ? <div className="grid md:grid-cols-2 gap-3">{data.exercises.map((ex, idx) => <div key={ex.id} className="rounded-xl border border-zinc-200 p-3"><p className="font-black text-sm">{idx + 1}. {ex.name}</p><p className="text-xs text-zinc-500 mt-1">{[ex.duration_min && `${ex.duration_min} min`, ex.blocks && `${ex.blocks} bloques`, ex.players_count && `${ex.players_count} jug.`].filter(Boolean).join(" · ")}</p>{ex.description && <p className="text-xs text-zinc-600 mt-2">{ex.description}</p>}</div>)}</div> : <p className="text-sm text-zinc-500">Sin ejercicios cargados.</p>}
            </Section>

            <Section title="Fuerza">
              {data.strengthStations.length ? <div className="grid md:grid-cols-2 gap-3">{data.strengthStations.map((st, idx) => <div key={st.id} className="rounded-xl border border-zinc-200 p-3"><p className="font-black text-sm flex items-center gap-2"><Dumbbell size={14} />{idx + 1}. {st.exercise_name || "Ejercicio"}</p><p className="text-xs text-zinc-500 mt-1">{[st.method, st.exercise_type, st.volume].filter(Boolean).join(" · ")}</p></div>)}</div> : <p className="text-sm text-zinc-500">Sin fuerza cargada.</p>}
            </Section>

            <Section title="GPS">
              {data.gpsRows.length ? <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="bg-zinc-100"><th className="text-left p-2">Jugador</th><th className="text-right p-2">Distancia</th><th className="text-right p-2">m/min</th><th className="text-right p-2">Sprints</th><th className="text-right p-2">PL</th></tr></thead><tbody>{data.gpsRows.map(row => <tr key={row.id} className="border-t"><td className="p-2 font-bold">{row.player_name}</td><td className="p-2 text-right">{row.total_distance || "—"}</td><td className="p-2 text-right">{row.m_min || "—"}</td><td className="p-2 text-right">{row.sprints || "—"}</td><td className="p-2 text-right">{row.player_load || "—"}</td></tr>)}</tbody></table></div> : <p className="text-sm text-zinc-500">Sin GPS cargado.</p>}
            </Section>

            <Section title="Videos">
              {data.videoLinks.length ? <div className="space-y-2">{data.videoLinks.map(link => <a key={link.id} href={link.video_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-700 underline"><Video size={14} />{link.title || link.video_url}</a>)}</div> : <p className="text-sm text-zinc-500">Sin videos vinculados.</p>}
            </Section>
          </div>
        )}
      </main>
    </div>
  );
}