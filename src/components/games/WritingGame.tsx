import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Send, RotateCcw, Clock, Sparkles, Trophy } from "lucide-react";

const WORDS = [
  "adventure", "beautiful", "challenge", "discovery", "enthusiasm",
  "freedom", "grateful", "harmony", "imagination", "journey",
  "knowledge", "liberty", "mysterious", "nature", "opportunity",
  "passionate", "question", "remarkable", "strength", "treasure",
  "universe", "victory", "wonderful", "extraordinary", "yesterday",
  "accomplish", "believe", "create", "determine", "embrace",
  "flourish", "genuine", "humble", "inspire", "joyful"
];

const ROUND_TIME = 60; // seconds

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

const WritingGame = () => {
  const [currentWord, setCurrentWord] = useState("");
  const [userSentence, setUserSentence] = useState("");
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);

  const getRandomWord = useCallback(() => {
    return WORDS[Math.floor(Math.random() * WORDS.length)];
  }, []);

  const startGame = () => {
    setCurrentWord(getRandomWord());
    setUserSentence("");
    setTimeLeft(ROUND_TIME);
    setIsPlaying(true);
    setResult(null);
  };

  const evaluateSentence = async () => {
    if (!userSentence.trim()) {
      toast.error("Please write a sentence first!");
      return;
    }

    setIsPlaying(false);
    setIsEvaluating(true);

    try {
      const { data, error } = await supabase.functions.invoke("evaluate-writing", {
        body: { 
          word: currentWord, 
          sentence: userSentence.trim() 
        },
      });

      if (error) throw error;

      const evaluation: EvaluationResult = data;
      setResult(evaluation);
      setTotalScore(prev => prev + evaluation.score);
      setRoundsPlayed(prev => prev + 1);
    } catch (error) {
      console.error("Evaluation error:", error);
      toast.error("Error evaluating your sentence. Please try again.");
      setIsPlaying(true);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Timer effect
  useEffect(() => {
    if (!isPlaying || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          evaluateSentence();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  const handleSubmit = () => {
    if (isPlaying) {
      evaluateSentence();
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return "🌟";
    if (score >= 80) return "🎉";
    if (score >= 60) return "👍";
    if (score >= 40) return "💪";
    return "📝";
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-6">
      {/* Header Stats */}
      {roundsPlayed > 0 && (
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span>Average: {Math.round(totalScore / roundsPlayed)}</span>
          </div>
          <div>Rounds: {roundsPlayed}</div>
        </div>
      )}

      {/* Main Game Card */}
      <Card className="p-6 space-y-6">
        {!isPlaying && !isEvaluating && !result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <Sparkles className="w-12 h-12 mx-auto text-primary" />
            <h2 className="text-2xl font-bold">Writing Challenge</h2>
            <p className="text-muted-foreground">
              A word will appear. Write a creative sentence using it!
              <br />
              You'll be scored on extension, naturalness, and grammar.
            </p>
            <Button onClick={startGame} size="lg" className="mt-4">
              Start Game
            </Button>
          </motion.div>
        )}

        {(isPlaying || isEvaluating) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Timer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Time remaining</span>
                </div>
                <span className={`font-mono font-bold ${timeLeft <= 10 ? "text-red-500" : ""}`}>
                  {timeLeft}s
                </span>
              </div>
              <Progress value={(timeLeft / ROUND_TIME) * 100} className="h-2" />
            </div>

            {/* Word Display */}
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-2">Use this word:</p>
              <motion.span
                key={currentWord}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-4xl font-bold text-primary"
              >
                {currentWord}
              </motion.span>
            </div>

            {/* Input Area */}
            <div className="space-y-4">
              <Textarea
                value={userSentence}
                onChange={(e) => setUserSentence(e.target.value)}
                placeholder={`Write a sentence using "${currentWord}"...`}
                className="min-h-[120px] text-lg resize-none"
                disabled={isEvaluating}
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {userSentence.split(/\s+/).filter(w => w).length} words
                </span>
                <Button 
                  onClick={handleSubmit} 
                  disabled={isEvaluating || !userSentence.trim()}
                  className="gap-2"
                >
                  {isEvaluating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Evaluating...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Results */}
        <AnimatePresence>
          {result && !isPlaying && !isEvaluating && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Score Display */}
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">Your Score</p>
                <div className="flex items-center justify-center gap-2">
                  <span className={`text-6xl font-bold ${getScoreColor(result.score)}`}>
                    {result.score}
                  </span>
                  <span className="text-4xl">{getScoreEmoji(result.score)}</span>
                </div>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Extension</p>
                  <p className={`text-xl font-bold ${getScoreColor(result.feedback.extension)}`}>
                    {result.feedback.extension}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Naturalness</p>
                  <p className={`text-xl font-bold ${getScoreColor(result.feedback.naturalness)}`}>
                    {result.feedback.naturalness}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Grammar</p>
                  <p className={`text-xl font-bold ${getScoreColor(result.feedback.grammar)}`}>
                    {result.feedback.grammar}
                  </p>
                </div>
              </div>

              {/* Word Usage Check */}
              <div className={`text-center p-3 rounded-lg ${result.feedback.wordUsage ? "bg-green-500/10" : "bg-red-500/10"}`}>
                <span className={result.feedback.wordUsage ? "text-green-600" : "text-red-600"}>
                  {result.feedback.wordUsage 
                    ? `✓ You correctly used "${currentWord}"` 
                    : `✗ You didn't use "${currentWord}" correctly`}
                </span>
              </div>

              {/* Your Sentence */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Your sentence:</p>
                <p className="italic">"{userSentence}"</p>
              </div>

              {/* AI Comment */}
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                <p className="text-xs text-primary mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI Feedback
                </p>
                <p className="text-sm">{result.comment}</p>
              </div>

              {/* Play Again */}
              <Button onClick={startGame} className="w-full gap-2" size="lg">
                <RotateCcw className="w-4 h-4" />
                Play Again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
};

export default WritingGame;
