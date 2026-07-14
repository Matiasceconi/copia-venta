import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { buildUnlinkedCompetitionGroups, normalizeCompetitionName } from "@/lib/competitions";

function labelForMatch(match, competitionMap) {
  const competition = competitionMap[match.competition_id]?.short_name || competitionMap[match.competition_id]?.name || match.competition || "Sin competencia";
  const phase = match.competition_stage || "Sin fase";
  const date = match.matchday_number ? `Fecha ${match.matchday_number}` : "Sin fecha";
  return `${match.squad_name || "Sin plantel"} · ${competition} · ${phase} · ${date} · vs ${match.rival}`;
}

export default function CompetitionMigrationTool({ matches, competitions, aliases, squads = [], onDone }) {
  const [assigning, setAssigning] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [patch, setPatch] = useState({ squad_id: "", competition_id: "", competition_stage: "", matchday_number: "", group_name: "", phase_label: "" });
  const competitionMap = useMemo(() => Object.fromEntries(competitions.map((item) => [item.id, item])), [competitions]);
  const groups = useMemo(() => buildUnlinkedCompetitionGroups(matches), [matches]);
  const aliasKeys = new Set(aliases.filter((a) => a.active !== false).map((a) => a.normalized_alias));
  const unresolved = groups.filter((group) => !aliasKeys.has(group.normalized));
  const candidates = matches.filter((match) => !match.squad_id || !match.competition_id || !match.competition_stage || (!match.matchday_number && !match.phase_label));
  const selectedCompetition = competitionMap[patch.competition_id];
  const phases = selectedCompetition?.phase_config || [];

  async function assign(group, competitionId) {
    const competition = competitions.find((item) => item.id === competitionId);
    if (!competition) return;
    setAssigning(true);
    for (const match of group.matches) await base44.entities.MatchReport.update(match.id, { competition_id: competition.id, competition: competition.name });
    for (const raw of group.rawNames) await base44.entities.CompetitionAliases.create({ competition_id: competition.id, alias: raw, normalized_alias: normalizeCompetitionName(raw), active: true });
    setAssigning(false);
    onDone?.();
  }

  async function applyBatch() {
    if (selectedIds.length === 0) return;
    const selectedSquad = squads.find((squad) => squad.id === patch.squad_id);
    const selectedCompetition = competitions.find((competition) => competition.id === patch.competition_id);
    const payload = {};
    if (patch.squad_id) { payload.squad_id = patch.squad_id; payload.squad_name = selectedSquad?.name || ""; payload.season_id = selectedSquad?.season || undefined; }
    if (patch.competition_id) { payload.competition_id = patch.competition_id; payload.competition = selectedCompetition?.name || ""; }
    if (patch.competition_stage) payload.competition_stage = patch.competition_stage;
    if (patch.matchday_number !== "") { payload.matchday_number = Number(patch.matchday_number); payload.competition_round = `Fecha ${Number(patch.matchday_number)}`; }
    if (patch.group_name) payload.group_name = patch.group_name;
    if (patch.phase_label) payload.phase_label = patch.phase_label;
    setAssigning(true);
    for (const id of selectedIds) await base44.entities.MatchReport.update(id, payload);
    setAssigning(false);
    setSelectedIds([]);
    onDone?.();
  }

  async function mergeDuplicate(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const source = competitions.find((item) => item.id === sourceId);
    const target = competitions.find((item) => item.id === targetId);
    if (!source || !target || !confirm(`¿Fusionar ${source.name} dentro de ${target.name}?`)) return;
    setAssigning(true);
    const affected = matches.filter((match) => match.competition_id === sourceId);
    for (const match of affected) await base44.entities.MatchReport.update(match.id, { competition_id: targetId, competition: target.name });
    await base44.entities.CompetitionAliases.create({ competition_id: targetId, alias: source.name, normalized_alias: normalizeCompetitionName(source.name), active: true });
    await base44.entities.Competitions.update(sourceId, { active: false, updated_at: new Date().toISOString() });
    setAssigning(false);
    onDone?.();
  }

  return <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-5">
    <div><p className="text-white font-semibold">Normalizar fases y fechas de partidos</p><p className="text-xs text-zinc-500">Completá plantel, competencia, fase, fecha, grupo y etiquetas en lote sin depender de texto libre.</p></div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {candidates.map((match) => <label key={match.id} className="flex items-start gap-2 bg-zinc-800/50 rounded-lg p-2 text-sm text-zinc-300"><input type="checkbox" className="mt-1" checked={selectedIds.includes(match.id)} onChange={(e) => setSelectedIds((current) => e.target.checked ? [...current, match.id] : current.filter((id) => id !== match.id))} /><span>{labelForMatch(match, competitionMap)}</span></label>)}
        {candidates.length === 0 && <p className="text-zinc-500 text-sm">No hay partidos pendientes de normalización.</p>}
      </div>
      <div className="space-y-2">
        <select value={patch.squad_id} onChange={(e) => setPatch((current) => ({ ...current, squad_id: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"><option value="">Plantel: sin cambio</option>{squads.map((squad) => <option key={squad.id} value={squad.id}>{squad.name}</option>)}</select>
        <select value={patch.competition_id} onChange={(e) => setPatch((current) => ({ ...current, competition_id: e.target.value, competition_stage: "" }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"><option value="">Competencia: sin cambio</option>{competitions.map((competition) => <option key={competition.id} value={competition.id}>{competition.name}</option>)}</select>
        <input list="migration-phases" value={patch.competition_stage} onChange={(e) => setPatch((current) => ({ ...current, competition_stage: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Fase / instancia" />
        <datalist id="migration-phases">{phases.map((phase) => <option key={phase.name} value={phase.name} />)}</datalist>
        <input type="number" value={patch.matchday_number} onChange={(e) => setPatch((current) => ({ ...current, matchday_number: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Número de fecha" />
        <input value={patch.group_name} onChange={(e) => setPatch((current) => ({ ...current, group_name: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Grupo o zona" />
        <input value={patch.phase_label} onChange={(e) => setPatch((current) => ({ ...current, phase_label: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Etiqueta corregida" />
        <button disabled={assigning || selectedIds.length === 0} onClick={applyBatch} className="w-full px-4 py-2 rounded-lg bg-yellow-500 text-zinc-950 text-sm font-semibold disabled:opacity-40">Actualizar {selectedIds.length} partido(s)</button>
      </div>
    </div>
    <div className="border-t border-zinc-800 pt-4 space-y-3"><p className="text-white font-semibold">Competencias sin vincular</p>{unresolved.map((group) => <div key={group.normalized} className="bg-zinc-800/60 rounded-lg p-3 flex items-center gap-3"><div className="flex-1"><p className="text-sm text-white">{group.rawNames.join(" / ")}</p><p className="text-xs text-zinc-500">{group.matches.length} partido(s)</p></div><select disabled={assigning} onChange={(e) => assign(group, e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"><option value="">Asignar a...</option>{competitions.map((competition) => <option key={competition.id} value={competition.id}>{competition.name}</option>)}</select></div>)}{unresolved.length === 0 && <p className="text-zinc-500 text-sm">No hay competencias sin vincular.</p>}</div>
    <MergeBox competitions={competitions} onMerge={mergeDuplicate} assigning={assigning} />
  </div>;
}

function MergeBox({ competitions, onMerge, assigning }) {
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  return <div className="border-t border-zinc-800 pt-4"><p className="text-sm text-white font-medium mb-2">Fusionar competencias duplicadas</p><div className="flex flex-col md:flex-row gap-2"><select value={source} onChange={(e) => setSource(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"><option value="">Duplicada</option>{competitions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><select value={target} onChange={(e) => setTarget(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"><option value="">Oficial</option>{competitions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button disabled={assigning || !source || !target} onClick={() => onMerge(source, target)} className="px-3 py-2 rounded-lg bg-zinc-700 text-white text-sm disabled:opacity-40">Fusionar</button></div></div>;
}