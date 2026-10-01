import { useState, useRef, useEffect, useCallback } from 'react';
import { GameShell } from '../../components/game/GameShell';
import { GameOverScreen } from '../../components/game/GameOverScreen';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useLocalArcadeData } from '../../hooks/useLocalArcadeData';
import { sounds } from '../../utils/audio';

const GAME_ID = 'breakout';
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 15;
const PADDLE_SPEED = 0.5; // px per ms
const BALL_SIZE = 12;
const INITIAL_BALL_SPEED_Y = -0.3;
const INITIAL_BALL_SPEED_X = 0.2;

const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_WIDTH = 65;
const BRICK_HEIGHT = 20;
const BRICK_PADDING = 10;
const BRICK_OFFSET_TOP = 60;
const BRICK_OFFSET_LEFT = (CANVAS_WIDTH - (BRICK_COLS * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING)) / 2;

type Brick = { x: number; y: number; status: number; color: string };

function createBricks(level: number): Brick[] {
  const bricks: Brick[] = [];
  const colors = ['#ff007f', '#ff007f', '#00e5ff', '#00e5ff', '#ffffff']; // Top to bottom colors
  for (let c = 0; c < BRICK_COLS; c++) {
    for (let r = 0; r < BRICK_ROWS; r++) {
      let active = 1;
      
      // Patterns based on level
      if (level % 4 === 2) {
        // Checkerboard
        if ((r + c) % 2 === 0) active = 0;
      } else if (level % 4 === 3) {
        // V shape
        const mid = (BRICK_COLS - 1) / 2;
        const dist = Math.abs(c - mid);
        if (r > dist) active = 0;
      } else if (level % 4 === 0) {
        // Outline (border only)
        if (r > 0 && r < BRICK_ROWS - 1 && c > 0 && c < BRICK_COLS - 1) active = 0;
      }

      if (active === 1) {
        bricks.push({
          x: BRICK_OFFSET_LEFT + c * (BRICK_WIDTH + BRICK_PADDING),
          y: BRICK_OFFSET_TOP + r * (BRICK_HEIGHT + BRICK_PADDING),
          status: 1,
          color: colors[r],
        });
      }
    }
  }
  return bricks;
}

export default function Breakout() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useKeyboard();
  const { getPersonalBest, savePersonalBest, incrementGamesPlayed } = useLocalArcadeData();

  const [gameState, setGameState] = useState({
    paddleX: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
    ball: { 
      x: CANVAS_WIDTH / 2, 
      y: CANVAS_HEIGHT - PADDLE_HEIGHT - 30, 
      dx: INITIAL_BALL_SPEED_X, 
      dy: INITIAL_BALL_SPEED_Y 
    },
    bricks: createBricks(1),
    score: 0,
    lives: 3,
    level: 1,
    isGameOver: false,
    isStarted: false, // Wait for first input
  });

  const bestScore = getPersonalBest(GAME_ID);
  const [isNewBest, setIsNewBest] = useState(false);

  const handleGameOver = useCallback((finalScore: number) => {
    sounds.gameOver();
    const isBest = finalScore > bestScore;
    setIsNewBest(isBest);
    if (isBest) {
      savePersonalBest(GAME_ID, finalScore);
    }
    incrementGamesPlayed(GAME_ID);
    setGameState((prev) => ({ ...prev, isGameOver: true }));
  }, [bestScore, savePersonalBest, incrementGamesPlayed]);

  const update = useCallback((deltaTime: number) => {
    if (gameState.isGameOver) return;
    if (!gameState.isStarted) {
      // Check for start
      if (keys.current['ArrowLeft'] || keys.current['ArrowRight'] || keys.current[' ']) {
        setGameState(prev => ({ ...prev, isStarted: true }));
      }
      return;
    }

    setGameState((prev) => {
      let newPaddleX = prev.paddleX;
      
      if (keys.current['ArrowLeft']) newPaddleX -= PADDLE_SPEED * deltaTime;
      if (keys.current['ArrowRight']) newPaddleX += PADDLE_SPEED * deltaTime;
      
      newPaddleX = Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, newPaddleX));

      let newBall = {
        ...prev.ball,
        x: prev.ball.x + prev.ball.dx * deltaTime,
        y: prev.ball.y + prev.ball.dy * deltaTime,
      };

      // Wall Collision (Left/Right)
      if (newBall.x <= 0 || newBall.x + BALL_SIZE >= CANVAS_WIDTH) {
        sounds.wallHit();
        newBall.dx *= -1;
        newBall.x = newBall.x <= 0 ? 0 : CANVAS_WIDTH - BALL_SIZE;
      }
      
      // Top Collision
      if (newBall.y <= 0) {
        sounds.wallHit();
        newBall.dy *= -1;
        newBall.y = 0;
      }

      // Bottom Collision (Lose life)
      if (newBall.y + BALL_SIZE >= CANVAS_HEIGHT) {
        const newLives = prev.lives - 1;
        if (newLives === 0) {
          handleGameOver(prev.score);
          return prev;
        }
        sounds.losePoint();
        return {
          ...prev,
          paddleX: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
          ball: { 
            x: CANVAS_WIDTH / 2, 
            y: CANVAS_HEIGHT - PADDLE_HEIGHT - 30, 
            dx: prev.level > 1 ? INITIAL_BALL_SPEED_X * (1 + prev.level * 0.1) : INITIAL_BALL_SPEED_X, 
            dy: prev.level > 1 ? INITIAL_BALL_SPEED_Y * (1 + prev.level * 0.1) : INITIAL_BALL_SPEED_Y 
          },
          lives: newLives,
          isStarted: false,
        };
      }

      // Paddle Collision
      if (
        newBall.dy > 0 &&
        newBall.y + BALL_SIZE >= CANVAS_HEIGHT - PADDLE_HEIGHT - 10 && // 10px buffer from bottom
        newBall.y <= CANVAS_HEIGHT - 10 &&
        newBall.x + BALL_SIZE >= newPaddleX &&
        newBall.x <= newPaddleX + PADDLE_WIDTH
      ) {
        sounds.paddleHitB();
        newBall.dy *= -1;
        newBall.y = CANVAS_HEIGHT - PADDLE_HEIGHT - 10 - BALL_SIZE;
        // Add english based on hit position
        const hitPoint = (newBall.x + BALL_SIZE/2 - (newPaddleX + PADDLE_WIDTH/2)) / (PADDLE_WIDTH/2);
        newBall.dx = hitPoint * Math.abs(prev.ball.dy) * 1.5; // Scale horizontal with current vertical speed
        
        // Slightly increase speed
        newBall.dy *= 1.02;
      }

      // Brick Collision
      let newScore = prev.score;
      const newBricks = [...prev.bricks];
      let brickHit = false;

      for (let i = 0; i < newBricks.length; i++) {
        const b = newBricks[i];
        if (b.status === 1) {
          if (
            newBall.x + BALL_SIZE > b.x &&
            newBall.x < b.x + BRICK_WIDTH &&
            newBall.y + BALL_SIZE > b.y &&
            newBall.y < b.y + BRICK_HEIGHT
          ) {
            sounds.brickHit();
            newBall.dy *= -1;
            b.status = 0;
            newScore += 10;
            brickHit = true;
            break; // Only hit one brick per frame
          }
        }
      }

      // Level Up Condition
      let newLevel = prev.level;
      if (brickHit && newBricks.every(b => b.status === 0)) {
        sounds.levelUp();
        newLevel++;
        return {
          ...prev,
          level: newLevel,
          bricks: createBricks(newLevel),
          score: newScore,
          ball: {
            ...newBall,
            dx: newBall.dx * 1.1,
            dy: newBall.dy * 1.1,
          }
        };
      }

      return {
        ...prev,
        paddleX: newPaddleX,
        ball: newBall,
        bricks: newBricks,
        score: newScore,
      };
    });
  }, [gameState.isGameOver, gameState.isStarted, handleGameOver, keys]);

  useGameLoop(update, gameState.isGameOver);

  // Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0a0514';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Bricks
    gameState.bricks.forEach(b => {
      if (b.status === 1) {
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(b.x, b.y, BRICK_WIDTH, BRICK_HEIGHT);
      }
    });

    // Draw Paddle
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 15;
    ctx.fillRect(gameState.paddleX, CANVAS_HEIGHT - PADDLE_HEIGHT - 10, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Draw Ball
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(gameState.ball.x + BALL_SIZE/2, gameState.ball.y + BALL_SIZE/2, BALL_SIZE/2, 0, Math.PI * 2);
    ctx.fill();

    // Draw Lives
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '16px "JetBrains Mono"';
    ctx.textAlign = 'left';
    ctx.shadowBlur = 0;
    ctx.fillText(`LIVES: ${'♥'.repeat(gameState.lives)}`, 20, 30);

    if (!gameState.isStarted && !gameState.isGameOver) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.textAlign = 'center';
      ctx.fillText('PRESS LEFT OR RIGHT ARROW TO START', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }

  }, [gameState]);

  const restartGame = () => {
    setIsNewBest(false);
    setGameState({
      paddleX: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
      ball: { 
        x: CANVAS_WIDTH / 2, 
        y: CANVAS_HEIGHT - PADDLE_HEIGHT - 30, 
        dx: INITIAL_BALL_SPEED_X, 
        dy: INITIAL_BALL_SPEED_Y 
      },
      bricks: createBricks(1),
      score: 0,
      lives: 3,
      level: 1,
      isGameOver: false,
      isStarted: false,
    });
  };

  return (
    <GameShell
      title="BREAKOUT"
      score={gameState.score}
      bestScore={bestScore}
      color="neon-cyan"
      instructions={[
        'Use ARROW LEFT and ARROW RIGHT to move.',
        'Destroy all bricks to win.',
        'Hitting the edges of the paddle changes the ball angle.',
        'Do not let the ball drop.'
      ]}
    >
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
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
