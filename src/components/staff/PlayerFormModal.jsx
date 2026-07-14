import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { Camera, Trash2 } from "lucide-react";
import { resolvePlayerType, resolvePositionGroup } from "@/components/squad/squadConstants";

const positions = ["Arquero", "Defensor Central", "Lateral Derecho", "Lateral Izquierdo", "Mediocampista Central", "Volante Interno", "Extremo", "Delantero Centro"];
const dominantFeet = ["Derecha", "Izquierda", "Ambidiestro"];
const seasonPeriods = ["En competencia", "Pretemporada", "Transitorio"];

const EMPTY_FORM = {
  first_name: "", last_name: "", number: "", position: "Defensor Central", status: "Disponible",
  division: "Primera",
  season_period: "",
  injury_detail: "", expected_return: "", photo_url: "",
  birth_date: "", category: "", document_number: "",
  dominant_foot: "", birth_place: "", current_residence: "", club_housing: false, has_contract: false,
};

export default function PlayerFormModal({ player, divisions, statuses, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (player) {
      setForm({
        first_name: player.first_name || "",
        last_name: player.last_name || "",
        number: player.number ? String(player.number) : "",
        position: player.position || "Defensor Central",
        status: player.status || "Disponible",
        division: player.division || "Primera",
        season_period: player.season_period || "",
        injury_detail: player.injury_detail || "",
        expected_return: player.expected_return || "",
        photo_url: player.photo_url || "",
        birth_date: player.birth_date || "",
        category: player.category || "",
        document_number: player.document_number || "",
        dominant_foot: player.dominant_foot || "",
        birth_place: player.birth_place || "",
        current_residence: player.current_residence || "",
        club_housing: player.club_housing || false,
        has_contract: player.has_contract || false,
      });
    }
  }, [player]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, number: form.number ? Number(form.number) : undefined };
      if (form.first_name || form.last_name) {
        payload.full_name = `${form.first_name} ${form.last_name}`.trim();
      }
      // Auto-derive player_type and position_group from position
      if (payload.position) {
        payload.player_type = resolvePlayerType(payload.position);
        payload.position_group = resolvePositionGroup(payload.position);
      }
      Object.keys(payload).forEach((k) => { if (payload[k] === "") delete payload[k]; });
      await onSave(payload);
      toast({ title: "Jugador actualizado" });
    } catch (err) {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await base44.entities.Player.delete(player.id);
      toast({ title: "Jugador eliminado" });
      setShowDeleteConfirm(false);
      if (onDelete) await onDelete(player.id);
      onClose();
    } catch (err) {
      toast({ title: "Error al eliminar", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">{player ? "Editar jugador" : "Agregar jugador"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo */}
          <div className="flex items-center gap-4">
            {form.photo_url ? (
              <img src={form.photo_url} alt="Foto" className="w-16 h-16 rounded-full object-cover border border-zinc-700" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <Camera size={20} className="text-zinc-600" />
              </div>
            )}
            <div className="flex-1">
              <label className="text-xs text-zinc-400 mb-1 block">Foto del jugador</label>
              <label className="cursor-pointer inline-flex items-center gap-2 text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition-colors rounded-md px-3 py-1.5">
                {uploadingPhoto ? "Subiendo..." : "Subir imagen"}
                <input type="file" accept="image/*" className="hidden" disabled={uploadingPhoto}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingPhoto(true);
                    const { file_url } = await base44.integrations.Core.UploadFile({ file });
                    set("photo_url", file_url);
                    setUploadingPhoto(false);
                  }}
                />
              </label>
              {form.photo_url && (
                <button type="button" onClick={() => set("photo_url", "")} className="ml-2 text-xs text-zinc-600 hover:text-red-400 transition-colors">Quitar</button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Nombre *</label>
              <Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} required className="bg-zinc-800 border-zinc-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Apellido *</label>
              <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} required className="bg-zinc-800 border-zinc-700 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Número</label>
              <Input type="number" value={form.number} onChange={(e) => set("number", e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" placeholder="Opcional" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Posición *</label>
              <Select value={form.position} onValueChange={(v) => set("position", v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {positions.map((p) => <SelectItem key={p} value={p} className="text-white">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Pierna hábil</label>
              <Select value={form.dominant_foot} onValueChange={(v) => set("dominant_foot", v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {dominantFeet.map((f) => <SelectItem key={f} value={f} className="text-white">{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Fecha de nacimiento</label>
              <Input type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Nº de documento</label>
              <Input value={form.document_number} onChange={(e) => set("document_number", e.target.value)} placeholder="DNI / Pasaporte" className="bg-zinc-800 border-zinc-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Lugar de nacimiento</label>
              <Input value={form.birth_place} onChange={(e) => set("birth_place", e.target.value)} placeholder="Ciudad, País" className="bg-zinc-800 border-zinc-700 text-white" />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Residencia actual</label>
            <Input value={form.current_residence} onChange={(e) => set("current_residence", e.target.value)} placeholder="Ciudad, Barrio" className="bg-zinc-800 border-zinc-700 text-white" />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Período de temporada</label>
            <Select value={form.season_period || "__none__"} onValueChange={(v) => set("season_period", v === "__none__" ? "" : v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Sin período" /></SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="__none__" className="text-zinc-400">Sin período</SelectItem>
                {seasonPeriods.map((p) => <SelectItem key={p} value={p} className="text-white">{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">División</label>
              <Select value={form.division} onValueChange={(v) => set("division", v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {divisions.map((d) => <SelectItem key={d.id} value={d.name} className="text-white">{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Estado</label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {statuses.map((s) => <SelectItem key={s.id} value={s.name} className="text-white">{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.status !== "Disponible" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Detalle</label>
                <Input value={form.injury_detail} onChange={(e) => set("injury_detail", e.target.value)} placeholder="Ej: Desgarro isquiotibial" className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Regreso estimado</label>
                <Input type="date" value={form.expected_return} onChange={(e) => set("expected_return", e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="club_housing" checked={form.club_housing} onChange={(e) => set("club_housing", e.target.checked)} className="w-4 h-4 rounded border-zinc-700" />
              <label htmlFor="club_housing" className="text-xs text-zinc-400 cursor-pointer">Reside en la pensión del club</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="has_contract" checked={form.has_contract} onChange={(e) => set("has_contract", e.target.checked)} className="w-4 h-4 rounded border-zinc-700" />
              <label htmlFor="has_contract" className="text-xs text-zinc-400 cursor-pointer">Tiene contrato</label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {player && (
              <Button type="button" onClick={() => setShowDeleteConfirm(true)} className="flex-1 bg-red-900/40 hover:bg-red-900/60 text-red-400 border border-red-800" disabled={saving || deleting}>
                <Trash2 size={16} /> Eliminar
              </Button>
            )}
            <Button type="button" onClick={onClose} className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white" disabled={saving || deleting}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-white text-zinc-900 hover:bg-zinc-200" disabled={saving || deleting}>
              {saving ? "Guardando..." : player ? "Guardar cambios" : "Crear jugador"}
            </Button>
          </div>
        </form>

        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent className="bg-zinc-900 border-zinc-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">¿Eliminar jugador?</AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400">
                Esta acción no se puede deshacer. Se eliminará permanentemente a {form.first_name} {form.last_name}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-2">
              <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700" disabled={deleting}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction className="bg-red-900 hover:bg-red-800 text-white" disabled={deleting} onClick={handleDelete}>
                {deleting ? "Eliminando..." : "Eliminar"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}