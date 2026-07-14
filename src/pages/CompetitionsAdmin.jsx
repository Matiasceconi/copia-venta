import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trophy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import CompetitionForm from "@/components/admin/competitions/CompetitionForm";
import CompetitionList from "@/components/admin/competitions/CompetitionList";
import AliasManager from "@/components/admin/competitions/AliasManager";
import CompetitionMigrationTool from "@/components/admin/competitions/CompetitionMigrationTool";
import CompetitionPhaseManager from "@/components/admin/competitions/CompetitionPhaseManager";

export default function CompetitionsAdmin() {
  const [competitions, setCompetitions] = useState([]);
  const [aliases, setAliases] = useState([]);
  const [matches, setMatches] = useState([]);
  const [squads, setSquads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    const [competitionRows, aliasRows, matchRows, squadRows] = await Promise.all([
      base44.entities.Competitions.list("name", 300),
      base44.entities.CompetitionAliases.list("alias", 500),
      base44.entities.MatchReport.list("-date", 500),
      base44.entities.Squad.list("name", 100),
    ]);
    setCompetitions(competitionRows);
    setAliases(aliasRows);
    setMatches(matchRows);
    setSquads(squadRows);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);
  const selectedAliases = useMemo(() => aliases.filter((alias) => alias.competition_id === selected?.id), [aliases, selected]);

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" /></div>;

  return <div className="space-y-5">
    <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-white flex items-center gap-2"><Trophy size={20} className="text-yellow-400" /> Competencias</h2><p className="text-zinc-500 text-sm">Base central para vincular partidos por competition_id y evitar duplicados por escritura.</p></div><button onClick={() => setEditing({})} className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 rounded-lg text-sm"><Plus size={15} /> Nueva</button></div>
    {editing && <CompetitionForm competition={editing.id ? editing : null} squads={squads} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); loadAll(); }} />}
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4"><CompetitionList competitions={competitions} selectedId={selected?.id} onSelect={setSelected} onEdit={setEditing} /><AliasManager competition={selected} aliases={selectedAliases} onChanged={loadAll} /></div>
    <CompetitionPhaseManager competition={selected} onSaved={loadAll} />
    <CompetitionMigrationTool matches={matches} competitions={competitions} aliases={aliases} squads={squads} onDone={loadAll} />
  </div>;
}