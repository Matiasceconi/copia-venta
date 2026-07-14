import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useEffect } from "react";

export function usePlayers() {
  const queryClient = useQueryClient();
  const { data: rawPlayers = [], isLoading } = useQuery({
    queryKey: ["players"],
    queryFn: () => base44.entities.Player.list("name", 100),
    staleTime: 1000 * 60 * 5, // 5 min cache
  });

  // Suscribirse a cambios en Player para actualizar fotos en tiempo real (con debounce)
  useEffect(() => {
    let timer;
    const unsubscribe = base44.entities.Player.subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["players"] });
      }, 2000);
    });
    return () => { unsubscribe(); clearTimeout(timer); };
  }, [queryClient]);

  // Helper para obtener nombre completo
  const getFullName = (p) => p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim();

  // Map by ID for O(1) lookup
  const playerMap = Object.fromEntries(rawPlayers.map((p) => [p.id, { ...p, name: getFullName(p) }]));

  // Normalizar nombre: remover tildes y convertir a minúsculas
  const normalizeName = (name) => {
    return (name || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  };

  // Obtener palabras clave del nombre (apellido + nombre)
  const getNameWords = (name) => {
    return normalizeName(name)
      .split(/\s+/)
      .filter(w => w.length > 2);
  };

  // Verificar si dos nombres coinciden (matching flexible)
  const namesMatch = (name1, name2) => {
    const words1 = getNameWords(name1);
    const words2 = getNameWords(name2);
    if (words1.length === 0 || words2.length === 0) return false;
    // Al menos 2 palabras deben coincidir (maneja variaciones de formato)
    const matches = words1.filter(w => words2.includes(w)).length;
    return matches >= Math.max(1, Math.min(words1.length, words2.length) - 1);
  };

  function getPlayer(player_id, player_name) {
    if (player_id && playerMap[player_id]) return playerMap[player_id];
    if (player_name) {
      // Buscar coincidencia exacta primero
      const normalized = normalizeName(player_name);
      for (const p of rawPlayers) {
        const pName = getFullName(p);
        if (normalizeName(pName) === normalized) return { ...p, name: pName };
      }
      // Si no encuentra exacta, buscar por matching flexible
      for (const p of rawPlayers) {
        const pName = getFullName(p);
        if (namesMatch(player_name, pName)) return { ...p, name: pName };
      }
    }
    return null;
  }

  const players = rawPlayers.map((p) => ({
    ...p,
    name: getFullName(p),
    id: p.id // Asegurar que el id está ahí
  }));

  return { players, playerMap, getPlayer, isLoading };
}