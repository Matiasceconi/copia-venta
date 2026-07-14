import React from "react";
import { AlertTriangle, AlertCircle, TrendingUp, TrendingDown, Zap, FileWarning } from "lucide-react";

const ICONS = { high: TrendingUp, low: TrendingDown, smax: Zap, accdec: AlertTriangle, missing: AlertCircle, pending: FileWarning };
const COLORS = {
  high: "bg-orange-500/10 border-orange-500/30 text-orange-300",
  low: "bg-sky-500/10 border-sky-500/30 text-sky-300",
  smax: "bg-purple-500/10 border-purple-500/30 text-purple-300",
  accdec: "bg-red-500/10 border-red-500/30 text-red-300",
  missing: "bg-zinc-700/20 border-zinc-700 text-zinc-300",
  pending: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300",
};

export default function ExternalGpsAlerts({ alerts }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Alertas</h3>
      {alerts.length === 0 ? (
        <p className="text-zinc-600 text-sm text-center py-4">Sin alertas para esta semana</p>
      ) : (
        <div className="space-y-2">
          {alerts.map((a, i) => {
            const Icon = ICONS[a.type] || AlertCircle;
            return (
              <div key={i} className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border text-xs ${COLORS[a.type] || COLORS.missing}`}>
                <Icon size={14} className="mt-0.5 shrink-0" />
                <span>{a.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}