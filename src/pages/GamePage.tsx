import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Users, Send } from "lucide-react";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { newGames, popularGames, multiplayerGames, brainGames, rankingGames } from "@/data/games";

const allGames = [...newGames, ...popularGames, ...multiplayerGames, ...brainGames, ...rankingGames];

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

        {/* Main content - Game + Chat */}
        <div className="flex gap-4 flex-1 mt-4 min-h-0">
          {/* Game Screen */}
          <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden relative">
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
            </div>
          </div>

          {/* Participation Chat */}
          <div className="w-80 bg-card rounded-xl border border-border overflow-hidden flex flex-col shrink-0">
            <div className="bg-gradient-to-r from-accent/20 to-primary/20 p-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Users className="text-accent" size={20} />
                <h3 className="font-semibold text-foreground">Chat de participación</h3>
              </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto scrollbar-hide">
              {chatMessages.map((chat, index) => (
                <div key={index} className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
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
            <div className="p-3 border-t border-border shrink-0">
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
      </main>
    </div>
  );
};

export default GamePage;
