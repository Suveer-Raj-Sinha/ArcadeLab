import { useCallback, useEffect, useRef, useState } from 'react';
import { GameShell } from '../../components/game/GameShell';
import { GameOverScreen } from '../../components/game/GameOverScreen';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useLocalArcadeData } from '../../hooks/useLocalArcadeData';
import { sounds } from '../../utils/audio';

const GAME_ID = 'neon-labyrinth';
const TILE = 30;
const START_COLS = 10;
const START_ROWS = 5;
const MAX_COLS = 16;
const MAX_ROWS = 9;
const AUTO_MOVE_INTERVAL_MS = 155;

type Cell = 'wall' | 'floor' | 'fragment' | 'exit';
type Point = { x: number; y: number };
type MazeData = {
  grid: Cell[][];
  width: number;
  height: number;
  start: Point;
  exit: Point;
  fragmentsTotal: number;
};

const DIRECTIONS: Record<string, Point> = {
  ArrowUp: { x: 0, y: -1 },
  w: { x: 0, y: -1 },
  W: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  s: { x: 0, y: 1 },
  S: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  a: { x: -1, y: 0 },
  A: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  d: { x: 1, y: 0 },
  D: { x: 1, y: 0 },
};

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Randomized depth-first search carves a perfect maze: every cell is reachable,
 * and there is exactly one simple route between any two cells.
 */
function generateMaze(level: number): MazeData {
  // A wide, short maze fits the game panel without vertical scrolling.
  const cols = Math.min(MAX_COLS, START_COLS + Math.floor((level - 1) / 3) * 2);
  const rows = Math.min(MAX_ROWS, START_ROWS + Math.floor((level - 1) / 4));
  const width = cols * 2 + 1;
  const height = rows * 2 + 1;
  const grid: Cell[][] = Array.from({ length: height }, () => Array<Cell>(width).fill('wall'));
  const visited = Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));
  const stack: Point[] = [{ x: 0, y: 0 }];
  const cellDirections = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];

  visited[0][0] = true;
  grid[1][1] = 'floor';

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const choices = shuffle(cellDirections).filter((direction) => {
      const nx = current.x + direction.x;
      const ny = current.y + direction.y;
      return nx >= 0 && ny >= 0 && nx < cols && ny < rows && !visited[ny][nx];
    });

    if (choices.length === 0) {
      stack.pop();
      continue;
    }

    const direction = choices[0];
    const nx = current.x + direction.x;
    const ny = current.y + direction.y;
    const gx = current.x * 2 + 1;
    const gy = current.y * 2 + 1;
    grid[gy + direction.y][gx + direction.x] = 'floor';
    grid[ny * 2 + 1][nx * 2 + 1] = 'floor';
    visited[ny][nx] = true;
    stack.push({ x: nx, y: ny });
  }

  const start = { x: 1, y: 1 };
  const exit = { x: width - 2, y: height - 2 };
  const reachableCells: Point[] = [];
  for (let y = 1; y < height; y += 2) {
    for (let x = 1; x < width; x += 2) {
      if (x === start.x && y === start.y) continue;
      if (x === exit.x && y === exit.y) continue;
      reachableCells.push({ x, y });
    }
  }

  // Put the exit in a reachable dead-end-ish far corner and collectibles only
  // on carved cell centers, so they can never spawn inside walls.
  grid[exit.y][exit.x] = 'exit';
  const fragmentsTotal = Math.min(5 + Math.floor((level - 1) / 2), 12);
  const fragmentSpots = shuffle(reachableCells).slice(0, Math.min(fragmentsTotal, reachableCells.length));
  for (const point of fragmentSpots) grid[point.y][point.x] = 'fragment';

  return { grid, width, height, start, exit, fragmentsTotal: fragmentSpots.length };
}

export default function NeonLabyrinth() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mazeRef = useRef<MazeData>(generateMaze(1));
  const playerRef = useRef<Point>({ ...mazeRef.current.start });
  const lastMoveRef = useRef(0);
  const directionRef = useRef<Point>({ x: 0, y: 0 });
  const queuedDirectionRef = useRef<Point | null>(null);
  const startedRef = useRef(false);
  const gameOverRef = useRef(false);
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const fragmentsRef = useRef(0);
  const timeRef = useRef(0);
  const bestAtStartRef = useRef(0);

  const { getPersonalBest, savePersonalBest, incrementGamesPlayed } = useLocalArcadeData();
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [fragments, setFragments] = useState(0);
  const [fragmentsTotal, setFragmentsTotal] = useState(mazeRef.current.fragmentsTotal);
  const [elapsed, setElapsed] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [notice, setNotice] = useState('FIND THE FRAGMENTS. REACH THE EXIT.');

  const bestScore = getPersonalBest(GAME_ID);
  bestAtStartRef.current = bestScore;

  const syncMaze = useCallback((nextLevel: number) => {
    const nextMaze = generateMaze(nextLevel);
    mazeRef.current = nextMaze;
    playerRef.current = { ...nextMaze.start };
    directionRef.current = { x: 0, y: 0 };
    queuedDirectionRef.current = null;
    lastMoveRef.current = 0;
    fragmentsRef.current = 0;
    setFragments(0);
    setFragmentsTotal(nextMaze.fragmentsTotal);
    setNotice(`LEVEL ${nextLevel}: NEW MAZE GENERATED`);
  }, []);

  const finishGame = useCallback(() => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    startedRef.current = false;
    setIsGameOver(true);
    setHasStarted(false);
    sounds.gameOver();
    const finalScore = scoreRef.current;
    const isBest = finalScore > bestAtStartRef.current;
    setIsNewBest(isBest);
    if (isBest) savePersonalBest(GAME_ID, finalScore);
    incrementGamesPlayed(GAME_ID);
  }, [incrementGamesPlayed, savePersonalBest]);

  const restartGame = useCallback(() => {
    const freshMaze = generateMaze(1);
    mazeRef.current = freshMaze;
    playerRef.current = { ...freshMaze.start };
    lastMoveRef.current = 0;
    directionRef.current = { x: 0, y: 0 };
    queuedDirectionRef.current = null;
    startedRef.current = false;
    gameOverRef.current = false;
    scoreRef.current = 0;
    levelRef.current = 1;
    fragmentsRef.current = 0;
    timeRef.current = 0;
    setScore(0);
    setLevel(1);
    setFragments(0);
    setFragmentsTotal(freshMaze.fragmentsTotal);
    setElapsed(0);
    setIsGameOver(false);
    setIsNewBest(false);
    setHasStarted(false);
    setNotice('FRESH WIDE MAZE GENERATED');
  }, []);

  const startGame = useCallback(() => {
    if (gameOverRef.current) return;
    startedRef.current = true;
    setHasStarted(true);
    setNotice('AUTO-MOVE ON • USE ARROWS OR WASD TO TURN');
  }, []);

  const movePlayer = useCallback((direction: Point) => {
    if (!startedRef.current || gameOverRef.current) return;

    const maze = mazeRef.current;
    const next = { x: playerRef.current.x + direction.x, y: playerRef.current.y + direction.y };
    if (next.y < 0 || next.y >= maze.height || next.x < 0 || next.x >= maze.width) return;
    const tile = maze.grid[next.y][next.x];
    if (tile === 'wall') return;

    playerRef.current = next;
    if (tile === 'fragment') {
      maze.grid[next.y][next.x] = 'floor';
      fragmentsRef.current += 1;
      scoreRef.current += 10;
      setFragments(fragmentsRef.current);
      setScore(scoreRef.current);
      setNotice('DATA FRAGMENT COLLECTED +10');
      sounds.eat();
    } else if (tile === 'exit') {
      if (fragmentsRef.current < maze.fragmentsTotal) {
        setNotice(`EXIT LOCKED • ${maze.fragmentsTotal - fragmentsRef.current} FRAGMENTS LEFT`);
        // Keep the player just outside the exit until enough fragments are collected.
        playerRef.current = { x: next.x - direction.x, y: next.y - direction.y };
        return;
      }

      scoreRef.current += 50 + Math.max(0, 100 - Math.floor(timeRef.current / 1000));
      setScore(scoreRef.current);
      sounds.levelUp();
      const nextLevel = levelRef.current + 1;
      levelRef.current = nextLevel;
      setLevel(nextLevel);
      syncMaze(nextLevel);
      lastMoveRef.current = 0;
    }
  }, [syncMaze]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = DIRECTIONS[event.key];
      if (direction) {
        event.preventDefault();
        if (!startedRef.current && !gameOverRef.current) startGame();
        queuedDirectionRef.current = direction;
        if (directionRef.current.x === 0 && directionRef.current.y === 0) directionRef.current = direction;
        return;
      }
      if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        restartGame();
      } else if (event.code === 'Space') {
        event.preventDefault();
        if (!startedRef.current) startGame();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [restartGame, startGame]);

  const update = useCallback((deltaTime: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // ArcadeLab's loop may supply milliseconds; normalize and cap long frames.
    const raw = Number.isFinite(deltaTime) ? Math.max(0, deltaTime) : 0;
    const dt = raw > 1 ? Math.min(raw, 100) : Math.min(raw * 1000, 100);
    if (startedRef.current && !gameOverRef.current) {
      timeRef.current += dt;
      const seconds = Math.floor(timeRef.current / 1000);
      setElapsed((previous) => previous === seconds ? previous : seconds);

      // Auto-move one tile at a steady cadence. Turns are buffered until the
      // requested direction is walkable, so movement feels continuous and responsive.
      lastMoveRef.current += dt;
      if (lastMoveRef.current >= AUTO_MOVE_INTERVAL_MS) {
        lastMoveRef.current %= AUTO_MOVE_INTERVAL_MS;
        if (queuedDirectionRef.current) {
          const q = queuedDirectionRef.current;
          const target = { x: playerRef.current.x + q.x, y: playerRef.current.y + q.y };
          const m = mazeRef.current;
          if (target.y >= 0 && target.y < m.height && target.x >= 0 && target.x < m.width && m.grid[target.y][target.x] !== 'wall') {
            directionRef.current = q;
            queuedDirectionRef.current = null;
          }
        }
        const dir = directionRef.current;
        if (dir.x !== 0 || dir.y !== 0) movePlayer(dir);
      }
    }

    const maze = mazeRef.current;
    const width = maze.width * TILE;
    const height = maze.height * TILE;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.fillStyle = '#050511';
    ctx.fillRect(0, 0, width, height);

    // Background grid.
    ctx.strokeStyle = 'rgba(35, 78, 125, 0.17)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += TILE) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y <= height; y += TILE) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // Walls, with a restrained glow so paths remain easy to read.
    for (let y = 0; y < maze.height; y += 1) {
      for (let x = 0; x < maze.width; x += 1) {
        const tile = maze.grid[y][x];
        const px = x * TILE;
        const py = y * TILE;
        if (tile === 'wall') {
          ctx.shadowColor = '#00d9ff';
          ctx.shadowBlur = 7;
          ctx.fillStyle = '#08213b';
          ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#00cfff';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 2.5, py + 2.5, TILE - 5, TILE - 5);
        } else if (tile === 'fragment') {
          ctx.save();
          ctx.translate(px + TILE / 2, py + TILE / 2);
          ctx.rotate(Math.PI / 4);
          ctx.shadowColor = '#ff39e6';
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#ff55ec';
          ctx.fillRect(-5, -5, 10, 10);
          ctx.restore();
        } else if (tile === 'exit') {
          const unlocked = fragmentsRef.current >= maze.fragmentsTotal;
          ctx.shadowColor = unlocked ? '#00ffae' : '#7e45ff';
          ctx.shadowBlur = 14;
          ctx.strokeStyle = unlocked ? '#00ffae' : '#9b65ff';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 5, py + 5, TILE - 10, TILE - 10);
          ctx.shadowBlur = 0;
          ctx.fillStyle = unlocked ? '#00ffae' : '#7546bc';
          ctx.font = 'bold 13px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(unlocked ? '↗' : '×', px + TILE / 2, py + TILE / 2);
        }
      }
    }

    // Player glow.
    const player = playerRef.current;
    const cx = player.x * TILE + TILE / 2;
    const cy = player.y * TILE + TILE / 2;
    ctx.beginPath();
    ctx.shadowColor = '#00eaff';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#e8fdff';
    ctx.arc(cx, cy, TILE * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.strokeStyle = '#00eaff';
    ctx.lineWidth = 2;
    ctx.arc(cx, cy, TILE * 0.38, 0, Math.PI * 2);
    ctx.stroke();

    // HUD overlay.
    if (!startedRef.current && !gameOverRef.current) {
      ctx.fillStyle = 'rgba(3, 5, 18, 0.82)';
      ctx.fillRect(0, 0, width, height);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#00eaff';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#00eaff';
      ctx.font = 'bold 24px monospace';
      ctx.fillText('NEON LABYRINTH', width / 2, height / 2 - 28);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#f4f7ff';
      ctx.font = '12px monospace';
      ctx.fillText('RANDOM WIDE MAZE • EVERY RUN', width / 2, height / 2 + 3);
      ctx.fillStyle = '#ff55ec';
      ctx.fillText('COLLECT FRAGMENTS • FIND THE EXIT', width / 2, height / 2 + 25);
      ctx.fillStyle = '#00ffae';
      ctx.fillText('PRESS AN ARROW KEY TO START & STEER', width / 2, height / 2 + 49);
    }
  }, [movePlayer]);

  useGameLoop(update, false);

  return (
    <GameShell
      title="NEON LABYRINTH"
      score={score}
      bestScore={bestScore}
      color="neon-cyan"
      instructions={[
        'Auto-move is enabled: use ARROW KEYS or WASD to steer through corridors.',
        'Every run starts with a fresh, wide 10×5 maze.',
        'Collect every data fragment to unlock the exit.',
        'Each exit creates a new maze; the maze gradually grows wider and taller.',
        'Press R at any time to restart with a new random maze.',
      ]}
    >
      <div className="mx-auto w-full max-w-[760px] overflow-hidden rounded-xl border border-cyan-400/40 bg-[#050511] shadow-[0_0_32px_rgba(0,229,255,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-400/20 px-3 py-2 font-mono text-xs">
          <span className="text-cyan-300">LEVEL {level}</span>
          <span className="text-pink-300">FRAGMENTS {fragments}/{fragmentsTotal}</span>
          <span className="text-violet-300">TIME {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</span>
        </div>
        <canvas
          ref={canvasRef}
          width={mazeRef.current.width * TILE}
          height={mazeRef.current.height * TILE}
          className="block h-auto w-full touch-none"
          aria-label="Neon Labyrinth. Use arrow keys or WASD to explore the randomly generated maze."
        />
        <div className="flex items-center justify-between gap-3 border-t border-cyan-400/20 px-3 py-2 font-mono text-[10px] sm:text-xs">
          <span className="truncate text-cyan-200">{notice}</span>
          <button
            type="button"
            onClick={restartGame}
            className="shrink-0 rounded border border-violet-400/50 px-3 py-1.5 text-violet-200 transition hover:bg-violet-950/70"
          >
            NEW MAZE [R]
          </button>
        </div>
        {!hasStarted && !isGameOver && (
          <button
            type="button"
            onClick={startGame}
            className="w-full border-t border-cyan-400/20 bg-cyan-950/30 py-2 font-mono text-xs text-cyan-200 transition hover:bg-cyan-900/50"
          >
            START EXPLORING
          </button>
        )}
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
