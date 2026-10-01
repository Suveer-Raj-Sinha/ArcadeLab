import { useState, useRef, useEffect, useCallback } from 'react';
import { GameShell } from '../../components/game/GameShell';
import { GameOverScreen } from '../../components/game/GameOverScreen';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useLocalArcadeData } from '../../hooks/useLocalArcadeData';
import { sounds } from '../../utils/audio';

const GAME_ID = 'tunnel';
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const SIDES = 8;
const MAX_DEPTH = 100;
const BASE_SPEED = 0.05;
const FOV = 20;

type Obstacle = {
  z: number;
  segments: boolean[]; // array of length SIDES, true if blocked
  color: string;
};

export default function TunnelRush() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { getPersonalBest, savePersonalBest, incrementGamesPlayed } = useLocalArcadeData();

  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const bestScore = getPersonalBest(GAME_ID);

  const playerPosRef = useRef(0); // 0 to SIDES - 1
  const obstaclesRef = useRef<Obstacle[]>([]);
  const distanceRef = useRef(0);
  const rotationOffsetRef = useRef(0); // For dynamic spinning of the whole tunnel

  const handleGameOver = useCallback(() => {
    setIsGameOver(true);
    sounds.gameOver();
    const finalScore = Math.floor(distanceRef.current);
    const isBest = finalScore > bestScore;
    setIsNewBest(isBest);
    if (isBest) savePersonalBest(GAME_ID, finalScore);
    incrementGamesPlayed(GAME_ID);
  }, [bestScore, savePersonalBest, incrementGamesPlayed]);

  const movePlayer = useCallback((dir: number) => {
    if (isGameOver) return;
    if (!hasStarted) setHasStarted(true);
    playerPosRef.current = (playerPosRef.current + dir + SIDES) % SIDES;
    sounds.paddleHit();
  }, [isGameOver, hasStarted]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        // Positive direction is clockwise in canvas (visually left when at bottom)
        movePlayer(1);
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        // Negative direction is counter-clockwise (visually right when at bottom)
        movePlayer(-1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayer]);

  const update = useCallback((deltaTime: number) => {
    if (isGameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (hasStarted) {
      const obstacles = obstaclesRef.current;
      const currentSpeed = BASE_SPEED + (distanceRef.current / 5000);
      const zMove = currentSpeed * deltaTime;

      distanceRef.current += currentSpeed * (deltaTime / 16);
      setScore(Math.floor(distanceRef.current));
      
      // Slowly rotate the entire tunnel
      rotationOffsetRef.current += (0.0005 + (distanceRef.current / 500000)) * deltaTime;

      // Spawn Obstacles
      const spawnChance = 0.02 + Math.min(0.03, distanceRef.current / 10000);
      if (Math.random() < spawnChance) {
        const lastObs = obstacles[obstacles.length - 1];
        if (!lastObs || lastObs.z < MAX_DEPTH - 15) { // gap between obstacles
          
          const segments = Array(SIDES).fill(false);
          // Block a random number of segments (1 to SIDES - 2)
          const numBlocks = Math.floor(Math.random() * (SIDES - 2)) + 1;
          const startIdx = Math.floor(Math.random() * SIDES);
          
          for (let i = 0; i < numBlocks; i++) {
            segments[(startIdx + i) % SIDES] = true;
          }
          
          const colors = ['#ff007f', '#00e5ff', '#eab308', '#ef4444'];
          obstacles.push({
            z: MAX_DEPTH,
            segments,
            color: colors[Math.floor(Math.random() * colors.length)]
          });
        }
      }

      // Update Obstacles
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.z -= zMove;

        // Collision Check
        if (obs.z < 2 && obs.z > -2) {
          if (obs.segments[playerPosRef.current]) {
            handleGameOver();
            return;
          }
        }

        if (obs.z < -5) {
          obstacles.splice(i, 1);
        }
      }
    }

    // --- DRAWING ---
    ctx.fillStyle = '#0a0514';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    const maxRadius = 180; // Adjusted so it fits inside the 400x400 canvas!

    const getProjectedRadius = (z: number) => {
      // Avoid division by zero
      const safeZ = Math.max(0, z);
      const scale = FOV / (FOV + safeZ);
      return maxRadius * scale;
    };

    const getAngle = (i: number) => {
      return (i * (Math.PI * 2) / SIDES) + rotationOffsetRef.current;
    };

    // Draw Tunnel Lines
    ctx.strokeStyle = '#1c0f33';
    ctx.lineWidth = 1;
    for (let i = 0; i < SIDES; i++) {
      const angle = getAngle(i);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle) * maxRadius,
        centerY + Math.sin(angle) * maxRadius
      );
      ctx.stroke();
    }

    // Draw Obstacles (Back to Front)
    // Sort by Z descending
    const sortedObstacles = [...obstaclesRef.current].sort((a, b) => b.z - a.z);

    sortedObstacles.forEach(obs => {
      const radiusOuter = getProjectedRadius(obs.z);
      // Give the obstacle some thickness
      const radiusInner = getProjectedRadius(obs.z + 5); 

      ctx.fillStyle = obs.color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = obs.color;

      for (let i = 0; i < SIDES; i++) {
        if (obs.segments[i]) {
          const a1 = getAngle(i);
          const a2 = getAngle(i + 1);

          ctx.beginPath();
          ctx.moveTo(centerX + Math.cos(a1) * radiusInner, centerY + Math.sin(a1) * radiusInner);
          ctx.lineTo(centerX + Math.cos(a2) * radiusInner, centerY + Math.sin(a2) * radiusInner);
          ctx.lineTo(centerX + Math.cos(a2) * radiusOuter, centerY + Math.sin(a2) * radiusOuter);
          ctx.lineTo(centerX + Math.cos(a1) * radiusOuter, centerY + Math.sin(a1) * radiusOuter);
          ctx.closePath();
          ctx.fill();
        }
      }
    });
    ctx.shadowBlur = 0;

    // Highlight Player's Segment faintly
    const playerA1 = getAngle(playerPosRef.current);
    const playerA2 = getAngle(playerPosRef.current + 1);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + Math.cos(playerA1) * maxRadius, centerY + Math.sin(playerA1) * maxRadius);
    ctx.lineTo(centerX + Math.cos(playerA2) * maxRadius, centerY + Math.sin(playerA2) * maxRadius);
    ctx.closePath();
    ctx.fill();

    // Draw Player
    const playerRadius = maxRadius - 10;
    
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#fff';
    
    // Draw a prominent triangle at the outer rim of the player's segment
    const midAngle = (playerA1 + playerA2) / 2;
    ctx.beginPath();
    // Tip points towards center
    ctx.moveTo(
      centerX + Math.cos(midAngle) * (playerRadius - 30),
      centerY + Math.sin(midAngle) * (playerRadius - 30)
    );
    // Base rests on outer rim
    ctx.lineTo(
      centerX + Math.cos(playerA1 + 0.1) * playerRadius,
      centerY + Math.sin(playerA1 + 0.1) * playerRadius
    );
    ctx.lineTo(
      centerX + Math.cos(playerA2 - 0.1) * playerRadius,
      centerY + Math.sin(playerA2 - 0.1) * playerRadius
    );
    ctx.closePath();
    ctx.fill();
    
    // Draw a glowing core inside the player ship
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.beginPath();
    ctx.arc(
      centerX + Math.cos(midAngle) * (playerRadius - 15),
      centerY + Math.sin(midAngle) * (playerRadius - 15),
      5, 0, Math.PI * 2
    );
    ctx.fill();

    if (!hasStarted && !isGameOver) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '16px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 0;
      ctx.fillText('USE LEFT/RIGHT ARROWS', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
      ctx.fillText('TO SPIN', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
    }

  }, [isGameOver, hasStarted, handleGameOver]);

  useGameLoop(update, isGameOver);

  const restartGame = () => {
    playerPosRef.current = 0;
    obstaclesRef.current = [];
    distanceRef.current = 0;
    rotationOffsetRef.current = 0;
    setScore(0);
    setHasStarted(false);
    setIsGameOver(false);
    setIsNewBest(false);
  };

  return (
    <GameShell
      title="TUNNEL RUSH"
      score={score}
      bestScore={bestScore}
      color="neon-cyan"
      instructions={[
        'Use LEFT/RIGHT ARROWS to spin.',
        'Dodge the incoming barriers.',
        'The tunnel spins faster as you go.'
      ]}
    >
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block border-4 border-cyber-line shadow-[0_0_20px_rgba(0,229,255,0.15)] rounded-full bg-[#0a0514]"
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
