import React from "react";
import { Clock, Lock } from "lucide-react";
import MinutesSubPanel from "@/components/performance/MinutesSubPanel";

export default function PerformanceMinutes() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-3">
          <Clock size={22} className="text-zinc-400" />
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Minutos Jugados</h1>
            <p className="text-zinc-500 text-sm mt-0.5">Consulta, comparación y exportación desde los minutos cargados en Partidos.</p>
          </div>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300">
          <Lock size={13} className="text-yellow-300" /> Solo lectura
        </div>
      </div>
      <MinutesSubPanel />
    </div>
  );
}