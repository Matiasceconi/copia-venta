import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import ReadingStatusBadge from "@/components/nutrition/ReadingStatusBadge";

export default function NutritionReadingEditModal({ reading, readingStatuses, onClose, onSaved }) {
  const [form, setForm] = useState({
    reading_status_id: reading?.reading_status_id || "",
    observation: reading?.observation || reading?.interpretation_note || "",
    responsible_user_id: reading?.responsible_user_id || "",
    next_control_date: reading?.next_control_date || "",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        updated_at: new Date().toISOString(),
      };
      if (!payload.reading_status_id) delete payload.reading_status_id;
      if (!payload.next_control_date) delete payload.next_control_date;
      await base44.entities.NutritionInterpretation.update(reading.id, payload);
      toast({ title: "Lectura actualizada" });
      onSaved();
    } catch (e) {
      toast({ title: "Error al guardar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const statusMap = Object.fromEntries((readingStatuses || []).map((s) => [s.id, s]));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border border-zinc-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">
            Editar lectura — {reading?.player_name_original || ""}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-5">
          {/* Status selector */}
          <div>
            <label className="text-xs text-zinc-400 mb-2 block font-medium">Estado de lectura</label>
            <div className="flex flex-wrap gap-2">
              {(readingStatuses || []).filter((s) => s.active !== false).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, reading_status_id: s.id }))}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${form.reading_status_id === s.id ? "ring-2 ring-white/20" : "opacity-60 hover:opacity-100"}`}
                  style={{
                    backgroundColor: s.color ? `${s.color}22` : "#27272a",
                    borderColor: s.color || "#3f3f46",
                    color: s.color || "#a1a1aa",
                  }}
                >
                  {s.name}
                </button>
              ))}
              {form.reading_status_id && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, reading_status_id: "" }))}
                  className="px-3 py-1.5 rounded-full text-xs text-zinc-500 border border-zinc-700 hover:bg-zinc-800"
                >
                  Limpiar
                </button>
              )}
            </div>
            {form.reading_status_id && (
              <div className="mt-2">
                <ReadingStatusBadge statusId={form.reading_status_id} statusMap={statusMap} />
              </div>
            )}
          </div>

          {/* Observation */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block font-medium">Observación</label>
            <Textarea
              value={form.observation}
              onChange={(e) => setForm((f) => ({ ...f, observation: e.target.value }))}
              rows={3}
              className="bg-zinc-800 border-zinc-700 text-white resize-none"
              placeholder="Notas sobre la lectura nutricional..."
            />
          </div>

          {/* Responsible */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block font-medium">Responsable</label>
            <Input
              value={form.responsible_user_id}
              onChange={(e) => setForm((f) => ({ ...f, responsible_user_id: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-white"
              placeholder="Nombre del profesional..."
            />
          </div>

          {/* Next control date */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block font-medium">Próximo control</label>
            <Input
              type="date"
              value={form.next_control_date}
              onChange={(e) => setForm((f) => ({ ...f, next_control_date: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <Button disabled={saving} className="w-full bg-white text-zinc-900 hover:bg-zinc-200 font-semibold">
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
