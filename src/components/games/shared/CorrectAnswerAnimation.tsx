import { motion, AnimatePresence } from 'framer-motion';
import { Star } from 'lucide-react';

interface CorrectAnswerAnimationProps {
  word: string;
  points: number;
  isVisible: boolean;
  onComplete?: () => void;
}

export default function CorrectAnswerAnimation({ 
  word, 
  points, 
  isVisible, 
  onComplete 
}: CorrectAnswerAnimationProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ scale: 0, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0, rotate: 20, opacity: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 20,
            duration: 0.5 
          }}
          onAnimationComplete={() => {
            setTimeout(() => onComplete?.(), 1500);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <div className="relative">
            {/* Star background */}
            <svg 
              viewBox="0 0 200 200" 
              className="w-72 h-72 md:w-96 md:h-96 drop-shadow-2xl"
            >
              {/* Outer stroke */}
              <path
                d="M100 10 L120 75 L190 80 L135 125 L155 190 L100 155 L45 190 L65 125 L10 80 L80 75 Z"
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="8"
                strokeLinejoin="round"
              />
              {/* Main star */}
              <path
                d="M100 10 L120 75 L190 80 L135 125 L155 190 L100 155 L45 190 L65 125 L10 80 L80 75 Z"
                fill="#F5B800"
                stroke="#E5A800"
                strokeWidth="2"
              />
              {/* Inner highlight */}
              <path
                d="M100 25 L115 75 L175 79 L130 115 L145 170 L100 142 L55 170 L70 115 L25 79 L85 75 Z"
                fill="#FFD54F"
                opacity="0.4"
              />
            </svg>

            {/* Decorative leaves/branches */}
            <motion.div 
              initial={{ rotate: -30, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="absolute -top-4 -right-8 text-green-500"
            >
              <svg width="60" height="60" viewBox="0 0 60 60">
                <ellipse cx="30" cy="15" rx="12" ry="8" fill="#4CAF50" transform="rotate(45 30 15)" />
                <ellipse cx="45" cy="25" rx="10" ry="6" fill="#66BB6A" transform="rotate(30 45 25)" />
                <path d="M20 40 Q35 20 50 35" stroke="#795548" strokeWidth="3" fill="none" />
              </svg>
            </motion.div>

            <motion.div 
              initial={{ rotate: 30, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="absolute -bottom-4 -left-8 text-green-500"
            >
              <svg width="60" height="60" viewBox="0 0 60 60">
                <ellipse cx="30" cy="45" rx="12" ry="8" fill="#4CAF50" transform="rotate(-45 30 45)" />
                <ellipse cx="15" cy="35" rx="10" ry="6" fill="#66BB6A" transform="rotate(-30 15 35)" />
                <path d="M40 20 Q25 40 10 25" stroke="#795548" strokeWidth="3" fill="none" />
              </svg>
            </motion.div>

            {/* Word and points */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-2xl md:text-3xl font-black text-gray-800 uppercase tracking-wide"
                style={{ textShadow: '2px 2px 0 rgba(255,255,255,0.5)' }}
              >
                {word}
              </motion.span>
              <motion.span 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-4xl md:text-5xl font-black text-white mt-1"
                style={{ 
                  textShadow: '3px 3px 0 #8B7355, -1px -1px 0 #8B7355, 1px -1px 0 #8B7355, -1px 1px 0 #8B7355'
                }}
              >
                {points}
              </motion.span>
            </div>
          </div>

          {/* Sparkle effects */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1.5, 0], 
                opacity: [0, 1, 0],
                x: [0, (i % 2 ? 1 : -1) * (50 + i * 20)],
                y: [0, (i % 3 - 1) * (40 + i * 15)]
              }}
              transition={{ 
                delay: 0.1 + i * 0.1, 
                duration: 0.8,
                ease: "easeOut"
              }}
              className="absolute"
              style={{
                top: '50%',
                left: '50%',
              }}
            >
              <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
