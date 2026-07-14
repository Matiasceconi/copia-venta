import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, AlertCircle, Check, Edit2, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import GpsReconciliationTool from "@/components/tools/GpsReconciliationTool";

export default function PlayerNameManagement() {
  const [tab, setTab] = useState("reconciliation");
  const [players, setPlayers] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [playersData, mappingsData] = await Promise.all([
        base44.entities.Player.list('', 200),
        base44.entities.PlayerNameMapping.list('', 200),
      ]);
      setPlayers(playersData);
      setMappings(mappingsData);
    } catch {
      toast({ title: "Error al cargar datos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePlayerName(playerId, newName, photoUrl) {
    try {
      await base44.entities.Player.update(playerId, { name: newName, photo_url: photoUrl });
      setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, name: newName, photo_url: photoUrl } : p));
      setEditingId(null);
      toast({ title: "Nombre actualizado" });
    } catch {
      toast({ title: "Error al actualizar", variant: "destructive" });
    }
  }

  async function handleSyncMappings() {
    try {
      const response = await base44.functions.invoke('syncPlayerNameMappings', {});
      toast({ title: `Sincronizados: ${response.data.created} nuevos, ${response.data.updated} actualizados` });
      await loadData();
    } catch {
      toast({ title: "Error en sincronización", variant: "destructive" });
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestión de Nombres GPS</h1>
          <p className="text-zinc-400 text-sm mt-1">Vinculá nombres de CSV con jugadores por ID</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
          <button onClick={() => setTab("reconciliation")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "reconciliation" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"}`}>
            <Link size={14} /> Reconciliación
          </button>
          <button onClick={() => setTab("mappings")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "mappings" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"}`}>
            <AlertCircle size={14} /> Variaciones ({mappings.length})
          </button>
        </div>

        {/* Reconciliation tool */}
        {tab === "reconciliation" && <GpsReconciliationTool />}

        {/* Mappings / aliases */}
        {tab === "mappings" && (
          <div className="space-y-4">
            <Button onClick={handleSyncMappings} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
              <Plus size={16} /> Sincronizar variaciones de CSV
            </Button>
            <div className="grid gap-3">
              {players.map(player => {
                const mapping = mappings.find(m => m.player_id === player.id);
                const isEditing = editingId === player.id;
                return (
                  <div key={player.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                    <div className="flex gap-4 items-start">
                      <div className="shrink-0">
                        {player.photo_url
                          ? <img src={player.photo_url} alt={player.full_name} className="w-12 h-12 rounded-full object-cover border-2 border-zinc-700" />
                          : <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-zinc-700">
                              <span className="text-base font-bold text-zinc-500">{(player.full_name || "?").charAt(0)}</span>
                            </div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input value={editData.name || player.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white" />
                            <div className="flex gap-2">
                              <Button onClick={() => handleUpdatePlayerName(player.id, editData.name || player.name, editData.photo_url || player.photo_url)}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm"><Check size={14} /> Guardar</Button>
                              <Button onClick={() => setEditingId(null)} className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white text-sm">Cancelar</Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <h3 className="text-sm font-semibold text-white">{player.full_name || player.name || "—"}</h3>
                            <p className="text-xs text-zinc-500">{player.position}</p>
                            {mapping?.aliases?.length > 0 && (
                              <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
                                <p className="text-[10px] font-semibold text-yellow-300 flex items-center gap-1 mb-1">
                                  <AlertCircle size={11} /> {mapping.aliases.length} variación(es)
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {mapping.aliases.map((alias, idx) => (
                                    <span key={idx} className="text-[10px] bg-yellow-500/20 text-yellow-200 px-1.5 py-0.5 rounded border border-yellow-500/30">{alias}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {!isEditing && (
                        <button onClick={() => { setEditingId(player.id); setEditData({ name: player.name, photo_url: player.photo_url || "" }); }}
                          className="p-2 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors">
                          <Edit2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}