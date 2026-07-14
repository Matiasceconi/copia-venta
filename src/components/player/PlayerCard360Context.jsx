import React, { createContext, useContext, useState, useCallback } from "react";

const PlayerCard360Context = createContext(null);

export function PlayerCard360Provider({ children }) {
  const [playerId, setPlayerId] = useState(null);
  const [playerData, setPlayerData] = useState(null); // optional pre-loaded player object

  const openCard = useCallback((playerIdOrObj) => {
    if (!playerIdOrObj) return;
    if (typeof playerIdOrObj === "string") {
      setPlayerId(playerIdOrObj);
      setPlayerData(null);
    } else {
      // full player object passed — use id + pre-populate header
      setPlayerId(playerIdOrObj.id);
      setPlayerData(playerIdOrObj);
    }
  }, []);

  const closeCard = useCallback(() => {
    setPlayerId(null);
    setPlayerData(null);
  }, []);

  return (
    <PlayerCard360Context.Provider value={{ openCard, closeCard, playerId, playerData }}>
      {children}
    </PlayerCard360Context.Provider>
  );
}

export function usePlayerCard360() {
  const ctx = useContext(PlayerCard360Context);
  if (!ctx) throw new Error("usePlayerCard360 must be used inside PlayerCard360Provider");
  return ctx;
}