import { useState } from "react";
import { seoConfig, SEOData } from "@/config/seoConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Globe, Save, Info } from "lucide-react";
import { toast } from "sonner";

export default function SEOManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [localSEO, setLocalSEO] = useState(seoConfig);

  const filteredPaths = Object.keys(localSEO).filter(path => 
    path.toLowerCase().includes(searchTerm.toLowerCase()) || 
    localSEO[path].title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = () => {
    // Aquí podrías integrar con Supabase si decides persistir estos datos en DB
    console.log("Datos actualizados:", localSEO);
    toast.success("Configuración SEO actualizada localmente");
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="text-primary" /> Manager de Metadatos
          </h1>
          <p className="text-muted-foreground">Control de títulos y descripciones para todas las rutas.</p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" /> Guardar Cambios
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar por ruta o título..." 
          className="pl-10" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rutas Registradas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Ruta (Path)</TableHead>
                <TableHead>Meta Title</TableHead>
                <TableHead>Meta Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPaths.map((path) => (
                <TableRow key={path}>
                  <TableCell className="font-mono text-blue-500 font-medium">{path}</TableCell>
                  <TableCell>
                    <Input 
                      value={localSEO[path].title}
                      onChange={(e) => setLocalSEO({
                        ...localSEO,
                        [path]: { ...localSEO[path], title: e.target.value }
                      })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={localSEO[path].description}
                      onChange={(e) => setLocalSEO({
                        ...localSEO,
                        [path]: { ...localSEO[path], description: e.target.value }
                      })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex gap-3 items-start">
        <Info className="text-blue-500 mt-1" />
        <p className="text-sm text-blue-700">
          <strong>Nota:</strong> Actualmente los cambios se manejan en memoria. Para que sean permanentes, 
          debes actualizar el archivo <code>seoConfig.ts</code> con los nuevos valores o conectar este 
          panel a una tabla en Supabase.
        </p>
      </div>
    </div>
  );
}
