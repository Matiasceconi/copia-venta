import React from "react";
import { X } from "lucide-react";
import PhysicalObjectiveManager from "@/components/planning/PhysicalObjectiveManager";
import PlannerDropdownOptionManager from "@/components/planning/PlannerDropdownOptionManager";

export default function PlannerSettingsModal({ open, onClose, physicalObjectives, onRefreshObjectives, cooldownOptions, onRefreshCooldown }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[88vh] overflow-y-auto rounded-3xl bg-slate-50 shadow-2xl border border-white">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-zinc-200 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Configuración del planificador</p>
            <h2 className="text-xl font-black text-zinc-950">Listas desplegables y objetivos físicos</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <PhysicalObjectiveManager objectives={physicalObjectives} onRefresh={onRefreshObjectives} defaultOpen />
          <PlannerDropdownOptionManager title="Vuelta a la calma" group="cooldown" options={cooldownOptions} onRefresh={onRefreshCooldown} />
        </div>
      </div>
    </div>
  );
}