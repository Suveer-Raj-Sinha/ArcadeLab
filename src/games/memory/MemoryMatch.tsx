import { useState, useEffect, useCallback } from 'react';
import { GameShell } from '../../components/game/GameShell';
import { GameOverScreen } from '../../components/game/GameOverScreen';
import { useLocalArcadeData } from '../../hooks/useLocalArcadeData';
import { sounds } from '../../utils/audio';

const GAME_ID = 'memory';

const SYMBOLS = [
  '👾', '🕹️', '🚀', '💻', '💾', '🔋', '📡', '🎧', '💿', '🎲', '🎯', '⚡', 
  '💣', '⭐', '💎', '🔑', '🔥', '🏆', '🔔', '🎵', '🧩', '🛸', '🛰️', '🌌', 
  '🌠', '🔮', '🛡️', '⚔️', '⚙️', '🧬'
];

type LevelConfig = { cols: number; pairs: number };
const LEVELS: LevelConfig[] = [
  { cols: 4, pairs: 6 },  // Level 1: 4x3 (12 cards)
  { cols: 4, pairs: 8 },  // Level 2: 4x4 (16 cards)
  { cols: 5, pairs: 10 }, // Level 3: 5x4 (20 cards)
  { cols: 6, pairs: 12 }, // Level 4: 6x4 (24 cards)
  { cols: 7, pairs: 14 }, // Level 5: 7x4 (28 cards)
  { cols: 6, pairs: 18 }, // Level 6: 6x6 (36 cards)
  { cols: 7, pairs: 21 }, // Level 7: 7x6 (42 cards)
  { cols: 8, pairs: 24 }, // Level 8: 8x6 (48 cards)
];

type Card = {
  id: number;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
};

function generateCards(pairs: number): Card[] {
  const selectedSymbols = SYMBOLS.slice(0, pairs);
  const deck = [...selectedSymbols, ...selectedSymbols]
    .sort(() => Math.random() - 0.5)
    .map((symbol, index) => ({
      id: index,
      symbol,
      isFlipped: false,
      isMatched: false,
    }));
  return deck;
}

export default function MemoryMatch() {
  const { getPersonalBest, savePersonalBest, incrementGamesPlayed } = useLocalArcadeData();

  const [levelIndex, setLevelIndex] = useState(0);
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  
  const bestScore = getPersonalBest(GAME_ID);
  const [isNewBest, setIsNewBest] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState(60);
  const [isRunning, setIsRunning] = useState(false);

  const currentLevel = LEVELS[Math.min(levelIndex, LEVELS.length - 1)];

  // Setup initial board
  useEffect(() => {
    setCards(generateCards(currentLevel.pairs));
    setMatches(0);
    setFlippedIds([]);
  }, [levelIndex, currentLevel.pairs]);

  // Timer countdown
  useEffect(() => {
    if (!isRunning || isGameOver) return;
    
    if (timeLeft > 0) {
      const interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(interval);
    } else {
      // Time up
      setIsRunning(false);
      setIsGameOver(true);
      sounds.gameOver();
      const isBest = score > bestScore;
      setIsNewBest(isBest);
      if (isBest) savePersonalBest(GAME_ID, score);
      incrementGamesPlayed(GAME_ID);
    }
  }, [isRunning, timeLeft, isGameOver, score, bestScore, savePersonalBest, incrementGamesPlayed]);

  const handleCardClick = (id: number) => {
    if (isGameOver || flippedIds.length === 2) return;
    
    if (!isRunning) setIsRunning(true);

    const card = cards.find(c => c.id === id);
    if (!card || card.isFlipped || card.isMatched) return;

    sounds.paddleHit();
    const newFlipped = [...flippedIds, id];
    setFlippedIds(newFlipped);
    setCards(prev => prev.map(c => c.id === id ? { ...c, isFlipped: true } : c));

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [firstId, secondId] = newFlipped;
      const firstCard = cards.find(c => c.id === firstId);
      
      if (firstCard?.symbol === card.symbol) {
        // Match
        setTimeout(() => {
          sounds.eat();
          setCards(prev => prev.map(c => 
            c.id === firstId || c.id === secondId ? { ...c, isMatched: true } : c
          ));
          setFlippedIds([]);
          
          setMatches(m => {
            const newMatches = m + 1;
            setScore(s => s + 100 * (levelIndex + 1)); // Points for match
            
            if (newMatches === currentLevel.pairs) {
              // Level clear
              setTimeout(() => {
                sounds.levelUp();
                setIsRunning(false);
                setScore(s => s + timeLeft * 10); // Bonus for remaining time
                setTimeLeft(t => t + currentLevel.pairs * 2 + 10); // Add time for next level
                setLevelIndex(l => l + 1);
              }, 500);
            }
            return newMatches;
          });
        }, 400);
      } else {
        // No match
        setTimeout(() => {
          sounds.wallHit();
          setCards(prev => prev.map(c => 
            c.id === firstId || c.id === secondId ? { ...c, isFlipped: false } : c
          ));
          setFlippedIds([]);
        }, 800);
      }
    }
  };

  const restartGame = useCallback(() => {
    setLevelIndex(0);
    setMoves(0);
    setScore(0);
    setTimeLeft(60);
    setIsRunning(false);
    setIsGameOver(false);
    setIsNewBest(false);
  }, []);

  return (
    <GameShell
      title="MEMORY MATCH"
      score={score}
      bestScore={bestScore}
      color="neon-cyan"
      instructions={[
        'Click a card to flip it over and find matching pairs.',
        'Clearing a board gives bonus time and grows the grid.',
        'Keep going until the timer runs out!',
      ]}
    >
      <div className="relative p-6 flex flex-col items-center bg-[#0a0514] font-mono min-h-[400px]">
        {/* HUD */}
        <div className="w-full flex justify-between items-center mb-6 max-w-xl">
          <div className="flex gap-4">
            <span className="text-neon-cyan font-bold">LEVEL {levelIndex + 1}</span>
            <span className="text-text-muted">MOVES: {moves}</span>
          </div>
          <div className={`font-bold text-xl ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            {timeLeft}s
          </div>
        </div>

        {/* Card Grid */}
        <div 
          className="grid gap-2 mb-4"
          style={{
            gridTemplateColumns: `repeat(${currentLevel.cols}, minmax(0, 1fr))`,
            width: 'fit-content'
          }}
        >
          {cards.map(card => {
            // Scale cards slightly down for very large grids
            const size = currentLevel.cols > 6 ? 'w-10 h-10 sm:w-12 sm:h-12 text-xl' 
                       : currentLevel.cols > 4 ? 'w-12 h-12 sm:w-14 sm:h-14 text-2xl' 
                       : 'w-16 h-16 sm:w-20 sm:h-20 text-3xl';
            return (
              <button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                className={`
                  ${size} flex items-center justify-center rounded transition-all duration-300 transform perspective-1000
                  ${card.isMatched ? 'opacity-50 scale-95' : 'hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(0,229,255,0.2)]'}
                `}
                style={{
                  transformStyle: 'preserve-3d',
                  backgroundColor: card.isFlipped || card.isMatched ? '#1a2a4a' : '#2a1b40',
                  border: `1px solid ${card.isFlipped || card.isMatched ? '#00e5ff' : '#3d2a5c'}`,
                }}
              >
                <span className={`transition-opacity duration-200 ${card.isFlipped || card.isMatched ? 'opacity-100' : 'opacity-0'}`}>
                  {card.symbol}
                </span>
              </button>
            );
          })}
        </div>

        {isGameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <GameOverScreen
              score={score}
              isNewBest={isNewBest}
              onRestart={restartGame}
              color="neon-cyan"
            />
          </div>
        )}
      </div>
    </GameShell>
  );
}
