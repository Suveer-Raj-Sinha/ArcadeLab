import { useState, useRef, useEffect, useCallback } from 'react';
import { GameShell } from '../../components/game/GameShell';
import { GameOverScreen } from '../../components/game/GameOverScreen';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useLocalArcadeData } from '../../hooks/useLocalArcadeData';
import { sounds } from '../../utils/audio';

const GAME_ID = 'pong';
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;
const BALL_SIZE = 10;
const PADDLE_SPEED = 0.4; // px per ms
const INITIAL_BALL_SPEED = 0.3; // px per ms

export default function Pong() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useKeyboard();
  const { getPersonalBest, savePersonalBest, incrementGamesPlayed } = useLocalArcadeData();

  const [gameState, setGameState] = useState({
    playerY: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    aiY: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    ball: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, dx: INITIAL_BALL_SPEED, dy: INITIAL_BALL_SPEED },
    playerScore: 0,
    lives: 3,
    rallyCount: 0,
    isGameOver: false,
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

    setGameState((prev) => {
      let newPlayerY = prev.playerY;
      
      // Progressive speed scaling
      const speedMultiplier = 1 + prev.playerScore * 0.08; // 8% faster per point scored
      
      // Player Movement — scales with score
      const currentPaddleSpeed = PADDLE_SPEED * Math.min(speedMultiplier, 2.5);
      if (keys.current['ArrowUp']) newPlayerY -= currentPaddleSpeed * deltaTime;
      if (keys.current['ArrowDown']) newPlayerY += currentPaddleSpeed * deltaTime;
      
      // Clamp player
      newPlayerY = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, newPlayerY));

      // AI Movement — scales with score
      let newAiY = prev.aiY;
      const aiSpeed = Math.min(currentPaddleSpeed * 0.9, PADDLE_SPEED * (0.4 + prev.playerScore * 0.12));
      if (prev.ball.y < newAiY + PADDLE_HEIGHT / 2 - 10) {
        newAiY -= aiSpeed * deltaTime;
      } else if (prev.ball.y > newAiY + PADDLE_HEIGHT / 2 + 10) {
        newAiY += aiSpeed * deltaTime;
      }
      newAiY = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, newAiY));

      // Ball Movement
      let newBall = {
        ...prev.ball,
        x: prev.ball.x + prev.ball.dx * deltaTime,
        y: prev.ball.y + prev.ball.dy * deltaTime,
      };

      // Top/Bottom Collision
      if (newBall.y <= 0 || newBall.y >= CANVAS_HEIGHT - BALL_SIZE) {
        sounds.wallHit();
        newBall.dy *= -1;
        newBall.y = newBall.y <= 0 ? 0 : CANVAS_HEIGHT - BALL_SIZE;
      }

      let newRally = prev.rallyCount;

      // Paddle Collision (Player)
      if (
        newBall.dx < 0 && 
        newBall.x <= PADDLE_WIDTH * 2 && 
        newBall.x >= PADDLE_WIDTH &&
        newBall.y + BALL_SIZE >= newPlayerY && 
        newBall.y <= newPlayerY + PADDLE_HEIGHT
      ) {
        sounds.paddleHit();
        newBall.dx *= -1.05;
        newBall.x = PADDLE_WIDTH * 2;
        const hitPoint = (newBall.y + BALL_SIZE/2 - (newPlayerY + PADDLE_HEIGHT/2)) / (PADDLE_HEIGHT/2);
        newBall.dy = hitPoint * INITIAL_BALL_SPEED * speedMultiplier * 1.5;
        newRally++;
      }

      // Paddle Collision (AI)
      if (
        newBall.dx > 0 && 
        newBall.x + BALL_SIZE >= CANVAS_WIDTH - PADDLE_WIDTH * 2 && 
        newBall.x + BALL_SIZE <= CANVAS_WIDTH - PADDLE_WIDTH &&
        newBall.y + BALL_SIZE >= newAiY && 
        newBall.y <= newAiY + PADDLE_HEIGHT
      ) {
        sounds.paddleHit();
        newBall.dx *= -1.05;
        newBall.x = CANVAS_WIDTH - PADDLE_WIDTH * 2 - BALL_SIZE;
      }

      let newPlayerScore = prev.playerScore;
      let newLives = prev.lives;

      // Scoring
      if (newBall.x < 0) {
        // AI Scored, player loses a life
        newLives--;
        if (newLives <= 0) {
          handleGameOver(newPlayerScore);
          return prev;
        }
        sounds.losePoint();
        // Serve to AI
        newBall = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, dx: INITIAL_BALL_SPEED, dy: INITIAL_BALL_SPEED };
        newRally = 0;
      } else if (newBall.x > CANVAS_WIDTH) {
        // Player Scored
        sounds.score();
        newPlayerScore++;
        // Serve to Player
        newBall = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, dx: -INITIAL_BALL_SPEED, dy: INITIAL_BALL_SPEED };
        newRally = 0;
      }

      return {
        ...prev,
        playerY: newPlayerY,
        aiY: newAiY,
        ball: newBall,
        rallyCount: newRally,
        playerScore: newPlayerScore,
        lives: newLives,
      };
    });
  }, [gameState.isGameOver, handleGameOver, keys]);

  useGameLoop(update, gameState.isGameOver);

  // Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#0a0514';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Center Line (Dashed)
    ctx.strokeStyle = '#2a1b40';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 15]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Lives
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '20px "JetBrains Mono"';
    ctx.textAlign = 'left';
    ctx.shadowBlur = 0;
    ctx.fillText(`LIVES: ${'♥'.repeat(gameState.lives)}`, 20, 30);

    // Draw Score Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.font = '80px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(gameState.playerScore.toString(), CANVAS_WIDTH / 2, 100);

    // Draw Paddles
    ctx.fillStyle = '#ff007f';
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 15;
    ctx.fillRect(PADDLE_WIDTH, gameState.playerY, PADDLE_WIDTH, PADDLE_HEIGHT);
    
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.fillRect(CANVAS_WIDTH - PADDLE_WIDTH * 2, gameState.aiY, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Draw Ball
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 20;
    ctx.fillRect(gameState.ball.x, gameState.ball.y, BALL_SIZE, BALL_SIZE);

    // Reset shadow
    ctx.shadowBlur = 0;

  }, [gameState]);

  const restartGame = () => {
    setIsNewBest(false);
    setGameState({
      playerY: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
      aiY: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
      ball: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, dx: INITIAL_BALL_SPEED, dy: INITIAL_BALL_SPEED },
      playerScore: 0,
      lives: 3,
      rallyCount: 0,
      isGameOver: false,
    });
  };

  return (
    <GameShell
      title="PONG"
      score={gameState.playerScore}
      bestScore={bestScore}
      color="neon-pink"
      instructions={[
        'Use ARROW UP and ARROW DOWN to move your paddle.',
        'You have 3 lives. Lose a life if the ball gets past you.',
        'Score by getting the ball past the AI.',
        'The AI gets faster as your score increases.'
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
            score={gameState.playerScore}
            isNewBest={isNewBest}
            onRestart={restartGame}
            color="neon-pink"
          />
        )}
      </div>
    </GameShell>
  );
}
