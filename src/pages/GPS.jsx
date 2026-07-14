import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import moment from "moment";
import "moment/locale/es";
moment.locale("es");

export default function GPS() {
  const [records, setRecords] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [metric, setMetric] = useState("total_distance");
  const [form, setForm] = useState({
    player_id: "", player_name: "", date: moment().format("YYYY-MM-DD"),
    session_label: "", total_distance: "", max_speed: "",
    high_speed_running: "", sprint_distance: "", accelerations: "",
    decelerations: "", player_load: "", heart_rate_avg: "", notes: ""
  });
  const { toast } = useToast();

  const metricOptions = [
    { key: "total_distance", label: "Distancia total (m)" },
    { key: "max_speed", label: "Vel. máxima (km/h)" },
    { key: "high_speed_running", label: "Alta velocidad (m)" },
    { key: "sprint_distance", label: "Sprint (m)" },
    { key: "player_load", label: "Player Load" },
    { key: "heart_rate_avg", label: "FC promedio" },
  ];

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [recs, pls] = await Promise.all([
        base44.entities.GPSRecord.list("-date", 100),
        base44.entities.Player.list("name", 100),
      ]);
      setRecords(recs);
      setPlayers(pls);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const player = players.find((p) => p.id === form.player_id);
      const toNum = (v) => (v !== "" ? Number(v) : undefined);
      await base44.entities.GPSRecord.create({
        ...form,
        player_name: player?.name || form.player_name,
        total_distance: toNum(form.total_distance),
        max_speed: toNum(form.max_speed),
        high_speed_running: toNum(form.high_speed_running),
        sprint_distance: toNum(form.sprint_distance),
        accelerations: toNum(form.accelerations),
        decelerations: toNum(form.decelerations),
        player_load: toNum(form.player_load),
        heart_rate_avg: toNum(form.heart_rate_avg),
      });
      toast({ title: "Registro GPS guardado" });
      setShowForm(false);
      setForm({ player_id: "", player_name: "", date: moment().format("YYYY-MM-DD"), session_label: "", total_distance: "", max_speed: "", high_speed_running: "", sprint_distance: "", accelerations: "", decelerations: "", player_load: "", heart_rate_avg: "", notes: "" });
      loadAll();
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  }

  async function deleteRecord(id) {
    await base44.entities.GPSRecord.delete(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }

  const chartData = records
    .filter((r) => r[metric] != null)
    .slice(0, 15)
    .reverse()
    .map((r) => ({ name: r.player_name?.split(" ")[0] || "—", value: r[metric], date: moment(r.date).format("DD/MM") }));

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{records.length} registros GPS</p>
        <Button onClick={() => setShowForm(true)} className="bg-white text-zinc-900 hover:bg-zinc-200">
          <Plus size={15} className="mr-1.5" /> Nuevo registro
        </Button>
      </div>

      {records.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Métrica:</p>
            <div className="flex flex-wrap gap-2">
              {metricOptions.map((m) => (
                <button key={m.key} onClick={() => setMetric(m.key)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${metric === m.key ? "bg-white text-zinc-900 border-white" : "border-zinc-700 text-zinc-400 hover:text-white"}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", color: "#fff", fontSize: 12 }} />
              <Bar dataKey="value" fill="#ffffff" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {records.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <Activity size={36} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">Sin registros GPS cargados</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {records.map((r) => (
            <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-semibold text-sm">{r.player_name}</span>
                  <span className="text-xs text-zinc-500">{moment(r.date).format("DD/MM/YYYY")}</span>
                  {r.session_label && <span className="text-xs text-zinc-500">{r.session_label}</span>}
                </div>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-zinc-500">
                  {r.total_distance && <span>Dist: <span className="text-zinc-300">{r.total_distance}m</span></span>}
                  {r.max_speed && <span>Vel. máx: <span className="text-zinc-300">{r.max_speed}km/h</span></span>}
                  {r.sprint_distance && <span>Sprint: <span className="text-zinc-300">{r.sprint_distance}m</span></span>}
                  {r.player_load && <span>Load: <span className="text-zinc-300">{r.player_load}</span></span>}
                  {r.heart_rate_avg && <span>FC: <span className="text-zinc-300">{r.heart_rate_avg}bpm</span></span>}
                </div>
                {r.notes && <p className="text-xs text-zinc-600 mt-0.5">{r.notes}</p>}
              </div>
              <button onClick={() => deleteRecord(r.id)} className="text-zinc-700 hover:text-red-400 transition-colors shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Nuevo registro GPS</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Jugador</label>
              <Select value={form.player_id} onValueChange={(v) => setForm((f) => ({ ...f, player_id: v }))}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Seleccionar jugador" /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {players.map((p) => <SelectItem key={p.id} value={p.id} className="text-white">{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Fecha</label>
                <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Sesión / Etiqueta</label>
                <Input value={form.session_label} onChange={(e) => setForm((f) => ({ ...f, session_label: e.target.value }))} placeholder="Ej: Martes tarde" className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-zinc-400 mb-1 block">Distancia total (m)</label><Input type="number" value={form.total_distance} onChange={(e) => setForm((f) => ({ ...f, total_distance: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white" /></div>
              <div><label className="text-xs text-zinc-400 mb-1 block">Vel. máxima (km/h)</label><Input type="number" step="0.1" value={form.max_speed} onChange={(e) => setForm((f) => ({ ...f, max_speed: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white" /></div>
              <div><label className="text-xs text-zinc-400 mb-1 block">Alta vel. (m)</label><Input type="number" value={form.high_speed_running} onChange={(e) => setForm((f) => ({ ...f, high_speed_running: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white" /></div>
              <div><label className="text-xs text-zinc-400 mb-1 block">Sprint (m)</label><Input type="number" value={form.sprint_distance} onChange={(e) => setForm((f) => ({ ...f, sprint_distance: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white" /></div>
              <div><label className="text-xs text-zinc-400 mb-1 block">Aceleraciones</label><Input type="number" value={form.accelerations} onChange={(e) => setForm((f) => ({ ...f, accelerations: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white" /></div>
              <div><label className="text-xs text-zinc-400 mb-1 block">Desaceleraciones</label><Input type="number" value={form.decelerations} onChange={(e) => setForm((f) => ({ ...f, decelerations: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white" /></div>
              <div><label className="text-xs text-zinc-400 mb-1 block">Player Load</label><Input type="number" step="0.1" value={form.player_load} onChange={(e) => setForm((f) => ({ ...f, player_load: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white" /></div>
              <div><label className="text-xs text-zinc-400 mb-1 block">FC promedio (bpm)</label><Input type="number" value={form.heart_rate_avg} onChange={(e) => setForm((f) => ({ ...f, heart_rate_avg: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white" /></div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Notas</label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="bg-zinc-800 border-zinc-700 text-white resize-none" />
            </div>
            <Button type="submit" className="w-full bg-white text-zinc-900 hover:bg-zinc-200">Guardar</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}