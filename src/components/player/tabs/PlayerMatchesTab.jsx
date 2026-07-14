import React from "react";
import moment from "moment";
import { MapPin, ArrowRight } from "lucide-react";

function fmtDate(d) { return d ? moment(d).format("DD/MM/YYYY") : "—"; }

function EmptyState({ text = "Sin registros" }) {
  return <div className="text-center py-10 text-zinc-600 text-sm">{text}</div>;
}

export default function PlayerMatchesTab({ minutes, matchReports, onOpenMatches }) {
  if (!minutes.length) return <EmptyState />;
  const sorted = [...minutes].sort((a, b) => (b.match_date || "").localeCompare(a.match_date || ""));

  function findReport(m) {
    return matchReports.find(r => r.date === m.match_date && (r.rival || "").toLowerCase() === (m.rival || "").toLowerCase());
  }

  return (
    <div className="space-y-2.5 max-h-[28rem] overflow-y-auto pr-1">
      {sorted.map(m => {
        const report = findReport(m);
        const isStarter = (m.minutes || 0) >= 60;
        return (
          <div key={m.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 hover:border-zinc-600 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">vs {m.rival || m.match_label || "Rival"}</p>
                <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1 flex-wrap">
                  <span>{fmtDate(m.match_date)}</span>
                  {report?.location && <span className="flex items-center gap-1"><MapPin size={10} /> {report.location}</span>}
                  {m.tournament && <span>· {m.tournament}</span>}
                </div>
              </div>
              {report && (
                <span className="text-sm font-bold text-white shrink-0">{report.our_score ?? "—"} - {report.rival_score ?? "—"}</span>
              )}
            </div>
            <div className="flex items-center justify-between mt-2.5">
              <div className="flex items-center gap-3 text-xs">
                <span className={`font-bold ${(m.minutes || 0) > 0 ? "text-yellow-400" : "text-zinc-600"}`}>{m.minutes || 0}'</span>
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${isStarter ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" : "text-zinc-400 bg-zinc-700/30 border-zinc-600"}`}>
                  {isStarter ? "Titular" : "Suplente"}
                </span>
              </div>
              <button onClick={onOpenMatches}
                className="flex items-center gap-1 text-xs text-white bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 rounded-lg transition-colors">
                Abrir partido <ArrowRight size={11} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}