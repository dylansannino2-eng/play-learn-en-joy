import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import GamePage from "./pages/GamePage";
import GamePageMobile from "./pages/GamePageMobile";
import AuthPage from "./pages/AuthPage";
import AdminPage from "./pages/AdminPage";
import AIGameCreator from "./pages/AIGameCreator";
import SubtitleConfigAdmin from "./pages/SubtitleConfigAdmin";
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
          <Routes>
            <Route path="/" element={<Index />} />

            {/* 👇 2. Agregamos la ruta específica para Listening */}
            <Route path="/listening" element={<ListeningGames />} />
            <Route path="/writing" element={<WritingGames />} />
            <Route path="/speaking" element={<SpeakingGames />} />
            <Route path="/reading" element={<ReadingGames />} />

            <Route path="/game/:slug" element={<GamePage />} />
            <Route path="/game-mobile/:slug" element={<GamePageMobile />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/subtitle-configs" element={<SubtitleConfigAdmin />} />
            <Route path="/ai-creator" element={<AIGameCreator />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
