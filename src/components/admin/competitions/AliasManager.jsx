import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { normalizeCompetitionName } from "@/lib/competitions";

export default function AliasManager({ competition, aliases, onChanged }) {
  const [alias, setAlias] = useState("");
  if (!competition) return <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-zinc-500 text-sm">Seleccioná una competencia para gestionar sus alias.</div>;

  async function addAlias() {
    if (!alias.trim()) return;
    await base44.entities.CompetitionAliases.create({ competition_id: competition.id, alias: alias.trim(), normalized_alias: normalizeCompetitionName(alias), active: true });
    setAlias("");
    onChanged?.();
  }

  async function toggle(item) {
    await base44.entities.CompetitionAliases.update(item.id, { active: item.active === false });
    onChanged?.();
  }

  return <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
    <div><p className="text-white font-semibold">Alias de {competition.short_name || competition.name}</p><p className="text-xs text-zinc-500">Los importadores deben resolver por estos alias antes de vincular partidos.</p></div>
    <div className="flex gap-2"><input className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Nuevo alias" value={alias} onChange={(e) => setAlias(e.target.value)} /><button onClick={addAlias} className="px-3 py-2 rounded-lg bg-yellow-500 text-zinc-950 text-sm font-semibold">Agregar</button></div>
    <div className="space-y-1">{aliases.map((item) => <div key={item.id} className="flex items-center justify-between bg-zinc-800/60 rounded-lg px-3 py-2"><span><span className="text-zinc-200 text-sm">{item.alias}</span><span className="text-zinc-600 text-xs ml-2">{item.normalized_alias}</span></span><button onClick={() => toggle(item)} className="text-xs text-zinc-400 hover:text-white">{item.active === false ? "Activar" : "Desactivar"}</button></div>)}</div>
  </div>;
}