import { useState, useRef, useEffect, useCallback } from 'react';
import { GameShell } from '../../components/game/GameShell';
import { useLocalArcadeData } from '../../hooks/useLocalArcadeData';
import { sounds } from '../../utils/audio';

const GAME_ID = 'reaction';
const MAX_ATTEMPTS = 5;

type State = 'idle' | 'waiting' | 'ready' | 'result' | 'finished';

export default function ReactionTest() {
  const { getPersonalBest, savePersonalBest, incrementGamesPlayed } = useLocalArcadeData();

  const [gameState, setGameState] = useState<State>('idle');
  const [attempts, setAttempts] = useState<number[]>([]);
  const [currentReactTime, setCurrentReactTime] = useState<number | null>(null);
  const [message, setMessage] = useState('CLICK TO START');

  const bestScore = getPersonalBest(GAME_ID);
  
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const startTimeRef = useRef<number>(0);

  const cleanup = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  useEffect(() => cleanup, []);

  const handleClick = useCallback(() => {
    if (gameState === 'idle') {
      // Start waiting
      setGameState('waiting');
      setMessage('WAIT FOR GREEN...');
      
      const delay = 1000 + Math.random() * 3000; // 1 to 4 seconds
      timeoutRef.current = setTimeout(() => {
        setGameState('ready');
        setMessage('CLICK NOW!');
        startTimeRef.current = performance.now();
        sounds.levelUp(); // A bright sound to indicate go
      }, delay);
      
    } else if (gameState === 'waiting') {
      // False start
      cleanup();
      sounds.crash();
      setGameState('result');
      setMessage('TOO EARLY! CLICK TO TRY AGAIN.');
      setCurrentReactTime(null);
      
    } else if (gameState === 'ready') {
      // Successful click
      const reactTime = Math.floor(performance.now() - startTimeRef.current);
      sounds.eat(); // Pop sound
      const newAttempts = [...attempts, reactTime];
      setAttempts(newAttempts);
      setCurrentReactTime(reactTime);
      
      if (newAttempts.length >= MAX_ATTEMPTS) {
        setGameState('finished');
        
        // Calculate average
        const avg = Math.floor(newAttempts.reduce((a, b) => a + b, 0) / newAttempts.length);
        setMessage(`FINISHED! AVG: ${avg}ms`);
        
        // Save best score (lowest average is best, so we can save inverted, or just save raw ms if we adapt our bestScore logic. 
        // For localArcadeData, higher is usually better. Let's save 10000 - avg so higher is better, or just tweak saving logic).
        // Let's save the raw average, but we need to ensure the arcade hook supports 'lower is better' or we just invert it.
        // We'll invert it: Score = Math.max(0, 5000 - avg).
        const score = Math.max(0, 5000 - avg);
        if (score > bestScore) {
          savePersonalBest(GAME_ID, score);
        }
        incrementGamesPlayed(GAME_ID);
      } else {
        setGameState('result');
        setMessage(`${reactTime}ms. CLICK TO CONTINUE.`);
      }
    } else if (gameState === 'result') {
      // Next attempt
      setGameState('waiting');
      setMessage('WAIT FOR GREEN...');
      
      const delay = 1000 + Math.random() * 3000;
      timeoutRef.current = setTimeout(() => {
        setGameState('ready');
        setMessage('CLICK NOW!');
        startTimeRef.current = performance.now();
        sounds.levelUp();
      }, delay);
    } else if (gameState === 'finished') {
      // Restart game
      setAttempts([]);
      setCurrentReactTime(null);
      setGameState('idle');
      setMessage('CLICK TO START');
    }
  }, [gameState, attempts, bestScore, savePersonalBest, incrementGamesPlayed]);

  // Determine colors based on state
  let bgColor = 'bg-[#130a24]';
  let textColor = 'text-neon-cyan';
  let pulse = false;

  if (gameState === 'waiting') {
    bgColor = 'bg-red-950';
    textColor = 'text-red-400';
  } else if (gameState === 'ready') {
    bgColor = 'bg-green-900';
    textColor = 'text-green-400';
    pulse = true;
  } else if (gameState === 'result' && currentReactTime === null) {
    bgColor = 'bg-yellow-950'; // Too early
    textColor = 'text-yellow-400';
  }

  // Current average
  const currentAvg = attempts.length > 0 ? Math.floor(attempts.reduce((a, b) => a + b, 0) / attempts.length) : 0;
  // Display score (we map the 5000-avg back to avg for display if we wanted, but let's just show avg in UI)
  const displayBest = bestScore > 0 ? 5000 - bestScore : 0;

  return (
    <GameShell
      title="REACTION TEST"
      score={currentAvg}
      bestScore={displayBest}
      color="neon-cyan"
      instructions={[
        'Wait for the screen to turn GREEN.',
        'Click as fast as you can.',
        'Do not click too early!',
        'Your score is the average of 5 attempts.'
      ]}
    >
      <div 
        className={`w-[600px] h-[400px] flex flex-col items-center justify-center cursor-pointer transition-colors duration-100 ${bgColor}`}
        onMouseDown={handleClick}
      >
        <div className={`text-4xl font-black font-mono tracking-widest text-center px-8 select-none ${textColor} ${pulse ? 'animate-pulse' : ''}`}>
          {message}
        </div>

        <div className="absolute top-4 left-4 font-mono text-sm text-text-muted">
          Attempt: {Math.min(attempts.length + 1, MAX_ATTEMPTS)} / {MAX_ATTEMPTS}
        </div>

        {attempts.length > 0 && gameState !== 'idle' && (
          <div className="absolute bottom-4 flex gap-2">
            {attempts.map((t, i) => (
              <div key={i} className="px-3 py-1 bg-black/40 text-neon-cyan font-mono text-xs rounded border border-neon-cyan/30">
                {t}ms
              </div>
            ))}
          </div>
        )}
      </div>
    </GameShell>
  );
}
