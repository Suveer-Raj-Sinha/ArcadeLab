import { useState, useRef, useEffect } from 'react';
import { GameShell } from '../../components/game/GameShell';
import { GameOverScreen } from '../../components/game/GameOverScreen';
import { useLocalArcadeData } from '../../hooks/useLocalArcadeData';
import { sounds } from '../../utils/audio';

const GAME_ID = 'guess';

export default function GuessNumber() {
  const { getPersonalBest, savePersonalBest, incrementGamesPlayed } = useLocalArcadeData();

  const [target, setTarget] = useState(generateNumber());
  const [guess, setGuess] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [history, setHistory] = useState<{ val: number; hint: string }[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  
  const bestScore = getPersonalBest(GAME_ID);
  const [isNewBest, setIsNewBest] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  function generateNumber() {
    return Math.floor(Math.random() * 100) + 1;
  }

  // Focus input automatically
  useEffect(() => {
    if (!isGameOver && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isGameOver]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGameOver || !guess.trim()) return;

    const num = parseInt(guess, 10);
    if (isNaN(num)) return;

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    setGuess('');

    if (num === target) {
      sounds.levelUp();
      const finalScore = Math.max(10, 1000 - newAttempts * 50); // Less attempts = higher score
      setScore(finalScore);
      setHistory([{ val: num, hint: 'CORRECT!' }, ...history]);
      
      const isBest = finalScore > bestScore;
      setIsNewBest(isBest);
      if (isBest) savePersonalBest(GAME_ID, finalScore);
      incrementGamesPlayed(GAME_ID);
      setIsGameOver(true);
    } else {
      sounds.paddleHit();
      const hint = num < target ? 'TOO LOW' : 'TOO HIGH';
      setHistory([{ val: num, hint }, ...history]);
    }
  };

  const restartGame = () => {
    setTarget(generateNumber());
    setGuess('');
    setAttempts(0);
    setHistory([]);
    setIsGameOver(false);
    setIsNewBest(false);
    setScore(0);
  };

  return (
    <GameShell
      title="GUESS THE NUMBER"
      score={score}
      bestScore={bestScore}
      color="neon-pink"
      instructions={[
        'I am thinking of a number between 1 and 100.',
        'Enter your guess and press ENTER.',
        'Use the Higher/Lower hints to find it.',
        'Fewer attempts give a higher score!'
      ]}
    >
      <div className="w-[600px] h-[500px] flex flex-col items-center bg-[#0a0514] p-8 font-mono">
        {!isGameOver ? (
          <div className="w-full max-w-sm flex flex-col items-center mt-12">
            <div className="text-neon-pink text-xl mb-8 tracking-widest text-center">
              SYSTEM ONLINE.<br/>NUMBER GENERATED.
            </div>
            
            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
              <input
                ref={inputRef}
                type="number"
                min="1"
                max="100"
                value={guess}
                onChange={e => setGuess(e.target.value)}
                className="w-full bg-[#130a24] border-2 border-neon-pink/50 text-white text-3xl p-4 text-center focus:outline-none focus:border-neon-pink shadow-[0_0_15px_rgba(255,0,127,0.2)] focus:shadow-[0_0_20px_rgba(255,0,127,0.5)] transition-all"
                placeholder="[ 1 - 100 ]"
                autoFocus
              />
              <button 
                type="submit"
                className="w-full py-3 bg-neon-pink/10 border border-neon-pink text-neon-pink hover:bg-neon-pink hover:text-black transition-colors tracking-widest font-bold"
              >
                SUBMIT GUESS
              </button>
            </form>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <GameOverScreen
              score={score}
              isNewBest={isNewBest}
              onRestart={restartGame}
              color="neon-pink"
            />
          </div>
        )}

        {/* History Log */}
        {history.length > 0 && !isGameOver && (
          <div className="mt-12 w-full max-w-sm">
            <div className="text-text-muted border-b border-cyber-line pb-2 mb-4 text-sm">TARGET LOCK LOG:</div>
            <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {history.map((h, i) => (
                <div key={i} className={`flex justify-between p-2 text-sm border-l-2 ${h.hint === 'CORRECT!' ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-cyber-line bg-cyber-panel text-white'}`}>
                  <span className="opacity-50">Attempt {attempts - i}</span>
                  <span className="font-bold w-8 text-right">{h.val}</span>
                  <span className={h.hint === 'CORRECT!' ? 'text-green-400 font-bold tracking-wider' : 'text-neon-cyan'}>{h.hint}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GameShell>
  );
}
