/**
 * IndexingComplete
 * 
 * Celebration screen shown when repository indexing finishes.
 * Premium animations with confetti effect and stats showcase.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface IndexingCompleteProps {
  repoName: string;
  stats: {
    files_processed: number;
    functions_indexed: number;
    indexing_time_seconds: number;
  };
  onStartSearching: () => void;
  onIndexAnother?: () => void;
}

// Confetti particle component
function Confetti() {
  const [particles] = useState(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      color: ['#818cf8', '#34d399', '#fbbf24', '#f472b6', '#60a5fa'][Math.floor(Math.random() * 5)],
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-2 h-2 rounded-full"
          style={{ 
            left: `${p.x}%`, 
            top: '-10px',
            backgroundColor: p.color,
          }}
          initial={{ y: 0, opacity: 1, scale: 1 }}
          animate={{ 
            y: '120vh', 
            opacity: [1, 1, 0],
            scale: [1, 0.8, 0.5],
            rotate: [0, 360, 720],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

// Animated stat display
function StatDisplay({ 
  label, 
  value, 
  suffix = '', 
  delay = 0,
  highlight = false 
}: { 
  label: string; 
  value: number; 
  suffix?: string;
  delay?: number;
  highlight?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const duration = 1500;
      const steps = 30;
      const increment = value / steps;
      let current = 0;
      
      const interval = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(interval);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timeout);
  }, [value, delay]);

  return (
    <motion.div
      className="text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000, duration: 0.5 }}
    >
      <div className={cn(
        'text-4xl font-bold mb-1',
        highlight ? 'text-indigo-400' : 'text-white'
      )}>
        {displayValue.toLocaleString()}{suffix}
      </div>
      <div className="text-zinc-400 text-sm">{label}</div>
    </motion.div>
  );
}

export function IndexingComplete({ 
  repoName, 
  stats, 
  onStartSearching,
  onIndexAnother 
}: IndexingCompleteProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <motion.div
      className="relative rounded-2xl bg-zinc-900/90 border border-zinc-800 overflow-hidden backdrop-blur-sm"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Confetti */}
      {showConfetti && <Confetti />}

      {/* Success glow */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.5] }}
        transition={{ duration: 1.5 }}
      />

      {/* Content */}
      <div className="relative z-10 p-8">
        {/* Success icon */}
        <motion.div
          className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: 'spring', 
            stiffness: 400, 
            damping: 15,
            delay: 0.2 
          }}
        >
          <motion.span
            className="text-4xl"
            initial={{ opacity: 0, rotate: -180 }}
            animate={{ opacity: 1, rotate: 0 }}
            transition={{ delay: 0.4 }}
          >
            ✓
          </motion.span>
        </motion.div>

        {/* Title */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-2xl font-bold text-white mb-2">
            Ready to Search!
          </h3>
          <p className="text-zinc-400">
            <span className="text-indigo-400 font-medium">{repoName}</span> has been indexed
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <StatDisplay 
            label="Files Processed" 
            value={stats.files_processed}
            delay={500}
          />
          <StatDisplay 
            label="Functions Found" 
            value={stats.functions_indexed}
            delay={700}
            highlight
          />
          <StatDisplay 
            label="Seconds" 
            value={Math.round(stats.indexing_time_seconds * 10) / 10}
            suffix="s"
            delay={900}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={onStartSearching}
            className={cn(
              'flex-1 py-6 text-lg font-semibold rounded-xl',
              'bg-gradient-to-r from-indigo-600 to-indigo-500',
              'hover:from-indigo-500 hover:to-indigo-400',
              'shadow-lg shadow-indigo-500/25',
              'transition-all duration-200'
            )}
          >
            <span className="mr-2">🔍</span>
            Start Searching
          </Button>
          
          {onIndexAnother && (
            <Button
              onClick={onIndexAnother}
              variant="outline"
              className={cn(
                'py-6 px-6 text-lg font-semibold rounded-xl',
                'bg-zinc-800/50 border-zinc-700 text-zinc-300',
                'hover:bg-zinc-700/50 hover:text-white',
                'transition-all duration-200'
              )}
            >
              <span className="mr-2">+</span>
              Index Another
            </Button>
          )}
        </div>

        {/* Pro tip */}
        <motion.div
          className="mt-6 text-center text-xs text-zinc-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          💡 Pro tip: Try searching for "authentication", "error handling", or "database"
        </motion.div>
      </div>
    </motion.div>
  );
}

export default IndexingComplete;
