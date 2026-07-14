import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Clock, MapPin, Shield, Trophy } from "lucide-react";
import moment from "moment";

const OWN_SHIELD = "https://media.base44.com/images/public/6a3bc03033558cd65ec27f53/a8608f7d3_defensa.png";

function dayLabel(date) {
  const daysLeft = moment(date).diff(moment().startOf("day"), "days");
  if (daysLeft === 0) return "Hoy";
  if (daysLeft === 1) return "Mañana";
  return `En ${daysLeft} días`;
}

export default function NextMatchHeaderCard({ match, matchReport }) {
  const [logoError, setLogoError] = useState(false);
  const rivalName = matchReport?.rival || match.rival || match.title;
  const logoUrl = matchReport?.rival_logo_url || match.rival_logo_url;
  const condition = matchReport?.location || match.home_away || "";
  const time = matchReport?.match_time || match.time || match.start_time || "Horario sin confirmar";
  const competition = matchReport?.competition || match.competition || "Competencia sin asignar";
  const matchPath = matchReport?.id || match.match_id ? `/matches/${matchReport?.id || match.match_id}?tab=convocados` : null;

  return (
    <div className="w-full rounded-2xl border border-zinc-700 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-4 shadow-lg shadow-black/20 lg:max-w-md">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Próximo partido</p>
        <span className="rounded-full bg-blue-500 px-2.5 py-1 text-[10px] font-bold uppercase text-white">{dayLabel(match.date)}</span>
      </div>

      <div className="flex items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-500/20 bg-zinc-950 p-2">
            <img src={OWN_SHIELD} alt="Defensa y Justicia" className="h-full w-full object-contain" />
          </div>
          <span className="max-w-[95px] truncate text-[10px] font-medium text-zinc-400">Defensa y Justicia</span>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">vs</p>
          <h3 className="mt-1 max-w-[150px] truncate text-sm font-bold text-white">{rivalName}</h3>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 p-2">
            {logoUrl && !logoError ? <img src={logoUrl} alt={rivalName} className="h-full w-full object-contain" onError={() => setLogoError(true)} /> : <Shield size={24} className="text-zinc-500" />}
          </div>
          <span className="max-w-[95px] truncate text-[10px] font-medium text-zinc-400">{rivalName}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-zinc-300 sm:grid-cols-4">
        <Info icon={CalendarDays} label={moment(match.date).format("DD/MM/YYYY")} />
        <Info icon={Clock} label={time} />
        <Info icon={MapPin} label={condition || "Sede a confirmar"} />
        <Info icon={Trophy} label={competition} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {matchPath ? (
          <Link to={matchPath} className="rounded-lg bg-yellow-500 px-3 py-2 text-center text-xs font-semibold text-zinc-950 transition-colors hover:bg-yellow-400">Abrir partido</Link>
        ) : (
          <Link to={`/matches?date=${match.date}`} className="rounded-lg bg-yellow-500 px-3 py-2 text-center text-xs font-semibold text-zinc-950 transition-colors hover:bg-yellow-400">Abrir partido</Link>
        )}
        <Link to={`/schedule?date=${match.date}`} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-center text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800">Ver calendario</Link>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label }) {
  return <div className="flex min-w-0 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1.5"><Icon size={12} className="shrink-0 text-zinc-500" /><span className="truncate">{label}</span></div>;
}