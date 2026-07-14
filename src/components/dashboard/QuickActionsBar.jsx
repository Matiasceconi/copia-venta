import React from "react";
import { Link } from "react-router-dom";
import { PlusCircle, CalendarRange, Calendar, Activity } from "lucide-react";

const ACTIONS = [
  { label: "Armar Sesión", icon: PlusCircle, to: "/sessions", color: "text-emerald-400" },
  { label: "Planificar Semana", icon: CalendarRange, to: "/weekly-planner", color: "text-sky-400" },
  { label: "Ver Calendario", icon: Calendar, to: "/schedule", color: "text-blue-400" },
  { label: "Reportes GPS", icon: Activity, to: "/performance/external-load", color: "text-amber-400" },
];

export default function QuickActionsBar() {
  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map(({ label, icon: Icon, to, color }) => (
        <Link key={to} to={to}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-sm font-medium text-zinc-200 transition-colors">
          <Icon size={16} className={color} />
          {label}
        </Link>
      ))}
    </div>
  );
}