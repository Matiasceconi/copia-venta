import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Fingerprint, Tag, GitMerge, BarChart2, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import IdentityOfficialTab from "@/components/identity/IdentityOfficialTab";
import IdentityAliasTab from "@/components/identity/IdentityAliasTab";
import IdentityDuplicatesTab from "@/components/identity/IdentityDuplicatesTab";
import IdentityCoverageTab from "@/components/identity/IdentityCoverageTab";

const TABS = [
  { key: "official",    label: "ID Oficial",     icon: Fingerprint },
  { key: "aliases",     label: "Alias",           icon: Tag },
  { key: "duplicates",  label: "Duplicados",      icon: GitMerge },
  { key: "coverage",    label: "Cobertura",       icon: BarChart2 },
];

export default function PlayerIdentity() {
  const [tab, setTab] = useState("official");
  const [players, setPlayers] = useState([]);
  const [aliases, setAliases] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => { loadBase(); }, []);

  async function loadBase() {
    setLoading(true);
    const [ps, as] = await Promise.all([
      base44.entities.Player.list("", 500),
      base44.entities.PlayerAlias.list("", 2000),
    ]);
    setPlayers(ps);
    setAliases(as);
    setLoading(false);
  }

  function onPlayersChanged(updated) { setPlayers(updated); }
  function onAliasesChanged(updated) { setAliases(updated); }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Fingerprint size={22} className="text-yellow-400" />
            Player Identity Manager
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Fuente única de verdad · {players.length} jugadores · {aliases.length} alias registrados
          </p>
        </div>
        <button
          onClick={loadBase}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {tab === "official"   && <IdentityOfficialTab   players={players} aliases={aliases} onPlayersChanged={onPlayersChanged} toast={toast} />}
          {tab === "aliases"    && <IdentityAliasTab      players={players} aliases={aliases} onAliasesChanged={onAliasesChanged} toast={toast} />}
          {tab === "duplicates" && <IdentityDuplicatesTab players={players} onPlayersChanged={onPlayersChanged} toast={toast} reload={loadBase} />}
          {tab === "coverage"   && <IdentityCoverageTab   players={players} toast={toast} />}
        </>
      )}
    </div>
  );
}