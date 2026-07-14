import React from "react";
import WeeklyPlannerBoard from "@/components/planning/WeeklyPlannerBoard";

export default function WeeklyPlanner() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Planificador Semanal</h1>
        <p className="text-zinc-500 text-sm mt-1">Preparador Físico — Cronograma diario del equipo</p>
      </div>
      <WeeklyPlannerBoard />
    </div>
  );
}