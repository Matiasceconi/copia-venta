import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function GpsRecalculateProfilesButton({ squadId, seasonId, onDone }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function recalculate() {
    if (!squadId) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await base44.functions.invoke("recalculateGpsProfiles", { squad_id: squadId, season_id: seasonId });
      setMessage(`Actualizados: ${res.data?.competitionProfilesUpdated || 0} partido · ${res.data?.microcycleProfilesUpdated || 0} microciclo`);
      await onDone?.();
    } catch {
      setMessage("No se pudo recalcular. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button onClick={recalculate} disabled={loading || !squadId} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-400 text-white rounded-xl text-sm font-bold transition-colors">
        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        {loading ? "Recalculando..." : "Recalcular perfiles GPS"}
      </button>
      {message && <span className="text-xs text-zinc-400">{message}</span>}
    </div>
  );
}