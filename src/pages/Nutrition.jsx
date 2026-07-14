import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, CheckCircle2, Upload, AlertTriangle } from "lucide-react";
import moment from "moment";
import SkinfoldTab from "@/components/nutrition/SkinfoldTab";
import ReadingTab from "@/components/nutrition/ReadingTab";
import NutritionRepairPanel from "@/components/nutrition/NutritionRepairPanel";
import NutritionImportModal from "@/components/nutrition/NutritionImportModal";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";

const TABS = [
  { id: "skinfold", label: "Seguimiento de pliegues" },
  { id: "reading", label: "Informe de una lectura" },
];

export default function Nutrition() {
  const [assessments, setAssessments] = useState([]);
  const [interpretations, setInterpretations] = useState([]);
  const [readingStatuses, setReadingStatuses] = useState([]);
  const [referenceRanges, setReferenceRanges] = useState([]);
  const [players, setPlayers] = useState([]);
  const [squads, setSquads] = useState([]);
  const [syncState, setSyncState] = useState(null);
  const [activeTab, setActiveTab] = useState("skinfold");
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const { activeSquad, activeSeasonId } = useWorkspace();
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    try {
      const [rows, interpRows, statusRows, referenceRows, playerRows, squadRows, syncRows] = await Promise.all([
        base44.entities.NutritionAssessment.list("-fecha", 3000),
        base44.entities.NutritionInterpretation.list("-fecha", 3000),
        base44.entities.NutritionReadingStatus.list("order", 100).catch(() => []),
        base44.entities.NutritionReferenceRange.list("order", 200).catch(() => []),
        base44.entities.Player.list("full_name", 3000),
        base44.entities.Squad.filter({ active: true }, "name", 100),
        base44.entities.NutritionSyncState.list("-updated_date", 5),
      ]);
      setAssessments(rows);
      setInterpretations(interpRows);
      setReadingStatuses(statusRows);
      setReferenceRanges(referenceRows);
      setPlayers(playerRows);
      setSquads(squadRows);
      setSyncState(syncRows[0] || null);
    } catch (e) {
      toast({ title: "Error al cargar datos", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const lastSync = syncState?.last_synced_at
    ? moment(syncState.last_synced_at).format("DD/MM/YYYY HH:mm")
    : "Sin sincronizar";

  const unlinkedCount = useMemo(
    () => assessments.filter((a) => !a.linked || !a.player_id).length,
    [assessments]
  );

  const allTabs = useMemo(() => {
    const tabs = [...TABS];
    if (unlinkedCount > 0) {
      tabs.push({ id: "unlinked", label: `Sin vincular (${unlinkedCount})`, warn: true });
    }
    return tabs;
  }, [unlinkedCount]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="w-7 h-7 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-zinc-950 text-white min-h-[calc(100vh-64px)] p-5 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Nutrición</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Seguimiento antropométrico y lecturas nutricionales
            {activeSquad && (
              <span className="ml-2 text-zinc-400">
                · <span className="text-emerald-400 font-medium">{activeSquad.name}</span>
                {(activeSeasonId || activeSquad?.season) && (
                  <span className="text-zinc-500 ml-1">· {activeSeasonId || activeSquad.season}</span>
                )}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Last sync */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
            <span>Última sync: <b className="text-zinc-300">{lastSync}</b></span>
          </div>

          {/* Refresh button */}
          <button
            onClick={load}
            title="Actualizar datos"
            className="inline-flex items-center justify-center px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors"
          >
            <RefreshCw size={14} />
          </button>

          {/* Import button */}
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-lg transition-colors"
          >
            <Upload size={14} />
            Importar
          </button>

          {/* Unlinked warning chip */}
          {unlinkedCount > 0 && (
            <button
              onClick={() => setActiveTab("unlinked")}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-900/30 border border-amber-700/40 text-amber-400 text-xs font-medium rounded-lg hover:bg-amber-900/50 transition-colors"
            >
              <AlertTriangle size={13} />
              {unlinkedCount} sin vincular
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800 overflow-x-auto">
        {allTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-4 text-sm whitespace-nowrap border-b-2 transition-colors font-medium ${
              activeTab === tab.id
                ? "border-emerald-500 text-emerald-400"
                : tab.warn
                  ? "border-transparent text-amber-500/70 hover:text-amber-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "skinfold" && (
        <SkinfoldTab
          assessments={assessments}
          interpretations={interpretations}
          referenceRanges={referenceRanges}
          players={players}
          squads={squads}
          onReload={load}
        />
      )}
      {activeTab === "reading" && (
        <ReadingTab
          interpretations={interpretations}
          assessments={assessments}
          players={players}
          readingStatuses={readingStatuses}
          squads={squads}
          onReload={load}
        />
      )}
      {activeTab === "unlinked" && (
        <NutritionRepairPanel
          assessments={assessments}
          players={players}
          onReload={load}
        />
      )}

      {/* Import modal */}
      {showImport && (
        <NutritionImportModal
          onClose={() => setShowImport(false)}
          onImported={load}
        />
      )}
    </div>
  );
}