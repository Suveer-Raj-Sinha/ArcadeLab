import { useState, useRef, useEffect, useCallback } from 'react';
import { GameShell } from '../../components/game/GameShell';
import { GameOverScreen } from '../../components/game/GameOverScreen';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useLocalArcadeData } from '../../hooks/useLocalArcadeData';
import { sounds } from '../../utils/audio';

const GAME_ID = 'runner';
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400; // Increased to fit game over screen comfortably
const PLAYER_SIZE = 30;
const FLOOR_Y = CANVAS_HEIGHT - 60; // Adjusted floor position
const GRAVITY = 0.0035;
const JUMP_FORCE = -0.7;
const SPEED = 0.4;

type Obstacle = {
  x: number;
  w: number;
  h: number;
  y: number;
};

export default function EndlessRunner() {
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
    isJumping: false 
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

  const handleJump = useCallback(() => {
    if (isGameOver) return;
    if (!hasStarted) {
      setHasStarted(true);
    }
    const p = playerRef.current;
    if (!p.isJumping) {
      p.velocity = JUMP_FORCE;
      p.isJumping = true;
      sounds.eat();
    }
  }, [isGameOver, hasStarted]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleJump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleJump]);

  const update = useCallback((deltaTime: number) => {
    if (isGameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (hasStarted) {
      const p = playerRef.current;
      const obstacles = obstaclesRef.current;
      
      // Speed increases slightly over time
      const currentSpeed = SPEED + (distanceRef.current / 50000);
      const pixelsToMove = currentSpeed * deltaTime;

      // Physics
      if (p.isJumping) {
        p.velocity += GRAVITY * deltaTime;
        p.y += p.velocity * deltaTime;

        if (p.y >= FLOOR_Y - PLAYER_SIZE) {
          p.y = FLOOR_Y - PLAYER_SIZE;
          p.velocity = 0;
          p.isJumping = false;
        }
      }

      distanceRef.current += pixelsToMove;
      setScore(Math.floor(distanceRef.current / 10));

      // Spawning
      const spawnChance = 0.015;
      if (Math.random() < spawnChance && distanceRef.current > 300) {
        const lastObs = obstacles[obstacles.length - 1];
        if (!lastObs || CANVAS_WIDTH - lastObs.x > 250) {
          // Types of obstacles: ground block or floating block
          const isFlying = Math.random() > 0.7;
          
          let y = FLOOR_Y - 30;
          let h = 30 + Math.random() * 20;
          if (isFlying) {
            y = FLOOR_Y - 60 - Math.random() * 30;
            h = 20;
          }

          obstacles.push({
            x: CANVAS_WIDTH,
            w: 20 + Math.random() * 20,
            h,
            y
          });
        }
      }

      // Update Obstacles
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= pixelsToMove;

        // Collision
        const pRect = { x: 50, y: p.y, w: PLAYER_SIZE, h: PLAYER_SIZE };
        const oRect = { x: obs.x, y: obs.y, w: obs.w, h: obs.h };

        if (
          pRect.x < oRect.x + oRect.w &&
          pRect.x + pRect.w > oRect.x &&
          pRect.y < oRect.y + oRect.h &&
          pRect.y + pRect.h > oRect.y
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

    // Floor
    ctx.fillStyle = '#00e5ff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00e5ff';
    ctx.fillRect(0, FLOOR_Y, CANVAS_WIDTH, 4);
    
    // Grid floor pattern
    const offset = distanceRef.current % 30;
    for(let i=0; i<CANVAS_WIDTH/30 + 1; i++) {
      ctx.fillRect(i*30 - offset, FLOOR_Y, 15, CANVAS_HEIGHT - FLOOR_Y);
    }

    if (hasStarted) {
      // Player
      ctx.fillStyle = '#ff007f';
      ctx.shadowColor = '#ff007f';
      const p = playerRef.current;
      ctx.fillRect(50, p.y, PLAYER_SIZE, PLAYER_SIZE);
      
      // Eye
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 0;
      ctx.fillRect(50 + 20, p.y + 6, 4, 4);
      
      // Running animation legs
      if (!p.isJumping) {
        const time = performance.now();
        if (Math.floor(time / 100) % 2 === 0) {
          ctx.fillRect(50 + 6, p.y + PLAYER_SIZE, 6, 6);
          ctx.fillRect(50 + 18, p.y + PLAYER_SIZE, 6, 2);
        } else {
          ctx.fillRect(50 + 6, p.y + PLAYER_SIZE, 6, 2);
          ctx.fillRect(50 + 18, p.y + PLAYER_SIZE, 6, 6);
        }
      }

      // Obstacles
      ctx.fillStyle = '#eab308';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#eab308';
      for (const obs of obstaclesRef.current) {
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      }
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '20px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 0;
      ctx.fillText('PRESS SPACE TO JUMP', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    }

  }, [isGameOver, hasStarted, handleGameOver]);

  useGameLoop(update, isGameOver);

  const restartGame = () => {
    playerRef.current = { y: FLOOR_Y - PLAYER_SIZE, velocity: 0, isJumping: false };
    distanceRef.current = 0;
    obstaclesRef.current = [];
    setScore(0);
    setHasStarted(false);
    setIsGameOver(false);
    setIsNewBest(false);
  };

  return (
    <GameShell
      title="NEON RUNNER"
      score={score}
      bestScore={bestScore}
      color="neon-cyan"
      instructions={[
        'Press SPACE or CLICK to jump.',
        'Avoid all obstacles.',
        'Speed increases over time.'
      ]}
    >
      <div 
        className="relative cursor-pointer touch-none"
        onMouseDown={handleJump}
        onTouchStart={(e) => { e.preventDefault(); handleJump(); }}
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
