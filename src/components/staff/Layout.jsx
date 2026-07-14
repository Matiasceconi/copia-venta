import React, { Component, createContext, useContext, useEffect, useState } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import SessionTimeoutWatcher from "@/components/workspace/SessionTimeoutWatcher";
import SessionExpiryBanner from "@/components/workspace/SessionExpiryBanner";
import { useWorkspace } from "@/lib/WorkspaceContext";

const SIDEBAR_STORAGE_KEY = "performancepitch_sidebar_collapsed_v1";
const SidebarCollapseContext = createContext({ collapsed: false, setCollapsed: () => {} });

export function useSidebarCollapse() {
  return useContext(SidebarCollapseContext);
}

class PageErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("Page crash:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-red-400 font-semibold">Error al cargar la página</p>
          <p className="text-zinc-500 text-sm text-center max-w-md">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-lg transition-colors">
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Layout() {
  const { canSeePath } = useWorkspace();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  });

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
    const timeout = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 220);
    return () => clearTimeout(timeout);
  }, [sidebarCollapsed]);

  // Seguridad: si la página actual no corresponde al área/rol activo, no se renderiza (redirige al dashboard).
  if (!canSeePath(location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return (
    <SidebarCollapseContext.Provider value={{ collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed }}>
      <div className="min-h-screen w-full min-w-0 overflow-x-clip bg-zinc-950">
        <SessionTimeoutWatcher />
        <SessionExpiryBanner />

        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />

        <main
          className={`min-h-screen w-full min-w-0 overflow-x-clip bg-zinc-950 transition-[padding] duration-200 ease-out ${
            sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-64"
          }`}
        >
          <div className="w-full min-w-0 max-w-[1920px] mx-auto p-4 pt-16 lg:p-6 lg:pt-6 2xl:p-8">
            <PageErrorBoundary>
              <Outlet />
            </PageErrorBoundary>
          </div>
        </main>
      </div>
    </SidebarCollapseContext.Provider>
  );
}