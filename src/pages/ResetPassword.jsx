import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, CheckCircle, Shield, Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const token = new URLSearchParams(window.location.search).get("token") || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.resetPassword(token, password);
      setDone(true);
    } catch {
      setError("El enlace es inválido o expiró. Solicitá uno nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10">
          <Shield size={22} className="text-blue-400" />
          <span className="text-lg font-black text-white">Performance<span className="text-blue-400">Pitch</span></span>
        </div>

        <h2 className="text-2xl font-bold text-white mb-1">Nueva contraseña</h2>
        <p className="text-zinc-500 text-sm mb-8">Ingresá tu nueva contraseña para restablecer el acceso.</p>

        {done ? (
          <div className="flex flex-col items-center text-center gap-4 py-6">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle size={28} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-semibold">Contraseña actualizada</p>
              <p className="text-zinc-400 text-sm mt-1">Ya podés iniciar sesión con tu nueva contraseña.</p>
            </div>
            <Link to="/login">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white">Ir al inicio de sesión</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs font-medium">Nueva contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-blue-500"
                  required
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs font-medium">Confirmar contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Repetí la contraseña"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="pl-10 h-11 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-blue-500"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 font-semibold bg-blue-600 hover:bg-blue-500 text-white"
              disabled={loading}
            >
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</> : "Cambiar contraseña"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}