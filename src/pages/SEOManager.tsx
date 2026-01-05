import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Search, Globe, Save, Loader2, ExternalLink, FileText, Gamepad2 } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// Unificamos la interfaz para manejar ambos tipos de datos igual
interface SEOItem {
  id: string;
  type: "game" | "static"; // Para saber en qué tabla guardar
  slug_or_path: string; // 'slug' para juegos, 'path' para estáticas
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  noindex: boolean;
}

export default function SEOManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState<SEOItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedItems, setEditedItems] = useState<Map<string, Partial<SEOItem>>>(new Map());
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchAllSEO();
  }, []);

  const fetchAllSEO = async () => {
    setLoading(true);
    try {
      // 1. Cargar Juegos
      const { data: gamesData, error: gamesError } = await supabase
        .from("games")
        .select("id, slug, title, meta_title, meta_description, noindex")
        .order("title");

      if (gamesError) throw gamesError;

      // 2. Cargar Páginas Estáticas (Nueva tabla)
      const { data: staticData, error: staticError } = await supabase
        .from("static_pages_seo") // Asegúrate de haber creado esta tabla
        .select("id, path, title, meta_title, meta_description, noindex")
        .order("path");

      if (staticError) {
        console.warn("Si no has creado la tabla static_pages_seo, esto fallará.", staticError);
      }

      // 3. Unificar datos
      const formattedGames: SEOItem[] = (gamesData || []).map((g) => ({
        id: g.id,
        type: "game",
        slug_or_path: g.slug,
        title: g.title,
        meta_title: g.meta_title,
        meta_description: g.meta_description,
        noindex: g.noindex,
      }));

      const formattedStatic: SEOItem[] = (staticData || []).map((p) => ({
        id: p.id,
        type: "static",
        slug_or_path: p.path,
        title: p.title,
        meta_title: p.meta_title,
        meta_description: p.meta_description,
        noindex: p.noindex,
      }));

      setItems([...formattedStatic, ...formattedGames]);
    } catch (error) {
      toast.error("Error al cargar datos SEO");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrado
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      (item.slug_or_path?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeTab === "all") return matchesSearch;
    if (activeTab === "static") return matchesSearch && item.type === "static";
    if (activeTab === "games") return matchesSearch && item.type === "game";
    return false;
  });

  const handleFieldChange = (id: string, field: keyof SEOItem, value: string | boolean) => {
    setEditedItems((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(id) || {};
      newMap.set(id, { ...existing, [field]: value });
      return newMap;
    });
  };

  const getFieldValue = (item: SEOItem, field: keyof SEOItem) => {
    const edited = editedItems.get(item.id);
    if (edited && field in edited) {
      // @ts-ignore - TypeScript a veces se queja con claves dinámicas en uniones
      return edited[field];
    }
    return item[field];
  };

  const handleSave = async () => {
    if (editedItems.size === 0) {
      toast.info("No hay cambios para guardar");
      return;
    }

    setSaving(true);
    let successCount = 0;

    try {
      const updates = Array.from(editedItems.entries());

      for (const [id, changes] of updates) {
        // Encontrar el item original para saber si es game o static
        const originalItem = items.find((i) => i.id === id);
        if (!originalItem) continue;

        const table = originalItem.type === "game" ? "games" : "static_pages_seo";

        // Preparar objeto de actualización
        const updatePayload: any = {
          meta_title: changes.meta_title,
          meta_description: changes.meta_description,
          noindex: changes.noindex,
        };

        const { error } = await supabase.from(table).update(updatePayload).eq("id", id);

        if (error) throw error;
        successCount++;
      }

      toast.success(`${successCount} URL(s) actualizada(s)`);
      setEditedItems(new Map());
      fetchAllSEO(); // Recargar datos
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar cambios");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = editedItems.size > 0;
  const staticCount = items.filter((i) => i.type === "static").length;
  const gamesCount = items.filter((i) => i.type === "game").length;

  // Componente de fila reutilizable para evitar duplicar código
  const SEORow = ({ item }: { item: SEOItem }) => {
    const isEdited = editedItems.has(item.id);
    const link = item.type === "game" ? `/${item.slug_or_path}` : item.slug_or_path;

    return (
      <TableRow className={isEdited ? "bg-muted/30" : ""}>
        <TableCell>
          <div className="space-y-1">
            <Badge variant={item.type === "game" ? "default" : "secondary"} className="text-xs">
              {item.type === "game" ? "Juego" : "Página"}
            </Badge>
            <p className="font-medium text-sm">{item.title}</p>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              {link}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </TableCell>
        <TableCell>
          <Input
            placeholder={item.title}
            value={(getFieldValue(item, "meta_title") as string) || ""}
            onChange={(e) => handleFieldChange(item.id, "meta_title", e.target.value)}
            className="text-sm"
          />
          <span
            className={`text-xs ${((getFieldValue(item, "meta_title") as string) || item.title).length > 60 ? "text-destructive" : "text-muted-foreground"}`}
          >
            {((getFieldValue(item, "meta_title") as string) || item.title).length}/60
          </span>
        </TableCell>
        <TableCell>
          <Input
            placeholder="Descripción para buscadores..."
            value={(getFieldValue(item, "meta_description") as string) || ""}
            onChange={(e) => handleFieldChange(item.id, "meta_description", e.target.value)}
            className="text-sm"
          />
          <span
            className={`text-xs ${((getFieldValue(item, "meta_description") as string) || "").length > 160 ? "text-destructive" : "text-muted-foreground"}`}
          >
            {((getFieldValue(item, "meta_description") as string) || "").length}/160
          </span>
        </TableCell>
        <TableCell>
          <div className="flex flex-col items-center gap-1">
            <Switch
              checked={!(getFieldValue(item, "noindex") as boolean)}
              onCheckedChange={(checked) => handleFieldChange(item.id, "noindex", !checked)}
            />
            <Label className="text-xs text-muted-foreground">
              {(getFieldValue(item, "noindex") as boolean) ? "No indexar" : "Indexar"}
            </Label>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="text-primary" /> SEO Manager
          </h1>
          <p className="text-muted-foreground">
            {items.length} URLs totales • {staticCount} estáticas • {gamesCount} juegos
          </p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar Cambios {hasChanges && `(${editedItems.size})`}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por URL o título..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Globe className="w-4 h-4" /> Todas ({items.length})
          </TabsTrigger>
          <TabsTrigger value="static" className="gap-2">
            <FileText className="w-4 h-4" /> Páginas ({staticCount})
          </TabsTrigger>
          <TabsTrigger value="games" className="gap-2">
            <Gamepad2 className="w-4 h-4" /> Juegos ({gamesCount})
          </TabsTrigger>
        </TabsList>

        {/* Contenido unificado para evitar duplicación de tablas */}
        <div className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[220px]">URL / Tipo</TableHead>
                      <TableHead>Meta Title</TableHead>
                      <TableHead>Meta Description</TableHead>
                      <TableHead className="w-[100px] text-center">Indexar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.length > 0 ? (
                      filteredItems.map((item) => <SEORow key={item.id} item={item} />)
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No se encontraron URLs
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}
