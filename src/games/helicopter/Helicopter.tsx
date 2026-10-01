import { useState, useRef, useEffect, useCallback } from 'react';
import { GameShell } from '../../components/game/GameShell';
import { GameOverScreen } from '../../components/game/GameOverScreen';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useLocalArcadeData } from '../../hooks/useLocalArcadeData';
import { sounds } from '../../utils/audio';

const GAME_ID = 'helicopter';
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const GRAVITY = 0.001;
const LIFT = -0.002;
const SPEED = 0.3;
const HELI_SIZE = 20;
const SEGMENT_WIDTH = 10; // Width of terrain segments

type Terrain = {
  top: number;
  bottom: number;
};

type Obstacle = {
  x: number;
  y: number;
  w: number;
  h: number;
  passed: boolean;
};

export default function Helicopter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { getPersonalBest, savePersonalBest, incrementGamesPlayed } = useLocalArcadeData();

  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const bestScore = getPersonalBest(GAME_ID);

  const isHoldingRef = useRef(false);
  const heliRef = useRef({ y: CANVAS_HEIGHT / 2, velocity: 0 });
  const terrainRef = useRef<Terrain[]>([]);
  const distanceRef = useRef(0);
  const obstaclesRef = useRef<Obstacle[]>([]);

  // Init terrain
  useEffect(() => {
    const t = [];
    for (let i = 0; i <= CANVAS_WIDTH / SEGMENT_WIDTH + 1; i++) {
      t.push({ top: 50, bottom: CANVAS_HEIGHT - 50 });
    }
    terrainRef.current = t;
  }, []);

  const handleGameOver = useCallback(() => {
    setIsGameOver(true);
    sounds.gameOver();
    const finalScore = Math.floor(distanceRef.current / 10);
    const isBest = finalScore > bestScore;
    setIsNewBest(isBest);
    if (isBest) savePersonalBest(GAME_ID, finalScore);
    incrementGamesPlayed(GAME_ID);
  }, [bestScore, savePersonalBest, incrementGamesPlayed]);

  // Input bindings
  const handleDown = useCallback(() => {
    if (isGameOver) return;
    if (!hasStarted) setHasStarted(true);
    isHoldingRef.current = true;
    sounds.paddleHit(); // slight tick for engine
  }, [isGameOver, hasStarted]);

  const handleUp = useCallback(() => {
    isHoldingRef.current = false;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleDown();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') handleUp();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleDown, handleUp]);

  const update = useCallback((deltaTime: number) => {
    if (isGameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (hasStarted) {
      const heli = heliRef.current;
      const terrain = terrainRef.current;
      const obstacles = obstaclesRef.current;

      // Physics
      heli.velocity += (isHoldingRef.current ? LIFT : GRAVITY) * deltaTime;
      // Terminal velocity
      if (heli.velocity > 0.5) heli.velocity = 0.5;
      if (heli.velocity < -0.5) heli.velocity = -0.5;
      
      heli.y += heli.velocity * deltaTime;
      distanceRef.current += SPEED * deltaTime;
      
      setScore(Math.floor(distanceRef.current / 10));

      // Terrain generation
      const currentSpeed = SPEED + (distanceRef.current / 40000); // Speed scales up slowly over time
      
      const pixelsToMove = currentSpeed * deltaTime;
      
      const lastDist = distanceRef.current - pixelsToMove;
      const passedSegments = Math.floor(distanceRef.current / SEGMENT_WIDTH) - Math.floor(lastDist / SEGMENT_WIDTH);
      
      for (let i = 0; i < passedSegments; i++) {
        terrain.shift();
        
        // Generate new segment
        const lastT = terrain[terrain.length - 1];
        
        // Slowly shrink gap as game goes on
        const minGap = Math.max(100, 300 - distanceRef.current / 100);
        
        let newTop = lastT.top + (Math.random() * 20 - 10);
        let newBottom = lastT.bottom + (Math.random() * 20 - 10);
        
        if (newTop < 10) newTop = 10;
        if (newBottom > CANVAS_HEIGHT - 10) newBottom = CANVAS_HEIGHT - 10;
        
        if (newBottom - newTop < minGap) {
          if (Math.random() > 0.5) newBottom = newTop + minGap;
          else newTop = newBottom - minGap;
        }

        terrain.push({ top: newTop, bottom: newBottom });

        // Spawn obstacle randomly
        if (Math.random() < 0.05 && distanceRef.current > 1000) {
          obstacles.push({
            x: CANVAS_WIDTH,
            y: newTop + Math.random() * (newBottom - newTop - 40),
            w: 20,
            h: 40 + Math.random() * 40,
            passed: false
          });
        }
      }

      // Update Obstacles
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= pixelsToMove;
        if (obs.x + obs.w < 0) {
          obstacles.splice(i, 1);
        }
      }

      // Collision Detection
      const heliRect = { x: 100 - HELI_SIZE/2, y: heli.y - HELI_SIZE/2, w: HELI_SIZE, h: HELI_SIZE };

      // 1. Terrain Collision
      // Find the segment the heli is currently in
      const segmentIdx = Math.floor(100 / SEGMENT_WIDTH);
      const t = terrain[segmentIdx];
      if (heli.y - HELI_SIZE/2 < t.top || heli.y + HELI_SIZE/2 > t.bottom) {
        handleGameOver();
        return;
      }

      // 2. Obstacle Collision
      for (const obs of obstacles) {
        if (
          heliRect.x < obs.x + obs.w &&
          heliRect.x + heliRect.w > obs.x &&
          heliRect.y < obs.y + obs.h &&
          heliRect.y + heliRect.h > obs.y
        ) {
          handleGameOver();
          return;
        }
      }
    }

    // --- DRAWING ---
    ctx.fillStyle = '#0a0514';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (hasStarted) {
      const offsetX = distanceRef.current % SEGMENT_WIDTH;

      // Draw Terrain
      ctx.fillStyle = '#00e5ff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00e5ff';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      terrainRef.current.forEach((t, i) => {
        ctx.lineTo(i * SEGMENT_WIDTH - offsetX, t.top);
      });
      ctx.lineTo(CANVAS_WIDTH, 0);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, CANVAS_HEIGHT);
      terrainRef.current.forEach((t, i) => {
        ctx.lineTo(i * SEGMENT_WIDTH - offsetX, t.bottom);
      });
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fill();

      // Draw Obstacles
      ctx.fillStyle = '#ff007f';
      ctx.shadowColor = '#ff007f';
      for (const obs of obstaclesRef.current) {
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      }

      // Draw Heli
      ctx.fillStyle = '#eab308';
      ctx.shadowColor = '#eab308';
      ctx.fillRect(100 - HELI_SIZE/2, heliRef.current.y - HELI_SIZE/2, HELI_SIZE, HELI_SIZE);
      
      // Rotor
      const time = performance.now();
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 0;
      const rotorWidth = (Math.sin(time * 0.05) + 1) * 15 + 10;
      ctx.fillRect(100 - rotorWidth/2, heliRef.current.y - HELI_SIZE/2 - 4, rotorWidth, 2);

    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '20px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.fillText('HOLD CLICK TO ASCEND', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }

  }, [isGameOver, hasStarted, handleGameOver]);

  useGameLoop(update, isGameOver);

  const restartGame = () => {
    heliRef.current = { y: CANVAS_HEIGHT / 2, velocity: 0 };
    distanceRef.current = 0;
    obstaclesRef.current = [];
    isHoldingRef.current = false;
    
    const t = [];
    for (let i = 0; i <= CANVAS_WIDTH / SEGMENT_WIDTH + 1; i++) {
      t.push({ top: 50, bottom: CANVAS_HEIGHT - 50 });
    }
    terrainRef.current = t;

    setScore(0);
    setHasStarted(false);
    setIsGameOver(false);
    setIsNewBest(false);
  };

  return (
    <GameShell
      title="HELI SURVIVAL"
      score={score}
      bestScore={bestScore}
      color="neon-cyan"
      instructions={[
        'Hold SPACE or CLICK to fly up.',
        'Release to fall.',
        'Do not touch the walls or obstacles.'
      ]}
    >
      <div 
        className="relative cursor-pointer touch-none"
        onMouseDown={handleDown}
        onMouseUp={handleUp}
        onMouseLeave={handleUp}
        onTouchStart={(e) => { e.preventDefault(); handleDown(); }}
        onTouchEnd={(e) => { e.preventDefault(); handleUp(); }}
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
