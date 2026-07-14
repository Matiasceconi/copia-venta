import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { STATUS_LABELS } from "./medicalStatusConfig";

export default function MedicalEpisodeEditModal({ episode, onClose, onSaved }) {
  const [form, setForm] = useState({
    categoria_division: episode.categoria_division || "",
    lesion_consulta: episode.lesion_consulta || "",
    mmii_afectado: episode.mmii_afectado || "",
    fecha_inicio_tto: episode.fecha_inicio_tto || "",
    fecha_final_tto: episode.fecha_final_tto || "",
    perdida_dias: episode.perdida_dias ?? "",
    etapa_rhb: episode.etapa_rhb || "",
    observaciones: episode.observaciones || "",
    medical_status: episode.medical_status || "lesionado",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const payload = {
        ...form,
        perdida_dias: form.perdida_dias === "" ? undefined : Number(form.perdida_dias),
        source: "app",
        edited_by: user?.full_name || user?.email || "Usuario",
        edited_at: new Date().toISOString(),
      };
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
      await base44.entities.MedicalEpisode.update(episode.id, payload);
      await base44.functions.invoke("recalculateMedicalCurrentStatus", {});
      toast({ title: "Registro actualizado" });
      onSaved();
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Editar registro médico — {episode.player_name_original}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Categoría/División</label>
              <Input value={form.categoria_division} onChange={(e) => setForm((f) => ({ ...f, categoria_division: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">MMII Afectado</label>
              <Input value={form.mmii_afectado} onChange={(e) => setForm((f) => ({ ...f, mmii_afectado: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white" />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Lesión / Consulta *</label>
            <Input value={form.lesion_consulta} onChange={(e) => setForm((f) => ({ ...f, lesion_consulta: e.target.value }))} required className="bg-zinc-800 border-zinc-700 text-white" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Estado</label>
            <Select value={form.medical_status} onValueChange={(v) => setForm((f) => ({ ...f, medical_status: v }))}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {Object.entries(STATUS_LABELS).map(([v, label]) => (
                  <SelectItem key={v} value={v} className="text-white">{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Fecha inicio TTO</label>
              <Input type="date" value={form.fecha_inicio_tto} onChange={(e) => setForm((f) => ({ ...f, fecha_inicio_tto: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Fecha final TTO</label>
              <Input type="date" value={form.fecha_final_tto} onChange={(e) => setForm((f) => ({ ...f, fecha_final_tto: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Días perdidos</label>
              <Input type="number" value={form.perdida_dias} onChange={(e) => setForm((f) => ({ ...f, perdida_dias: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Etapa RHB</label>
              <Input value={form.etapa_rhb} onChange={(e) => setForm((f) => ({ ...f, etapa_rhb: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white" />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Observaciones</label>
            <Textarea value={form.observaciones} onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))} rows={2} className="bg-zinc-800 border-zinc-700 text-white resize-none" />
          </div>
          <Button type="submit" disabled={saving} className="w-full bg-white text-zinc-900 hover:bg-zinc-200">
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}