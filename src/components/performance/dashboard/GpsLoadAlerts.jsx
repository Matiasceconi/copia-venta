import React from "react";
import { AlertTriangle, TrendingUp, CheckCircle2 } from "lucide-react";

export default function GpsLoadAlerts({ counts }) {
  const items = [
    { key: "muyAlta", label: "Carga muy alta", sub: "≥ 110% de su promedio", value: counts.muyAlta, icon: AlertTriangle, color: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400" } },
    { key: "alta", label: "Carga alta", sub: "95% – 110% de su promedio", value: counts.alta, icon: TrendingUp, color: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400" } },
    { key: "optima", label: "Carga óptima", sub: "< 95% de su promedio", value: counts.optima, icon: CheckCircle2, color: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" } },
  ];
  return (
    <div>
      <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">Alertas de carga (vs. promedio individual de partido)</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map(({ key, label, sub, value, icon: Icon, color }) => (
          <div key={key} className={`rounded-xl border p-3 flex items-center gap-3 ${color.bg} ${color.border}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color.bg}`}>
              <Icon size={16} className={color.text} />
            </div>
            <div>
              <p className="text-white text-lg font-bold leading-tight">{value} <span className="text-[10px] text-zinc-500 font-normal">jugadores</span></p>
              <p className={`text-[11px] font-semibold ${color.text}`}>{label}</p>
              <p className="text-[10px] text-zinc-500">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}