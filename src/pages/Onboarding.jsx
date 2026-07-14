import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useOrganization } from "@/lib/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ChevronRight, ChevronLeft, Upload, ShieldCheck } from "lucide-react";

const COUNTRIES = [
  "Argentina", "Brasil", "Chile", "Uruguay", "Paraguay", "Bolivia",
  "Perú", "Ecuador", "Colombia", "Venezuela", "México", "España", "Otro",
];

const TIMEZONES = [
  "America/Buenos_Aires", "America/Montevideo", "America/Santiago",
  "America/Sao_Paulo", "America/Bogota", "America/Mexico_City",
  "Europe/Madrid", "UTC",
];

const LOCALES = ["es-AR", "es-ES", "es-MX", "pt-BR", "en-US"];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { reloadOrganizations, setActiveOrganization } = useOrganization();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    name: "",
    short_name: "",
    country: "Argentina",
    timezone: "America/Buenos_Aires",
    locale: "es-AR",
    logo_url: "",
    primary_color: "#111827",
    secondary_color: "#22c55e",
    active_season: String(new Date().getFullYear()),
    squad_name: "Primera",
  });

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      update("logo_url", file_url);
    } catch (err) {
      setError("No se pudo subir el escudo.");
    }
  }

  async function handleFinish() {
    setSubmitting(true);
    setError(null);
    try {
      // 1. Crear organización + membresía + roles
      const response = await base44.functions.invoke("createOrganizationForCurrentUser", {
        name: form.name,
        short_name: form.short_name,
        slug: form.name,
        country: form.country,
        timezone: form.timezone,
        locale: form.locale,
        logo_url: form.logo_url,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        active_season: form.active_season,
        onboarding_completed: true,
      });
      const org = response.data?.organization;
      if (!org) throw new Error("No se pudo crear la organización.");

      // 2. Crear el primer Squad con organization_id
      const squad = await base44.entities.Squad.create({
        organization_id: org.id,
        name: form.squad_name || "Primera",
        season: form.active_season,
        active: true,
      });

      // 3. Actualizar active_season en la organización
      await base44.entities.Organization.update(org.id, {
        active_season: form.active_season,
        onboarding_completed: true,
      });

      // 4. Seleccionar la organización y plantel creados
      setActiveOrganization(org.id);
      localStorage.setItem("activeSquadId", squad.id);
      localStorage.setItem("activeSquadUserId", user?.id || "");

      // 5. Recargar organizaciones y redirigir al Dashboard
      await reloadOrganizations();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Error al crear la organización.");
    } finally {
      setSubmitting(false);
    }
  }

  const canNext = () => {
    if (step === 1) return form.name.trim().length >= 2;
    if (step === 2) return true;
    if (step === 3) return form.active_season.trim().length > 0;
    if (step === 4) return form.squad_name.trim().length > 0;
    return true;
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header neutral */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <span className="text-lg font-black text-emerald-400">PP</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">PerformancePitch</h1>
            <p className="text-zinc-500 text-sm">Configuración inicial del club</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                s < step ? "bg-emerald-500 text-white" : s === step ? "bg-white text-zinc-900" : "bg-zinc-800 text-zinc-500"
              }`}>
                {s < step ? <Check size={14} /> : s}
              </div>
              {s < 5 && <div className={`w-8 h-0.5 ${s < step ? "bg-emerald-500" : "bg-zinc-800"}`} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-5">
          {step === 1 && (
            <>
              <h2 className="text-white font-bold text-xl">Datos del club</h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-zinc-300">Nombre del club *</Label>
                  <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Ej: Club Atlético Ejemplo" className="bg-zinc-950 border-zinc-700 text-white mt-1" />
                </div>
                <div>
                  <Label className="text-zinc-300">Nombre corto / Sigla</Label>
                  <Input value={form.short_name} onChange={(e) => update("short_name", e.target.value)} placeholder="Ej: CAE" maxLength={6} className="bg-zinc-950 border-zinc-700 text-white mt-1" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-zinc-300">País</Label>
                    <select value={form.country} onChange={(e) => update("country", e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg px-3 py-2 mt-1">
                      {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-zinc-300">Idioma</Label>
                    <select value={form.locale} onChange={(e) => update("locale", e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg px-3 py-2 mt-1">
                      {LOCALES.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <Label className="text-zinc-300">Zona horaria</Label>
                  <select value={form.timezone} onChange={(e) => update("timezone", e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg px-3 py-2 mt-1">
                    {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-white font-bold text-xl">Escudo y colores</h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-zinc-300">Escudo del club</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="w-20 h-20 rounded-xl bg-zinc-950 border border-zinc-700 flex items-center justify-center overflow-hidden">
                      {form.logo_url ? (
                        <img src={form.logo_url} alt="Escudo" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-2xl font-black" style={{ color: form.secondary_color }}>
                          {form.short_name || form.name.slice(0, 3).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-lg transition-colors">
                        <Upload size={16} /> Subir escudo
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-zinc-300">Color principal</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="color" value={form.primary_color} onChange={(e) => update("primary_color", e.target.value)} className="w-12 h-10 rounded cursor-pointer bg-zinc-950 border border-zinc-700" />
                      <Input value={form.primary_color} onChange={(e) => update("primary_color", e.target.value)} className="bg-zinc-950 border-zinc-700 text-white" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-zinc-300">Color secundario</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="color" value={form.secondary_color} onChange={(e) => update("secondary_color", e.target.value)} className="w-12 h-10 rounded cursor-pointer bg-zinc-950 border border-zinc-700" />
                      <Input value={form.secondary_color} onChange={(e) => update("secondary_color", e.target.value)} className="bg-zinc-950 border-zinc-700 text-white" />
                    </div>
                  </div>
                </div>
                {/* Preview */}
                <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: form.primary_color }}>
                  <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
                    {form.logo_url ? (
                      <img src={form.logo_url} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <span className="font-black text-sm" style={{ color: form.secondary_color }}>
                        {form.short_name || "PP"}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: form.secondary_color }}>{form.name || "Nombre del club"}</p>
                    <p className="text-xs opacity-70" style={{ color: form.secondary_color }}>PerformancePitch</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-white font-bold text-xl">Temporada inicial</h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-zinc-300">Temporada *</Label>
                  <Input value={form.active_season} onChange={(e) => update("active_season", e.target.value)} placeholder="Ej: 2026" className="bg-zinc-950 border-zinc-700 text-white mt-1" />
                </div>
                <p className="text-zinc-500 text-sm">Esta será la temporada activa del club. Podrás cambiarla más adelante desde la configuración.</p>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="text-white font-bold text-xl">Primer plantel</h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-zinc-300">Nombre del primer plantel *</Label>
                  <Input value={form.squad_name} onChange={(e) => update("squad_name", e.target.value)} placeholder="Ej: Primera, Reserva, Sub-20" className="bg-zinc-950 border-zinc-700 text-white mt-1" />
                </div>
                <p className="text-zinc-500 text-sm">Podrás crear más planteles desde la sección correspondiente una vez dentro.</p>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <h2 className="text-white font-bold text-xl">Confirmación</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Club</span>
                  <span className="text-white font-medium">{form.name}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Nombre corto</span>
                  <span className="text-white font-medium">{form.short_name || "—"}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">País</span>
                  <span className="text-white font-medium">{form.country}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Temporada</span>
                  <span className="text-white font-medium">{form.active_season}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Primer plantel</span>
                  <span className="text-white font-medium">{form.squad_name}</span>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <span className="text-zinc-400 text-xs">Serás el propietario y administrador del club.</span>
                </div>
              </div>
            </>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="ghost"
            onClick={() => (step > 1 ? setStep(step - 1) : null)}
            disabled={step === 1 || submitting}
            className="text-zinc-400 hover:text-white"
          >
            <ChevronLeft size={16} className="mr-1" /> Atrás
          </Button>
          {step < 5 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Continuar <ChevronRight size={16} className="ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {submitting ? "Creando club…" : "Crear club"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}