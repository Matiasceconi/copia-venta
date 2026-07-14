import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { UserCheck, AlertTriangle } from "lucide-react";
import { usePlayers } from "@/hooks/usePlayers";

function normalize(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function getWords(s) {
  return normalize(s).split(/\s+/).filter((w) => w.length > 2);
}

function suggestPlayer(name, players) {
  const words = getWords(name);
  if (words.length === 0) return null;
  let best = null;
  let bestScore = 0;
  players.forEach((p) => {
    const pWords = getWords(p.name);
    const matches = words.filter((w) => pWords.includes(w)).length;
    if (matches > bestScore) { bestScore = matches; best = p; }
  });
  return bestScore > 0 ? best : null;
}

export default function MedicalLinkRepairModal({ onClose, onRepaired }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(null);
  const [selections, setSelections] = useState({});
  const { players } = usePlayers();
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const unlinked = await base44.entities.MedicalEpisode.filter({ linked: false }, "-fecha_inicio_tto", 2000);
    const byName = new Map();
    unlinked.forEach((e) => {
      const key = normalize(e.player_name_original);
      if (!byName.has(key)) byName.set(key, { name: e.player_name_original, episodes: [] });
      byName.get(key).episodes.push(e);
    });
    setGroups(Array.from(byName.values()));
    setLoading(false);
  }

  const suggestions = useMemo(() => {
    const map = {};
    groups.forEach((g) => { map[g.name] = suggestPlayer(g.name, players); });
    return map;
  }, [groups, players]);

  async function handleLink(group) {
    const playerId = selections[group.name] || suggestions[group.name]?.id;
    if (!playerId) {
      toast({ title: "Seleccioná un jugador primero", variant: "destructive" });
      return;
    }
    const player = players.find((p) => p.id === playerId);
    setLinking(group.name);
    try {
      await Promise.all(group.episodes.map((e) =>
        base44.entities.MedicalEpisode.update(e.id, { player_id: playerId, linked: true })
      ));
      await base44.entities.PlayerAlias.create({
        player_id: playerId,
        player_name: player?.name || "",
        alias_name: group.name,
        normalized_alias: normalize(group.name),
        source: "Manual",
        confidence_score: 1,
      });
      await base44.functions.invoke("recalculateMedicalCurrentStatus", {});
      toast({ title: `${group.name} vinculado a ${player?.name}` });
      setGroups((prev) => prev.filter((g) => g.name !== group.name));
      onRepaired?.();
    } catch {
      toast({ title: "Error al vincular", variant: "destructive" });
    } finally {
      setLinking(null);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <UserCheck size={18} /> Reparar vínculos médicos
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" /></div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            <UserCheck size={28} className="mx-auto mb-2 text-green-500" />
            No hay registros médicos sin vincular.
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => {
              const suggested = suggestions[g.name];
              const selected = selections[g.name] ?? suggested?.id ?? "";
              return (
                <div key={g.name} className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={13} className="text-yellow-400 shrink-0" />
                    <span className="text-white text-sm font-medium">{g.name}</span>
                    <span className="text-xs text-zinc-500 ml-auto">{g.episodes.length} registro{g.episodes.length !== 1 ? "s" : ""}</span>
                  </div>
                  <Select value={selected} onValueChange={(v) => setSelections((s) => ({ ...s, [g.name]: v }))}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white h-9 text-sm">
                      <SelectValue placeholder="Seleccionar jugador oficial" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700 max-h-64">
                      {players.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-white">{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => handleLink(g)}
                    disabled={!selected || linking === g.name}
                    className="w-full bg-white text-zinc-900 hover:bg-zinc-200 h-8 text-xs"
                  >
                    {linking === g.name ? "Vinculando..." : "Vincular"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}