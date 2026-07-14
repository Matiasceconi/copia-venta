import React from "react";
import { Printer, Trophy, MapPin, Clock, Dumbbell, Utensils, Bus, Video, CalendarDays } from "lucide-react";
import moment from "moment";
import "moment/locale/es";
import { CLUB_BRAND } from "@/lib/clubBrand";

moment.locale("es");

function norm(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function typeStyle(event) {
  const text = norm(`${event.title || ""} ${event.event_type || ""} ${event.type || ""} ${event.location || ""}`);
  if (text.includes("partido")) return { icon: Trophy, label: "Partido", color: CLUB_BRAND.colors.greenDeep, bg: "#E6F4EA" };
  if (text.includes("gimnasio") || text.includes("fuerza")) return { icon: Dumbbell, label: "Gimnasio", color: "#1D4ED8", bg: "#DBEAFE" };
  if (text.includes("almuerzo") || text.includes("cena") || text.includes("desayuno") || text.includes("comida")) return { icon: Utensils, label: "Comida", color: "#D97706", bg: "#FEF3C7" };
  if (text.includes("viaje") || text.includes("salida") || text.includes("traslado")) return { icon: Bus, label: "Viaje", color: "#7C3AED", bg: "#EDE9FE" };
  if (text.includes("video") || text.includes("charla")) return { icon: Video, label: "Video", color: "#EA580C", bg: "#FFEDD5" };
  return { icon: CalendarDays, label: event.event_type || event.type || "Actividad", color: CLUB_BRAND.colors.green, bg: "#ECFDF3" };
}

function timeText(event) {
  const start = event.start_time || event.time || "";
  const end = event.end_time || "";
  if (start && end) return `${start} - ${end}`;
  return start || "Horario sin definir";
}

function EventPrintCard({ event }) {
  const style = typeStyle(event);
  const Icon = style.icon;
  return (
    <div className="rounded-xl border p-2 break-inside-avoid" style={{ borderColor: `${style.color}55`, backgroundColor: style.bg }}>
      <div className="flex items-start gap-2">
        {event.rival_logo_url ? <img src={event.rival_logo_url} alt="Escudo" className="w-8 h-8 object-contain rounded-lg bg-white p-0.5" /> : <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: style.color, color: "white" }}><Icon size={15} /></span>}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase" style={{ color: style.color }}>{style.label}</p>
          <p className="text-xs font-black text-zinc-950 leading-tight">{event.rival ? `vs ${event.rival}` : event.title}</p>
          <div className="mt-1 space-y-0.5 text-[10px] font-bold text-zinc-600">
            <p className="flex items-center gap-1"><Clock size={10} />{timeText(event)}{event.duration_minutes ? ` · ${event.duration_minutes}min` : ""}</p>
            {event.location && <p className="flex items-center gap-1"><MapPin size={10} />{event.location}</p>}
            {event.home_away && <p>{event.home_away}</p>}
          </div>
        </div>
      </div>
      {event.notes && <p className="mt-2 text-[10px] text-zinc-500 leading-snug">{event.notes}</p>}
    </div>
  );
}

export default function ScheduleExportView({ days, eventsForDate, activeSquad, activeSeasonId, getPlanMeta, onExit }) {
  const isSingleDay = days.length === 1;
  const title = isSingleDay ? "Cronograma del Día" : "Cronograma Semanal";
  const range = isSingleDay ? days[0].format("dddd DD/MM/YYYY") : `${days[0].format("DD/MM")} - ${days[days.length - 1].format("DD/MM/YYYY")}`;
  const allEvents = days.flatMap((day) => eventsForDate(day.format("YYYY-MM-DD")));

  return (
    <div className="min-h-screen bg-white text-zinc-950 p-6 print:p-0">
      <style>{`@page { size: landscape; margin: 8mm; } @media print { .no-print { display: none !important; } body { background: white !important; } .break-inside-avoid { break-inside: avoid; } }`}</style>
      <div className="no-print flex justify-end gap-2 mb-4">
        <button onClick={() => window.print()} className="px-3 py-2 bg-zinc-900 text-white rounded-lg text-sm flex items-center gap-2"><Printer size={15} /> Imprimir / PDF</button>
        <button onClick={onExit} className="px-3 py-2 bg-zinc-200 rounded-lg text-sm">Volver</button>
      </div>

      <div className="rounded-2xl border-b-4 pb-4 mb-5 p-4 flex justify-between items-start" style={{ borderColor: CLUB_BRAND.colors.green, background: `linear-gradient(135deg, ${CLUB_BRAND.colors.panel}, #ffffff 62%, ${CLUB_BRAND.colors.yellow}22)` }}>
        <div className="flex items-center gap-4">
          <img src={CLUB_BRAND.logoUrl} alt={CLUB_BRAND.name} className="w-16 h-16 object-contain" />
          <div><p className="text-xs font-bold uppercase" style={{ color: CLUB_BRAND.colors.greenDark }}>{CLUB_BRAND.name}</p><h1 className="text-3xl font-black">{title}</h1><p className="text-sm text-zinc-600">{activeSquad?.name || "Plantel"} · {activeSeasonId || activeSquad?.season || "Temporada"} · {range}</p></div>
        </div>
        <div className="text-right text-sm"><p className="font-black uppercase" style={{ color: CLUB_BRAND.colors.greenDeep }}>Vista imprimible</p><p className="text-zinc-600">{moment().format("DD/MM/YYYY HH:mm")}</p></div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border p-3" style={{ borderColor: CLUB_BRAND.colors.line }}><p className="text-[10px] font-black uppercase text-zinc-500">Días</p><p className="text-2xl font-black">{days.length}</p></div>
        <div className="rounded-xl border p-3" style={{ borderColor: CLUB_BRAND.colors.line }}><p className="text-[10px] font-black uppercase text-zinc-500">Actividades</p><p className="text-2xl font-black" style={{ color: CLUB_BRAND.colors.greenDark }}>{allEvents.length}</p></div>
        <div className="rounded-xl border p-3" style={{ borderColor: CLUB_BRAND.colors.line }}><p className="text-[10px] font-black uppercase text-zinc-500">Partidos</p><p className="text-2xl font-black">{allEvents.filter((event) => norm(`${event.title} ${event.type} ${event.event_type}`).includes("partido")).length}</p></div>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
        {days.map((day) => {
          const date = day.format("YYYY-MM-DD");
          const events = eventsForDate(date);
          const planMeta = getPlanMeta?.(date);
          return (
            <div key={date} className="border rounded-xl overflow-hidden break-inside-avoid bg-white" style={{ borderColor: CLUB_BRAND.colors.line }}>
              <div className="p-2 text-center border-b" style={{ borderColor: CLUB_BRAND.colors.line, backgroundColor: CLUB_BRAND.colors.greenDark }}>
                <p className="text-[10px] font-black text-white uppercase tracking-widest">{day.format("dddd")}</p>
                <p className="text-xl font-black" style={{ color: CLUB_BRAND.colors.yellow }}>{day.format("DD/MM")}</p>
                {planMeta && <p className="mt-1 rounded-lg px-2 py-1 text-[9px] font-black bg-white/15 text-white">{planMeta.match_day_code} · {planMeta.session_objective}</p>}
              </div>
              <div className="p-2 space-y-2 min-h-[270px]" style={{ backgroundColor: events.length ? "#FFFFFF" : CLUB_BRAND.colors.panel }}>
                {events.length ? events.map((event) => <EventPrintCard key={event.id} event={event} />) : <div className="h-full min-h-[230px] flex items-center justify-center text-center text-zinc-400"><div><p className="text-3xl">☾</p><p className="text-xs font-black mt-2">SIN EVENTOS</p></div></div>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-xl border p-3 text-xs text-zinc-600" style={{ borderColor: CLUB_BRAND.colors.line }}>
        <b style={{ color: CLUB_BRAND.colors.greenDeep }}>Observaciones:</b> horarios sujetos a modificación. Documento generado automáticamente desde PerformancePitch.
      </div>
    </div>
  );
}