import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Search, Globe, Save, Loader2, ExternalLink, FileText, Gamepad2 } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface SEOItem {
  id: string;
  type: "game" | "static";
  slug_or_path: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  noindex: boolean;
}

// COMPONENTE DE FILA (Fuera para evitar pérdida de foco)
const SEORow = ({
  item,
  getFieldValue,
  handleFieldChange,
}: {
  item: SEOItem;
  getFieldValue: (id: string, f: keyof SEOItem) => any;
  handleFieldChange: (id: string, f: keyof SEOItem, v: any) => void;
}) => {
  const mTitle = getFieldValue(item.id, "meta_title") ?? "";
  const mDesc = getFieldValue(item.id, "meta_description") ?? "";
  const nIndex = getFieldValue(item.id, "noindex") ?? false;
  const link = item.type === "game" ? `/${item.slug_or_path}` : item.slug_or_path;

  return (
    <TableRow>
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
            {link} <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </TableCell>
      <TableCell>
        <Input
          value={mTitle}
          onChange={(e) => handleFieldChange(item.id, "meta_title", e.target.value)}
          className="text-sm"
          placeholder={item.title}
        />
        <span className={`text-xs ${mTitle.length > 60 ? "text-destructive" : "text-muted-foreground"}`}>
          {mTitle.length}/60
        </span>
      </TableCell>
      <TableCell>
        <Input
          value={mDesc}
          onChange={(e) => handleFieldChange(item.id, "meta_description", e.target.value)}
          className="text-sm"
          placeholder="Meta descripción..."
        />
        <span className={`text-xs ${mDesc.length > 160 ? "text-destructive" : "text-muted-foreground"}`}>
          {mDesc.length}/160
        </span>
      </TableCell>
      <TableCell>
        <div className="flex flex-col items-center gap-1">
          <Switch checked={!nIndex} onCheckedChange={(checked) => handleFieldChange(item.id, "noindex", !checked)} />
          <Label className="text-xs text-muted-foreground">{nIndex ? "No indexar" : "Indexar"}</Label>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default function SEOManager() {
  const [items, setItems] = useState<SEOItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editedItems, setEditedItems] = useState<Record<string, Partial<SEOItem>>>({});
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [gamesRes, staticRes] = await Promise.all([
        supabase.from("games").select("*"),
        supabase.from("static_pages_seo").select("*"),
      ]);

      const games: SEOItem[] = (gamesRes.data || []).map((g) => ({
        ...g,
        type: "game",
        slug_or_path: g.slug,
      }));
      const statics: SEOItem[] = (staticRes.data || []).map((s) => ({
        ...s,
        type: "static",
        slug_or_path: s.path,
      }));

      setItems([...statics, ...games]);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (id: string, field: keyof SEOItem, value: any) => {
    setEditedItems((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const getFieldValue = (id: string, field: keyof SEOItem) => {
    if (editedItems[id] && field in editedItems[id]) return editedItems[id][field];
    return items.find((i) => i.id === id)?.[field];
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [id, changes] of Object.entries(editedItems)) {
        const item = items.find((i) => i.id === id);
        const table = item?.type === "game" ? "games" : "static_pages_seo";
        await supabase.from(table).update(changes).eq("id", id);
      }
      toast.success("Cambios guardados");
      setEditedItems({});
      fetchAllData();
    } catch (e) {
      toast.error("Error al guardar");
    }
    setSaving(false);
  };

  const filtered = items
    .filter(
      (i) =>
        i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.slug_or_path.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .filter((i) => (activeTab === "all" ? true : activeTab === "games" ? i.type === "game" : i.type === "static"));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Globe /> SEO Manager
        </h1>
        <Button onClick={handleSave} disabled={Object.keys(editedItems).length === 0 || saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar ({Object.keys(editedItems).length})
        </Button>
      </div>

      <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="static">Páginas</TabsTrigger>
          <TabsTrigger value="games">Juegos</TabsTrigger>
        </TabsList>
        <Card className="mt-4">
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL / Tipo</TableHead>
                  <TableHead>Meta Title</TableHead>
                  <TableHead>Meta Description</TableHead>
                  <TableHead className="text-center">Index</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <SEORow
                    key={item.id}
                    item={item}
                    getFieldValue={getFieldValue}
                    handleFieldChange={handleFieldChange}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
