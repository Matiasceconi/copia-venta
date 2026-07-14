import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { UserPlus, Mail, Shield, User, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

const roleLabels = { admin: "Admin", user: "Usuario" };
const roleColors = {
  admin: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
  user:  "bg-zinc-700/50 text-zinc-400 border border-zinc-700",
};

export default function Team() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      base44.entities.User.list("-created_date", 50),
      base44.auth.me(),
    ]).then(([us, me]) => {
      setUsers(us);
      setCurrentUser(me);
    }).finally(() => setLoading(false));
  }, []);

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    try {
      await base44.users.inviteUser(email, role);
      toast({ title: "Invitación enviada", description: `Se envió un correo a ${email}` });
      setEmail("");
      setRole("user");
      setShowInvite(false);
      // Refresh list
      const updated = await base44.entities.User.list("-created_date", 50);
      setUsers(updated);
    } catch {
      toast({ title: "Error al invitar", description: "Verificá que el email sea válido.", variant: "destructive" });
    } finally {
      setInviting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Cuerpo Técnico</h1>
          <p className="text-zinc-500 text-sm mt-1">Miembros con acceso a la plataforma</p>
        </div>
        {currentUser?.role === "admin" && (
          <Button onClick={() => setShowInvite(true)} className="bg-white text-zinc-900 hover:bg-zinc-200">
            <UserPlus size={16} className="mr-1.5" /> Invitar usuario
          </Button>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800/50">
        {users.length === 0 ? (
          <div className="p-10 text-center text-zinc-600 text-sm">No hay usuarios registrados</div>
        ) : (
          users.map((u) => (
            <div key={u.id} className="flex items-center gap-4 p-4">
              <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                <User size={16} className="text-zinc-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{u.full_name || "—"}</p>
                <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                  <Mail size={10} /> {u.email}
                </p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleColors[u.role] || roleColors.user}`}>
                {roleLabels[u.role] || u.role}
              </span>
              {u.id === currentUser?.id && (
                <span className="text-xs text-zinc-600">(vos)</span>
              )}
            </div>
          ))
        )}
      </div>

      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Invitar al cuerpo técnico</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Email</label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="preparador@club.com"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Rol</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="user" className="text-white">Usuario — acceso estándar</SelectItem>
                  <SelectItem value="admin" className="text-white">Admin — acceso completo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-zinc-600">El usuario recibirá un email para registrarse y acceder a la plataforma.</p>
            <Button type="submit" disabled={inviting} className="w-full bg-white text-zinc-900 hover:bg-zinc-200">
              {inviting ? "Enviando..." : "Enviar invitación"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}