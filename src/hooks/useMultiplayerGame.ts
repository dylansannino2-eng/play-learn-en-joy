import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Player {
  odId: string;
  odname: string;
  odints: number;
  odrrectAnswers: number;
  odreak: number;
  odline: boolean;
}

interface GameState {
  phase: 'waiting' | 'playing' | 'ranking';
  round: number;
  cardId: string | null;
}

interface CorrectAnswerEvent {
  username: string;
  odints: number;
  answer: string;
}

export function useMultiplayerGame(gameSlug: string, roomCode?: string, displayName?: string) {
  const { user } = useAuth();

  const anonNameRef = useRef<string>(`Player_${Math.random().toString(36).slice(2, 6)}`);
  const anonIdRef = useRef<string>(`anon_${Math.random().toString(36).slice(2, 10)}`);

  const username = displayName?.trim() || user?.email?.split('@')[0] || anonNameRef.current;
  const oderId = user?.id || anonIdRef.current;
  
  const [players, setPlayers] = useState<Map<string, Player>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [correctAnswerEvents, setCorrectAnswerEvents] = useState<CorrectAnswerEvent[]>([]);

  // Initialize realtime connection
  useEffect(() => {
    // Use room code if provided, otherwise use public channel
    const channelName = roomCode ? `game:${gameSlug}:${roomCode}` : `game:${gameSlug}:public`;
    
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: oderId,
        },
      },
    });

    // Handle presence sync
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const updatedPlayers = new Map<string, Player>();
      
      Object.entries(state).forEach(([oderId, presences]) => {
        const presence = presences[0] as any;
        if (presence) {
          updatedPlayers.set(oderId, {
            odId: oderId,
            odname: presence.username,
            odints: presence.odints ?? presence.points ?? 0,
            odrrectAnswers: presence.odrrectAnswers ?? presence.correctAnswers ?? 0,
            odreak: presence.odreak ?? presence.streak ?? 0,
            odline: true,
          });
        }
      });
      
      setPlayers(updatedPlayers);
    });

    // Handle player join
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('Player joined:', key, newPresences);
    });

    // Handle player leave
    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('Player left:', key, leftPresences);
    });

    // Handle broadcast events
    channel.on('broadcast', { event: 'correct_answer' }, ({ payload }) => {
      const event = payload as CorrectAnswerEvent;
      setCorrectAnswerEvents((prev) => [...prev, event]);
      
      // Auto-clear after 3 seconds
      setTimeout(() => {
        setCorrectAnswerEvents((prev) => prev.filter((e) => e !== event));
      }, 3000);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        
        // Track initial presence
        await channel.track({
          username,
          odints: 0,
          odrrectAnswers: 0,
          odreak: 0,
          joinedAt: new Date().toISOString(),
        });
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [gameSlug, roomCode, oderId, username]);

  // Update presence with new score
  const updateScore = useCallback(async (points: number, correctAnswers: number, streak: number) => {
    if (channelRef.current) {
      await channelRef.current.track({
        username,
        odints: points,
        odrrectAnswers: correctAnswers,
        odreak: streak,
        joinedAt: new Date().toISOString(),
      });
    }
  }, [username]);

  // Broadcast correct answer event
  const broadcastCorrectAnswer = useCallback(async (answer: string, points: number) => {
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'correct_answer',
        payload: {
          username,
          answer,
          odints: points,
        },
      });
    }
  }, [username]);

  // Generic broadcast helper (e.g. game_start)
  const broadcastEvent = useCallback(async (event: string, payload: unknown) => {
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event,
        payload,
      });
    }
  }, []);

  // Get sorted player list
  const getSortedPlayers = useCallback(() => {
    return Array.from(players.values())
      .sort((a, b) => b.odints - a.odints)
      .map((player, index) => ({
        rank: index + 1,
        username: player.odname,
        points: player.odints,
        correctAnswers: player.odrrectAnswers,
        streak: player.odreak,
        isCurrentUser: player.odId === oderId,
      }));
  }, [players, oderId]);

  const getPlayerCount = useCallback(() => players.size, [players]);

  return {
    players: getSortedPlayers(),
    playerCount: getPlayerCount(),
    isConnected,
    username,
    updateScore,
    broadcastCorrectAnswer,
    broadcastEvent,
    correctAnswerEvents,
  };
}
