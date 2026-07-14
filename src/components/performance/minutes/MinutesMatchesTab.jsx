import React from "react";
import { ExternalLink } from "lucide-react";
import { getRivalLogo } from "@/lib/match-utils";

export default function MinutesMatchesTab({ matches }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">Detalle por partido</h3>
        <p className="text-xs text-zinc-500">Vista de control y acceso directo al módulo oficial de minutos de cada partido.</p>
      </div>
      <div className="space-y-3">
        {matches.map((match) => {
          const logo = getRivalLogo(match);
          const positivePlayers = match.minuteRows.filter((row) => Number(row.minutes_played || 0) > 0 || Number(row.minutes || 0) > 0).length;
          return (
            <a key={match.id} href={`/matches/${match.id}?tab=minutos`} className="grid grid-cols-[110px_1.6fr_110px_1.1fr_90px_90px_110px_110px_auto] gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4 transition hover:border-zinc-700 hover:bg-zinc-800/40">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Fecha</p>
                <p className="mt-1 text-sm font-semibold text-white">{match.date}</p>
              </div>
              <div className="flex items-center gap-3">
                {logo ? <img src={logo} alt={match.rival} className="h-10 w-10 rounded-full object-contain" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-sm font-bold text-zinc-400">{String(match.rival || "?").charAt(0)}</div>}
                <div>
                  <p className="text-sm font-semibold text-white">{match.rival}</p>
                  <p className="text-xs text-zinc-500">{match.location || "—"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Resultado</p>
                <p className="mt-1 text-sm font-semibold text-white">{match.our_score != null && match.rival_score != null ? `${match.our_score} - ${match.rival_score}` : "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Competencia</p>
                <p className="mt-1 text-sm text-zinc-300">{match.displayCompetition}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Jornada</p>
                <p className="mt-1 text-sm text-zinc-300">{match.matchday_number ? `Fecha ${match.matchday_number}` : match.competition_round || "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Duración</p>
                <p className="mt-1 text-sm text-zinc-300">{match.duration ? `${match.duration}'` : "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Jugadores</p>
                <p className="mt-1 text-sm text-zinc-300">{positivePlayers}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Estado</p>
                <span className={`mt-1 inline-flex rounded-full border px-2 py-1 text-xs font-medium ${match.status.badge} ${match.status.tone}`}>{match.status.label}</span>
              </div>
              <div className="flex items-center justify-end gap-1 text-sm font-medium text-yellow-300">Abrir partido <ExternalLink size={14} /></div>
            </a>
          );
        })}
        {matches.length === 0 && <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-10 text-center text-sm text-zinc-500">No hay partidos para este filtro.</div>}
      </div>
    </div>
  );
}