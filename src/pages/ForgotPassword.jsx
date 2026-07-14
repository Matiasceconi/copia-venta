import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2, CheckCircle, Shield } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
    } catch {
      // Always show success for security
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10">
          <Shield size={22} className="text-blue-400" />
          <span className="text-lg font-black text-white">Performance<span className="text-blue-400">Pitch</span></span>
        </div>

        <h2 className="text-2xl font-bold text-white mb-1">Recuperar contraseña</h2>
        <p className="text-zinc-500 text-sm mb-8">
          Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña.
        </p>

        {sent ? (
          <div className="flex flex-col items-center text-center gap-4 py-6">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle size={28} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-semibold">Revisá tu correo</p>
              <p className="text-zinc-400 text-sm mt-1">
                Si existe una cuenta con ese email, recibirás el enlace en breve.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
              ) : (
                "Enviar enlace"
              )}
            </Button>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            <ArrowLeft size={13} /> Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}