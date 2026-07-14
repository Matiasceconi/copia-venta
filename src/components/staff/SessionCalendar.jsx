import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import moment from "moment";
import "moment/locale/es";

moment.locale("es");

const typeColors = {
  "Entrenamiento": "bg-blue-500",
  "Táctica":       "bg-purple-500",
  "Físico":        "bg-orange-500",
  "Regenerativo":  "bg-emerald-500",
  "Partido amistoso": "bg-red-500",
  "Otro":          "bg-zinc-500",
};

const typeDot = {
  "Entrenamiento": "bg-blue-400",
  "Táctica":       "bg-purple-400",
  "Físico":        "bg-orange-400",
  "Regenerativo":  "bg-emerald-400",
  "Partido amistoso": "bg-red-400",
  "Otro":          "bg-zinc-400",
};

const intensityBorder = {
  "Baja":     "border-l-blue-400",
  "Media":    "border-l-yellow-400",
  "Alta":     "border-l-orange-400",
  "Muy alta": "border-l-red-400",
};

export default function SessionCalendar({ sessions, onDayClick }) {
  const [current, setCurrent] = useState(moment().startOf("month"));
  const [selected, setSelected] = useState(null);

  const startOfMonth = current.clone().startOf("month");
  const endOfMonth   = current.clone().endOf("month");
  const startGrid    = startOfMonth.clone().startOf("isoWeek");
  const endGrid      = endOfMonth.clone().endOf("isoWeek");

  const days = [];
  let d = startGrid.clone();
  while (d.isSameOrBefore(endGrid, "day")) {
    days.push(d.clone());
    d.add(1, "day");
  }

  const sessionsByDate = {};
  sessions.forEach((s) => {
    const key = s.date;
    if (!sessionsByDate[key]) sessionsByDate[key] = [];
    sessionsByDate[key].push(s);
  });

  const today = moment().format("YYYY-MM-DD");

  function handleDayClick(day) {
    const key = day.format("YYYY-MM-DD");
    setSelected(key);
    onDayClick && onDayClick(key, sessionsByDate[key] || []);
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <button
          onClick={() => setCurrent(current.clone().subtract(1, "month"))}
          className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-sm font-semibold text-white capitalize">
          {current.format("MMMM YYYY")}
        </h2>
        <button
          onClick={() => setCurrent(current.clone().add(1, "month"))}
          className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 border-b border-zinc-800">
        {dayNames.map((dn) => (
          <div key={dn} className="text-center text-xs font-medium text-zinc-600 py-2">
            {dn}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="divide-y divide-zinc-800/60">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 divide-x divide-zinc-800/60">
            {week.map((day) => {
              const key      = day.format("YYYY-MM-DD");
              const isToday  = key === today;
              const isMonth  = day.isSame(current, "month");
              const isSelected = key === selected;
              const daySessions = sessionsByDate[key] || [];
              const hasSession  = daySessions.length > 0;

              return (
                <button
                  key={key}
                  onClick={() => handleDayClick(day)}
                  className={`min-h-[80px] p-1.5 text-left flex flex-col transition-colors
                    ${isSelected ? "bg-zinc-800" : "hover:bg-zinc-800/40"}
                    ${!isMonth ? "opacity-30" : ""}`}
                >
                  <span
                    className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1
                      ${isToday ? "bg-white text-zinc-900" : "text-zinc-400"}`}
                  >
                    {day.format("D")}
                  </span>
                  <div className="flex flex-col gap-0.5 w-full">
                    {daySessions.slice(0, 2).map((s, i) => (
                      <span
                        key={i}
                        className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate text-white
                          ${typeColors[s.session_type] || "bg-zinc-600"} bg-opacity-80`}
                      >
                        {s.title}
                      </span>
                    ))}
                    {daySessions.length > 2 && (
                      <span className="text-[10px] text-zinc-500 pl-1">
                        +{daySessions.length - 2} más
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="px-5 py-3 border-t border-zinc-800 flex flex-wrap gap-3">
        {Object.entries(typeDot).map(([type, dot]) => (
          <span key={type} className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span className={`w-2 h-2 rounded-full ${dot}`} />
            {type}
          </span>
        ))}
      </div>
    </div>
  );
}