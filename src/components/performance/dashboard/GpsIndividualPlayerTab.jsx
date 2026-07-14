import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { isGoalkeeper } from "@/components/squad/squadConstants";
import { avg } from "../externalGpsLoadUtils";
import GpsIndividualPlayerSelector from "./GpsIndividualPlayerSelector";
import GpsIndividualPlayerReport from "./GpsIndividualPlayerReport";

export default function GpsIndividualPlayerTab({
  players,
  gpsBySession,
  sessions,
  playerMap,
  competitionProfiles,
}) {
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [playerData, setPlayerData] = useState(null);
  const [playerGpsRecords, setPlayerGpsRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // Set initial player
  useEffect(() => {
    const availablePlayers = players.filter((p) => !isGoalkeeper(p));
    if (availablePlayers.length > 0 && !selectedPlayerId) {
      setSelectedPlayerId(availablePlayers[0].id);
    }
  }, [players, selectedPlayerId]);

  // Load player data when selected
  useEffect(() => {
    if (!selectedPlayerId) return;

    async function loadPlayer() {
      setLoading(true);
      try {
        const player = await base44.entities.Player.get(selectedPlayerId);
        setPlayerData(player);

        // Get all GPS records for this player
        const allRecords = await base44.entities.SessionGPSData.filter(
          { player_id: selectedPlayerId },
          "-created_date",
          500
        );

        // Filter to only sessions in our current dataset
        const sessionIds = new Set(sessions.map((s) => s.id));
        const filtered = allRecords.filter((r) => sessionIds.has(r.session_id));
        setPlayerGpsRecords(filtered);
      } catch (err) {
        console.error("Error loading player data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPlayer();
  }, [selectedPlayerId, sessions]);

  // Enrich records with session and player info
  const enrichedRecords = useMemo(() => {
    const sessionMap = {};
    sessions.forEach((s) => {
      sessionMap[s.id] = s;
    });

    return playerGpsRecords
      .filter((r) => r.include_in_session_average !== false)
      .map((r) => ({
        ...r,
        date: sessionMap[r.session_id]?.date || "",
        sessionTitle: sessionMap[r.session_id]?.title || "",
        matchDayCode: sessionMap[r.session_id]?.match_day_code || "",
      }))
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [playerGpsRecords, sessions]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (enrichedRecords.length === 0) {
      return {
        sessionsCount: 0,
        avgDistance: 0,
        maxDistance: 0,
        avgSprints: 0,
        maxSprints: 0,
        avgPlayerLoad: 0,
        maxPlayerLoad: 0,
        avgSpeed: 0,
        maxSpeed: 0,
      };
    }

    return {
      sessionsCount: enrichedRecords.length,
      total_distance: avg(enrichedRecords.map((r) => r.total_distance)),
      m_min: avg(enrichedRecords.map((r) => r.m_min)),
      distance_19_8: avg(enrichedRecords.map((r) => r.distance_19_8)),
      distance_25: avg(enrichedRecords.map((r) => r.distance_25)),
      sprints: avg(enrichedRecords.map((r) => r.sprints)),
      acc_3: avg(enrichedRecords.map((r) => r.acc_3)),
      dec_3: avg(enrichedRecords.map((r) => r.dec_3)),
      player_load: avg(enrichedRecords.map((r) => r.player_load)),
      smax: avg(enrichedRecords.map((r) => r.smax)),
      avgDistance: avg(enrichedRecords.map((r) => r.total_distance)),
      maxDistance: Math.max(...enrichedRecords.map((r) => r.total_distance || 0)),
      avgSprints: avg(enrichedRecords.map((r) => r.sprints)),
      maxSprints: Math.max(...enrichedRecords.map((r) => r.sprints || 0)),
      avgPlayerLoad: avg(enrichedRecords.map((r) => r.player_load)),
      maxPlayerLoad: Math.max(...enrichedRecords.map((r) => r.player_load || 0)),
      avgSpeed: avg(enrichedRecords.map((r) => r.smax)),
      maxSpeed: Math.max(...enrichedRecords.map((r) => r.smax || 0)),
    };
  }, [enrichedRecords]);

  const competitionProfile = competitionProfiles.find(
    (p) => p.player_id === selectedPlayerId
  );

  const availablePlayers = players.filter((p) => !isGoalkeeper(p));

  return (
    <div className="space-y-5">
      {/* Player Selector */}
      <GpsIndividualPlayerSelector
        players={availablePlayers}
        selectedPlayerId={selectedPlayerId}
        onSelectPlayer={setSelectedPlayerId}
        loading={loading}
      />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
        </div>
      ) : playerData ? (
        <>
          <GpsIndividualPlayerReport
            player={playerData}
            records={enrichedRecords}
            stats={stats}
            competitionProfile={competitionProfile}
          />
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-zinc-500 text-sm">No hay datos disponibles</p>
        </div>
      )}
    </div>
  );
}