import { useState, useRef, useEffect, useCallback } from 'react';
import { GameShell } from '../../components/game/GameShell';
import { GameOverScreen } from '../../components/game/GameOverScreen';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useLocalArcadeData } from '../../hooks/useLocalArcadeData';
import { sounds } from '../../utils/audio';

const GAME_ID = 'doodle';
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.0012;
const JUMP_FORCE = -0.6;
const MOVE_SPEED = 0.3;
const PLAYER_SIZE = 20;
const PLATFORM_WIDTH = 60;
const PLATFORM_HEIGHT = 10;

type Platform = {
  x: number;
  y: number;
  type: 'normal' | 'moving';
  dx?: number;
};

export default function DoodleJump() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useKeyboard();
  const { getPersonalBest, savePersonalBest, incrementGamesPlayed } = useLocalArcadeData();

  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);

  const bestScore = getPersonalBest(GAME_ID);

  const playerRef = useRef({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, velocity: 0 });
  const platformsRef = useRef<Platform[]>([]);
  const cameraYRef = useRef(0);

  const initPlatforms = () => {
    const platforms: Platform[] = [];
    platforms.push({ x: CANVAS_WIDTH / 2 - PLATFORM_WIDTH / 2, y: CANVAS_HEIGHT - 50, type: 'normal' });
    
    for (let i = 0; i < 15; i++) {
      platforms.push({
        x: Math.random() * (CANVAS_WIDTH - PLATFORM_WIDTH),
        y: CANVAS_HEIGHT - 100 - i * 60,
        type: Math.random() > 0.8 ? 'moving' : 'normal',
        dx: Math.random() > 0.5 ? 0.1 : -0.1
      });
    }
    return platforms;
  };

  useEffect(() => {
    platformsRef.current = initPlatforms();
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    setIsGameOver(true);
    sounds.gameOver();
    const isBest = finalScore > bestScore;
    setIsNewBest(isBest);
    if (isBest) savePersonalBest(GAME_ID, finalScore);
    incrementGamesPlayed(GAME_ID);
  }, [bestScore, savePersonalBest, incrementGamesPlayed]);

  const update = useCallback((deltaTime: number) => {
    if (isGameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const player = playerRef.current;
    const platforms = platformsRef.current;

    // Lateral Movement
    if (keys.current['ArrowLeft']) player.x -= MOVE_SPEED * deltaTime;
    if (keys.current['ArrowRight']) player.x += MOVE_SPEED * deltaTime;

    // Screen Wrap
    if (player.x < -PLAYER_SIZE) player.x = CANVAS_WIDTH;
    if (player.x > CANVAS_WIDTH) player.x = -PLAYER_SIZE;

    // Physics
    player.velocity += GRAVITY * deltaTime;
    player.y += player.velocity * deltaTime;

    // Collision with platforms (only falling down)
    if (player.velocity > 0) {
      for (const p of platforms) {
        if (
          player.y + PLAYER_SIZE / 2 > p.y &&
          player.y + PLAYER_SIZE / 2 < p.y + PLATFORM_HEIGHT + 10 &&
          player.x + PLAYER_SIZE / 2 > p.x &&
          player.x - PLAYER_SIZE / 2 < p.x + PLATFORM_WIDTH
        ) {
          player.velocity = JUMP_FORCE;
          sounds.paddleHit(); // jump sound
          break;
        }
      }
    }

    // Camera follow and Score
    if (player.y < CANVAS_HEIGHT / 2) {
      const diff = CANVAS_HEIGHT / 2 - player.y;
      player.y = CANVAS_HEIGHT / 2;
      cameraYRef.current += diff;
      
      setScore(s => Math.max(s, Math.floor(cameraYRef.current / 10)));

      // Move platforms down relative to camera
      for (const p of platforms) {
        p.y += diff;
      }
    }

    // Update moving platforms
    for (const p of platforms) {
      if (p.type === 'moving' && p.dx) {
        p.x += p.dx * deltaTime;
        if (p.x < 0 || p.x + PLATFORM_WIDTH > CANVAS_WIDTH) {
          p.dx *= -1;
        }
      }
    }

    // Recycle platforms that fall below screen
    for (let i = 0; i < platforms.length; i++) {
      if (platforms[i].y > CANVAS_HEIGHT) {
        platforms[i] = {
          x: Math.random() * (CANVAS_WIDTH - PLATFORM_WIDTH),
          y: platforms.reduce((min, p) => Math.min(min, p.y), CANVAS_HEIGHT) - (40 + Math.random() * 40),
          type: Math.random() > 0.8 ? 'moving' : 'normal',
          dx: Math.random() > 0.5 ? 0.1 : -0.1
        };
      }
    }

    // Death check
    if (player.y > CANVAS_HEIGHT) {
      // Current score is already updated
      setScore(s => {
        handleGameOver(s);
        return s;
      });
    }

    // --- DRAWING ---
    // Background
    ctx.fillStyle = '#0a0514';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Platforms
    platformsRef.current.forEach(p => {
      ctx.fillStyle = p.type === 'moving' ? '#ff007f' : '#00e5ff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = ctx.fillStyle;
      ctx.fillRect(p.x, p.y, PLATFORM_WIDTH, PLATFORM_HEIGHT);
      
      // Highlight
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 0;
      ctx.fillRect(p.x + 2, p.y + 2, PLATFORM_WIDTH - 4, 2);
    });

    // Draw Player
    ctx.fillStyle = '#eab308'; // Yellow
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#eab308';
    
    // Simple springy box
    const stretch = player.velocity > 0 ? 4 : player.velocity < -0.3 ? -4 : 0;
    
    ctx.fillRect(player.x - PLAYER_SIZE/2 + stretch/2, player.y - PLAYER_SIZE/2 - stretch, PLAYER_SIZE - stretch, PLAYER_SIZE + stretch);
    
    // Eyes
    ctx.fillStyle = '#000';
    ctx.shadowBlur = 0;
    const eyeOffsetX = keys.current['ArrowRight'] ? 4 : keys.current['ArrowLeft'] ? -4 : 0;
    ctx.fillRect(player.x - 6 + eyeOffsetX, player.y - 4, 3, 3);
    ctx.fillRect(player.x + 3 + eyeOffsetX, player.y - 4, 3, 3);

  }, [isGameOver, keys, handleGameOver]);

  useGameLoop(update, isGameOver);

  const restartGame = () => {
    playerRef.current = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, velocity: JUMP_FORCE };
    platformsRef.current = initPlatforms();
    cameraYRef.current = 0;
    setScore(0);
    setIsGameOver(false);
    setIsNewBest(false);
  };

  return (
    <GameShell
      title="NEON JUMP"
      score={score}
      bestScore={bestScore}
      color="neon-cyan"
      instructions={[
        'Use ARROW LEFT and RIGHT to move.',
        'You bounce automatically.',
        'Pink platforms move.',
        'Do not fall!'
      ]}
    >
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block"
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
