import { useState, useEffect, useCallback } from 'react';
import { GameShell } from '../../components/game/GameShell';
import { GameOverScreen } from '../../components/game/GameOverScreen';
import { useLocalArcadeData } from '../../hooks/useLocalArcadeData';
import { sounds } from '../../utils/audio';

const GAME_ID = 'color-rush';

const COLORS = [
  { name: 'RED', hex: '#ef4444' },
  { name: 'BLUE', hex: '#3b82f6' },
  { name: 'GREEN', hex: '#22c55e' },
  { name: 'YELLOW', hex: '#eab308' },
  { name: 'PINK', hex: '#ff007f' },
  { name: 'CYAN', hex: '#00e5ff' }
];

export default function ColorRush() {
  const { getPersonalBest, savePersonalBest, incrementGamesPlayed } = useLocalArcadeData();

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);
  
  const [word, setWord] = useState(COLORS[0]);
  const [color, setColor] = useState(COLORS[1]);
  const [options, setOptions] = useState<typeof COLORS>([]);
  
  const bestScore = getPersonalBest(GAME_ID);

  const generateRound = useCallback(() => {
    // Pick a random word and a random distinct color for the text
    const randomWord = COLORS[Math.floor(Math.random() * COLORS.length)];
    let randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    // Try to ensure they are often different to maximize the Stroop effect
    if (Math.random() > 0.3) {
      while (randomColor.name === randomWord.name) {
        randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      }
    }

    setWord(randomWord);
    setColor(randomColor);

    // Generate 4 button options including the correct one
    const opts = [randomColor];
    while (opts.length < 4) {
      const opt = COLORS[Math.floor(Math.random() * COLORS.length)];
      if (!opts.find(o => o.name === opt.name)) {
        opts.push(opt);
      }
    }
    // Shuffle
    opts.sort(() => Math.random() - 0.5);
    setOptions(opts);
  }, []);

  useEffect(() => {
    generateRound();
  }, [generateRound]);

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
    
    const isBest = score > bestScore;
    setIsNewBest(isBest);
    if (isBest) savePersonalBest(GAME_ID, score);
    incrementGamesPlayed(GAME_ID);
  }, [score, bestScore, savePersonalBest, incrementGamesPlayed]);

  const handleGuess = (guessedColor: typeof COLORS[0]) => {
    if (isGameOver) return;
    if (!isRunning) setIsRunning(true);

    if (guessedColor.name === color.name) {
      // Correct!
      sounds.eat();
      setScore(s => s + 10);
      generateRound();
    } else {
      // Wrong! Penalize time
      sounds.crash();
      setTimeLeft(t => Math.max(0, t - 3));
      // Shake effect or just flash red could go here
    }
  };

  const restartGame = () => {
    setScore(0);
    setTimeLeft(30);
    setIsRunning(false);
    setIsGameOver(false);
    setIsNewBest(false);
    generateRound();
  };

  return (
    <GameShell
      title="COLOR RUSH"
      score={score}
      bestScore={bestScore}
      color="neon-pink"
      instructions={[
        'Tap the color of the INK, not the word.',
        'Ignore what the text says!',
        'Wrong answers cost 3 seconds.',
        'Score as many as you can in 30 seconds.'
      ]}
    >
      <div className="relative w-full max-w-md min-h-[400px] flex flex-col items-center justify-center p-8 bg-[#0a0514] font-mono">
        
        {/* Timer */}
        <div className={`absolute top-6 right-8 text-2xl font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
          {timeLeft}s
        </div>

        {!isGameOver ? (
          <div className="flex flex-col items-center w-full mt-4">
            {/* Display Word */}
            <div 
              className="text-6xl font-black mb-12 tracking-wider transition-colors duration-100 uppercase text-center"
              style={{ 
                color: color.hex,
                textShadow: `0 0 20px ${color.hex}`
              }}
            >
              {word.name}
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-4 w-full">
              {options.map((opt) => (
                <button
                  key={opt.name}
                  onClick={() => handleGuess(opt)}
                  className="py-4 text-xl font-bold text-white bg-cyber-panel border-2 border-cyber-line rounded hover:border-white hover:bg-white/10 transition-colors"
                >
                  {opt.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm z-10 rounded">
            <GameOverScreen
              score={score}
              isNewBest={isNewBest}
              onRestart={restartGame}
              color="neon-pink"
            />
          </div>
        )}
      </div>
    </GameShell>
  );
}
