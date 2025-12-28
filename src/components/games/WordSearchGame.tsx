import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface WordSearchGameProps {
  roomCode?: string;
}

const WordSearchGame = ({ roomCode }: WordSearchGameProps) => {
  const [words, setWords] = useState<string[]>([]);
  const [grid, setGrid] = useState<string[][]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Cargar palabras de Supabase
  useEffect(() => {
    const loadGameData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("wordsearch_dictionary").select("word").limit(10);

        if (error) throw error;

        if (data && data.length > 0) {
          const wordList = data.map((d) => d.word.toUpperCase());
          setWords(wordList);
          generateGrid(wordList);
        } else {
          // Fallback manual si la tabla está vacía
          const fallback = ["REACT", "SUPABASE", "NODE", "HTML", "CSS"];
          setWords(fallback);
          generateGrid(fallback);
        }
      } catch (err) {
        console.error("Error loading words:", err);
        toast.error("No se pudieron cargar las palabras");
      } finally {
        setLoading(false);
      }
    };

    loadGameData();
  }, []);

  // 2. Lógica simple para generar la grilla (10x10)
  const generateGrid = (wordList: string[]) => {
    const size = 10;
    const newGrid = Array(size)
      .fill(null)
      .map(() =>
        Array(size)
          .fill(null)
          .map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26))),
      );

    // Colocar palabras de forma horizontal (ejemplo simple)
    wordList.forEach((word, index) => {
      if (index < size) {
        for (let i = 0; i < Math.min(word.length, size); i++) {
          newGrid[index][i] = word[i];
        }
      }
    });

    setGrid(newGrid);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card rounded-xl border border-border min-h-[500px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 p-4 bg-card rounded-xl border border-border shadow-lg">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary">Sopa de Letras</h2>
        <div className="text-sm font-medium px-3 py-1 bg-secondary rounded-full">
          Encontradas: {foundWords.length} / {words.length}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
        {/* Grilla de juego */}
        <div className="grid grid-cols-10 gap-1 bg-background p-2 rounded-lg border border-border shadow-inner">
          {grid.map((row, rowIndex) =>
            row.map((letter, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-card border border-border text-sm md:text-base font-bold cursor-pointer hover:bg-primary/20 transition-colors rounded-sm"
              >
                {letter}
              </div>
            )),
          )}
        </div>

        {/* Lista de palabras */}
        <Card className="p-4 w-full md:w-48 bg-muted/30 border-dashed">
          <h3 className="font-semibold mb-3 border-b pb-2 text-center">Palabras</h3>
          <ul className="space-y-2">
            {words.map((word) => (
              <li
                key={word}
                className={`text-sm text-center ${foundWords.includes(word) ? "line-through opacity-40" : ""}`}
              >
                {word}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4 text-center text-sm text-muted-foreground italic">
        (Modo de juego: Selección táctil próximamente)
      </div>
    </div>
  );
};

export default WordSearchGame;
