import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import moment from "moment";

export default function MedicalRecordModal({ isOpen, onClose, players, onSubmit, form, setForm }) {
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit();
      setSubmitting(false);
    } catch (err) {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Nuevo registro médico</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Tipo de registro</label>
            <Select value={form.record_type} onValueChange={(v) => setForm(f => ({ ...f, record_type: v }))}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="Lesión" className="text-white">Lesión</SelectItem>
                <SelectItem value="Consulta/Seguimiento" className="text-white">Consulta / Seguimiento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Jugador</label>
            <Select value={form.player_id} onValueChange={(v) => setForm(f => ({ ...f, player_id: v }))}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder={players && players.length > 0 ? "Seleccionar jugador" : "Cargando..."} />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {players && players.length > 0 ? (
                  players.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-white">
                      {p.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="__none__" disabled className="text-zinc-500">
                    Sin jugadores
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Categoría/División</label>
              <Input
                value={form.category_division}
                onChange={(e) => setForm(f => ({ ...f, category_division: e.target.value }))}
                placeholder="Ej: 08/Reserva"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">MMII Afectado</label>
              <Input
                value={form.affected_limb}
                onChange={(e) => setForm(f => ({ ...f, affected_limb: e.target.value }))}
                placeholder="Derecho / Izquierdo"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Diagnóstico / Lesión *</label>
            <Input
              value={form.diagnosis}
              onChange={(e) => setForm(f => ({ ...f, diagnosis: e.target.value }))}
              required
              placeholder="Ej: Desgarro isquiotibial"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Estado</label>
            <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {["Lesionado", "En recuperación", "Seguimiento", "Alta médica"].map((s) => (
                  <SelectItem key={s} value={s} className="text-white">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Fecha inicio TTO</label>
              <Input
                type="date"
                value={form.injury_date}
                onChange={(e) => setForm(f => ({ ...f, injury_date: e.target.value }))}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Fecha final TTO</label>
              <Input
                type="date"
                value={form.expected_return}
                onChange={(e) => setForm(f => ({ ...f, expected_return: e.target.value }))}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Días perdidos</label>
              <Input
                type="number"
                value={form.days_lost}
                onChange={(e) => setForm(f => ({ ...f, days_lost: e.target.value }))}
                placeholder="0"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Etapa RHB</label>
              <Input
                value={form.rehab_stage}
                onChange={(e) => setForm(f => ({ ...f, rehab_stage: e.target.value }))}
                placeholder="Retorno con el grupo..."
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Observaciones</label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="bg-zinc-800 border-zinc-700 text-white resize-none"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white"
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-white text-zinc-900 hover:bg-zinc-200"
              disabled={submitting}
            >
              {submitting ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}