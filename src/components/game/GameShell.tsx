import { useEffect, useRef } from 'react';
import { GameHeader } from './GameHeader';
import type { ReactNode } from 'react';

interface GameShellProps {
  title: string;
  score: number;
  bestScore: number;
  color?: 'neon-cyan' | 'neon-pink';
  children: ReactNode;
  instructions?: string[];
}

export function GameShell({ title, score, bestScore, color = 'neon-cyan', children, instructions }: GameShellProps) {
  const borderColorClass = color === 'neon-cyan' ? 'border-neon-cyan/50' : 'border-neon-pink/50';
  const gameRef = useRef<HTMLDivElement>(null);

  const focusGame = () => {
    if (gameRef.current) {
      gameRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Auto-focus when the game loads
  useEffect(() => {
    // Small timeout ensures layout is fully rendered before scrolling
    const timer = setTimeout(focusGame, 100);
    return () => clearTimeout(timer);
  }, []);

  // Prevent window scrolling when using arrow keys or spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling for Space and Arrow keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        // Only prevent if the active element isn't an input/textarea
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto py-8 w-full">
      <GameHeader 
        title={title} 
        score={score} 
        bestScore={bestScore} 
        color={color} 
      />
      
      <div 
        ref={gameRef}
        onClick={focusGame}
        className={`relative bg-black w-full flex items-center justify-center border-2 ${borderColorClass} shadow-lg overflow-hidden cursor-crosshair`}
      >
        {children}
      </div>

      {instructions && (
        <div className="mt-8 p-4 bg-cyber-panel border border-cyber-line w-full rounded-sm font-mono text-sm text-text-muted">
          <h4 className="text-white mb-2 tracking-widest border-b border-cyber-line pb-2">CONTROLS</h4>
          <ul className="space-y-1">
            {instructions.map((inst, i) => (
              <li key={i} className="flex gap-2">
                <span className={`text-${color} opacity-80`}>&gt;</span>
                {inst}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
