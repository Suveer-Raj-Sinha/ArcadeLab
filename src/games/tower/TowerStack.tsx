import { useState, useRef, useEffect, useCallback } from 'react';
import { GameShell } from '../../components/game/GameShell';
import { GameOverScreen } from '../../components/game/GameOverScreen';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useLocalArcadeData } from '../../hooks/useLocalArcadeData';
import { sounds } from '../../utils/audio';

const GAME_ID = 'tower';
const COLS = 11;
const ROWS = 15;
const BLOCK_SIZE = 40;
const CANVAS_WIDTH = COLS * BLOCK_SIZE;
const CANVAS_HEIGHT = ROWS * BLOCK_SIZE;

export default function TowerStack() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { getPersonalBest, savePersonalBest, incrementGamesPlayed } = useLocalArcadeData();

  const [score, setScore] = useState(0); // Score is the number of rows successfully placed
  const [isGameOver, setIsGameOver] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const bestScore = getPersonalBest(GAME_ID);

  // Game State Refs
  const gridRef = useRef<number[][]>(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
  const currentRowRef = useRef(ROWS - 1);
  const currentWidthRef = useRef(5);
  const blockXRef = useRef(0);
  const directionRef = useRef(1); // 1 = right, -1 = left
  
  const moveTimerRef = useRef(0);
  const speedRef = useRef(200); // ms per move

  const handleGameOver = useCallback(() => {
    setIsGameOver(true);
    sounds.gameOver();
    const finalScore = score;
    const isBest = finalScore > bestScore;
    setIsNewBest(isBest);
    if (isBest) savePersonalBest(GAME_ID, finalScore);
    incrementGamesPlayed(GAME_ID);
  }, [score, bestScore, savePersonalBest, incrementGamesPlayed]);

  const handleDrop = useCallback(() => {
    if (isGameOver) return;
    if (!hasStarted) {
      setHasStarted(true);
      return;
    }

    const grid = gridRef.current;
    const y = currentRowRef.current;
    const x = blockXRef.current;
    const w = currentWidthRef.current;

    // Lock in the blocks
    sounds.paddleHit();
    
    // Determine how many blocks land on the previous row
    let blocksLanded = 0;
    
    for (let i = 0; i < w; i++) {
      const col = x + i;
      if (col >= 0 && col < COLS) {
        // If it's the very first row (bottom), it always lands
        if (y === ROWS - 1) {
          grid[y][col] = 1;
          blocksLanded++;
        } else {
          // Check if there is a block directly below
          if (grid[y + 1][col] === 1) {
            grid[y][col] = 1;
            blocksLanded++;
          }
        }
      }
    }

    if (blocksLanded === 0) {
      handleGameOver();
      return;
    }

    // Success! Prepare next row
    setScore(s => {
      const newScore = s + 1;
      if (newScore === ROWS) {
        sounds.levelUp();
        handleGameOver(); // Win condition!
      } else {
        sounds.score();
      }
      return newScore;
    });

    if (score + 1 < ROWS) {
      currentWidthRef.current = blocksLanded;
      currentRowRef.current -= 1;
      blockXRef.current = 0;
      directionRef.current = 1;
      speedRef.current = Math.max(50, speedRef.current - 10);
      moveTimerRef.current = 0;
    }

  }, [isGameOver, hasStarted, handleGameOver, score]);

  // Input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleDrop();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDrop]);

  // Loop
  const update = useCallback((deltaTime: number) => {
    if (isGameOver || !hasStarted) return;

    moveTimerRef.current += deltaTime;
    if (moveTimerRef.current > speedRef.current) {
      moveTimerRef.current = 0;

      const x = blockXRef.current;
      const w = currentWidthRef.current;
      const dir = directionRef.current;

      let nextX = x + dir;
      if (nextX < 0 || nextX + w > COLS) {
        directionRef.current *= -1;
        nextX = x + directionRef.current;
      }
      blockXRef.current = nextX;
    }

    // --- DRAWING ---
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // BG
    ctx.fillStyle = '#0a0514';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Grid Lines
    ctx.strokeStyle = '#1c0f33';
    ctx.lineWidth = 1;
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * BLOCK_SIZE); ctx.lineTo(CANVAS_WIDTH, r * BLOCK_SIZE); ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c * BLOCK_SIZE, 0); ctx.lineTo(c * BLOCK_SIZE, CANVAS_HEIGHT); ctx.stroke();
    }

    // Draw Locked Blocks
    const grid = gridRef.current;
    ctx.fillStyle = '#00e5ff'; // Cyan
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00e5ff';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] === 1) {
          ctx.fillRect(c * BLOCK_SIZE + 2, r * BLOCK_SIZE + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
        }
      }
    }

    // Draw Current Moving Block
    ctx.fillStyle = '#ff007f'; // Pink
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff007f';
    const y = currentRowRef.current;
    const xBase = blockXRef.current;
    const w = currentWidthRef.current;
    for (let i = 0; i < w; i++) {
      const col = xBase + i;
      ctx.fillRect(col * BLOCK_SIZE + 2, y * BLOCK_SIZE + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
    }
    
    ctx.shadowBlur = 0; // Reset
  }, [isGameOver, hasStarted]);

  useGameLoop(update, isGameOver);

  // Initial render when idle
  useEffect(() => {
    if (!hasStarted) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0a0514';
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.font = '20px "JetBrains Mono"';
          ctx.textAlign = 'center';
          ctx.fillText('PRESS SPACE TO DROP', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        }
      }
    }
  }, [hasStarted]);

  const restartGame = () => {
    gridRef.current = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    currentRowRef.current = ROWS - 1;
    currentWidthRef.current = 5;
    blockXRef.current = 0;
    directionRef.current = 1;
    speedRef.current = 200;
    moveTimerRef.current = 0;
    setScore(0);
    setHasStarted(false);
    setIsGameOver(false);
    setIsNewBest(false);
  };

  return (
    <GameShell
      title="TOWER STACK"
      score={score}
      bestScore={bestScore}
      color="neon-cyan"
      instructions={[
        'Press SPACE or CLICK to drop blocks.',
        'Stack them perfectly.',
        'Overhang blocks will fall off.',
        'Reach the top to win!'
      ]}
    >
      <div 
        className="relative cursor-pointer touch-none"
        onMouseDown={handleDrop}
        onTouchStart={(e) => { e.preventDefault(); handleDrop(); }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block border-4 border-cyber-line shadow-[0_0_20px_rgba(0,229,255,0.15)] rounded bg-[#0a0514]"
        />
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
