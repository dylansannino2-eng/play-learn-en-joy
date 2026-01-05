import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Player {
  odId: string;
  username: string;
  points: number;
  correctAnswers: number;
  streak: number;
  online: boolean;
}

interface GameState {
  phase: 'waiting' | 'playing' | 'ranking';
  round: number;
  cardId: string | null;
}

interface CorrectAnswerEvent {
  username: string;
  points: number;
  answer: string;
}

export interface GameEvent<TPayload = unknown> {
  type: string;
  payload: TPayload;
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
  const [gameEvent, setGameEvent] = useState<GameEvent | null>(null);
  const [chatMessages, setChatMessages] = useState<{ username: string; message: string; timestamp: string; round?: number }[]>([]);

  // Initialize realtime connection
  useEffect(() => {
    // Clear previous chat messages when channel changes
    setChatMessages([]);
    setCorrectAnswerEvents([]);
    setGameEvent(null);

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
        const presence = (presences as any[])[(presences as any[]).length - 1] as any;
        if (presence) {
          updatedPlayers.set(oderId, {
            odId: oderId,
            username: presence.username,
            points: presence.points ?? 0,
            correctAnswers: presence.correctAnswers ?? 0,
            streak: presence.streak ?? 0,
            online: true,
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

    // Generic in-game events (for syncing cards/rounds/etc)
    channel.on('broadcast', { event: 'game_event' }, ({ payload }) => {
      console.log('Game event received:', payload);
      setGameEvent(payload as GameEvent);
    });

    // Chat messages from other players
    channel.on('broadcast', { event: 'chat_message' }, ({ payload }) => {
      console.log('Chat message received:', payload);
      setChatMessages((prev) => [...prev, payload as { username: string; message: string; timestamp: string; round?: number }]);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);

        // Track initial presence
        await channel.track({
          username,
          points: 0,
          correctAnswers: 0,
          streak: 0,
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
  const updateScore = useCallback(
    async (points: number, correctAnswers: number, streak: number) => {
      if (channelRef.current) {
        await channelRef.current.track({
          username,
          points,
          correctAnswers,
          streak,
          joinedAt: new Date().toISOString(),
        });
      }
    },
    [username]
  );

  // Broadcast correct answer event
  const broadcastCorrectAnswer = useCallback(
    async (answer: string, points: number) => {
      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'correct_answer',
          payload: {
            username,
            answer,
            points,
          },
        });
      }
    },
    [username]
  );

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

  const broadcastGameEvent = useCallback(async (type: string, payload: unknown) => {
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'game_event',
      payload: { type, payload },
    });
  }
}, []);

  const broadcastChatMessage = useCallback(async (message: string, round?: number) => {
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: {
          username,
          message,
          timestamp: new Date().toISOString(),
          round,
        },
      });
    }
  }, [username]);

  // Get sorted player list
  const getSortedPlayers = useCallback(() => {
    return Array.from(players.values())
      .sort((a, b) => b.points - a.points)
      .map((player, index) => ({
        rank: index + 1,
        username: player.username,
        points: player.points,
        correctAnswers: player.correctAnswers,
        streak: player.streak,
        isCurrentUser: player.odId === oderId,
      }));
  }, [players, oderId]);

  const getPlayerCount = useCallback(() => players.size, [players]);

  const clearChatMessages = useCallback(() => {
    setChatMessages([]);
  }, []);

  return {
    players: getSortedPlayers(),
    playerCount: getPlayerCount(),
    isConnected,
    username,
    oderId,
    updateScore,
    broadcastCorrectAnswer,
    broadcastEvent,
    gameEvent,
    broadcastGameEvent,
    correctAnswerEvents,
    chatMessages,
    broadcastChatMessage,
    clearChatMessages,
  };
}
