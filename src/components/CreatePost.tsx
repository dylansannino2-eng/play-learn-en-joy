import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button"; // Asumiendo que usas shadcn o similar
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast"; // Si tienes notificaciones toast

const CreatePost = () => {
  const navigate = useNavigate();
  // const { toast } = useToast(); // Descomentar si usas toast
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    image_url: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("posts")
        .insert([
          {
            title: formData.title,
            content: formData.content,
            image_url: formData.image_url,
          },
        ]);

      if (error) throw error;

      // Éxito
      alert("Post creado correctamente!"); // O usa toast({ title: "Éxito" })
      navigate("/"); // Redirigir al inicio o a la lista de posts
    } catch (error: any) {
      console.error("Error creando post:", error);
      alert("Error al crear el post: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />

      <main className="ml-16 pt-20 px-6 pb-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-primary">✍️ Crear Nuevo Post</h1>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Título */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Título del Post
              </label>
              <Input
                id="title"
                name="title"
                placeholder="Ej: Nuevos juegos de lógica agregados..."
                required
                value={formData.title}
                onChange={handleChange}
                className="bg-background"
              />
            </div>

            {/* URL de Imagen (Opcional) */}
            <div className="space-y-2">
              <label htmlFor="image_url" className="text-sm font-medium">
                URL de la Imagen (Opcional)
              </label>
              <Input
                id="image_url"
                name="image_url"
                placeholder="https://..."
                value={formData.image_url}
                onChange={handleChange}
                className="bg-background"
              />
            </div>

            {/* Contenido */}
            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-medium">
                Contenido
              </label>
              <Textarea
                id="content"
                name="content"
                placeholder="Escribe aquí el contenido de tu post..."
                required
                value={formData.content}
                onChange={handleChange}
                className="min-h-[200px] bg-background"
              />
            </div>

            {/* Botón de envío */}
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? "Publicando..." : "Publicar Post"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default CreatePost;
