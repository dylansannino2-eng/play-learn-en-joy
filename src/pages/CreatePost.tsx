import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
// Si usas componentes de UI como shadcn, impórtalos aquí. Si no, usa HTML estándar con clases Tailwind.
import { Button } from "@/components/ui/button"; 
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const CreatePost = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    image: "",
    content: "",
    category: "new" // Valor por defecto
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. Insertar en Supabase
    // Asegúrate de que tu tabla en Supabase se llame 'posts' o 'games' según lo que quieras crear
    const { error } = await supabase
      .from("posts") // 👈 Cambia esto por el nombre real de tu tabla
      .insert([
        {
          title: formData.title,
          image: formData.image, // URL de la imagen
          content: formData.content, // O descripción
          category: formData.category,
          is_active: true,
          created_at: new Date(),
        },
      ]);

    setLoading(false);

    if (error) {
      alert("Error al crear: " + error.message);
    } else {
      alert("¡Post creado con éxito!");
      navigate("/"); // Te devuelve al home después de crear
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />

      {/* ml-16 y pt-20 son para respetar el espacio del Sidebar y Header */}
      <main className="ml-16 pt-20 px-6 pb-8 flex justify-center">
        <div className="w-full max-w-2xl">
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary">📝 Crear Nuevo Post</h1>
            <p className="text-muted-foreground">Rellena los detalles para publicar contenido nuevo.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 rounded-xl border border-border shadow-sm">
            
            {/* Título */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Título</label>
              <Input
                name="title"
                placeholder="Ej: Estrategias de Juego"
                required
                value={formData.title}
                onChange={handleChange}
              />
            </div>

            {/* Categoría */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoría</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="new">🆕 Nuevo</option>
                <option value="popular">🔥 Popular</option>
                <option value="brain">🧠 Lógica</option>
                <option value="learning">📚 Aprendizaje</option>
              </select>
            </div>

            {/* Imagen URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium">URL de Imagen</label>
              <Input
                name="image"
                placeholder="https://ejemplo.com/imagen.jpg"
                value={formData.image}
                onChange={handleChange}
              />
            </div>

            {/* Contenido */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Contenido</label>
              <Textarea
                name="content"
                placeholder="Escribe el contenido aquí..."
                className="min-h-[150px]"
                required
                value={formData.content}
                onChange={handleChange}
              />
            </div>

            {/* Botones */}
            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Publicar Post"}
              </Button>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
};

export default CreatePost;
