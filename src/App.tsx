import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ScrollToTop from "@/components/ScrollToTop";

// --- Imports de SEO ---
import { SEO } from "@/components/SEO"; // El componente lógico
import SEOManager from "@/pages/SEOManager"; // La página de administración

// --- Resto de Imports ---
import Index from "./pages/Index";
import GamePage from "./pages/GamePage";
import GamePageMobile from "./pages/GamePageMobile";
import AuthPage from "./pages/AuthPage";
import AdminPage from "./pages/AdminPage";
import AIGameCreator from "./pages/AIGameCreator";
import SubtitleConfigAdmin from "./pages/SubtitleConfigAdmin";
import MicrolessonsAdmin from "./pages/MicrolessonsAdmin";
import NotFound from "./pages/NotFound";
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
          <ScrollToTop />

          {/* 🔍 Inyectamos el componente SEO aquí para que escuche los cambios de ruta */}
          <SEO />

          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/listening" element={<ListeningGames />} />
            <Route path="/writing" element={<WritingGames />} />
            <Route path="/speaking" element={<SpeakingGames />} />
            <Route path="/reading" element={<ReadingGames />} />
            <Route path="/game/:slug" element={<GamePage />} />
            <Route path="/game/:slug/:category" element={<GamePage />} />
            <Route path="/game-mobile/:slug" element={<GamePageMobile />} />
            <Route path="/game-mobile/:slug/:category" element={<GamePageMobile />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/admin" element={<AdminPage />} />
            {/* 👇 Rutas de Administración */}
            <Route path="/admin/subtitle-configs" element={<SubtitleConfigAdmin />} />
            <Route path="/admin/microlessons" element={<MicrolessonsAdmin />} />
            <Route path="/admin/seo" element={<SEOManager />} /> {/* NUEVA RUTA SEO */}
            <Route path="/ai-creator" element={<AIGameCreator />} />
            {/* CATCH-ALL ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
