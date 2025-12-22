import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Users, Trophy, Send, Crown, Medal, Award } from "lucide-react";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { newGames, popularGames, multiplayerGames, brainGames, rankingGames } from "@/data/games";

const allGames = [...newGames, ...popularGames, ...multiplayerGames, ...brainGames, ...rankingGames];

const mockRanking = [
  { position: 1, name: "Carlos M.", score: 15420, avatar: "🥇" },
  { position: 2, name: "María L.", score: 14850, avatar: "🥈" },
  { position: 3, name: "Juan P.", score: 13200, avatar: "🥉" },
  { position: 4, name: "Ana R.", score: 12100, avatar: "👤" },
  { position: 5, name: "Pedro S.", score: 11500, avatar: "👤" },
  { position: 6, name: "Laura G.", score: 10800, avatar: "👤" },
  { position: 7, name: "Miguel T.", score: 9950, avatar: "👤" },
  { position: 8, name: "Sofia V.", score: 9200, avatar: "👤" },
];

const mockChat = [
  { user: "Carlos M.", message: "¡Gran partida!", time: "2m" },
  { user: "María L.", message: "Wow, esa palabra fue difícil", time: "5m" },
  { user: "Juan P.", message: "Alguien quiere jugar?", time: "8m" },
  { user: "Ana R.", message: "Acabo de superar mi récord 🎉", time: "12m" },
];

const GamePage = () => {
  const { id } = useParams();
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState(mockChat);

  const game = allGames.find((g) => g.id === Number(id));

  const handleSendMessage = () => {
    if (message.trim()) {
      setChatMessages([
        { user: "Tú", message: message.trim(), time: "ahora" },
        ...chatMessages,
      ]);
      setMessage("");
    }
  };

  if (!game) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      <main className="flex-1 ml-16 p-4">
        {/* Back button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Volver al catálogo</span>
        </Link>

        <div className="flex gap-4">
          {/* Left Column - Banner + Game */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Ad Banner */}
            <div className="w-full h-20 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-xl flex items-center justify-center border border-border/50">
              <div className="text-center">
                <p className="text-muted-foreground text-sm">Espacio publicitario</p>
                <p className="text-xs text-muted-foreground/60">Banner de publicidad</p>
              </div>
            </div>

            {/* Game Screen */}
            <div className="w-full aspect-video bg-card rounded-xl border border-border overflow-hidden relative group">
              <img
                src={game.image}
                alt={game.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-4">
                <h2 className="text-3xl font-bold text-foreground">{game.title}</h2>
                <button className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold text-lg hover:bg-primary/90 transition-colors animate-pulse">
                  ▶ Jugar Ahora
                </button>
                <p className="text-muted-foreground text-sm mt-2">
                  Haz clic para comenzar a jugar
                </p>
              </div>
            </div>

            {/* Game Info */}
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-lg font-semibold text-foreground mb-2">Sobre este juego</h3>
              <p className="text-muted-foreground text-sm">
                Aprende inglés de manera divertida con {game.title}. Este juego te ayudará a mejorar tu vocabulario, 
                gramática y comprensión del idioma mientras te diviertes. Compite con otros jugadores y escala 
                en el ranking global.
              </p>
              <div className="flex gap-4 mt-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users size={16} />
                  <span className="text-sm">1,234 jugadores activos</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Trophy size={16} />
                  <span className="text-sm">Ranking disponible</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Ranking + Chat */}
          <div className="w-80 flex flex-col gap-4">
            {/* Ranking */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="bg-gradient-to-r from-primary/20 to-accent/20 p-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Trophy className="text-primary" size={20} />
                  <h3 className="font-semibold text-foreground">Ranking</h3>
                </div>
              </div>
              <div className="p-2 max-h-64 overflow-y-auto scrollbar-hide">
                {mockRanking.map((player) => (
                  <div
                    key={player.position}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      player.position <= 3 ? "bg-primary/10" : "hover:bg-muted/50"
                    } transition-colors`}
                  >
                    <span className="text-lg w-8 text-center">{player.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {player.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {player.score.toLocaleString()} pts
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">#{player.position}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Participation Chat */}
            <div className="bg-card rounded-xl border border-border overflow-hidden flex-1 flex flex-col">
              <div className="bg-gradient-to-r from-accent/20 to-primary/20 p-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Users className="text-accent" size={20} />
                  <h3 className="font-semibold text-foreground">Chat de participación</h3>
                </div>
              </div>
              
              {/* Messages */}
              <div className="flex-1 p-3 space-y-3 max-h-64 overflow-y-auto scrollbar-hide">
                {chatMessages.map((chat, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                      {chat.user.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-foreground">{chat.user}</span>
                        <span className="text-xs text-muted-foreground">{chat.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{chat.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GamePage;
