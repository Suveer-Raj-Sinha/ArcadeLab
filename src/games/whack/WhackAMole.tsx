import { useState, useEffect, useCallback, useRef } from 'react';
import { GameShell } from '../../components/game/GameShell';
import { GameOverScreen } from '../../components/game/GameOverScreen';
import { useLocalArcadeData } from '../../hooks/useLocalArcadeData';
import { sounds } from '../../utils/audio';

const GAME_ID = 'whack';

type MoleType = 'normal' | 'gold' | 'bomb';

interface Mole {
  id: number;
  type: MoleType;
  visible: boolean;
  active: boolean; // if false, it was whacked
}

export default function WhackAMole() {
  const { getPersonalBest, savePersonalBest, incrementGamesPlayed } = useLocalArcadeData();

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);
  const [moles, setMoles] = useState<Mole[]>(Array(9).fill({ id: 0, type: 'normal', visible: false, active: false }));

  const bestScore = getPersonalBest(GAME_ID);
  
  const spawnTimerRef = useRef<number | null>(null);

  // Timer
  useEffect(() => {
    if (!isRunning || isGameOver) return;
    
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timerId);
    } else {
      endGame();
    }
  }, [isRunning, timeLeft, isGameOver]);

  const endGame = useCallback(() => {
    setIsRunning(false);
    setIsGameOver(true);
    sounds.gameOver();
    
    setMoles(prev => prev.map(m => ({ ...m, visible: false })));
    
    const isBest = score > bestScore;
    setIsNewBest(isBest);
    if (isBest) savePersonalBest(GAME_ID, score);
    incrementGamesPlayed(GAME_ID);
  }, [score, bestScore, savePersonalBest, incrementGamesPlayed]);

  // Spawner
  useEffect(() => {
    if (!isRunning || isGameOver) return;

    const spawnMole = () => {
      setMoles(prev => {
        const next = [...prev];
        // find hidden moles
        const hiddenIndices = next.map((m, i) => !m.visible ? i : -1).filter(i => i !== -1);
        if (hiddenIndices.length > 0) {
          const idx = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
          const rand = Math.random();
          let type: MoleType = 'normal';
          if (rand > 0.85) type = 'bomb';
          else if (rand > 0.75) type = 'gold';

          next[idx] = { id: Math.random(), type, visible: true, active: true };
          
          // Auto hide after random time
          const duration = Math.max(500, 1500 - (30 - timeLeft) * 20); // gets faster
          setTimeout(() => {
            setMoles(current => {
              const c = [...current];
              if (c[idx].id === next[idx].id) {
                c[idx] = { ...c[idx], visible: false, active: false };
              }
              return c;
            });
          }, duration);
        }
        return next;
      });

      const nextSpawnTime = Math.max(200, 800 - (30 - timeLeft) * 15);
      spawnTimerRef.current = window.setTimeout(spawnMole, nextSpawnTime + Math.random() * 300);
    };

    spawnTimerRef.current = window.setTimeout(spawnMole, 500);

    return () => {
      if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
    };
  }, [isRunning, isGameOver, timeLeft]);

  const handleWhack = (index: number) => {
    if (isGameOver) return;
    if (!isRunning) setIsRunning(true);

    const mole = moles[index];
    if (!mole.visible || !mole.active) return;

    // Mark as whacked
    setMoles(prev => {
      const next = [...prev];
      next[index] = { ...mole, active: false };
      return next;
    });

    if (mole.type === 'bomb') {
      sounds.crash();
      setScore(s => Math.max(0, s - 30));
    } else if (mole.type === 'gold') {
      sounds.score();
      setScore(s => s + 50);
    } else {
      sounds.paddleHit();
      setScore(s => s + 10);
    }
  };

  const restartGame = () => {
    setScore(0);
    setTimeLeft(30);
    setMoles(Array(9).fill({ id: 0, type: 'normal', visible: false, active: false }));
    setIsRunning(false);
    setIsGameOver(false);
    setIsNewBest(false);
  };

  return (
    <GameShell
      title="CYBER WHACK"
      score={score}
      bestScore={bestScore}
      color="neon-cyan"
      instructions={[
        'Click the pop-ups before they disappear.',
        'Blue = +10 pts',
        'Yellow = +50 pts',
        'Red (Bomb) = -30 pts',
        'You have 30 seconds.'
      ]}
    >
      <div className="relative w-full max-w-md min-h-[400px] flex flex-col items-center justify-center p-8 bg-[#0a0514] font-mono">
        
        {/* HUD */}
        <div className="w-full flex justify-between items-center mb-8 px-4">
          <div className="text-neon-cyan font-bold">SCORE: {score}</div>
          <div className={`font-bold text-xl ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            {timeLeft}s
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-4 w-full aspect-square max-w-[300px] relative z-10">
          {!isRunning && !isGameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20 backdrop-blur-sm cursor-pointer" onClick={() => setIsRunning(true)}>
              <span className="text-white font-bold animate-pulse text-lg tracking-widest">CLICK TO START</span>
            </div>
          )}
          
          {moles.map((mole, i) => (
            <button
              key={i}
              onMouseDown={() => handleWhack(i)}
              className={`
                relative rounded-full border-4 border-cyber-line bg-cyber-panel overflow-hidden
                transition-all duration-75 active:scale-95
              `}
            >
              {/* Hole depth illusion */}
              <div className="absolute inset-2 rounded-full bg-[#05020a] shadow-inner" />
              
              {/* Mole */}
              <div 
                className={`
                  absolute inset-3 rounded-full transition-all duration-150 ease-out flex items-center justify-center
                  ${mole.visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
                  ${mole.type === 'bomb' ? 'bg-red-500 shadow-[0_0_15px_#ef4444]' : 
                    mole.type === 'gold' ? 'bg-yellow-400 shadow-[0_0_15px_#facc15]' : 
                    'bg-neon-cyan shadow-[0_0_15px_#00e5ff]'}
                  ${!mole.active && mole.visible ? 'scale-75 brightness-50' : ''}
                `}
              >
                {mole.type === 'bomb' && <span className="text-white font-black text-xl">!</span>}
              </div>
            </button>
          ))}
        </div>

        {isGameOver && (
          <GameOverScreen
            score={score}
            isNewBest={isNewBest}
            onRestart={restartGame}
            color="neon-cyan"
          />
        )}
      </div>
    </GameShell>
  );
}
