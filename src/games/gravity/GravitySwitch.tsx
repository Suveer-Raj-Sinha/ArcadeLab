import { useState, useRef, useEffect, useCallback } from 'react';
import { GameShell } from '../../components/game/GameShell';
import { GameOverScreen } from '../../components/game/GameOverScreen';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useLocalArcadeData } from '../../hooks/useLocalArcadeData';
import { sounds } from '../../utils/audio';

const GAME_ID = 'gravity';
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400; // Increased to fit Game Over UI
const PLAYER_SIZE = 24;
const CEILING_Y = 60;
const FLOOR_Y = CANVAS_HEIGHT - 60;
const GRAVITY_FORCE = 0.003;
const SPEED = 0.35;

type Obstacle = {
  x: number;
  w: number;
  h: number;
  isCeiling: boolean;
  passed: boolean;
};

export default function GravitySwitch() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { getPersonalBest, savePersonalBest, incrementGamesPlayed } = useLocalArcadeData();

  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const bestScore = getPersonalBest(GAME_ID);

  const playerRef = useRef({ 
    y: FLOOR_Y - PLAYER_SIZE, 
    velocity: 0,
    gravityDirection: 1 // 1 = down, -1 = up
  });
  
  const distanceRef = useRef(0);
  const obstaclesRef = useRef<Obstacle[]>([]);

  const handleGameOver = useCallback(() => {
    setIsGameOver(true);
    sounds.gameOver();
    const finalScore = Math.floor(distanceRef.current / 10);
    const isBest = finalScore > bestScore;
    setIsNewBest(isBest);
    if (isBest) savePersonalBest(GAME_ID, finalScore);
    incrementGamesPlayed(GAME_ID);
  }, [bestScore, savePersonalBest, incrementGamesPlayed]);

  const handleSwitch = useCallback(() => {
    if (isGameOver) return;
    if (!hasStarted) setHasStarted(true);
    
    // Only allow switch if touching floor or ceiling
    const player = playerRef.current;
    if (player.y >= FLOOR_Y - PLAYER_SIZE || player.y <= CEILING_Y) {
      player.gravityDirection *= -1;
      sounds.eat(); // Small blip
    }
  }, [isGameOver, hasStarted]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleSwitch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSwitch]);

  const update = useCallback((deltaTime: number) => {
    if (isGameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (hasStarted) {
      const player = playerRef.current;
      const obstacles = obstaclesRef.current;
      const currentSpeed = SPEED + (distanceRef.current / 40000);
      const pixelsToMove = currentSpeed * deltaTime;

      // Physics
      player.velocity += GRAVITY_FORCE * player.gravityDirection * deltaTime;
      player.y += player.velocity * deltaTime;

      // Floor/Ceiling collision
      if (player.y >= FLOOR_Y - PLAYER_SIZE) {
        player.y = FLOOR_Y - PLAYER_SIZE;
        player.velocity = 0;
      }
      if (player.y <= CEILING_Y) {
        player.y = CEILING_Y;
        player.velocity = 0;
      }

      distanceRef.current += pixelsToMove;
      setScore(Math.floor(distanceRef.current / 10));

      // Spawn obstacles
      // The further we go, the more frequent they spawn
      const spawnChance = 0.01 + Math.min(0.02, distanceRef.current / 100000);
      if (Math.random() < spawnChance && distanceRef.current > 200) {
        // Prevent spawning too close to another obstacle
        const lastObs = obstacles[obstacles.length - 1];
        if (!lastObs || CANVAS_WIDTH - lastObs.x > 150) {
          const isCeiling = Math.random() > 0.5;
          const h = 30 + Math.random() * 40;
          obstacles.push({
            x: CANVAS_WIDTH,
            w: 30,
            h: h,
            isCeiling,
            passed: false
          });
        }
      }

      // Update Obstacles
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= pixelsToMove;

        // Collision detection
        const pRect = { x: 100, y: player.y, w: PLAYER_SIZE, h: PLAYER_SIZE };
        const obsRect = { 
          x: obs.x, 
          y: obs.isCeiling ? CEILING_Y : FLOOR_Y - obs.h, 
          w: obs.w, 
          h: obs.h 
        };

        if (
          pRect.x < obsRect.x + obsRect.w &&
          pRect.x + pRect.w > obsRect.x &&
          pRect.y < obsRect.y + obsRect.h &&
          pRect.y + pRect.h > obsRect.y
        ) {
          handleGameOver();
          return;
        }

        if (obs.x + obs.w < 0) {
          obstacles.splice(i, 1);
        }
      }
    }

    // --- DRAWING ---
    ctx.fillStyle = '#0a0514';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Floor and Ceiling
    ctx.fillStyle = '#ff007f';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff007f';
    
    // Animate lines to show speed
    const lineOffset = (distanceRef.current % 40);
    
    // Ceiling line
    ctx.fillRect(0, CEILING_Y - 4, CANVAS_WIDTH, 4);
    // Floor line
    ctx.fillRect(0, FLOOR_Y, CANVAS_WIDTH, 4);
    
    ctx.fillStyle = 'rgba(255,0,127,0.3)';
    for(let i=0; i<CANVAS_WIDTH/40 + 1; i++) {
      ctx.fillRect(i*40 - lineOffset, 0, 20, CEILING_Y);
      ctx.fillRect(i*40 - lineOffset, FLOOR_Y, 20, CANVAS_HEIGHT - FLOOR_Y);
    }

    if (hasStarted) {
      // Draw Obstacles
      ctx.fillStyle = '#00e5ff';
      ctx.shadowColor = '#00e5ff';
      for (const obs of obstaclesRef.current) {
        if (obs.isCeiling) {
          ctx.fillRect(obs.x, CEILING_Y, obs.w, obs.h);
        } else {
          ctx.fillRect(obs.x, FLOOR_Y - obs.h, obs.w, obs.h);
        }
      }

      // Draw Player
      ctx.fillStyle = '#eab308';
      ctx.shadowColor = '#eab308';
      const p = playerRef.current;
      ctx.fillRect(100, p.y, PLAYER_SIZE, PLAYER_SIZE);
      
      // Player eye
      ctx.fillStyle = '#000';
      ctx.shadowBlur = 0;
      const eyeY = p.gravityDirection === 1 ? p.y + 4 : p.y + PLAYER_SIZE - 8;
      ctx.fillRect(100 + 14, eyeY, 4, 4);

    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '20px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 0;
      ctx.fillText('PRESS SPACE TO INVERT GRAVITY', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }

  }, [isGameOver, hasStarted, handleGameOver]);

  useGameLoop(update, isGameOver);

  const restartGame = () => {
    playerRef.current = { y: FLOOR_Y - PLAYER_SIZE, velocity: 0, gravityDirection: 1 };
    distanceRef.current = 0;
    obstaclesRef.current = [];
    setScore(0);
    setHasStarted(false);
    setIsGameOver(false);
    setIsNewBest(false);
  };

  return (
    <GameShell
      title="GRAVITY SHIFT"
      score={score}
      bestScore={bestScore}
      color="neon-pink"
      instructions={[
        'Press SPACE or CLICK to flip gravity.',
        'Run on the ceiling or floor to dodge.',
        'You can only flip when touching a surface.'
      ]}
    >
      <div 
        className="relative cursor-pointer touch-none"
        onMouseDown={handleSwitch}
        onTouchStart={(e) => { e.preventDefault(); handleSwitch(); }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block border-4 border-cyber-line shadow-[0_0_20px_rgba(255,0,127,0.15)] rounded bg-[#0a0514]"
        />
        {isGameOver && (
          <GameOverScreen
            score={score}
            isNewBest={isNewBest}
            onRestart={restartGame}
            color="neon-pink"
          />
        )}
      </div>
    </GameShell>
  );
}
