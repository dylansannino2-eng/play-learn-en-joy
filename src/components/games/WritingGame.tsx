import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Clock, Zap, Send, RotateCcw, Sparkles } from "lucide-react";
import GameLobby from "./shared/GameLobby";
import RoundRanking from "./shared/RoundRanking";
import { useGameSounds } from "@/hooks/useGameSounds";

const WORDS_BY_DIFFICULTY = {
  easy: [
    "happy", "book", "house", "water", "food", "friend", "family", "work", 
    "school", "money", "time", "love", "life", "world", "music"
  ],
  medium: [
    "adventure", "beautiful", "challenge", "discovery", "enthusiasm",
    "freedom", "grateful", "harmony", "imagination", "journey",
    "knowledge", "liberty", "mysterious", "nature", "opportunity"
  ],
  hard: [
    "accomplished", "conscientious", "extraordinary", "incomprehensible",
    "simultaneously", "unprecedented", "sophisticated", "quintessential",
    "metaphorical", "philosophical", "revolutionary", "circumstantial"
  ]
};

const ROUND_SECONDS = 60;
const MAX_CHARS = 280;

type Difficulty = "easy" | "medium" | "hard";
type GamePhase = "waiting" | "playing" | "evaluating" | "ranking";

interface EvaluationResult {
  score: number;
  feedback: {
    extension: number;
    naturalness: number;
    grammar: number;
    wordUsage: boolean;
  };
  comment: string;
}

interface WritingGameProps {
  roomCode?: string;
  multiplayerEnabled?: boolean;
}

export default function WritingGame({ roomCode, multiplayerEnabled = false }: WritingGameProps) {
  const { playSound, preloadSounds } = useGameSounds();

  const [displayName, setDisplayName] = useState("");
  const [selectedDifficulties, setSelectedDifficulties] = useState<Difficulty[]>(["medium"]);

  const [currentWord, setCurrentWord] = useState("");
  const [userSentence, setUserSentence] = useState("");
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [roundEndsAt, setRoundEndsAt] = useState<number | null>(null);
  const lastTimerSecondRef = useRef<number>(ROUND_SECONDS);

  const [gamePhase, setGamePhase] = useState<GamePhase>("waiting");
  const [round, setRound] = useState(1);
  const [totalRounds] = useState(5);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<EvaluationResult | null>(null);

  useEffect(() => {
    preloadSounds();
  }, [preloadSounds]);

  const getRandomWord = useCallback((difficulty: Difficulty) => {
    const words = WORDS_BY_DIFFICULTY[difficulty];
    return words[Math.floor(Math.random() * words.length)];
  }, []);

  const getRandomDifficulty = useCallback(() => {
    return selectedDifficulties[Math.floor(Math.random() * selectedDifficulties.length)];
  }, [selectedDifficulties]);

  const startRoundTimer = useCallback(() => {
    const nextEndsAt = Date.now() + ROUND_SECONDS * 1000;
    lastTimerSecondRef.current = ROUND_SECONDS;
    setRoundEndsAt(nextEndsAt);
    setTimeLeft(ROUND_SECONDS);
    return nextEndsAt;
  }, []);

  const evaluateSentence = useCallback(async () => {
    if (!userSentence.trim()) {
      // Si no escribió nada, dar puntuación 0
      setResult({
        score: 0,
        feedback: { extension: 0, naturalness: 0, grammar: 0, wordUsage: false },
        comment: "No escribiste ninguna oración. ¡Intenta de nuevo!"
      });
      setGamePhase("ranking");
      return;
    }

    setGamePhase("evaluating");

    try {
      const { data, error } = await supabase.functions.invoke("evaluate-writing", {
        body: { word: currentWord, sentence: userSentence.trim() },
      });

      if (error) throw error;

      const evaluation: EvaluationResult = data;
      setResult(evaluation);
      setScore(prev => prev + evaluation.score);
      playSound("correct", 0.6);
    } catch (error) {
      console.error("Evaluation error:", error);
      toast.error("Error evaluating your sentence");
      // Fallback
      const fallbackScore = userSentence.toLowerCase().includes(currentWord.toLowerCase()) ? 40 : 10;
      setResult({
        score: fallbackScore,
        feedback: { extension: 40, naturalness: 40, grammar: 40, wordUsage: userSentence.toLowerCase().includes(currentWord.toLowerCase()) },
        comment: "No pudimos evaluar tu oración con IA, pero aquí tienes una puntuación aproximada."
      });
      setScore(prev => prev + fallbackScore);
    }

    setGamePhase("ranking");
  }, [currentWord, userSentence, playSound]);

  // Timer
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
        if (remainingSec <= 6 && remainingSec > 1) {
          playSound("tick", 0.3);
        }

        if (remainingSec <= 0 && lastTimerSecondRef.current > 0) {
          playSound("roundEnd", 0.6);
          evaluateSentence();
        }

        lastTimerSecondRef.current = remainingSec;
        setTimeLeft(remainingSec);
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [gamePhase, roundEndsAt, playSound, evaluateSentence, startRoundTimer]);

  const handleLobbyStart = useCallback(
    (payload: { difficulties: Difficulty[]; isHost: boolean; playerName: string }) => {
      setDisplayName(payload.playerName);
      setSelectedDifficulties(payload.difficulties);

      const firstDifficulty = payload.difficulties[Math.floor(Math.random() * payload.difficulties.length)];
      const word = getRandomWord(firstDifficulty);
      
      setCurrentWord(word);
      setUserSentence("");
      setResult(null);
      setRound(1);
      setScore(0);
      startRoundTimer();
      setGamePhase("playing");
      playSound("gameStart", 0.6);
    },
    [getRandomWord, startRoundTimer, playSound]
  );

  const handleSubmit = () => {
    if (gamePhase === "playing" && userSentence.trim()) {
      evaluateSentence();
    }
  };

  const nextRound = useCallback(() => {
    if (round >= totalRounds) {
      return;
    }

    setRound(r => r + 1);
    setUserSentence("");
    setResult(null);
    const difficulty = getRandomDifficulty();
    setCurrentWord(getRandomWord(difficulty));
    startRoundTimer();
    setGamePhase("playing");
    playSound("gameStart", 0.5);
  }, [round, totalRounds, getRandomDifficulty, getRandomWord, startRoundTimer, playSound]);

  const handlePlayAgain = useCallback(() => {
    playSound("gameStart", 0.5);
    setGamePhase("waiting");
    setRound(1);
    setScore(0);
    setResult(null);
    setUserSentence("");
  }, [playSound]);

  const getDifficultyFromWord = () => {
    if (WORDS_BY_DIFFICULTY.easy.includes(currentWord)) return "easy";
    if (WORDS_BY_DIFFICULTY.hard.includes(currentWord)) return "hard";
    return "medium";
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "text-green-400";
      case "medium": return "text-yellow-400";
      case "hard": return "text-red-400";
      default: return "text-muted-foreground";
    }
  };

  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-green-500";
    if (s >= 60) return "text-yellow-500";
    if (s >= 40) return "text-orange-500";
    return "text-red-500";
  };

  // Show ranking between rounds
  if (gamePhase === "ranking" && result) {
    const isLastRound = round >= totalRounds;
    const rankingPlayers = [
      { rank: 1, username: displayName || "Player", points: score, correctAnswers: round, streak: 0, isCurrentUser: true }
    ];

    return (
      <>
        <RoundRanking
          players={rankingPlayers}
          roundNumber={round}
          totalRounds={totalRounds}
          countdownSeconds={8}
          onCountdownComplete={isLastRound ? handlePlayAgain : nextRound}
          isLastRound={isLastRound}
          allPlayersCorrect={result.feedback.wordUsage}
          isSoloMode={true}
        />
        
        {/* Panel de Resultados */}
        <div className="w-96 bg-card rounded-xl border border-border overflow-hidden flex flex-col shrink-0">
          <div className="bg-gradient-to-r from-accent/20 to-primary/20 p-3 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Evaluación IA
            </h3>
          </div>
          
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {/* Puntuación */}
            <div className="text-center py-2">
              <p className="text-xs text-muted-foreground mb-1">Tu puntuación</p>
              <span className={`text-5xl font-black ${getScoreColor(result.score)}`}>
                {result.score}
              </span>
            </div>

            {/* Desglose */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-secondary/50 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground">Extensión</p>
                <p className={`text-lg font-bold ${getScoreColor(result.feedback.extension)}`}>
                  {result.feedback.extension}
                </p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground">Naturalidad</p>
                <p className={`text-lg font-bold ${getScoreColor(result.feedback.naturalness)}`}>
                  {result.feedback.naturalness}
                </p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground">Gramática</p>
                <p className={`text-lg font-bold ${getScoreColor(result.feedback.grammar)}`}>
                  {result.feedback.grammar}
                </p>
              </div>
            </div>

            {/* Uso de palabra */}
            <div className={`text-center p-2 rounded-lg text-sm ${result.feedback.wordUsage ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
              {result.feedback.wordUsage 
                ? `✓ Usaste "${currentWord}" correctamente` 
                : `✗ No usaste "${currentWord}" correctamente`}
            </div>

            {/* Tu oración */}
            <div className="bg-muted/30 p-3 rounded-lg">
              <p className="text-[10px] text-muted-foreground mb-1">Tu oración:</p>
              <p className="text-sm italic">"{userSentence}"</p>
            </div>

            {/* Comentario IA */}
            <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
              <p className="text-[10px] text-primary mb-1">💡 Feedback</p>
              <p className="text-sm text-foreground">{result.comment}</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Evaluating state
  if (gamePhase === "evaluating") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-4"
        >
          <div className="w-16 h-16 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-medium text-muted-foreground">Evaluando tu oración...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {/* Game Area */}
      <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden flex flex-col">
        {/* Header Stats */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="text-yellow-400" size={20} />
              <span className="font-bold text-lg">{score}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock
                className={`${timeLeft <= 10 ? "text-destructive animate-pulse" : "text-muted-foreground"}`}
                size={20}
              />
              <span className={`font-bold text-lg ${timeLeft <= 10 ? "text-destructive" : ""}`}>
                {timeLeft}s
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Ronda {round}/{totalRounds}</span>
            {gamePhase === "playing" && (
              <div className="flex items-center gap-2">
                <Zap className={getDifficultyColor(getDifficultyFromWord())} size={18} />
                <span className={`text-sm font-medium ${getDifficultyColor(getDifficultyFromWord())}`}>
                  {getDifficultyFromWord() === "easy" ? "Fácil" : getDifficultyFromWord() === "hard" ? "Difícil" : "Medio"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {gamePhase === "playing" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-lg text-center"
            >
              <p className="text-sm text-muted-foreground mb-2">Escribe una oración usando:</p>
              <motion.div
                key={currentWord}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-8"
              >
                <span className="text-5xl font-black text-primary">{currentWord}</span>
              </motion.div>
              
              <p className="text-xs text-muted-foreground">
                Serás evaluado por <strong>extensión</strong>, <strong>naturalidad</strong> y <strong>gramática</strong>
              </p>
            </motion.div>
          )}

          {gamePhase === "waiting" && (
            <GameLobby
              gameSlug="writing-game"
              initialRoomCode={roomCode}
              multiplayerEnabled={multiplayerEnabled}
              onStartGame={handleLobbyStart}
            />
          )}
        </div>
      </div>

      {/* Writing Panel (replaces chat) */}
      {gamePhase === "playing" && (
        <div className="w-96 bg-card rounded-xl border border-border overflow-hidden flex flex-col shrink-0">
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-4 border-b border-border">
            <h3 className="font-bold text-foreground text-lg">Writing Round</h3>
            <p className="text-sm text-muted-foreground">Round {round} / {totalRounds}</p>
          </div>
          
          <div className="flex-1 p-4 flex flex-col">
            {/* Textarea con estilo similar a la imagen */}
            <div className="flex-1 relative">
              <Textarea
                value={userSentence}
                onChange={(e) => setUserSentence(e.target.value.slice(0, MAX_CHARS))}
                placeholder={`Write a sentence using "${currentWord}"...`}
                className="w-full h-full min-h-[200px] resize-none text-lg bg-white dark:bg-zinc-900 text-foreground border-2 border-amber-400/50 focus:border-amber-500 rounded-xl p-4"
              />
            </div>

            {/* Footer con contador y botón */}
            <div className="mt-4 flex items-center justify-between">
              <Button 
                onClick={handleSubmit}
                disabled={!userSentence.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold gap-2"
              >
                <Send className="w-4 h-4" />
                SAVE REPLY
              </Button>
              
              <span className="text-sm text-muted-foreground font-mono">
                {userSentence.length} / {MAX_CHARS}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Panel placeholder when waiting */}
      {gamePhase === "waiting" && (
        <div className="w-96 bg-card rounded-xl border border-border overflow-hidden flex flex-col shrink-0">
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-4 border-b border-border">
            <h3 className="font-bold text-foreground text-lg">Writing Challenge</h3>
            <p className="text-sm text-muted-foreground">Practica tu escritura</p>
          </div>
          
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
            <Sparkles className="w-12 h-12 text-amber-400 mb-4" />
            <p className="text-muted-foreground mb-2">
              Escribe oraciones creativas usando palabras aleatorias
            </p>
            <p className="text-xs text-muted-foreground">
              La IA evaluará tu extensión, naturalidad y gramática
            </p>
          </div>
        </div>
      )}
    </>
  );
}
