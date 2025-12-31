import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, User, Mail, Bell, Shield, LogOut, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    username: "",
    email: "",
    avatar_url: "",
  });

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setProfile({
          username: user.user_metadata?.username || "Usuario",
          email: user.email || "",
          avatar_url: user.user_metadata?.avatar_url || "",
        });
      }
    } catch (error) {
      console.error("Error cargando perfil:", error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada correctamente");
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />

      <main className="ml-16 pt-20 px-6 pb-8 max-w-4xl mx-auto">
        {/* Cabecera */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="p-2 hover:bg-muted rounded-full transition">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-bold">Configuración</h1>
        </div>

        <div className="grid gap-8">
          {/* 👤 Perfil */}
          <section className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b pb-4">
              <User className="text-primary w-5 h-5" />
              <h2 className="text-xl font-semibold">Perfil Personal</h2>
            </div>
            
            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Nombre de usuario</label>
                <input 
                  type="text" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={profile.username}
                  onChange={(e) => setProfile({...profile, username: e.target.value})}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Correo electrónico</label>
                <input 
                  type="email" 
                  disabled
                  className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm cursor-not-allowed opacity-70"
                  value={profile.email}
                />
              </div>

              <Button className="mt-2 gap-2">
                <Save className="w-4 h-4" /> Guardar cambios
              </Button>
            </div>
          </section>

          {/* 🔔 Notificaciones */}
          <section className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b pb-4">
              <Bell className="text-primary w-5 h-5" />
              <h2 className="text-xl font-semibold">Preferencias</h2>
            </div>
            
            <div className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition">
              <div>
                <p className="font-medium">Efectos de sonido</p>
                <p className="text-sm text-muted-foreground">Activar sonidos durante los juegos</p>
              </div>
              <input type="checkbox" className="w-5 h-5 accent-primary" defaultChecked />
            </div>
          </section>

          {/* 🔐 Seguridad */}
          <section className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b pb-4">
              <Shield className="text-primary w-5 h-5" />
              <h2 className="text-xl font-semibold">Seguridad</h2>
            </div>
            <Button variant="outline">Cambiar contraseña</Button>
          </section>

          {/* 🚪 Cerrar Sesión */}
          <section className="pt-4">
            <Button 
              variant="destructive" 
              className="w-full sm:w-auto gap-2"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4" /> Cerrar sesión
            </Button>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Settings;
