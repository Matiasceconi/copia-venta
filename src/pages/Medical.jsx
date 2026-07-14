import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { UserCheck, LayoutDashboard } from "lucide-react";
import MedicalDashboard from "@/components/medical/MedicalDashboard";
import MedicalSheetTable from "@/components/medical/MedicalSheetTable";
import MedicalLinkRepairModal from "@/components/medical/MedicalLinkRepairModal";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { Button } from "@/components/ui/button";

export default function Medical() {
  const { activeSquadId } = useWorkspace();
  const [squadPlayerIds, setSquadPlayerIds] = useState(null); // null = sin filtro aún
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showRepair, setShowRepair] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Obtener IDs de jugadores del plantel activo
  useEffect(() => {
    if (!activeSquadId) { setSquadPlayerIds(null); return; }
    base44.entities.SquadMembership.filter({ squad_id: activeSquadId, status: "activo" }, "player_name", 200)
      .then(members => setSquadPlayerIds(new Set(members.map(m => m.player_id))));
  }, [activeSquadId]);

  const renderTabs = () => (
    <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
      <button
        onClick={() => setActiveTab("dashboard")}
        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "dashboard" ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}
      >
        <LayoutDashboard size={13} /> Dashboard
      </button>
      <button
        onClick={() => setActiveTab("planilla")}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "planilla" ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}
      >
        Planilla Médica
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {renderTabs()}
        <Button onClick={() => setShowRepair(true)} variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800">
          <UserCheck size={15} className="mr-1.5" /> Reparar vínculos médicos
        </Button>
      </div>

      {activeTab === "dashboard" ? (
        <MedicalDashboard key={refreshKey} squadPlayerIds={squadPlayerIds} />
      ) : (
        <MedicalSheetTable key={refreshKey} squadPlayerIds={squadPlayerIds} />
      )}

      {showRepair && (
        <MedicalLinkRepairModal
          onClose={() => setShowRepair(false)}
          onRepaired={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}