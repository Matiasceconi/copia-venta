import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Video, LayoutDashboard, Menu, X, Map, UsersRound, CalendarDays, Trophy,
  ClipboardList, Settings2, ShieldCheck, BookOpen, Dumbbell, LogOut, User,
  Gauge, HeartPulse, Heart, Apple, Clock, Repeat, PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import SquadSelector from "@/components/workspace/SquadSelector";
import UserProfileModal from "@/components/workspace/UserProfileModal";
import { useAuth } from "@/lib/AuthContext";
import { useWorkspace } from "@/lib/WorkspaceContext";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Sesiones", path: "/sessions", icon: Video },
  { label: "Partidos", path: "/matches", icon: Trophy },
  { label: "Mapa Táctico", path: "/tactical", icon: Map },
  { label: "Carga Externa", path: "/performance/external-load", icon: Gauge },
  { label: "Carga Interna", path: "/performance/internal-load", icon: HeartPulse },
  { label: "Área Médica", path: "/performance/medical", icon: Heart },
  { label: "Nutrición", path: "/performance/nutrition", icon: Apple },
  { label: "Minutos Jugados", path: "/performance/minutes", icon: Clock },
  { label: "Calendario", path: "/schedule", icon: CalendarDays },
  { label: "Plan Semanal", path: "/weekly-planner", icon: ClipboardList },
  { label: "Estado del Plantel", path: "/daily-squad", icon: ShieldCheck },
  { label: "Jugadores", path: "/players", icon: UsersRound },
  { label: "Biblioteca Campo", path: "/field-library", icon: BookOpen },
  { label: "Biblioteca Fuerza", path: "/strength-library", icon: Dumbbell },
  { label: "Cuerpo Técnico", path: "/team", icon: UsersRound },
  { label: "Planteles", path: "/squad-manager", icon: UsersRound },
  { label: "Configuración", path: "/admin", icon: Settings2 },
];

export default function Sidebar({ collapsed = false, onCollapsedChange }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { user } = useAuth();
  const { activeAreaName, canSeePath, requestAreaChange, myAreas } = useWorkspace();
  const visibleItems = NAV_ITEMS.filter((item) => canSeePath(item.path));

  function NavLink({ item }) {
    const isActive = location.pathname === item.path;
    return <Link to={item.path} onClick={() => setOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? "text-zinc-900 font-semibold" : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"}`} style={isActive ? { backgroundColor: "#F0C800", color: "#1a1a1a" } : {}}><item.icon size={18} />{item.label}</Link>;
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="lg:hidden fixed top-4 left-4 z-50 bg-zinc-900 text-white p-2 rounded-lg shadow-lg"><Menu size={20} /></button>
      {open && <div className="lg:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setOpen(false)} />}
      <aside className={`fixed top-0 left-0 h-full bg-zinc-950 border-r border-zinc-800 z-50 transition-[width,transform] duration-200 ease-out lg:translate-x-0 ${collapsed ? "lg:w-[72px]" : "lg:w-64"} w-64 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className={`${collapsed ? "lg:hidden" : ""}`}>
          <div className="p-4 border-b border-zinc-800 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight leading-tight">Defensa y Justicia</h1>
                <p className="text-xs mt-0.5" style={{ color: "#F0C800" }}>PerformancePitch</p>
              </div>
              <button
                type="button"
                onClick={() => onCollapsedChange?.(true)}
                aria-label="Contraer menú"
                title="Contraer menú"
                className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-white"
              >
                <PanelLeftClose size={16} />
              </button>
            </div>
            {myAreas.length > 1 && <button onClick={requestAreaChange} className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors text-left"><span className="text-xs text-zinc-300 truncate">{activeAreaName || "Área"}</span><Repeat size={12} className="text-zinc-500 shrink-0" /></button>}
            <SquadSelector />
          </div>
          <nav className="p-3 space-y-0.5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 218px)" }}>
            {visibleItems.map((item) => <NavLink key={item.path} item={item} />)}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-zinc-800 bg-zinc-950">
            <button onClick={() => setShowProfile(true)} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-zinc-800 transition-colors text-left group">
              <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">{user?.photo_url ? <img src={user.photo_url} className="w-7 h-7 rounded-full object-cover" alt="" /> : <User size={13} className="text-zinc-400" />}</div>
              <div className="flex-1 min-w-0"><p className="text-xs font-medium text-zinc-300 truncate group-hover:text-white transition-colors">{user?.full_name || user?.email || "Usuario"}</p></div>
              <LogOut size={13} className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
            </button>
          </div>
        </div>
        <div className={`${collapsed ? "hidden lg:flex" : "hidden"} h-full flex-col items-center py-4`}>
          <div className="flex shrink-0 flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => onCollapsedChange?.(false)}
              aria-label="PerformancePitch"
              title="PerformancePitch"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-sm font-black text-yellow-400 transition-colors hover:border-yellow-400/40 hover:bg-zinc-800"
            >
              PP
            </button>
            <button
              type="button"
              onClick={() => onCollapsedChange?.(false)}
              aria-label="Abrir menú"
              title="Abrir menú"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-white"
            >
              <PanelLeftOpen size={16} />
            </button>
            <div className="h-px w-9 bg-zinc-800" />
          </div>
          <nav className="mt-3 flex min-h-0 w-full flex-1 flex-col items-center gap-1 overflow-y-auto px-2 [scrollbar-width:thin] [scrollbar-color:#3f3f46_transparent]">
            {visibleItems.map((item) => {
              const isActive = location.pathname === item.path;
              return <Link key={item.path} to={item.path} title={item.label} aria-label={item.label} aria-current={isActive ? "page" : undefined} className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${isActive ? "border-yellow-400/50 text-zinc-950" : "border-transparent text-zinc-500 hover:bg-zinc-900 hover:text-white"}`} style={isActive ? { backgroundColor: "#F0C800", color: "#1a1a1a" } : {}}>
                {isActive && <span className="absolute -left-2 top-2 h-6 w-1 rounded-r-full bg-yellow-400" />}
                <item.icon size={18} />
              </Link>;
            })}
          </nav>
          <div className="flex shrink-0 flex-col items-center gap-3 pt-3">
            {myAreas.length > 1 && <button type="button" onClick={requestAreaChange} aria-label="Cambiar área de trabajo" title="Cambiar área de trabajo" className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"><Repeat size={16} /></button>}
            <button
              onClick={() => setShowProfile(true)}
              aria-label="Abrir perfil de usuario"
              title={user?.full_name || user?.email || "Usuario"}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700 hover:bg-zinc-800"
            >
              <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">{user?.photo_url ? <img src={user.photo_url} className="w-7 h-7 rounded-full object-cover" alt="" /> : <User size={13} className="text-zinc-400" />}</div>
            </button>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="lg:hidden absolute top-4 right-4 text-zinc-500"><X size={18} /></button>
      </aside>
      {showProfile && <UserProfileModal onClose={() => setShowProfile(false)} />}
    </>
  );
}