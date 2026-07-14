import React from "react";
import { Heart } from "lucide-react";
import Medical from "@/pages/Medical";

export default function PerformanceMedical() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Heart size={22} className="text-zinc-400" />
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Área Médica</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Rendimiento · Lesiones, molestias, reintegros y controles médicos</p>
        </div>
      </div>
      <Medical />
    </div>
  );
}