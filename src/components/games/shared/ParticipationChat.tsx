import { useState, useRef, useEffect } from 'react';
import { Send, Check, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  type: 'message' | 'correct' | 'system';
  timestamp: Date;
  isCurrentUser?: boolean;
}

interface ParticipationChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  currentUsername?: string;
}

export default function ParticipationChat({
  messages,
  onSendMessage,
  disabled = false,
  placeholder = 'Escribe tu respuesta...',
  currentUsername
}: ParticipationChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const renderMessage = (msg: ChatMessage) => {
    if (msg.type === 'correct') {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 py-2"
        >
          <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="w-3 h-3 text-green-400" />
          </div>
          <span className="text-green-400 font-medium">
            {msg.username} <span className="text-green-400/70">ha acertado</span>
          </span>
        </motion.div>
      );
    }

    if (msg.type === 'system') {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-2"
        >
          <span className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
            {msg.message}
          </span>
        </motion.div>
      );
    }

    // Regular message - only show to the user who sent it
    if (msg.isCurrentUser) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 items-start"
        >
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {msg.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-primary">{msg.username}</span>
              <span className="text-xs text-muted-foreground">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{msg.message}</p>
          </div>
        </motion.div>
      );
    }

    // Other users' messages - don't show the actual message content
    return null;
  };

  return (
    <div className="w-80 bg-card rounded-xl border border-border overflow-hidden flex flex-col shrink-0">
      {/* Header */}
      <div className="bg-gradient-to-r from-accent/20 to-primary/20 p-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Users className="text-accent" size={20} />
          <h3 className="font-semibold text-foreground">Chat de participación</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Escribe tu respuesta aquí</p>
      </div>

      {/* Messages */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto scrollbar-hide min-h-0">
        <AnimatePresence>
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              {disabled ? 'Esperando a que inicie la ronda...' : 'Sé el primero en responder'}
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id}>
                {renderMessage(msg)}
              </div>
            ))
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={disabled ? 'Esperando...' : placeholder}
            disabled={disabled}
            className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
