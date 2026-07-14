import React, { useMemo } from "react";
import moment from "moment";
import { Shield, HeartPulse, CheckCircle2, ArrowUpCircle, ArrowDownCircle, Trophy, Flag } from "lucide-react";

function fmtDate(d) { return d ? moment(d).format("DD/MM/YYYY") : "—"; }

function EmptyState({ text = "Sin eventos registrados" }) {
  return <div className="text-center py-10 text-zinc-600 text-sm">{text}</div>;
}

const EVENT_STYLES = {
  debut:   { icon: Flag, color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" },
  plantel: { icon: Shield, color: "text-blue-400 bg-blue-500/15 border-blue-500/30" },
  lesion:  { icon: HeartPulse, color: "text-red-400 bg-red-500/15 border-red-500/30" },
  alta:    { icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" },
  subida:  { icon: ArrowUpCircle, color: "text-violet-400 bg-violet-500/15 border-violet-500/30" },
  bajada:  { icon: ArrowDownCircle, color: "text-pink-400 bg-pink-500/15 border-pink-500/30" },
  partido: { icon: Trophy, color: "text-yellow-400 bg-yellow-500/15 border-yellow-500/30" },
};

export default function PlayerHistoryTab({ memberships, medical, minutes }) {
  const events = useMemo(() => {
    const list = [];

    const sortedMinutes = [...minutes].filter(m => m.match_date).sort((a, b) => (a.match_date || "").localeCompare(b.match_date || ""));
    if (sortedMinutes[0]) {
      list.push({ type: "debut", date: sortedMinutes[0].match_date, title: "Debut", detail: `vs ${sortedMinutes[0].rival || ""}` });
    }
    sortedMinutes.filter(m => (m.minutes || 0) >= 70).forEach(m => {
      list.push({ type: "partido", date: m.match_date, title: "Partido destacado", detail: `vs ${m.rival || ""} · ${m.minutes}'` });
    });

    memberships.forEach(m => {
      list.push({ type: "plantel", date: m.effective_from, title: "Cambio de plantel", detail: `${m.squad_name}${m.reason ? ` · ${m.reason}` : ""}` });
    });

    medical.forEach(m => {
      const isAlta = ["Alta", "alta", "Recuperado"].includes(m.status);
      list.push({
        type: isAlta ? "alta" : "lesion",
        date: m.injury_date,
        title: isAlta ? "Alta médica" : "Lesión",
        detail: m.diagnosis || "",
      });
    });

    return list.filter(e => e.date).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [memberships, medical, minutes]);

  if (!events.length) return <EmptyState />;

  return (
    <div className="relative pl-6 space-y-4 max-h-[28rem] overflow-y-auto pr-1">
      <div className="absolute left-[9px] top-1 bottom-1 w-px bg-zinc-800" />
      {events.map((e, i) => {
        const style = EVENT_STYLES[e.type] || EVENT_STYLES.plantel;
        const Icon = style.icon;
        return (
          <div key={i} className="relative">
            <div className={`absolute -left-6 w-5 h-5 rounded-full border flex items-center justify-center ${style.color}`}>
              <Icon size={11} />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">{e.title}</p>
                <span className="text-xs text-zinc-500 shrink-0">{fmtDate(e.date)}</span>
              </div>
              {e.detail && <p className="text-xs text-zinc-500 mt-0.5">{e.detail}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}