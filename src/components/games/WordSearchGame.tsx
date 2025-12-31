import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Trophy, Clock, Users, Wifi, WifiOff, Lightbulb, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import RoundRanking from "./shared/RoundRanking";
import GameLobby from "./shared/GameLobby";
import { useGameSounds } from "@/hooks/useGameSounds";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { supabase } from "@/integrations/supabase/client";

// --- CONFIGURACIÓN Y TIPOS ---

const ROUND_SECONDS = 90;

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
  { value: "easy", label: "Fácil", gridSize: 8, wordCount: 4, color: "text-green-400", bgColor: "bg-green-500/20" },
  {
    value: "medium",
    label: "Medio",
    gridSize: 10,
    wordCount: 6,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
  },
  { value: "hard", label: "Difícil", gridSize: 12, wordCount: 8, color: "text-red-400", bgColor: "bg-red-500/20" },
];

interface WordDef {
  word: string;
  clue: string;
  category?: string; // Columna adicional de la DB
}

type GamePhase = "waiting" | "playing" | "ranking";

interface WordSearchGameProps {
  roomCode?: string;
  onBack?: () => void;
  category?: string;
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
];

const generateGrid = (words: string[], size: number) => {
  const grid = Array(size)
    .fill(null)
    .map(() => Array(size).fill(""));
  const placedWordsStrings: string[] = [];

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
          placedWordsStrings.push(word);
          placed = true;
        }
      }
      attempts++;
    }
  }

  const letters = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === "") grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
    }
  }

  return { grid, placedWordsStrings };
};

// --- COMPONENTE PRINCIPAL ---

export default function WordSearchGame({ roomCode, onBack, category }: WordSearchGameProps) {
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
    gameEvent,
    broadcastGameEvent,
  } = useMultiplayerGame("word-search", gameRoomCode, displayName || undefined);

  const [gamePhase, setGamePhase] = useState<GamePhase>("waiting");
  const [grid, setGrid] = useState<string[][]>([]);
  const [dictionary, setDictionary] = useState<WordDef[]>([]);
  const [isLoadingDictionary, setIsLoadingDictionary] = useState(true);

  const [targetWords, setTargetWords] = useState<WordDef[]>([]);
  const [myFoundWords, setMyFoundWords] = useState<string[]>([]);
  const [foundWordsCoords, setFoundWordsCoords] = useState<Coordinate[][]>([]);

  const [isSelecting, setIsSelecting] = useState(false);
  const [startCell, setStartCell] = useState<Coordinate | null>(null);
  const [currentCell, setCurrentCell] = useState<Coordinate | null>(null);

  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [totalRounds] = useState(3);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [roundEndsAt, setRoundEndsAt] = useState<number | null>(null);
  const lastTimerSecondRef = useRef<number>(ROUND_SECONDS);
  const [currentDifficulty, setCurrentDifficulty] = useState<Difficulty>("medium");

  useEffect(() => {
    preloadSounds();
  }, [preloadSounds]);

  // Cargar palabras incluyendo la columna CATEGORY
  useEffect(() => {
    async function fetchWords() {
      try {
        setIsLoadingDictionary(true);
        const { data, error } = await supabase.from("wordsearch_dictionary").select("word, clue, category"); //

        if (error) throw error;

        if (data) {
          const formattedData: WordDef[] = data.map((item: any) => ({
            word: item.word.toUpperCase(),
            clue: item.clue,
            category: item.category, //
          }));
          setDictionary(formattedData);
        }
      } catch (err) {
        console.error("Error cargando diccionario:", err);
        toast.error("Error cargando palabras del servidor");
      } finally {
        setIsLoadingDictionary(false);
      }
    }

    fetchWords();
  }, []);

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
      setFoundWordsCoords([]);
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

  const generateAndBroadcastRound = useCallback(
    async (difficultyVal: Difficulty, roundNum: number) => {
      if (dictionary.length === 0) {
        toast.error("No hay palabras disponibles para jugar.");
        return;
      }

      const diffConfig = difficultyOptions.find((d) => d.value === difficultyVal) || difficultyOptions[1];
      const shuffled = [...dictionary].sort(() => 0.5 - Math.random());
      const selectedItems = shuffled.slice(0, diffConfig.wordCount);

      const wordsOnly = selectedItems.map((item) => item.word);
      const { grid: newGrid, placedWordsStrings } = generateGrid(wordsOnly, diffConfig.gridSize);
      const finalTargetWords = selectedItems.filter((item) => placedWordsStrings.includes(item.word));

      setGrid(newGrid);
      setTargetWords(finalTargetWords);
      setMyFoundWords([]);
      setFoundWordsCoords([]);
      setRound(roundNum);
      setCurrentDifficulty(difficultyVal);
      setGamePhase("playing");
      const endsAt = startRoundTimer();
      playSound("gameStart", 0.6);

      if (gameRoomCode) {
        await broadcastGameEvent("wordsearch_start", {
          grid: newGrid,
          words: finalTargetWords,
          round: roundNum,
          difficulty: difficultyVal,
          roundEndsAt: endsAt,
        });
      }
    },
    [gameRoomCode, broadcastGameEvent, playSound, startRoundTimer, dictionary],
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

  const getSelectedCells = (start: Coordinate, end: Coordinate): Coordinate[] => {
    const cells: Coordinate[] = [];
    const dr = end.r - start.r;
    const dc = end.c - start.c;
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

  const isSelected = (r: number, c: number) => currentSelectionCoords.some((cell) => cell.r === r && cell.c === c);
  const isPermanentlyFound = (r: number, c: number) =>
    foundWordsCoords.some((coords) => coords.some((cell) => cell.r === r && cell.c === c));

  const handleMouseDown = (r: number, c: number) => {
    if (gamePhase !== "playing") return;
    setIsSelecting(true);
    setStartCell({ r, c });
    setCurrentCell({ r, c });
  };

  const handleMouseEnter = (r: number, c: number) => {
    if (isSelecting && gamePhase === "playing") setCurrentCell({ r, c });
  };

  const handleMouseUp = async () => {
    if (!isSelecting || !startCell || !currentCell) return;
    const wordStr = getSelectedWord();
    const reversedWordStr = wordStr.split("").reverse().join("");
    const candidateCoords = getSelectedCells(startCell, currentCell);

    let foundItem = null;
    const matchNormal = targetWords.find((t) => t.word === wordStr);
    if (matchNormal && !myFoundWords.includes(matchNormal.word)) foundItem = matchNormal;
    else {
      const matchReverse = targetWords.find((t) => t.word === reversedWordStr);
      if (matchReverse && !myFoundWords.includes(matchReverse.word)) foundItem = matchReverse;
    }

    if (foundItem) {
      const actualWord = foundItem.word;
      setFoundWordsCoords((prev) => [...prev, candidateCoords]);
      const newFound = [...myFoundWords, actualWord];
      setMyFoundWords(newFound);
      playSound("correct", 0.6);
      const wordPoints = actualWord.length * 15;
      const newScore = score + wordPoints;
      setScore(newScore);
      await updateScore(newScore, newFound.length, 0);
      await broadcastCorrectAnswer(actualWord, wordPoints);
      toast.success(`¡Correcto! ${actualWord} (+${wordPoints})`);
    }

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

  if (gamePhase === "waiting") {
    return (
      <GameLobby
        gameSlug="word-search"
        initialRoomCode={roomCode}
        existingRoomCode={gameRoomCode}
        isHostReturning={isHostInRoom}
        initialPlayerName={displayName || undefined}
        buildStartPayload={async ({ difficulties }) => ({ difficulties })}
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
        countdownSeconds={10}
        onCountdownComplete={isHostInRoom ? handleNextRound : () => {}}
        isLastRound={isLastRound}
        allPlayersCorrect={false}
        isSoloMode={playerCount <= 1}
      />
    );
  }

  return (
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

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* LADO IZQUIERDO: GRILLA */}
        <div className="flex-1 flex items-center justify-center p-4 bg-secondary/10 overflow-auto">
          <div
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
                const isActive = isSelected(rIndex, cIndex);
                const isAlreadyFound = isPermanentlyFound(rIndex, cIndex);
                return (
                  <motion.div
                    key={`${rIndex}-${cIndex}`}
                    whileTap={{ scale: 0.9 }}
                    className={`
                      flex items-center justify-center font-bold text-lg sm:text-xl rounded-md cursor-pointer 
                      transition-colors duration-100
                      ${isActive ? "bg-primary text-primary-foreground shadow-lg scale-105 z-20" : isAlreadyFound ? "bg-green-500/20 text-green-500 border border-green-500/30" : "bg-secondary/40 text-foreground hover:bg-secondary/70"} 
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

        {/* LADO DERECHO: PISTAS CON TAG DE CATEGORÍA */}
        <div className="w-full md:w-96 border-l border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border bg-secondary/5">
            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <Lightbulb size={16} className="text-yellow-500" />
              PISTAS ({myFoundWords.length}/{targetWords.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <AnimatePresence>
              {targetWords.map((item) => {
                const found = myFoundWords.includes(item.word);
                return (
                  <motion.div
                    key={item.word}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`relative p-3 rounded-lg border text-sm transition-all duration-300 group ${found ? "bg-green-500/10 border-green-500/50" : "bg-card border-border hover:bg-secondary/40"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 ${found ? "text-green-500" : "text-primary/40"}`}>
                        {found ? (
                          <CheckCircle2 size={18} />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-current" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p
                          className={`mb-2 leading-relaxed ${found ? "text-muted-foreground line-through decoration-green-500/50" : "text-foreground font-medium"}`}
                        >
                          {item.clue}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {/* TAG: Cantidad de letras */}
                            <div
                              className={`text-[10px] font-mono px-2 py-1 rounded-md border ${found ? "bg-background/50 text-muted-foreground/50" : "bg-primary/10 text-primary"}`}
                            >
                              {item.word.length} letras
                            </div>
                            {/* TAG: CATEGORÍA */}
                            {item.category && (
                              <div
                                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md border ${found ? "bg-secondary/30 text-muted-foreground/40 border-transparent" : "bg-orange-500/10 text-orange-500 border-orange-500/20"}`}
                              >
                                {item.category}
                              </div>
                            )}
                          </div>
                          <AnimatePresence>
                            {found && (
                              <motion.span
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-xs font-bold text-green-500 uppercase bg-green-500/10 px-2 py-1 rounded"
                              >
                                {item.word}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
