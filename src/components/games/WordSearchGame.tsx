import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Clock, Zap, Users, Wifi, WifiOff, Grid3X3, Check, MousePointer2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
// Se eliminó la importación de ParticipationChat
import RoundRanking from "./shared/RoundRanking";
import GameLobby from "./shared/GameLobby";
import { useGameSounds } from "@/hooks/useGameSounds";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";

// --- CONFIGURACIÓN Y TIPOS ---

const ROUND_SECONDS = 60;

type Difficulty = "easy" | "medium" | "hard";

interface DifficultyOption {
  value: Difficulty;
  label: string;
  gridSize: number;
  wordCount: number;
  color: string;
  bgColor: string;
}

const difficultyOptions: DifficultyOption[] = [
  { value: "easy", label: "Fácil", gridSize: 8, wordCount: 5, color: "text-green-400", bgColor: "bg-green-500/20" },
  {
    value: "medium",
    label: "Medio",
    gridSize: 10,
    wordCount: 8,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
  },
  { value: "hard", label: "Difícil", gridSize: 12, wordCount: 12, color: "text-red-400", bgColor: "bg-red-500/20" },
];

type GamePhase = "waiting" | "playing" | "ranking";

interface WordSearchGameProps {
  roomCode?: string;
  onBack?: () => void;
}

interface Coordinate {
  r: number;
  c: number;
}

// --- LÓGICA DE GENERACIÓN DE SOPA DE LETRAS ---
const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [-1, 1],
]; // Horiz, Vert, Diag, DiagInv

const generateGrid = (words: string[], size: number) => {
  const grid = Array(size)
    .fill(null)
    .map(() => Array(size).fill(""));
  const placedWords: string[] = [];

  const sortedWords = [...words].map((w) => w.toUpperCase().replace(/\s/g, "")).sort((a, b) => b.length - a.length);

  for (const word of sortedWords) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 50) {
      const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      const [dRow, dCol] = dir;
      const rowStart = Math.floor(Math.random() * size);
      const colStart = Math.floor(Math.random() * size);

      const rowEnd = rowStart + (word.length - 1) * dRow;
      const colEnd = colStart + (word.length - 1) * dCol;

      if (rowEnd >= 0 && rowEnd < size && colEnd >= 0 && colEnd < size) {
        let collision = false;
        for (let i = 0; i < word.length; i++) {
          const char = grid[rowStart + i * dRow][colStart + i * dCol];
          if (char !== "" && char !== word[i]) {
            collision = true;
            break;
          }
        }

        if (!collision) {
          for (let i = 0; i < word.length; i++) {
            grid[rowStart + i * dRow][colStart + i * dCol] = word[i];
          }
          placedWords.push(word);
          placed = true;
        }
      }
      attempts++;
    }
  }

  const letters = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === "") {
        grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
      }
    }
  }

  return { grid, placedWords };
};

// --- COMPONENTE PRINCIPAL ---

export default function WordSearchGame({ roomCode, onBack }: WordSearchGameProps) {
  const { playSound, preloadSounds } = useGameSounds();

  const [displayName, setDisplayName] = useState("");
  const [gameRoomCode, setGameRoomCode] = useState<string | undefined>(undefined);
  const [isHostInRoom, setIsHostInRoom] = useState(false);

  const {
    players,
    playerCount,
    isConnected,
    username,
    updateScore,
    broadcastCorrectAnswer,
    // correctAnswerEvents, // Ya no necesitamos escuchar esto para el chat
    gameEvent,
    broadcastGameEvent,
    // chatMessages, // Eliminado
    // broadcastChatMessage, // Eliminado
  } = useMultiplayerGame("word-search", gameRoomCode, displayName || undefined);

  // Estados del Juego
  const [gamePhase, setGamePhase] = useState<GamePhase>("waiting");
  const [grid, setGrid] = useState<string[][]>([]);
  const [targetWords, setTargetWords] = useState<string[]>([]);
  const [myFoundWords, setMyFoundWords] = useState<string[]>([]);

  // Estado para guardar coordenadas de palabras ya encontradas
  const [foundWordsCoords, setFoundWordsCoords] = useState<Coordinate[][]>([]);

  // Estados de Selección
  const [isSelecting, setIsSelecting] = useState(false);
  const [startCell, setStartCell] = useState<Coordinate | null>(null);
  const [currentCell, setCurrentCell] = useState<Coordinate | null>(null);

  // Estado General
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [totalRounds] = useState(3);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [roundEndsAt, setRoundEndsAt] = useState<number | null>(null);
  const lastTimerSecondRef = useRef<number>(ROUND_SECONDS);
  const [currentDifficulty, setCurrentDifficulty] = useState<Difficulty>("medium");

  // Precarga de sonidos
  useEffect(() => {
    preloadSounds();
  }, [preloadSounds]);

  // --- (SECCIÓN DE CHAT ELIMINADA) ---

  // --- SINCRONIZACIÓN DE JUEGO (GAME LOOP) ---

  const startRoundTimer = useCallback((endsAt?: number) => {
    const nextEndsAt = endsAt ?? Date.now() + ROUND_SECONDS * 1000;
    const nextSeconds = Math.max(0, Math.ceil((nextEndsAt - Date.now()) / 1000));
    lastTimerSecondRef.current = nextSeconds;
    setRoundEndsAt(nextEndsAt);
    setTimeLeft(nextSeconds);
    return nextEndsAt;
  }, []);

  useEffect(() => {
    if (gamePhase !== "playing") return;
    if (!roundEndsAt) {
      startRoundTimer();
      return;
    }

    const timer = window.setInterval(() => {
      const remainingMs = roundEndsAt - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      if (remainingSec !== lastTimerSecondRef.current) {
        if (remainingSec <= 5 && remainingSec > 0) playSound("tick", 0.3);

        if (remainingSec <= 0 && lastTimerSecondRef.current > 0) {
          playSound("roundEnd", 0.6);
          setGamePhase("ranking");
        }
        lastTimerSecondRef.current = remainingSec;
        setTimeLeft(remainingSec);
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [gamePhase, roundEndsAt, playSound, startRoundTimer]);

  // Manejo de eventos del Host para Clientes
  useEffect(() => {
    if (isHostInRoom) return;
    if (!gameEvent) return;

    if (gameEvent.type === "wordsearch_start") {
      const p = gameEvent.payload as any;

      setGrid(p.grid);
      setTargetWords(p.words);
      setRound(p.round);
      setCurrentDifficulty(p.difficulty);

      setMyFoundWords([]);
      setFoundWordsCoords([]); // Reset visual de palabras encontradas
      setGamePhase("playing");
      startRoundTimer(p.roundEndsAt);
      playSound("gameStart", 0.6);
    }

    if (gameEvent.type === "return_to_lobby") {
      playSound("gameStart", 0.5);
      setGamePhase("waiting");
      setScore(0);
      setMyFoundWords([]);
      setFoundWordsCoords([]);
      setRound(1);
    }
  }, [gameEvent, isHostInRoom, playSound, startRoundTimer]);

  // --- FUNCIONES DEL HOST ---

  const generateAndBroadcastRound = useCallback(
    async (difficultyVal: Difficulty, roundNum: number) => {
      const diffConfig = difficultyOptions.find((d) => d.value === difficultyVal) || difficultyOptions[1];

      const wordBank = [
        "REACT",
        "TYPESCRIPT",
        "SUPABASE",
        "TAILWIND",
        "CODIGO",
        "LUCIDE",
        "FRONTEND",
        "BACKEND",
        "DATABASE",
        "DEPLOY",
        "VERCEL",
        "NODE",
        "PYTHON",
        "JAVA",
        "DOCKER",
        "CLOUD",
        "API",
        "REST",
        "GRAPHQL",
        "HOOK",
      ];
      const shuffled = wordBank.sort(() => 0.5 - Math.random());
      const selectedWords = shuffled.slice(0, diffConfig.wordCount);

      const { grid: newGrid, placedWords } = generateGrid(selectedWords, diffConfig.gridSize);

      setGrid(newGrid);
      setTargetWords(placedWords);
      setMyFoundWords([]);
      setFoundWordsCoords([]); // Reset visual host
      setRound(roundNum);
      setCurrentDifficulty(difficultyVal);
      setGamePhase("playing");
      const endsAt = startRoundTimer();
      playSound("gameStart", 0.6);

      if (gameRoomCode) {
        await broadcastGameEvent("wordsearch_start", {
          grid: newGrid,
          words: placedWords,
          round: roundNum,
          difficulty: difficultyVal,
          roundEndsAt: endsAt,
        });
      }
    },
    [gameRoomCode, broadcastGameEvent, playSound, startRoundTimer],
  );

  const handleLobbyStart = useCallback(
    async (payload: any) => {
      setDisplayName(payload.playerName);
      setIsHostInRoom(payload.isHost);
      if (payload.roomCode) setGameRoomCode(payload.roomCode);

      const initialDiff = payload.difficulties[0] || "medium";

      if (payload.isHost) {
        setTimeout(() => generateAndBroadcastRound(initialDiff, 1), 500);
      }
    },
    [generateAndBroadcastRound],
  );

  // --- LÓGICA DE SELECCIÓN EN LA GRILLA ---

  const getSelectedCells = (start: Coordinate, end: Coordinate): Coordinate[] => {
    const cells: Coordinate[] = [];
    const dr = end.r - start.r;
    const dc = end.c - start.c;

    // Permitir selección en 8 direcciones (Horiz, Vert, Diag)
    if (dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc)) {
      const steps = Math.max(Math.abs(dr), Math.abs(dc));
      const rStep = dr === 0 ? 0 : dr / steps;
      const cStep = dc === 0 ? 0 : dc / steps;

      for (let i = 0; i <= steps; i++) {
        cells.push({ r: start.r + i * rStep, c: start.c + i * cStep });
      }
    }
    return cells;
  };

  const getSelectedWord = (): string => {
    if (!startCell || !currentCell) return "";
    const cells = getSelectedCells(startCell, currentCell);
    return cells.map((pos) => grid[pos.r][pos.c]).join("");
  };

  const currentSelectionCoords = useMemo(() => {
    if (!isSelecting || !startCell || !currentCell) return [];
    return getSelectedCells(startCell, currentCell);
  }, [isSelecting, startCell, currentCell]);

  // Verifica si la celda es parte de la selección ACTUAL (drag)
  const isSelected = (r: number, c: number) => currentSelectionCoords.some((cell) => cell.r === r && cell.c === c);

  // Verifica si la celda es parte de una palabra YA ENCONTRADA (permanent)
  const isPermanentlyFound = (r: number, c: number) =>
    foundWordsCoords.some((coords) => coords.some((cell) => cell.r === r && cell.c === c));

  // --- HANDLERS DE INTERACCIÓN ---

  const handleMouseDown = (r: number, c: number) => {
    if (gamePhase !== "playing") return;
    setIsSelecting(true);
    setStartCell({ r, c });
    setCurrentCell({ r, c });
    playSound("click", 0.2);
  };

  const handleMouseEnter = (r: number, c: number) => {
    if (isSelecting && gamePhase === "playing") {
      setCurrentCell({ r, c });
    }
  };

  const handleMouseUp = async () => {
    if (!isSelecting || !startCell || !currentCell) return;

    const word = getSelectedWord();
    const reversedWord = word.split("").reverse().join("");
    // Guardamos las coordenadas candidatas antes de limpiar el estado
    const candidateCoords = getSelectedCells(startCell, currentCell);

    let found = null;
    // Verificamos si es palabra objetivo Y si no la encontré yo todavía
    if (targetWords.includes(word) && !myFoundWords.includes(word)) found = word;
    else if (targetWords.includes(reversedWord) && !myFoundWords.includes(reversedWord)) found = reversedWord;

    if (found) {
      // --- ÉXITO ---
      // 1. Guardar coordenadas visuales
      setFoundWordsCoords((prev) => [...prev, candidateCoords]);

      // 2. Lógica de juego
      const newFound = [...myFoundWords, found];
      setMyFoundWords(newFound);
      playSound("correct", 0.6);

      const wordPoints = found.length * 10;
      const newScore = score + wordPoints;
      setScore(newScore);

      await updateScore(newScore, newFound.length, 0);
      await broadcastCorrectAnswer(found, wordPoints);
      toast.success(`¡Encontraste ${found}! (+${wordPoints})`);
    }

    // Resetear selección
    setIsSelecting(false);
    setStartCell(null);
    setCurrentCell(null);
  };

  const handleNextRound = () => {
    if (round < totalRounds) {
      if (isHostInRoom) generateAndBroadcastRound(currentDifficulty, round + 1);
    } else {
      handlePlayAgain();
    }
  };

  const handlePlayAgain = async () => {
    if (isHostInRoom && gameRoomCode) {
      await broadcastGameEvent("return_to_lobby", {});
    }
    setGamePhase("waiting");
    setScore(0);
    setMyFoundWords([]);
    setFoundWordsCoords([]);
    setRound(1);
  };

  // --- RENDERIZADO ---

  if (gamePhase === "waiting") {
    return (
      <GameLobby
        gameSlug="word-search"
        initialRoomCode={roomCode}
        existingRoomCode={gameRoomCode}
        isHostReturning={isHostInRoom}
        initialPlayerName={displayName || undefined}
        buildStartPayload={async ({ difficulties }) => ({
          difficulties,
        })}
        onStartGame={handleLobbyStart}
      />
    );
  }

  if (gamePhase === "ranking") {
    const isLastRound = round >= totalRounds;
    const rankingPlayers =
      players.length > 0
        ? players
        : [{ rank: 1, username, points: score, correctAnswers: myFoundWords.length, streak: 0, isCurrentUser: true }];

    return (
      <RoundRanking
        players={rankingPlayers}
        roundNumber={round}
        totalRounds={totalRounds}
        countdownSeconds={8}
        onCountdownComplete={isHostInRoom ? handleNextRound : () => {}}
        isLastRound={isLastRound}
        allPlayersCorrect={false}
      />
    );
  }

  return (
    // Agregamos handleMouseUp al contenedor principal para soltar el click fuera de la grilla
    <div
      className="flex-1 bg-card rounded-xl border border-border overflow-hidden flex flex-col h-full select-none"
      onMouseUp={handleMouseUp}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Trophy className="text-yellow-400" size={20} />
            <span className="font-bold text-foreground text-xl">{score}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="text-muted-foreground" size={18} />
            <span className="text-sm text-muted-foreground">{playerCount}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-full">
          <Clock className={`${timeLeft <= 10 ? "text-red-400" : "text-primary"}`} size={18} />
          <span className={`font-bold ${timeLeft <= 10 ? "text-red-400" : "text-foreground"}`}>{timeLeft}s</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium hidden sm:inline text-muted-foreground">
            Ronda {round}/{totalRounds}
          </span>
          {isConnected ? <Wifi className="text-green-400" size={16} /> : <WifiOff className="text-red-400" size={16} />}
        </div>
      </div>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* LADO IZQUIERDO: GRILLA */}
        <div className="flex-1 flex items-center justify-center p-4 bg-secondary/10 overflow-auto">
          <div
            // select-none y touch-none son vitales para evitar selección de texto y scroll en móvil al jugar
            className="grid gap-1 select-none touch-none p-2 bg-card rounded-lg shadow-xl border border-border relative"
            style={{
              gridTemplateColumns: `repeat(${grid.length}, minmax(28px, 40px))`,
              gridTemplateRows: `repeat(${grid.length}, minmax(28px, 40px))`,
            }}
            onMouseLeave={() => {
              if (isSelecting) handleMouseUp();
            }}
          >
            {grid.map((row, rIndex) =>
              row.map((letter, cIndex) => {
                const isActive = isSelected(rIndex, cIndex); // Seleccionando ahora mismo
                const isAlreadyFound = isPermanentlyFound(rIndex, cIndex); // Ya encontrada antes

                return (
                  <motion.div
                    key={`${rIndex}-${cIndex}`}
                    whileTap={{ scale: 0.9 }}
                    className={`
                       flex items-center justify-center font-bold text-lg sm:text-xl rounded-md cursor-pointer 
                       transition-colors duration-100
                       ${
                         isActive
                           ? "bg-primary text-primary-foreground shadow-lg scale-105 z-20" // Estilo al arrastrar
                           : isAlreadyFound
                             ? "bg-green-500/20 text-green-500 border border-green-500/30" // Estilo palabra encontrada
                             : "bg-secondary/40 text-foreground hover:bg-secondary/70"
                       } // Estilo normal
                     `}
                    onMouseDown={() => handleMouseDown(rIndex, cIndex)}
                    onMouseEnter={() => handleMouseEnter(rIndex, cIndex)}
                  >
                    {letter}
                  </motion.div>
                );
              }),
            )}
          </div>
        </div>

        {/* LADO DERECHO: SOLO PALABRAS (Chat eliminado) */}
        <div className="w-full md:w-80 border-l border-border bg-card flex flex-col">
          <div className="p-4 flex-1 overflow-y-auto">
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground flex items-center gap-2">
              <Grid3X3 size={16} />
              PALABRAS ({myFoundWords.length}/{targetWords.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {targetWords.map((word) => {
                const found = myFoundWords.includes(word);
                return (
                  <div
                    key={word}
                    className={`
                      px-2 py-1 rounded text-xs font-medium border
                      ${
                        found
                          ? "bg-green-500/20 border-green-500/50 text-green-500 line-through decoration-2 opacity-60"
                          : "bg-secondary border-border text-foreground"
                      }
                    `}
                  >
                    {word}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
