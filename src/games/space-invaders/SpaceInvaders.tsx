import { useState, useRef, useEffect, useCallback } from 'react';
import { GameShell } from '../../components/game/GameShell';
import { GameOverScreen } from '../../components/game/GameOverScreen';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useLocalArcadeData } from '../../hooks/useLocalArcadeData';
import { sounds } from '../../utils/audio';

const GAME_ID = 'space-invaders';
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 20;
const PLAYER_SPEED = 0.3; // px per ms
const BULLET_SPEED = 0.6;
const ENEMY_BULLET_SPEED = 0.3;
const BULLET_WIDTH = 4;
const BULLET_HEIGHT = 15;
const FIRE_COOLDOWN = 500; // ms between shots

const ENEMY_ROWS = 4;
const ENEMY_COLS = 8;
const ENEMY_WIDTH = 45;
const ENEMY_HEIGHT = 30;
const ENEMY_PADDING = 15;

type Point = { x: number; y: number };
type Enemy = { x: number; y: number; active: boolean; type: number };

function createEnemies(): Enemy[] {
  const enemies: Enemy[] = [];
  for (let r = 0; r < ENEMY_ROWS; r++) {
    for (let c = 0; c < ENEMY_COLS; c++) {
      enemies.push({
        x: 50 + c * (ENEMY_WIDTH + ENEMY_PADDING),
        y: 50 + r * (ENEMY_HEIGHT + ENEMY_PADDING),
        active: true,
        type: r % 2,
      });
    }
  }
  return enemies;
}

export default function SpaceInvaders() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useKeyboard();
  const { getPersonalBest, savePersonalBest, incrementGamesPlayed } = useLocalArcadeData();

  const [gameState, setGameState] = useState({
    playerX: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
    bullets: [] as Point[],
    enemyBullets: [] as Point[],
    enemies: createEnemies(),
    enemyDirection: 1,
    score: 0,
    lives: 3,
    isGameOver: false,
    level: 1,
  });

  const bestScore = getPersonalBest(GAME_ID);
  const [isNewBest, setIsNewBest] = useState(false);
  const lastShotTimeRef = useRef(0);
  const lastEnemyMoveTimeRef = useRef(0);
  const lastEnemyShotTimeRef = useRef(0);

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
      let newPlayerX = prev.playerX;
      
      // Player Movement — speed increases with level
      const playerSpeed = PLAYER_SPEED + prev.level * 0.02;
      if (keys.current['ArrowLeft']) newPlayerX -= playerSpeed * deltaTime;
      if (keys.current['ArrowRight']) newPlayerX += playerSpeed * deltaTime;
      newPlayerX = Math.max(0, Math.min(CANVAS_WIDTH - PLAYER_WIDTH, newPlayerX));

      // Player Auto-Shooting — one bullet at a time
      let newBullets = [...prev.bullets];
      lastShotTimeRef.current += deltaTime;
      const fireCooldown = Math.max(200, FIRE_COOLDOWN - prev.level * 30); // Gets faster each wave
      if (newBullets.length === 0 && lastShotTimeRef.current > fireCooldown) {
        sounds.shoot();
        newBullets.push({ x: newPlayerX + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2, y: CANVAS_HEIGHT - PLAYER_HEIGHT - 30 });
        lastShotTimeRef.current = 0;
      }

      // Update Bullets — speed increases with level
      const bulletSpeed = BULLET_SPEED + prev.level * 0.05;
      newBullets = newBullets.map(b => ({ ...b, y: b.y - bulletSpeed * deltaTime })).filter(b => b.y > -BULLET_HEIGHT);

      const enemyBulletSpeed = ENEMY_BULLET_SPEED + prev.level * 0.03;
      let newEnemyBullets = prev.enemyBullets.map(b => ({ ...b, y: b.y + enemyBulletSpeed * deltaTime })).filter(b => b.y < CANVAS_HEIGHT);

      let newEnemies = [...prev.enemies];
      let newScore = prev.score;
      let newLives = prev.lives;
      let newEnemyDirection = prev.enemyDirection;
      let newLevel = prev.level;

      // Enemy Movement — gets faster with fewer enemies and higher levels
      lastEnemyMoveTimeRef.current += deltaTime;
      const activeCount = newEnemies.filter(e => e.active).length;
      const totalCount = ENEMY_ROWS * ENEMY_COLS;
      const ratioAlive = activeCount / totalCount;
      const baseSpeed = Math.max(80, 800 - (prev.level * 80));
      const currentEnemySpeed = baseSpeed * ratioAlive; // Faster as fewer enemies remain
      
      if (lastEnemyMoveTimeRef.current > currentEnemySpeed) {
        lastEnemyMoveTimeRef.current = 0;
        let hitEdge = false;
        
        const activeEnemies = newEnemies.filter(e => e.active);
        
        for (const e of activeEnemies) {
          if ((newEnemyDirection === 1 && e.x + ENEMY_WIDTH >= CANVAS_WIDTH - 20) || 
              (newEnemyDirection === -1 && e.x <= 20)) {
            hitEdge = true;
            break;
          }
        }

        if (hitEdge) {
          newEnemyDirection *= -1;
          newEnemies = newEnemies.map(e => ({ ...e, y: e.y + 20 }));
        } else {
          const stepSize = 12 + prev.level * 2; // Larger steps at higher levels
          newEnemies = newEnemies.map(e => ({ ...e, x: e.x + (stepSize * newEnemyDirection) }));
        }
        
        if (activeEnemies.some(e => e.y + ENEMY_HEIGHT >= CANVAS_HEIGHT - PLAYER_HEIGHT - 20)) {
          handleGameOver(newScore);
          return prev;
        }
      }

      // Enemy Shooting — rate increases with level
      lastEnemyShotTimeRef.current += deltaTime;
      const enemyFireRate = Math.max(400, 2000 - prev.level * 200);
      if (lastEnemyShotTimeRef.current > enemyFireRate) {
        lastEnemyShotTimeRef.current = 0;
        const activeEnemies = newEnemies.filter(e => e.active);
        if (activeEnemies.length > 0) {
          const shooters = activeEnemies.filter(e => {
            return !activeEnemies.some(other => other.active && Math.abs(other.x - e.x) < 5 && other.y > e.y);
          });
          if (shooters.length > 0) {
            const shooter = shooters[Math.floor(Math.random() * shooters.length)];
            sounds.enemyShoot();
            newEnemyBullets.push({ x: shooter.x + ENEMY_WIDTH / 2, y: shooter.y + ENEMY_HEIGHT });
          }
        }
      }

      // Collisions: Player Bullet hits Enemy
      for (let i = newBullets.length - 1; i >= 0; i--) {
        const b = newBullets[i];
        let hit = false;
        for (let j = 0; j < newEnemies.length; j++) {
          const e = newEnemies[j];
          if (e.active && b.x > e.x && b.x < e.x + ENEMY_WIDTH && b.y > e.y && b.y < e.y + ENEMY_HEIGHT) {
            e.active = false;
            hit = true;
            sounds.invaderHit();
            newScore += e.type === 0 ? 20 : 10;
            break;
          }
        }
        if (hit) {
          newBullets.splice(i, 1);
        }
      }

      // Collisions: Enemy Bullet hits Player
      for (let i = newEnemyBullets.length - 1; i >= 0; i--) {
        const b = newEnemyBullets[i];
        if (
          b.x + BULLET_WIDTH > newPlayerX &&
          b.x < newPlayerX + PLAYER_WIDTH &&
          b.y + BULLET_HEIGHT > CANVAS_HEIGHT - PLAYER_HEIGHT - 20 &&
          b.y < CANVAS_HEIGHT - 20
        ) {
          newEnemyBullets.splice(i, 1);
          sounds.playerHit();
          newLives -= 1;
          if (newLives <= 0) {
            handleGameOver(newScore);
            return prev;
          }
        }
      }

      // Next Level Condition
      if (newEnemies.every(e => !e.active)) {
        sounds.levelUp();
        newEnemies = createEnemies();
        newLevel++;
        newBullets = [];
        newEnemyBullets = [];
      }

      return {
        ...prev,
        playerX: newPlayerX,
        bullets: newBullets,
        enemyBullets: newEnemyBullets,
        enemies: newEnemies,
        enemyDirection: newEnemyDirection,
        score: newScore,
        lives: newLives,
        level: newLevel,
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

    ctx.fillStyle = '#0a0514';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Player
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    ctx.fillRect(gameState.playerX, CANVAS_HEIGHT - PLAYER_HEIGHT - 20, PLAYER_WIDTH, PLAYER_HEIGHT);
    ctx.fillRect(gameState.playerX + PLAYER_WIDTH/2 - 5, CANVAS_HEIGHT - PLAYER_HEIGHT - 30, 10, 10);

    // Draw Enemies
    gameState.enemies.forEach(e => {
      if (e.active) {
        ctx.fillStyle = e.type === 0 ? '#ff007f' : '#d946ef';
        ctx.shadowColor = e.type === 0 ? '#ff007f' : '#d946ef';
        ctx.shadowBlur = 10;
        ctx.fillRect(e.x, e.y, ENEMY_WIDTH, ENEMY_HEIGHT);
        ctx.fillStyle = '#0a0514';
        ctx.shadowBlur = 0;
        ctx.fillRect(e.x + 8, e.y + 8, 6, 6);
        ctx.fillRect(e.x + ENEMY_WIDTH - 14, e.y + 8, 6, 6);
      }
    });

    // Draw Bullets
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    gameState.bullets.forEach(b => {
      ctx.fillRect(b.x, b.y, BULLET_WIDTH, BULLET_HEIGHT);
    });

    // Draw Enemy Bullets
    ctx.fillStyle = '#ff007f';
    ctx.shadowColor = '#ff007f';
    gameState.enemyBullets.forEach(b => {
      ctx.fillRect(b.x, b.y, BULLET_WIDTH, BULLET_HEIGHT);
    });

    // Draw Lives & Level
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '16px "JetBrains Mono"';
    ctx.textAlign = 'left';
    ctx.shadowBlur = 0;
    ctx.fillText(`LIVES: ${'♥'.repeat(gameState.lives)}`, 20, 30);
    ctx.textAlign = 'right';
    ctx.fillText(`WAVE: ${gameState.level}`, CANVAS_WIDTH - 20, 30);

  }, [gameState]);

  const restartGame = () => {
    setIsNewBest(false);
    lastShotTimeRef.current = 0;
    lastEnemyMoveTimeRef.current = 0;
    lastEnemyShotTimeRef.current = 0;
    setGameState({
      playerX: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
      bullets: [],
      enemyBullets: [],
      enemies: createEnemies(),
      enemyDirection: 1,
      score: 0,
      lives: 3,
      isGameOver: false,
      level: 1,
    });
  };

  return (
    <GameShell
      title="SPACE INVADERS"
      score={gameState.score}
      bestScore={bestScore}
      color="neon-pink"
      instructions={[
        'Use ARROW LEFT and ARROW RIGHT to move.',
        'Your ship fires one shot at a time automatically.',
        'Destroy all invaders before they reach the bottom.',
        'Everything speeds up as you clear waves.'
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
            color="neon-pink"
          />
        )}
      </div>
    </GameShell>
  );
}
