import { Trophy } from 'lucide-react';

interface GameHeaderProps {
  title: string;
  score: number;
  bestScore: number;
  color?: 'neon-cyan' | 'neon-pink';
}

export function GameHeader({ title, score, bestScore, color = 'neon-cyan' }: GameHeaderProps) {
  const textColorClass = color === 'neon-cyan' ? 'text-neon-cyan' : 'text-neon-pink';
  const shadowClass = color === 'neon-cyan' 
    ? 'drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]' 
    : 'drop-shadow-[0_0_8px_rgba(255,0,127,0.5)]';

  return (
    <div className="flex items-end justify-between w-full mb-6 font-mono">
      <div>
        <h2 className={`text-2xl font-bold tracking-widest ${textColorClass} ${shadowClass}`}>
          {title}
        </h2>
      </div>
      <div className="flex gap-8 text-right">
        <div>
          <div className="text-text-muted text-xs mb-1">SCORE</div>
          <div className="text-xl font-bold">{score.toString().padStart(5, '0')}</div>
        </div>
        <div>
          <div className="text-text-muted text-xs mb-1 flex items-center gap-1 justify-end">
            <Trophy className="w-3 h-3" /> BEST
          </div>
          <div className={`text-xl font-bold ${textColorClass}`}>
            {bestScore.toString().padStart(5, '0')}
          </div>
        </div>
      </div>
    </div>
  );
}
