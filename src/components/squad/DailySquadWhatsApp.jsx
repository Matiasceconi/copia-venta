import React, { useState } from "react";
import { X, Copy, Check } from "lucide-react";
import { STATUS_LABELS } from "@/components/squad/squadConstants";
import moment from "moment";
import "moment/locale/es";
moment.locale("es");

function buildText(players, getEffectiveStatus, date) {
  const groups = {
    disponibles: [],
    lesionados: [],
    diferenciados: [],
    suben: [],
    bajan: [],
    convocados: [],
    ausentes: [],
    otros: [],
  };

  players.forEach(p => {
    const s = getEffectiveStatus(p);
    const name = p.full_name;
    const note = s.notes ? ` (${s.notes})` : "";
    const tags = s.tags?.length > 0 ? ` [${s.tags.join(", ")}]` : "";
    const entry = `${name}${tags}${note}`;

    if (s.status === "disponible") groups.disponibles.push(name);
    else if (s.status === "lesionado") groups.lesionados.push(entry);
    else if (s.status === "diferenciado") groups.diferenciados.push(entry);
    else if (s.status === "subió") groups.suben.push(entry);
    else if (s.status === "bajó") groups.bajan.push(entry);
    else if (s.status === "convocado") groups.convocados.push(entry);
    else if (s.status === "ausente") groups.ausentes.push(entry);
    else groups.otros.push(`${name} (${STATUS_LABELS[s.status] || s.status})${note}`);
  });

  const section = (title, items) =>
    items.length > 0 ? `*${title}:*\n${items.map(i => `• ${i}`).join("\n")}\n\n` : "";

  return (
    `*Estado del Plantel — ${moment(date).format("dddd D [de] MMMM YYYY")}*\n\n` +
    section("✅ Disponibles", groups.disponibles) +
    section("🔴 Lesionados", groups.lesionados) +
    section("🟡 Diferenciados", groups.diferenciados) +
    section("🟢 Suben", groups.suben) +
    section("🔵 Bajan", groups.bajan) +
    section("📋 Convocados", groups.convocados) +
    section("⚫ Ausentes", groups.ausentes) +
    section("ℹ️ Otros", groups.otros)
  ).trim();
}

export default function DailySquadWhatsApp({ players, getEffectiveStatus, selectedDate, onClose }) {
  const text = buildText(players, getEffectiveStatus, selectedDate);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl" style={{ maxHeight: "90vh" }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-white">Resumen para el Staff</h2>
            <p className="text-xs text-zinc-500">Listo para copiar y compartir por WhatsApp</p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <pre className="text-sm text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            {text}
          </pre>
        </div>

        <div className="flex gap-2 p-5 pt-3 border-t border-zinc-800 shrink-0">
          <button onClick={handleCopy}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              copied ? "bg-emerald-600 text-white" : "bg-white text-zinc-900 hover:bg-zinc-200"
            }`}>
            {copied ? <><Check size={15} /> Copiado!</> : <><Copy size={15} /> Copiar texto</>}
          </button>
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}