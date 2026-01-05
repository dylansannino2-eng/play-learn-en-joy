import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Search, Globe, Save, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

interface GameSEO {
  id: string;
  slug: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  noindex: boolean;
}

export default function SEOManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [games, setGames] = useState<GameSEO[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedGames, setEditedGames] = useState<Map<string, Partial<GameSEO>>>(new Map());

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

  const filteredGames = games.filter(
    (game) =>
      (game.slug?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      game.title.toLowerCase().includes(searchTerm.toLowerCase())
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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="text-primary" /> SEO Manager
          </h1>
          <p className="text-muted-foreground">
            Gestiona los metadatos SEO de cada juego
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
          placeholder="Buscar por título o slug..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

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
                  <TableHead className="w-[200px]">URL / Juego</TableHead>
                  <TableHead>Meta Title</TableHead>
                  <TableHead>Meta Description</TableHead>
                  <TableHead className="w-[100px] text-center">Indexar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGames.map((game) => (
                  <TableRow key={game.id}>
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
                        value={(getFieldValue(game, "meta_title") as string) || ""}
                        onChange={(e) => handleFieldChange(game.id, "meta_title", e.target.value)}
                        className="text-sm"
                      />
                      <span className="text-xs text-muted-foreground">
                        {((getFieldValue(game, "meta_title") as string) || game.title).length}/60
                      </span>
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Descripción para buscadores..."
                        value={(getFieldValue(game, "meta_description") as string) || ""}
                        onChange={(e) => handleFieldChange(game.id, "meta_description", e.target.value)}
                        className="text-sm"
                      />
                      <span className="text-xs text-muted-foreground">
                        {((getFieldValue(game, "meta_description") as string) || "").length}/160
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center gap-1">
                        <Switch
                          checked={!(getFieldValue(game, "noindex") as boolean)}
                          onCheckedChange={(checked) => handleFieldChange(game.id, "noindex", !checked)}
                        />
                        <Label className="text-xs text-muted-foreground">
                          {(getFieldValue(game, "noindex") as boolean) ? "No indexar" : "Indexar"}
                        </Label>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredGames.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No se encontraron juegos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
