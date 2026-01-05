import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { seoConfig } from "@/seoConfig";
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

// Interfaces
interface GameSEO {
  id: string;
  slug: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  noindex: boolean;
}

interface StaticPageSEO {
  path: string;
  title: string;
  description: string;
}

// --- COMPONENTE EXTRAÍDO (LA SOLUCIÓN AL FOCO) ---
// Al estar fuera, React no lo destruye en cada render
const GameRow = ({
  game,
  getFieldValue,
  handleFieldChange,
}: {
  game: GameSEO;
  getFieldValue: (g: GameSEO, f: keyof GameSEO) => any;
  handleFieldChange: (id: string, f: keyof GameSEO, v: any) => void;
}) => {
  const metaTitle = (getFieldValue(game, "meta_title") as string) || "";
  const metaDesc = (getFieldValue(game, "meta_description") as string) || "";
  const noIndex = getFieldValue(game, "noindex") as boolean;

  return (
    <TableRow>
      <TableCell>
        <div className="space-y-1">
          <p className="font-medium text-sm">{game.title}</p>
          <a
            href={`/${game.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            /{game.slug}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </TableCell>
      <TableCell>
        <Input
          placeholder={game.title}
          value={metaTitle}
          onChange={(e) => handleFieldChange(game.id, "meta_title", e.target.value)}
          className="text-sm"
        />
        <span className={`text-xs ${metaTitle.length > 60 ? "text-destructive" : "text-muted-foreground"}`}>
          {metaTitle.length}/60
        </span>
      </TableCell>
      <TableCell>
        <Input
          placeholder="Descripción para buscadores..."
          value={metaDesc}
          onChange={(e) => handleFieldChange(game.id, "meta_description", e.target.value)}
          className="text-sm"
        />
        <span className={`text-xs ${metaDesc.length > 160 ? "text-destructive" : "text-muted-foreground"}`}>
          {metaDesc.length}/160
        </span>
      </TableCell>
      <TableCell>
        <div className="flex flex-col items-center gap-1">
          <Switch checked={!noIndex} onCheckedChange={(checked) => handleFieldChange(game.id, "noindex", !checked)} />
          <Label className="text-xs text-muted-foreground">{noIndex ? "No indexar" : "Indexar"}</Label>
        </div>
      </TableCell>
    </TableRow>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function SEOManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [games, setGames] = useState<GameSEO[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedGames, setEditedGames] = useState<Map<string, Partial<GameSEO>>>(new Map());
  const [activeTab, setActiveTab] = useState("all");

  // Convert static seoConfig to array
  const staticPages: StaticPageSEO[] = Object.entries(seoConfig).map(([path, data]) => ({
    path,
    title: data.title,
    description: data.description,
  }));

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("games")
      .select("id, slug, title, meta_title, meta_description, noindex")
      .order("title");

    if (error) {
      toast.error("Error al cargar juegos");
      console.error(error);
    } else {
      setGames(data || []);
    }
    setLoading(false);
  };

  const filteredStaticPages = staticPages.filter(
    (page) =>
      page.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredGames = games.filter(
    (game) =>
      (game.slug?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      game.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleFieldChange = (gameId: string, field: keyof GameSEO, value: string | boolean) => {
    setEditedGames((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(gameId) || {};
      newMap.set(gameId, { ...existing, [field]: value });
      return newMap;
    });
  };

  const getFieldValue = (game: GameSEO, field: keyof GameSEO) => {
    const edited = editedGames.get(game.id);
    if (edited && field in edited) {
      // @ts-ignore
      return edited[field];
    }
    return game[field];
  };

  const handleSave = async () => {
    if (editedGames.size === 0) {
      toast.info("No hay cambios para guardar");
      return;
    }

    setSaving(true);
    try {
      const updates = Array.from(editedGames.entries()).map(([id, changes]) => ({
        id,
        ...changes,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("games")
          .update({
            meta_title: update.meta_title,
            meta_description: update.meta_description,
            noindex: update.noindex,
          })
          .eq("id", update.id);

        if (error) throw error;
      }

      toast.success(`${updates.length} juego(s) actualizado(s)`);
      setEditedGames(new Map());
      fetchGames();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar cambios");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = editedGames.size > 0;
  const totalUrls = staticPages.length + games.length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="text-primary" /> SEO Manager
          </h1>
          <p className="text-muted-foreground">
            {totalUrls} URLs totales • {staticPages.length} páginas estáticas • {games.length} juegos
          </p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar Cambios {hasChanges && `(${editedGames.size})`}
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
            <Globe className="w-4 h-4" /> Todas
          </TabsTrigger>
          <TabsTrigger value="static" className="gap-2">
            <FileText className="w-4 h-4" /> Páginas
          </TabsTrigger>
          <TabsTrigger value="games" className="gap-2">
            <Gamepad2 className="w-4 h-4" /> Juegos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
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
                      <TableHead className="w-[220px]">URL / Juego</TableHead>
                      <TableHead>Meta Title</TableHead>
                      <TableHead>Meta Description</TableHead>
                      <TableHead className="w-[100px] text-center">Indexar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Renderizamos las estáticas (solo lectura en esta vista) */}
                    {(activeTab === "all" || activeTab === "static") &&
                      filteredStaticPages.map((page) => (
                        <TableRow key={page.path}>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant="secondary" className="text-xs">
                                Página
                              </Badge>
                              <div className="text-sm font-medium">{page.path}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{page.title}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{page.description}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">Auto</Badge>
                          </TableCell>
                        </TableRow>
                      ))}

                    {/* Renderizamos los juegos usando el componente extraído */}
                    {(activeTab === "all" || activeTab === "games") &&
                      filteredGames.map((game) => (
                        <GameRow
                          key={game.id}
                          game={game}
                          getFieldValue={getFieldValue}
                          handleFieldChange={handleFieldChange}
                        />
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contenido duplicado para las otras tabs si se desea, 
            pero el tab "all" ya maneja todo visualmente. 
            Puedes simplificar eliminando TabsContent redundantes si quieres. */}

        <TabsContent value="games" className="mt-4">
          {/* ... similar al anterior pero solo filteredGames ... */}
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Juego</TableHead>
                    <TableHead>Meta Title</TableHead>
                    <TableHead>Meta Description</TableHead>
                    <TableHead>Indexar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGames.map((game) => (
                    <GameRow
                      key={game.id}
                      game={game}
                      getFieldValue={getFieldValue}
                      handleFieldChange={handleFieldChange}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="static" className="mt-4">
          {/* Solo visualización de estáticas */}
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaticPages.map((page) => (
                    <TableRow key={page.path}>
                      <TableCell>{page.path}</TableCell>
                      <TableCell>{page.title}</TableCell>
                      <TableCell>{page.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
