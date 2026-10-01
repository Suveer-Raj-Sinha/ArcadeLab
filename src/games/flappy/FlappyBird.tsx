import { useState, useRef, useEffect, useCallback } from 'react';
import { GameShell } from '../../components/game/GameShell';
import { GameOverScreen } from '../../components/game/GameOverScreen';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useLocalArcadeData } from '../../hooks/useLocalArcadeData';
import { sounds } from '../../utils/audio';

const GAME_ID = 'flappy';
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.0015;
const JUMP_FORCE = -0.4;
const PIPE_SPEED = 0.2;
const PIPE_WIDTH = 60;
const PIPE_GAP = 150;
const BIRD_SIZE = 24;

type Pipe = {
  x: number;
  topHeight: number;
  passed: boolean;
};

export default function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { getPersonalBest, savePersonalBest, incrementGamesPlayed } = useLocalArcadeData();

  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const bestScore = getPersonalBest(GAME_ID);

  const birdRef = useRef({ y: CANVAS_HEIGHT / 2, velocity: 0 });
  const pipesRef = useRef<Pipe[]>([]);
  const lastPipeSpawnRef = useRef(0);

  const handleJump = useCallback(() => {
    if (isGameOver) return;
    if (!hasStarted) {
      setHasStarted(true);
    }
    birdRef.current.velocity = JUMP_FORCE;
    sounds.eat(); // Pop sound for flap
  }, [isGameOver, hasStarted]);

  // Key and click handlers
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

  const handleGameOver = useCallback(() => {
    setIsGameOver(true);
    sounds.gameOver();
    const isBest = score > bestScore;
    setIsNewBest(isBest);
    if (isBest) savePersonalBest(GAME_ID, score);
    incrementGamesPlayed(GAME_ID);
  }, [score, bestScore, savePersonalBest, incrementGamesPlayed]);

  const update = useCallback((deltaTime: number) => {
    if (isGameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (hasStarted) {
      const bird = birdRef.current;
      const pipes = pipesRef.current;

      // Physics
      bird.velocity += GRAVITY * deltaTime;
      bird.y += bird.velocity * deltaTime;
      
      const currentSpeed = PIPE_SPEED + (score * 0.005); // Speed scales with score

      // Pipe Spawning
      lastPipeSpawnRef.current += deltaTime;
      // Spawn slightly faster as speed increases
      const spawnInterval = Math.max(1000, 1800 - (score * 20)); 
      if (lastPipeSpawnRef.current > spawnInterval) {
        lastPipeSpawnRef.current = 0;
        const minHeight = 50;
        const maxHeight = CANVAS_HEIGHT - PIPE_GAP - minHeight;
        const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);
        
        pipes.push({
          x: CANVAS_WIDTH,
          topHeight,
          passed: false
        });
      }

      // Pipe Movement & Collision
      for (let i = pipes.length - 1; i >= 0; i--) {
        const p = pipes[i];
        p.x -= currentSpeed * deltaTime;

        // Score
        if (!p.passed && p.x + PIPE_WIDTH < 100) {
          p.passed = true;
          setScore(s => s + 1);
          sounds.levelUp(); // Ping for point
        }

        // Cleanup
        if (p.x + PIPE_WIDTH < 0) {
          pipes.splice(i, 1);
          continue;
        }

        // Collision
        const birdRect = { x: 100 - BIRD_SIZE/2, y: bird.y - BIRD_SIZE/2, w: BIRD_SIZE, h: BIRD_SIZE };
        const topPipeRect = { x: p.x, y: 0, w: PIPE_WIDTH, h: p.topHeight };
        const bottomPipeRect = { x: p.x, y: p.topHeight + PIPE_GAP, w: PIPE_WIDTH, h: CANVAS_HEIGHT };

        const checkCollision = (r1: any, r2: any) => {
          return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
        };

        if (checkCollision(birdRect, topPipeRect) || checkCollision(birdRect, bottomPipeRect)) {
          handleGameOver();
          return;
        }
      }

      // Floor / Ceiling Collision
      if (bird.y + BIRD_SIZE/2 >= CANVAS_HEIGHT || bird.y - BIRD_SIZE/2 <= 0) {
        handleGameOver();
        return;
      }
    }

    // --- DRAWING ---
    // Background
    ctx.fillStyle = '#0a0514';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Pipes
    pipesRef.current.forEach(p => {
      ctx.fillStyle = '#00e5ff'; // Neon Cyan
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00e5ff';
      
      // Top pipe
      ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topHeight);
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 0;
      ctx.fillRect(p.x + PIPE_WIDTH - 5, 0, 2, p.topHeight);
      
      // Bottom pipe
      ctx.fillStyle = '#00e5ff';
      ctx.shadowBlur = 15;
      ctx.fillRect(p.x, p.topHeight + PIPE_GAP, PIPE_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 0;
      ctx.fillRect(p.x + PIPE_WIDTH - 5, p.topHeight + PIPE_GAP, 2, CANVAS_HEIGHT);
    });

    // Draw Bird
    ctx.fillStyle = '#ff007f'; // Neon Pink
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ff007f';
    
    ctx.save();
    ctx.translate(100, birdRef.current.y);
    const rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, birdRef.current.velocity * 1.5));
    ctx.rotate(rotation);
    
    ctx.fillRect(-BIRD_SIZE/2, -BIRD_SIZE/2, BIRD_SIZE, BIRD_SIZE);
    
    // Eye
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 0;
    ctx.fillRect(BIRD_SIZE/4, -BIRD_SIZE/4, 6, 6);
    ctx.fillStyle = '#000';
    ctx.fillRect(BIRD_SIZE/4 + 2, -BIRD_SIZE/4 + 2, 2, 2);
    
    ctx.restore();

    if (!hasStarted) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '20px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 0;
      ctx.fillText('PRESS SPACE TO FLAP', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
    }
  }, [isGameOver, hasStarted, handleGameOver]);

  useGameLoop(update, isGameOver);

  const restartGame = () => {
    birdRef.current = { y: CANVAS_HEIGHT / 2, velocity: 0 };
    pipesRef.current = [];
    lastPipeSpawnRef.current = 0;
    setScore(0);
    setHasStarted(false);
    setIsGameOver(false);
    setIsNewBest(false);
  };

  return (
    <GameShell
      title="CYBER FLAP"
      score={score}
      bestScore={bestScore}
      color="neon-pink"
      instructions={[
        'Press SPACE or CLICK to flap.',
        'Navigate through the cyber-gates.',
        'Do not touch the floor or ceiling.'
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
          className="block"
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
