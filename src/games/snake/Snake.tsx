import { useState, useRef, useEffect, useCallback } from 'react';
import { GameShell } from '../../components/game/GameShell';
import { GameOverScreen } from '../../components/game/GameOverScreen';
// import { useKeyboard } from '../../hooks/useKeyboard';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useLocalArcadeData } from '../../hooks/useLocalArcadeData';
import { sounds } from '../../utils/audio';

const GAME_ID = 'snake';
const GRID_SIZE = 20;
const CANVAS_SIZE = 400; // 20x20 grid
const INITIAL_SPEED = 150; // ms per move
const MIN_SPEED = 50;

type Point = { x: number; y: number };

const INITIAL_SNAKE: Point[] = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION: Point = { x: 0, y: -1 }; // Up

function getRandomFood(snake: Point[]): Point {
  let newFood: Point;
  let isOccupied = true;
  while (isOccupied) {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    isOccupied = snake.some((segment) => segment.x === newFood.x && segment.y === newFood.y);
  }
  return newFood!;
}

export default function Snake() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { getPersonalBest, savePersonalBest, incrementGamesPlayed } = useLocalArcadeData();

  const [gameState, setGameState] = useState<{
    snake: Point[];
    direction: Point;
    food: Point;
    score: number;
    isGameOver: boolean;
    isPaused: boolean;
    speed: number;
  }>({
    snake: INITIAL_SNAKE,
    direction: INITIAL_DIRECTION,
    food: { x: 5, y: 5 }, // Will be randomized on first start if needed, but hardcode for now
    score: 0,
    isGameOver: false,
    isPaused: false,
    speed: INITIAL_SPEED,
  });

  const bestScore = getPersonalBest(GAME_ID);
  const [isNewBest, setIsNewBest] = useState(false);
  const lastMoveTimeRef = useRef<number>(0);
  const nextDirectionRef = useRef<Point>(INITIAL_DIRECTION);
  const currentDirectionRef = useRef<Point>(INITIAL_DIRECTION); // Tracks the currently EXECUTING direction

  // Input Handling - Discrete key presses for Snake
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }

      const dir = currentDirectionRef.current;
      
      if (e.key === 'ArrowUp' && dir.y !== 1) nextDirectionRef.current = { x: 0, y: -1 };
      else if (e.key === 'ArrowDown' && dir.y !== -1) nextDirectionRef.current = { x: 0, y: 1 };
      else if (e.key === 'ArrowLeft' && dir.x !== 1) nextDirectionRef.current = { x: -1, y: 0 };
      else if (e.key === 'ArrowRight' && dir.x !== -1) nextDirectionRef.current = { x: 1, y: 0 };
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialization
  useEffect(() => {
    setGameState((prev) => ({ ...prev, food: getRandomFood(prev.snake) }));
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    sounds.crash();
    const isBest = finalScore > bestScore;
    setIsNewBest(isBest);
    if (isBest) {
      savePersonalBest(GAME_ID, finalScore);
    }
    incrementGamesPlayed(GAME_ID);
    setGameState((prev) => ({ ...prev, isGameOver: true }));
  }, [bestScore, savePersonalBest, incrementGamesPlayed]);

  // Game Loop
  const update = useCallback((deltaTime: number) => {
    if (gameState.isGameOver || gameState.isPaused) return;

    lastMoveTimeRef.current += deltaTime;
    if (lastMoveTimeRef.current < gameState.speed) return;
    lastMoveTimeRef.current = 0;

    setGameState((prev) => {
      currentDirectionRef.current = nextDirectionRef.current;
      
      const newHead = {
        x: prev.snake[0].x + nextDirectionRef.current.x,
        y: prev.snake[0].y + nextDirectionRef.current.y,
      };

      // Wall Collision
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        handleGameOver(prev.score);
        return prev;
      }

      // Self Collision
      if (prev.snake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
        handleGameOver(prev.score);
        return prev;
      }

      const newSnake = [newHead, ...prev.snake];
      let newScore = prev.score;
      let newFood = prev.food;
      let newSpeed = prev.speed;

      // Food Collision
      if (newHead.x === prev.food.x && newHead.y === prev.food.y) {
        sounds.eat();
        newScore += 10;
        newFood = getRandomFood(newSnake);
        newSpeed = Math.max(MIN_SPEED, INITIAL_SPEED - Math.floor(newScore / 50) * 10);
      } else {
        newSnake.pop(); // Remove tail if no food eaten
      }

      return {
        ...prev,
        snake: newSnake,
        direction: nextDirectionRef.current,
        food: newFood,
        score: newScore,
        speed: newSpeed,
      };
    });
  }, [gameState, handleGameOver]);

  useGameLoop(update, gameState.isGameOver || gameState.isPaused);

  // Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#0a0514'; // cyber-bg
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const cellSize = CANVAS_SIZE / GRID_SIZE;

    // Draw Grid (Optional, subtle)
    ctx.strokeStyle = '#2a1b40'; // cyber-line
    ctx.lineWidth = 0.5;
    for (let i = 0; i < GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(CANVAS_SIZE, i * cellSize);
      ctx.stroke();
    }

    // Draw Food (Neon Pink)
    ctx.fillStyle = '#ff007f';
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 10;
    ctx.fillRect(gameState.food.x * cellSize + 2, gameState.food.y * cellSize + 2, cellSize - 4, cellSize - 4);

    // Draw Snake (Neon Cyan)
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    gameState.snake.forEach((segment, i) => {
      // Head is slightly brighter/different
      if (i === 0) {
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = '#00e5ff';
      }
      ctx.fillRect(segment.x * cellSize + 1, segment.y * cellSize + 1, cellSize - 2, cellSize - 2);
    });

    // Reset shadow for performance
    ctx.shadowBlur = 0;

  }, [gameState.snake, gameState.food]);

  const restartGame = () => {
    nextDirectionRef.current = INITIAL_DIRECTION;
    currentDirectionRef.current = INITIAL_DIRECTION;
    setIsNewBest(false);
    setGameState({
      snake: INITIAL_SNAKE,
      direction: INITIAL_DIRECTION,
      food: getRandomFood(INITIAL_SNAKE),
      score: 0,
      isGameOver: false,
      isPaused: false,
      speed: INITIAL_SPEED,
    });
  };

  return (
    <GameShell
      title="SNAKE"
      score={gameState.score}
      bestScore={bestScore}
      color="neon-cyan"
      instructions={[
        'Use ARROW KEYS to move.',
        'Eat the pink data packets to grow.',
        'Do not hit the walls or yourself.',
        'Speed increases over time.'
      ]}
    >
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="block"
        />
        {gameState.isGameOver && (
          <GameOverScreen
            score={gameState.score}
            isNewBest={isNewBest}
            onRestart={restartGame}
            color="neon-cyan"
          />
        )}
      </div>
    </GameShell>
  );
}
