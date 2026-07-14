import React, { useState, useRef } from "react";
import { Camera, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import PlayerPhoto from "@/components/player/PlayerPhoto";
import { fileToTransparentPng } from "@/lib/playerPhotoPng";

export default function PlayerPhotoUpload({ player, onPhotoUpdate }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const pngFile = await fileToTransparentPng(file);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: pngFile });
      await base44.entities.Player.update(player.id, { photo_url: file_url });
      // No mutar el prop directamente — notificar con la nueva URL para que el padre actualice su estado
      onPhotoUpdate?.(file_url);
      toast({ title: "Foto actualizada" });
    } catch (err) {
      toast({ title: "Error al cargar foto", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="relative group"
      >
        <PlayerPhoto
          player={player}
          className="w-10 h-10 rounded-full object-cover border-2 border-zinc-700 group-hover:opacity-75 transition-opacity"
          fallbackClassName="w-10 h-10 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center group-hover:bg-zinc-700 transition-colors"
          textClassName="text-xs font-bold text-zinc-500"
        />
        <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera size={14} className="text-white" />
        </div>
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </button>
    </div>
  );
}