import React from "react";
import { Link } from "react-router-dom";
import { Shield, ArrowLeft } from "lucide-react";

// Registration is admin-only via invitation. This page just redirects users.
export default function Register() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-10">
          <Shield size={22} className="text-blue-400" />
          <span className="text-lg font-black text-white">Performance<span className="text-blue-400">Pitch</span></span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-4">
          <Shield size={32} className="text-zinc-600 mx-auto" />
          <h2 className="text-lg font-bold text-white">Acceso restringido</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Los accesos a la plataforma son gestionados por el administrador. Si necesitás una cuenta, contactá al responsable de tu cuerpo técnico.
          </p>
        </div>
        <Link to="/login" className="inline-flex items-center gap-1.5 mt-6 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft size={13} /> Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
}