import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Importaciones de Páginas Base
import Index from "./pages/Index";
import GamePage from "./pages/GamePage";
import AuthPage from "./pages/AuthPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

// 👇 Importaciones de las nuevas páginas de categorías
import ListeningGames from "./pages/ListeningGames";
import WritingGames from "./pages/WritingGames";
import SpeakingGames from "./pages/SpeakingGames";
import ReadingGames from "./pages/ReadingGames";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Ruta Principal */}
            <Route path="/" element={<Index />} />

            {/* 🎯 Rutas de Categorías de Aprendizaje */}
            <Route path="/listening" element={<ListeningGames />} />
            <Route path="/writing" element={<WritingGames />} />
            <Route path="/speaking" element={<SpeakingGames />} />
            <Route path="/reading" element={<ReadingGames />} />

            {/* Rutas de Juego y Administración */}
            <Route path="/game/:slug" element={<GamePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/admin" element={<AdminPage />} />

            {/* Captura de errores (404) */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
