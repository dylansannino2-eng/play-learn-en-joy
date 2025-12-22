import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import WordBattleGame from "@/components/games/WordBattleGame";
import GameLobby from "@/components/games/shared/GameLobby";
import { supabase } from "@/integrations/supabase/client";

interface Game {
  id: string;
  title: string;
  image: string;
  slug: string | null;
  description: string | null;
  uses_chat: boolean;
}

type GameView = 'lobby' | 'playing';

const GamePage = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [game, setGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gameView, setGameView] = useState<GameView>('lobby');
  const [roomCode, setRoomCode] = useState<string | undefined>(undefined);

  // Check for room code in URL
  useEffect(() => {
    const roomFromUrl = searchParams.get('room');
    if (roomFromUrl) {
      setRoomCode(roomFromUrl);
      setGameView('playing');
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchGame = async () => {
      if (!slug) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('games')
        .select('id, title, image, slug, description, uses_chat')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (!error && data) {
        setGame(data);
      }
      setIsLoading(false);
    };

    fetchGame();
  }, [slug]);

  const handleStartGame = (code?: string) => {
    setRoomCode(code);
    setGameView('playing');
    
    // Update URL with room code if provided
    if (code) {
      navigate(`/game/${slug}?room=${code}`, { replace: true });
    }
  };

  const handleBackToLobby = () => {
    setGameView('lobby');
    setRoomCode(undefined);
    navigate(`/game/${slug}`, { replace: true });
  };

  const renderGameComponent = () => {
    if (!game?.slug) return null;

    // Show lobby first for games with chat
    if (game.uses_chat && gameView === 'lobby') {
      return (
        <GameLobby
          gameSlug={game.slug}
          gameTitle={game.title}
          onStartGame={handleStartGame}
        />
      );
    }

    switch (game.slug) {
      case 'word-battle':
        return <WordBattleGame roomCode={roomCode} onBack={handleBackToLobby} />;
      default:
        return (
          <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">{game.title}</h2>
              <p className="text-muted-foreground">Este juego estará disponible pronto</p>
            </div>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Juego no encontrado</h1>
          <Link to="/" className="text-primary hover:underline">
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 ml-16 p-4 flex flex-col h-screen overflow-hidden">
        {/* Back button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft size={20} />
          <span>{game.title}</span>
        </Link>

        {/* Main content */}
        <div className="flex gap-4 flex-1 mt-4 min-h-0">
          {renderGameComponent()}
        </div>
      </main>
    </div>
  );
};

export default GamePage;
