import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const EMPTY_PHASE = { name: "", order: 1, uses_matchday: false, is_knockout: false, matchday_start: "", matchday_end: "" };

export default function CompetitionPhaseManager({ competition, onSaved }) {
  const [phases, setPhases] = useState([]);
  const [groupsText, setGroupsText] = useState("");
  const [matchdayCount, setMatchdayCount] = useState("");

  useEffect(() => {
    setPhases(competition?.phase_config?.length ? competition.phase_config : []);
    setGroupsText((competition?.groups || []).join(", "));
    setMatchdayCount(competition?.matchday_count || "");
  }, [competition]);

  if (!competition) return <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-500">Seleccioná una competencia para configurar fases, fechas y grupos.</div>;

  function setPhase(index, key, value) {
    setPhases((current) => current.map((phase, i) => i === index ? { ...phase, [key]: value } : phase));
  }

  async function save() {
    const phase_config = phases
      .filter((phase) => phase.name?.trim())
      .map((phase, index) => ({
        ...phase,
        order: Number(phase.order || index + 1),
        matchday_start: phase.matchday_start ? Number(phase.matchday_start) : null,
        matchday_end: phase.matchday_end ? Number(phase.matchday_end) : null,
      }))
      .sort((a, b) => a.order - b.order);
    const groups = groupsText.split(",").map((item) => item.trim()).filter(Boolean);
    await base44.entities.Competitions.update(competition.id, { phase_config, groups, matchday_count: matchdayCount ? Number(matchdayCount) : null, updated_at: new Date().toISOString() });
    onSaved?.();
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between"><div><p className="text-white font-semibold">Fases de {competition.short_name || competition.name}</p><p className="text-xs text-zinc-500">Configurá orden, fechas y fases eliminatorias.</p></div><button onClick={() => setPhases((current) => [...current, { ...EMPTY_PHASE, order: current.length + 1 }])} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-200 text-sm"><Plus size={14} /> Fase</button></div>
      <div className="space-y-2">
        {phases.map((phase, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 bg-zinc-800/50 rounded-lg p-2">
            <input className="md:col-span-3 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Fase regular" value={phase.name || ""} onChange={(e) => setPhase(index, "name", e.target.value)} />
            <input type="number" className="md:col-span-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Orden" value={phase.order || ""} onChange={(e) => setPhase(index, "order", e.target.value)} />
            <input type="number" className="md:col-span-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Desde fecha" value={phase.matchday_start || ""} onChange={(e) => setPhase(index, "matchday_start", e.target.value)} />
            <input type="number" className="md:col-span-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Hasta fecha" value={phase.matchday_end || ""} onChange={(e) => setPhase(index, "matchday_end", e.target.value)} />
            <label className="md:col-span-2 flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" checked={!!phase.uses_matchday} onChange={(e) => setPhase(index, "uses_matchday", e.target.checked)} /> Usa fecha</label>
            <label className="md:col-span-1 flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" checked={!!phase.is_knockout} onChange={(e) => setPhase(index, "is_knockout", e.target.checked)} /> KO</label>
            <button onClick={() => setPhases((current) => current.filter((_, i) => i !== index))} className="md:col-span-1 text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input type="number" className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Cantidad total de fechas" value={matchdayCount} onChange={(e) => setMatchdayCount(e.target.value)} />
        <input className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Grupos o zonas separados por coma" value={groupsText} onChange={(e) => setGroupsText(e.target.value)} />
      </div>
      <div className="flex justify-end"><button onClick={save} className="px-4 py-2 rounded-lg bg-yellow-500 text-zinc-950 text-sm font-semibold">Guardar fases</button></div>
    </div>
  );
}