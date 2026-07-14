import React, { useMemo } from "react";
import moment from "moment";

function MiniStat({ label, value, color = "text-white", sub }) {
  return (
    <div className="bg-zinc-800/60 rounded-xl p-3 text-center">
      <p className={`text-xl font-bold ${color}`}>{value ?? "—"}</p>
      <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{label}</p>
      {sub && <p className="text-[9px] text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function EmptyState({ text = "Sin registros" }) {
  return <div className="text-center py-10 text-zinc-600 text-sm">{text}</div>;
}

export default function PlayerMinutesTab({ minutes, orphanCount = 0 }) {
  const byCompetition = useMemo(() => {
    const map = {};
    minutes.forEach(m => {
      const t = m.tournament || "Otro";
      map[t] = (map[t] || 0) + (m.minutes || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [minutes]);

  if (!minutes.length) {
    return (
      <>
        <EmptyState />
        {orphanCount > 0 && (
          <p className="text-center text-xs text-amber-400">{orphanCount} registro{orphanCount !== 1 ? "s" : ""} huérfano{orphanCount !== 1 ? "s" : ""} (sin partido válido) no se muestran</p>
        )}
      </>
    );
  }

  const total = minutes.reduce((s, r) => s + (r.minutes || 0), 0);
  const played = minutes.filter(r => (r.minutes || 0) > 0).length;
  const today = moment();
  const last30 = minutes.filter(r => r.match_date && today.diff(moment(r.match_date), "days") <= 30).reduce((s, r) => s + (r.minutes || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Minutos temporada" value={`${total}'`} color="text-yellow-400" />
        <MiniStat label="Últimos 30 días" value={`${last30}'`} color="text-emerald-400" />
        <MiniStat label="Partidos jugados" value={played} color="text-blue-400" />
        <MiniStat label="Promedio por partido" value={played ? `${Math.round(total / played)}'` : "—"} color="text-orange-400" />
      </div>

      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Minutos por competencia</p>
        <div className="space-y-1.5">
          {byCompetition.map(([comp, mins]) => (
            <div key={comp} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
              <span className="text-sm text-white">{comp}</span>
              <span className="text-sm font-semibold text-yellow-400">{mins}'</span>
            </div>
          ))}
        </div>
      </div>

      {orphanCount > 0 && (
        <p className="text-xs text-amber-400">{orphanCount} registro{orphanCount !== 1 ? "s" : ""} huérfano{orphanCount !== 1 ? "s" : ""} (sin partido válido en Partidos) no incluido{orphanCount !== 1 ? "s" : ""} en este resumen</p>
      )}
    </div>
  );
}