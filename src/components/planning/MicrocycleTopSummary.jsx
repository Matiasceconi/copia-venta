import React from "react";
import { Calendar, Trophy, Zap, Flame } from "lucide-react";

function SummaryCell({ label, value, sub, icon: Icon, accent = "text-blue-600", children }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-r border-zinc-200 last:border-r-0 min-w-[170px]">
      <div className={`w-9 h-9 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-center ${accent}`}><Icon size={18} /></div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wide">{label}</p>
        {children || <><p className="text-sm font-black text-zinc-950 leading-tight truncate">{value || "—"}</p>{sub && <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{sub}</p>}</>}
      </div>
    </div>
  );
}

function formatDate(date) {
  if (!date) return "Fecha sin definir";
  const [y, m, d] = String(date).split("-");
  return `${d}/${m}/${y}`;
}

export default function MicrocycleTopSummary({ meta, activeSquad, activeSeasonId, startDateLabel, nextMatch, dayCount }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-zinc-200">
        <SummaryCell label={`Semana ${meta.week_number || "—"}`} value={startDateLabel} sub={activeSeasonId || activeSquad?.season || "Temporada"} icon={Calendar} />
        <SummaryCell label="Día actual" value={meta.current_md || "—"} sub={`${dayCount} días de microciclo`} icon={Zap} accent="text-blue-600" />
        <SummaryCell label="Próximo partido" icon={Trophy} accent="text-red-600">
          {nextMatch ? <div className="flex items-center gap-2 min-w-0">
            {nextMatch.rival_logo_url ? <img src={nextMatch.rival_logo_url} alt="Escudo rival" className="w-8 h-8 object-contain shrink-0" /> : <div className="w-8 h-8 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-[10px] font-black text-red-600">VS</div>}
            <div className="min-w-0"><p className="text-sm font-black text-zinc-950 truncate">vs. {nextMatch.rival || nextMatch.title || "Rival"}</p><p className="text-[11px] text-zinc-500 truncate">{formatDate(nextMatch.date)} · {nextMatch.home_away || "Condición sin definir"}</p></div>
          </div> : <><p className="text-sm font-black text-zinc-950">Sin partido programado</p><p className="text-[11px] text-zinc-500">Se toma del calendario</p></>}
        </SummaryCell>
        <SummaryCell label="Tipo de semana" value={meta.week_type || "Normal"} sub="Sincronizada con el plan" icon={Flame} accent="text-orange-600" />
      </div>
    </div>
  );
}