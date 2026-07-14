import React, { useState } from "react";
import { PROFILE_METRICS } from "./gpsProfileMetrics";
import GpsIndividualMicrocycleTable from "./GpsIndividualMicrocycleTable";
import GpsRecalculateProfilesButton from "./GpsRecalculateProfilesButton";

export default function GpsIndividualProfilePanel({ players, competitionProfiles, microcycleProfiles, squadId, seasonId, onReload }) {
  const [metricKey, setMetricKey] = useState("avg_total_distance");
  const metric = PROFILE_METRICS.find((m) => m.key === metricKey) || PROFILE_METRICS[0];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white">Perfil individual por microciclo</h2>
          <p className="text-zinc-500 text-sm mt-1">Promedios por día MD comparados contra el perfil competitivo real de partido +80’.</p>
        </div>
        <GpsRecalculateProfilesButton squadId={squadId} seasonId={seasonId} onDone={onReload} />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-zinc-400">Métrica</span>
        <select value={metricKey} onChange={(e) => setMetricKey(e.target.value)} className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-xl px-3 py-2">
          {PROFILE_METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
      </div>

      <GpsIndividualMicrocycleTable players={players} competitionProfiles={competitionProfiles} microcycleProfiles={microcycleProfiles} metric={metric} />
    </div>
  );
}