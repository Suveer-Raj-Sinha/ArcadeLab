import { useEffect, useState } from 'react';

interface GameOverScreenProps {
  score: number;
  isNewBest: boolean;
  onRestart: () => void;
  color?: 'neon-cyan' | 'neon-pink';
}

export function GameOverScreen({ score, isNewBest, onRestart, color = 'neon-cyan' }: GameOverScreenProps) {
  const textColorClass = color === 'neon-cyan' ? 'text-neon-cyan' : 'text-neon-pink';
  const borderColorClass = color === 'neon-cyan' ? 'border-neon-cyan' : 'border-neon-pink';
  const shadowClass = color === 'neon-cyan' 
    ? 'shadow-[0_0_15px_rgba(0,229,255,0.2)]' 
    : 'shadow-[0_0_15px_rgba(255,0,127,0.2)]';
    
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    // let start = 0;
    const duration = 1000;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayScore(Math.floor(ease * score));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [score]);

  return (
    <div className="absolute inset-0 bg-cyber-bg/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 font-mono animate-fade-in-up">
      <div className={`bg-cyber-panel p-8 border ${borderColorClass} ${shadowClass} flex flex-col items-center max-w-sm w-full mx-4 transform transition-all`}>
        <h2 className="text-3xl font-bold text-white mb-6 tracking-widest relative">
          GAME OVER
          {isNewBest && (
            <div className="absolute -inset-2 border border-white/20 animate-ping rounded-sm pointer-events-none" />
          )}
        </h2>
        
        <div className="text-center mb-8 w-full relative">
          <div className="text-text-muted text-sm mb-1 tracking-widest">FINAL SCORE</div>
          <div className={`text-5xl font-black ${textColorClass} drop-shadow-md mb-2 tabular-nums transition-transform ${displayScore === score ? 'scale-110' : 'scale-100'}`}>
            {displayScore}
          </div>
          {isNewBest && displayScore === score && (
            <div className="text-amber-400 text-sm animate-pulse flex items-center gap-2 justify-center font-bold tracking-wider mt-4">
              <span className="animate-spin">★</span> NEW RECORD <span className="animate-spin">★</span>
            </div>
          )}
        </div>

        <button
          onClick={onRestart}
          className={`
            w-full py-3 border ${borderColorClass} text-white font-bold tracking-widest relative overflow-hidden group
            transition-all active:scale-95 hover:text-black
          `}
        >
          <div className={`absolute inset-0 w-full h-full bg-${color} -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out z-0`} />
          <span className="relative z-10 flex items-center justify-center gap-2">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">►</span>
            INSERT COIN
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">◄</span>
          </span>
        </button>
      </div>
    </div>
  );
}
