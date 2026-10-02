import { useState, useRef, useEffect, useCallback } from 'react';
import { GameShell } from '../../components/game/GameShell';
import { GameOverScreen } from '../../components/game/GameOverScreen';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useLocalArcadeData } from '../../hooks/useLocalArcadeData';
import { sounds } from '../../utils/audio';

const GAME_ID = 'cyber-maze';
const TILE = 24;
const COLS = 19;
const ROWS = 21;
const CANVAS_WIDTH = COLS * TILE;
const CANVAS_HEIGHT = ROWS * TILE;
const PLAYER_SPEED = 2.75; // tiles per second
const GHOST_SPEED = 2.12; // tiles per second; slower than the player
const POWER_DURATION = 7000;

type Direction = 'up' | 'down' | 'left' | 'right';
type TileKind = 'wall' | 'empty' | 'pellet' | 'power';

type Ghost = {
  id: number;
  x: number;
  y: number;
  spawnX: number;
  spawnY: number;
  direction: Direction;
  color: string;
  mode: 'chase' | 'ambush' | 'patrol' | 'random';
  frightened: boolean;
  decisionTimer: number;
};

type Player = {
  x: number;
  y: number;
  direction: Direction;
  nextDirection: Direction;
  mouth: number;
};

const DIRECTIONS: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const MAZE_TEMPLATE = [
  '###################',
  '#o.......#.......o#',
  '#.###.##.#.##.###.#',
  '#.................#',
  '#.###.#.###.#.###.#',
  '#.....#.....#.....#',
  '###.#.#####.#.#.###',
  '  #.#...#...#.#.#  ',
  '###.###.#.###.#.###',
  '#.......   .......#',
  '#.###.#GGG#.###.#',
  '#.....#GGG#.....#',
  '###.#.#####.#.###',
  '  #.#...#...#.#  ',
  '###.#.#####.#.###',
  '#.....#.....#.....#',
  '#.###.#.###.#.###.#',
  '#.................#',
  '#.###.##.#.##.###.#',
  '#o.......P.......o#',
  '###################',
];

function makeMaze(level: number): TileKind[][] {
  return MAZE_TEMPLATE.map((sourceRow, y) => {
    // Keep every row exactly COLS tiles wide; malformed rows caused edge gaps and collision glitches.
    const row = sourceRow.padEnd(COLS, '#').slice(0, COLS);
    return row.split('').map((char, x) => {
      if (char === '#') return 'wall';
      if (char === 'o') return 'power';
      if (char === 'P' || char === 'G' || char === ' ') return 'empty';
      // Preserve a playable central lane and slightly vary pellets per level.
      if (level > 1 && (x + y + level) % 17 === 0) return 'empty';
      return 'pellet';
    });
  });
}

function isWalkable(maze: TileKind[][], x: number, y: number) {
  // Coordinates refer to tile CENTERS (integers), not tile corners.
  // Round the footprint edges so a player centered in an open tile does not
  // incorrectly collide with walls in neighboring rows/columns.
  const radius = 0.28;
  const minX = Math.round(x - radius);
  const maxX = Math.round(x + radius);
  const minY = Math.round(y - radius);
  const maxY = Math.round(y + radius);

  for (let ty = minY; ty <= maxY; ty += 1) {
    for (let tx = minX; tx <= maxX; tx += 1) {
      if (ty < 0 || ty >= maze.length || tx < 0 || tx >= maze[ty].length) return false;
      if (maze[ty][tx] === 'wall') return false;
    }
  }
  return true;
}

function atTile(x: number, y: number) {
  // This must be smaller than one frame's movement. A larger tolerance makes
  // the update loop round the player back to the same tile center every frame.
  const TILE_CENTER_TOLERANCE = 0.01;
  return (
    Math.abs(x - Math.round(x)) < TILE_CENTER_TOLERANCE &&
    Math.abs(y - Math.round(y)) < TILE_CENTER_TOLERANCE
  );
}


function findPath(
  maze: TileKind[][],
  start: { x: number; y: number },
  target: { x: number; y: number },
): Direction[] {
  const sx = Math.round(start.x);
  const sy = Math.round(start.y);
  const tx = Math.round(target.x);
  const ty = Math.round(target.y);
  if (sx === tx && sy === ty) return [];

  const queue: Array<{ x: number; y: number; path: Direction[] }> = [
    { x: sx, y: sy, path: [] },
  ];
  const visited = new Set([`${sx},${sy}`]);
  const order: Direction[] = ['up', 'left', 'down', 'right'];

  while (queue.length) {
    const current = queue.shift()!;
    for (const direction of order) {
      const delta = DIRECTIONS[direction];
      const nx = current.x + delta.x;
      const ny = current.y + delta.y;
      const key = `${nx},${ny}`;
      if (visited.has(key) || !isWalkable(maze, nx, ny)) continue;
      const path = [...current.path, direction];
      if (nx === tx && ny === ty) return path;
      visited.add(key);
      queue.push({ x: nx, y: ny, path });
    }
  }
  return [];
}

function canMove(maze: TileKind[][], x: number, y: number, direction: Direction) {
  const delta = DIRECTIONS[direction];
  return isWalkable(maze, Math.round(x) + delta.x, Math.round(y) + delta.y);
}

function drawGlowCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  glow: number,
) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export default function CyberMaze() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { getPersonalBest, savePersonalBest, incrementGamesPlayed } = useLocalArcadeData();

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const bestScore = getPersonalBest(GAME_ID);
  const mazeRef = useRef<TileKind[][]>(makeMaze(1));
  const playerRef = useRef<Player>({
    x: 9, y: 19, direction: 'left', nextDirection: 'left', mouth: 0,
  });
  const ghostsRef = useRef<Ghost[]>([]);
  const powerTimerRef = useRef(0);
  const ghostComboRef = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const levelRef = useRef(1);
  const startedRef = useRef(false);
  const pausedRef = useRef(false);
  const gameOverRef = useRef(false);
  const gameOverHandledRef = useRef(false);
  const lastScoreSyncRef = useRef(0);
  const lastLifeLossRef = useRef(0);

  const resetActors = useCallback(() => {
    playerRef.current = {
      x: 9, y: 19, direction: 'left', nextDirection: 'left', mouth: 0,
    };
    ghostsRef.current = [
      { id: 0, x: 8, y: 10, spawnX: 8, spawnY: 10, direction: 'left', color: '#ff3b8d', mode: 'chase', frightened: false, decisionTimer: 0 },
      { id: 1, x: 9, y: 10, spawnX: 9, spawnY: 10, direction: 'up', color: '#00e5ff', mode: 'ambush', frightened: false, decisionTimer: 0 },
      { id: 2, x: 7, y: 10, spawnX: 7, spawnY: 10, direction: 'left', color: '#b66cff', mode: 'patrol', frightened: false, decisionTimer: 0 },
      { id: 3, x: 9, y: 11, spawnX: 9, spawnY: 11, direction: 'down', color: '#ff9d42', mode: 'random', frightened: false, decisionTimer: 0 },
    ];
    powerTimerRef.current = 0;
    ghostComboRef.current = 0;
  }, []);

  const resetMaze = useCallback((nextLevel: number) => {
    mazeRef.current = makeMaze(nextLevel);
    resetActors();
  }, [resetActors]);

  const finishGame = useCallback(() => {
    if (gameOverHandledRef.current) return;
    gameOverHandledRef.current = true;
    gameOverRef.current = true;
    setIsGameOver(true);
    sounds.gameOver();
    const finalScore = scoreRef.current;
    const isBest = finalScore > bestScore;
    setIsNewBest(isBest);
    if (isBest) savePersonalBest(GAME_ID, finalScore);
    incrementGamesPlayed(GAME_ID);
  }, [bestScore, savePersonalBest, incrementGamesPlayed]);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    livesRef.current = 3;
    levelRef.current = 1;
    startedRef.current = true;
    pausedRef.current = false;
    gameOverRef.current = false;
    gameOverHandledRef.current = false;
    lastLifeLossRef.current = 0;
    lastScoreSyncRef.current = 0;
    setScore(0);
    setLives(3);
    setLevel(1);
    setIsGameOver(false);
    setIsNewBest(false);
    setHasStarted(true);
    setIsPaused(false);
    resetMaze(1);
  }, [resetMaze]);

  const restartGame = useCallback(() => {
    startGame();
  }, [startGame]);

  const togglePause = useCallback(() => {
    if (!startedRef.current || gameOverRef.current) return;
    pausedRef.current = !pausedRef.current;
    setIsPaused(pausedRef.current);
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const keyMap: Record<string, Direction> = {
      ArrowUp: 'up', KeyW: 'up',
      ArrowDown: 'down', KeyS: 'down',
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right',
    };
    if (event.code === 'Space') {
      event.preventDefault();
      if (!startedRef.current) startGame();
      else togglePause();
      return;
    }
    if (event.code === 'Escape' || event.code === 'KeyP') {
      event.preventDefault();
      togglePause();
      return;
    }
    const direction = keyMap[event.code];
    if (direction) {
      event.preventDefault();
      if (!startedRef.current && !gameOverRef.current) startGame();
      playerRef.current.nextDirection = direction;
    }
  }, [startGame, togglePause]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const update = useCallback((deltaTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const maze = mazeRef.current;
    const player = playerRef.current;
    const ghosts = ghostsRef.current;
    // useGameLoop implementations differ: accept either milliseconds (e.g. 16) or seconds (e.g. 0.016).
    const rawDt = Number.isFinite(deltaTime) ? Math.max(0, deltaTime) : 0;
    const dtSeconds = Math.min(rawDt > 1 ? rawDt / 1000 : rawDt, 0.04);
    const dtMs = dtSeconds * 1000;

    if (startedRef.current && !pausedRef.current && !gameOverRef.current) {
      powerTimerRef.current = Math.max(0, powerTimerRef.current - dtMs);
      if (powerTimerRef.current === 0) {
        ghosts.forEach((ghost) => { ghost.frightened = false; });
      }

      // Player movement: buffered turns are applied at tile intersections.
      if (atTile(player.x, player.y)) {
        player.x = Math.round(player.x);
        player.y = Math.round(player.y);
        if (canMove(maze, player.x, player.y, player.nextDirection)) {
          player.direction = player.nextDirection;
        }
        if (!canMove(maze, player.x, player.y, player.direction)) {
          player.direction = player.nextDirection;
        }
      }

      const playerDelta = DIRECTIONS[player.direction];
      const nextX = player.x + playerDelta.x * PLAYER_SPEED * dtSeconds;
      const nextY = player.y + playerDelta.y * PLAYER_SPEED * dtSeconds;

      // Resolve axes independently so touching a wall doesn't freeze the player
      // or push them through a corner. Snap only the blocked axis to the corridor.
      if (playerDelta.x !== 0) {
        if (isWalkable(maze, nextX, player.y)) {
          player.x = nextX;
        } else {
          player.x = Math.round(player.x);
        }
      }
      if (playerDelta.y !== 0) {
        if (isWalkable(maze, player.x, nextY)) {
          player.y = nextY;
        } else {
          player.y = Math.round(player.y);
        }
      }
      player.mouth += dtMs * 0.012;

      // Collect items from the tile the player currently occupies.
      // Do not require an exact tile-center position: frame-based movement can
      // step over the tiny atTile() tolerance and leave pellets uncollected.
      {
        const tx = Math.round(player.x);
        const ty = Math.round(player.y);
        const tile = maze[ty]?.[tx];

        if (tile === 'pellet') {
          maze[ty][tx] = 'empty';
          scoreRef.current += 10;
          sounds.eat();
        } else if (tile === 'power') {
          maze[ty][tx] = 'empty';
          scoreRef.current += 50;
          powerTimerRef.current = POWER_DURATION;
          ghostComboRef.current = 0;
          ghosts.forEach((ghost) => { ghost.frightened = true; });
          sounds.levelUp();
        }
      }

      // Ghost movement and simple behavior-specific BFS targeting.
      ghosts.forEach((ghost) => {
        ghost.decisionTimer -= dtMs;
        if (atTile(ghost.x, ghost.y)) {
          ghost.x = Math.round(ghost.x);
          ghost.y = Math.round(ghost.y);
          const legal = (Object.keys(DIRECTIONS) as Direction[])
            .filter((direction) => canMove(maze, ghost.x, ghost.y, direction));
          const reverse: Record<Direction, Direction> = {
            up: 'down', down: 'up', left: 'right', right: 'left',
          };
          const nonReverse = legal.filter((direction) => direction !== reverse[ghost.direction]);
          const choices = nonReverse.length ? nonReverse : legal;
          let target = { x: Math.round(player.x), y: Math.round(player.y) };

          if (ghost.mode === 'ambush') {
            const delta = DIRECTIONS[player.direction];
            target = {
              x: Math.max(1, Math.min(COLS - 2, Math.round(player.x) + delta.x * 3)),
              y: Math.max(1, Math.min(ROWS - 2, Math.round(player.y) + delta.y * 3)),
            };
          } else if (ghost.mode === 'patrol') {
            target = Math.hypot(player.x - ghost.x, player.y - ghost.y) < 6
              ? { x: 1, y: 1 }
              : { x: COLS - 2, y: ROWS - 2 };
          } else if (ghost.mode === 'random' || ghost.frightened) {
            // Choose a legal direction, but do NOT return here:
            // the ghost still needs to execute its movement for this frame.
            if (choices.length) {
              ghost.direction = choices[Math.floor(Math.random() * choices.length)];
            }
          } else {
            const path = findPath(maze, { x: ghost.x, y: ghost.y }, target);
            if (path.length) {
              ghost.direction = path[0];
            } else if (choices.length) {
              // If the target is unreachable, keep moving through a legal exit.
              ghost.direction = choices[Math.floor(Math.random() * choices.length)];
            }
          }
        }

        const delta = DIRECTIONS[ghost.direction];
        const speed = ghost.frightened ? GHOST_SPEED * 0.68 : Math.min(1.42, GHOST_SPEED + (levelRef.current - 1) * 0.035);
        const gx = ghost.x + delta.x * speed * dtSeconds;
        const gy = ghost.y + delta.y * speed * dtSeconds;
        if (isWalkable(maze, gx, gy)) {
          ghost.x = gx;
          ghost.y = gy;
        } else {
          // Snap back to the last tile center and immediately select a legal
          // exit, preventing a blocked direction from being retried indefinitely.
          ghost.x = Math.round(ghost.x);
          ghost.y = Math.round(ghost.y);
          const legal = (Object.keys(DIRECTIONS) as Direction[])
            .filter((direction) => canMove(maze, ghost.x, ghost.y, direction));
          const reverse: Record<Direction, Direction> = {
            up: 'down', down: 'up', left: 'right', right: 'left',
          };
          const nonReverse = legal.filter((direction) => direction !== reverse[ghost.direction]);
          const choices = nonReverse.length ? nonReverse : legal;
          if (choices.length) {
            ghost.direction = choices[Math.floor(Math.random() * choices.length)];
          }
          ghost.decisionTimer = 0;
        }
      });

      // Player/ghost collisions.
      for (const ghost of ghosts) {
        if (Math.hypot(player.x - ghost.x, player.y - ghost.y) < 0.62) {
          if (ghost.frightened && powerTimerRef.current > 0) {
            scoreRef.current += 200 * (2 ** Math.min(ghostComboRef.current, 3));
            ghostComboRef.current += 1;
            ghost.x = ghost.spawnX;
            ghost.y = ghost.spawnY;
            ghost.frightened = false;
            sounds.levelUp();
          } else if (Date.now() - lastLifeLossRef.current > 1200) {
            lastLifeLossRef.current = Date.now();
            livesRef.current -= 1;
            setLives(livesRef.current);
            sounds.crash();
            if (livesRef.current <= 0) {
              finishGame();
              break;
            }
            resetActors();
            break;
          }
        }
      }

      // Finish a level once no collectible pellets remain.
      const pelletsRemain = maze.some((row) => row.some((tile) => tile === 'pellet' || tile === 'power'));
      if (!pelletsRemain && !gameOverRef.current) {
        levelRef.current += 1;
        setLevel(levelRef.current);
        scoreRef.current += 250;
        resetMaze(levelRef.current);
        sounds.levelUp();
      }

      if (scoreRef.current !== lastScoreSyncRef.current) {
        lastScoreSyncRef.current = scoreRef.current;
        setScore(scoreRef.current);
      }
    }

    // Background and maze.
    ctx.fillStyle = '#080713';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle scan lines.
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#5c42a8';
    for (let y = 0; y < CANVAS_HEIGHT; y += 4) {
      ctx.fillRect(0, y, CANVAS_WIDTH, 1);
    }
    ctx.restore();

    maze.forEach((row, y) => row.forEach((tile, x) => {
      const px = x * TILE;
      const py = y * TILE;
      if (tile === 'wall') {
        ctx.save();
        ctx.shadowColor = '#00d9ff';
        ctx.shadowBlur = 7;
        ctx.fillStyle = '#10274a';
        ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = '#00d9ff';
        ctx.lineWidth = 1.3;
        ctx.strokeRect(px + 3, py + 3, TILE - 6, TILE - 6);
        ctx.restore();
      } else if (tile === 'pellet') {
        drawGlowCircle(ctx, px + TILE / 2, py + TILE / 2, 2.1, '#a8faff', 5);
      } else if (tile === 'power') {
        const pulse = 4 + Math.sin(performance.now() / 140) * 1.2;
        drawGlowCircle(ctx, px + TILE / 2, py + TILE / 2, pulse, '#ff3bd4', 12);
      }
    }));

    // Player.
    const px = (player.x + 0.5) * TILE;
    const py = (player.y + 0.5) * TILE;
    const facingAngle: Record<Direction, number> = {
      right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2,
    };
    const mouthOpen = startedRef.current && !pausedRef.current
      ? Math.abs(Math.sin(player.mouth)) * 0.38
      : 0.12;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(facingAngle[player.direction]);
    ctx.shadowColor = '#ffe600';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffe600';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, TILE * 0.39, mouthOpen, Math.PI * 2 - mouthOpen);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Ghosts with rounded domes and scalloped bottoms.
    ghosts.forEach((ghost) => {
      const gx = (ghost.x + 0.5) * TILE;
      const gy = (ghost.y + 0.5) * TILE;
      const color = ghost.frightened && powerTimerRef.current > 0
        ? (powerTimerRef.current < 1800 && Math.floor(performance.now() / 180) % 2 ? '#ffffff' : '#3867ff')
        : ghost.color;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(gx, gy - 2, TILE * 0.34, Math.PI, 0);
      ctx.lineTo(gx + TILE * 0.34, gy + TILE * 0.32);
      ctx.lineTo(gx + TILE * 0.12, gy + TILE * 0.23);
      ctx.lineTo(gx, gy + TILE * 0.32);
      ctx.lineTo(gx - TILE * 0.12, gy + TILE * 0.23);
      ctx.lineTo(gx - TILE * 0.34, gy + TILE * 0.32);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(gx - 4, gy - 2, 3.2, 4.1, 0, 0, Math.PI * 2);
      ctx.ellipse(gx + 4, gy - 2, 3.2, 4.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#101020';
      ctx.beginPath();
      ctx.arc(gx - 3.5, gy - 1, 1.5, 0, Math.PI * 2);
      ctx.arc(gx + 4.5, gy - 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    if (!startedRef.current) {
      ctx.fillStyle = 'rgba(4, 3, 15, 0.84)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.textAlign = 'center';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 24px "JetBrains Mono", monospace';
      ctx.fillText('CYBER MAZE', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 28);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText('COLLECT THE DATA ORBS', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 4);
      ctx.fillText('AVOID GHOSTS • POWER UP TO HUNT', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 23);
      ctx.fillStyle = '#ffe600';
      ctx.fillText('PRESS SPACE OR ARROW KEYS', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 52);
    } else if (pausedRef.current && !gameOverRef.current) {
      ctx.fillStyle = 'rgba(4, 3, 15, 0.72)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 24px "JetBrains Mono", monospace';
      ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillText('PRESS P OR SPACE TO RESUME', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 28);
    }
  }, [finishGame, resetActors, resetMaze]);

  useGameLoop(update, isGameOver);

  return (
    <GameShell
      title="CYBER MAZE"
      score={score}
      bestScore={bestScore}
      color="neon-cyan"
      instructions={[
        'Use ARROW KEYS or WASD to navigate the maze.',
        'Collect all data orbs to advance to the next level.',
        'Power orbs let you eat ghosts temporarily.',
        'Avoid ghosts when they are not frightened. You have 3 lives.',
        'Press SPACE or P to pause or resume.',
      ]}
    >
      <div className="relative mx-auto w-full max-w-114 overflow-hidden rounded-lg border border-cyan-400/30 bg-[#080713] shadow-[0_0_30px_rgba(0,229,255,0.12)]">
        <div className="flex items-center justify-between border-b border-cyan-400/20 px-3 py-2 font-mono text-xs">
          <span className="text-cyan-300">LEVEL {level}</span>
          <span className="text-yellow-300">LIVES {'♥ '.repeat(Math.max(0, lives))}</span>
          <span className="text-pink-300">
            {powerTimerRef.current > 0 ? 'POWER ACTIVE' : 'GHOST ALERT'}
          </span>
        </div>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block h-auto w-full touch-none"
          aria-label="Cyber Maze game. Use arrow keys or WASD to move."
        />
        {isGameOver && (
          <GameOverScreen
            score={score}
            isNewBest={isNewBest}
            onRestart={restartGame}
            color="neon-cyan"
          />
        )}
        {isPaused && !isGameOver && (
          <button
            type="button"
            onClick={togglePause}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded border border-cyan-300/50 bg-slate-950/90 px-4 py-2 font-mono text-xs text-cyan-200 hover:bg-cyan-950"
          >
            RESUME
          </button>
        )}
        {!hasStarted && !isGameOver && (
          <button
            type="button"
            onClick={startGame}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded border border-cyan-300/50 bg-slate-950/90 px-4 py-2 font-mono text-xs text-cyan-200 hover:bg-cyan-950"
          >
            START GAME
          </button>
        )}
      </div>
    </GameShell>
  );
}
  