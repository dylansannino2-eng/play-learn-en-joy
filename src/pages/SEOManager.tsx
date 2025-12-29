import { useState } from "react";
// Usamos ruta relativa para asegurar compatibilidad total
import { seoConfig } from "../../seoConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Globe, Save, Info } from "lucide-react";
import { toast } from "sonner";

export default function SEOManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [localSEO, setLocalSEO] = useState(seoConfig);

  const filteredPaths = Object.keys(localSEO).filter(
    (path) =>
      path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      localSEO[path].title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSave = () => {
    console.log("Datos actualizados:", localSEO);
    toast.success("SEO actualizado en memoria local");
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="text-primary" /> Manager de Metadatos
          </h1>
          <p className="text-muted-foreground">Control de títulos y descripciones.</p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" /> Guardar Cambios
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar ruta..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ruta</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Descripción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPaths.map((path) => (
                <TableRow key={path}>
                  <TableCell className="font-mono text-blue-500 text-xs">{path}</TableCell>
                  <TableCell>
                    <Input
                      value={localSEO[path].title}
                      onChange={(e) =>
                        setLocalSEO({
                          ...localSEO,
                          [path]: { ...localSEO[path], title: e.target.value },
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={localSEO[path].description}
                      onChange={(e) =>
                        setLocalSEO({
                          ...localSEO,
                          [path]: { ...localSEO[path], description: e.target.value },
                        })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
