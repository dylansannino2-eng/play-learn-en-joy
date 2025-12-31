import * as React from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"; // Ajusta la ruta según tu carpeta
import { Button } from "@/components/ui/button";

export function DrawerGameSelection() {
  return (
    <Drawer>
      {/* El botón que abre el panel */}
      <DrawerTrigger asChild>
        <Button variant="outline">Seleccionar Modo</Button>
      </DrawerTrigger>

      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            {/* AQUÍ SE REALIZÓ EL CAMBIO */}
            <DrawerTitle>Single Player</DrawerTitle>
            <DrawerDescription>Comienza tu partida individual y rompe tu propio récord.</DrawerDescription>
          </DrawerHeader>

          <div className="p-4 pb-0">
            <div className="flex items-center justify-center space-x-2">
              {/* Aquí puedes meter el contenido de tu juego o botones de niveles */}
              <div className="flex-1 text-center">
                <div className="text-7xl font-bold tracking-tighter">🎮</div>
              </div>
            </div>
          </div>

          <DrawerFooter>
            <Button>Empezar Partida</Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
