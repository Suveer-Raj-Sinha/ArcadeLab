import { useState, useEffect, useCallback, useRef } from 'react';
import { GameShell } from '../../components/game/GameShell';
import { GameOverScreen } from '../../components/game/GameOverScreen';
import { useLocalArcadeData } from '../../hooks/useLocalArcadeData';
import { sounds } from '../../utils/audio';

const GAME_ID = '2048';
const GRID_SIZE = 4;
const CELL_SIZE = 85;
const CELL_GAP = 12;

let tileIdCounter = 0;
function nextTileId() { return ++tileIdCounter; }

type Tile = {
  id: number;
  value: number;
  row: number;
  col: number;
  mergedFrom?: boolean;  // Was this tile just created from a merge?
  isNew?: boolean;       // Was this tile just spawned?
};

type Grid = (Tile | null)[][];

function createEmptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
}

function getEmptyCells(grid: Grid): [number, number][] {
  const cells: [number, number][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid[r][c]) cells.push([r, c]);
    }
  }
  return cells;
}

function addRandomTile(grid: Grid): Grid {
  const newGrid = grid.map(row => [...row]);
  const empty = getEmptyCells(newGrid);
  if (empty.length === 0) return newGrid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  newGrid[r][c] = {
    id: nextTileId(),
    value: Math.random() < 0.9 ? 2 : 4,
    row: r,
    col: c,
    isNew: true,
  };
  return newGrid;
}

function initGrid(): Grid {
  let grid = createEmptyGrid();
  grid = addRandomTile(grid);
  grid = addRandomTile(grid);
  return grid;
}

function cloneGrid(grid: Grid): Grid {
  return grid.map(row => row.map(tile => tile ? { ...tile } : null));
}

function moveGrid(grid: Grid, direction: 'up' | 'down' | 'left' | 'right'): { newGrid: Grid; score: number; moved: boolean } {
  let totalScore = 0;
  let anyMoved = false;
  const newGrid = createEmptyGrid();

  // Clear animation flags from all existing tiles
  const allTiles: Tile[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c]) {
        allTiles.push({ ...grid[r][c]!, mergedFrom: false, isNew: false });
      }
    }
  }

  // Process each line (row or column) depending on direction
  const isVertical = direction === 'up' || direction === 'down';
  const isReverse = direction === 'down' || direction === 'right';

  for (let line = 0; line < GRID_SIZE; line++) {
    // Extract tiles from this row/column
    const tiles: Tile[] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      const r = isVertical ? i : line;
      const c = isVertical ? line : i;
      if (grid[r][c]) tiles.push({ ...grid[r][c]!, mergedFrom: false, isNew: false });
    }

    if (isReverse) tiles.reverse();

    // Slide and merge
    const merged: Tile[] = [];
    let skip = false;
    for (let i = 0; i < tiles.length; i++) {
      if (skip) { skip = false; continue; }
      if (i < tiles.length - 1 && tiles[i].value === tiles[i + 1].value) {
        // Merge
        const newValue = tiles[i].value * 2;
        totalScore += newValue;
        merged.push({
          id: nextTileId(),
          value: newValue,
          row: 0, col: 0, // Will be set below
          mergedFrom: true,
        });
        skip = true;
      } else {
        merged.push({ ...tiles[i] });
      }
    }

    if (isReverse) merged.reverse();

    // Place back into grid
    // Pad to GRID_SIZE
    const padded: (Tile | null)[] = Array(GRID_SIZE).fill(null);
    if (isReverse) {
      for (let i = 0; i < merged.length; i++) {
        padded[GRID_SIZE - 1 - i] = merged[merged.length - 1 - i];
      }
    } else {
      for (let i = 0; i < merged.length; i++) {
        padded[i] = merged[i];
      }
    }

    for (let i = 0; i < GRID_SIZE; i++) {
      const r = isVertical ? i : line;
      const c = isVertical ? line : i;
      if (padded[i]) {
        padded[i]!.row = r;
        padded[i]!.col = c;
      }
      newGrid[r][c] = padded[i];
    }
  }

  // Check if anything moved
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const oldVal = grid[r][c]?.value ?? 0;
      const newVal = newGrid[r][c]?.value ?? 0;
      if (oldVal !== newVal) anyMoved = true;
    }
  }

  return { newGrid, score: totalScore, moved: anyMoved };
}

function canMove(grid: Grid): boolean {
  if (getEmptyCells(grid).length > 0) return true;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const val = grid[r][c]?.value ?? 0;
      if (c < GRID_SIZE - 1 && (grid[r][c + 1]?.value ?? 0) === val) return true;
      if (r < GRID_SIZE - 1 && (grid[r + 1][c]?.value ?? 0) === val) return true;
    }
  }
  return false;
}

const TILE_COLORS: Record<number, { bg: string; text: string; glow?: string }> = {
  2:    { bg: '#1a2a4a', text: '#8ab4f8' },
  4:    { bg: '#1a3a5a', text: '#8ab4f8' },
  8:    { bg: '#00e5ff', text: '#0a0514', glow: 'rgba(0, 229, 255, 0.3)' },
  16:   { bg: '#00b8d4', text: '#0a0514', glow: 'rgba(0, 229, 255, 0.4)' },
  32:   { bg: '#ff007f', text: '#ffffff', glow: 'rgba(255, 0, 127, 0.3)' },
  64:   { bg: '#e5006a', text: '#ffffff', glow: 'rgba(255, 0, 127, 0.4)' },
  128:  { bg: '#d946ef', text: '#ffffff', glow: 'rgba(217, 70, 239, 0.4)' },
  256:  { bg: '#c026d3', text: '#ffffff', glow: 'rgba(192, 38, 211, 0.5)' },
  512:  { bg: '#a21caf', text: '#ffffff', glow: 'rgba(162, 28, 175, 0.5)' },
  1024: { bg: '#f59e0b', text: '#0a0514', glow: 'rgba(245, 158, 11, 0.5)' },
  2048: { bg: '#fbbf24', text: '#0a0514', glow: 'rgba(251, 191, 36, 0.6)' },
};

function getTileStyle(value: number) {
  return TILE_COLORS[value] || { bg: '#fbbf24', text: '#0a0514', glow: 'rgba(251, 191, 36, 0.8)' };
}

export default function Game2048() {
  const { getPersonalBest, savePersonalBest, incrementGamesPlayed } = useLocalArcadeData();

  const [grid, setGrid] = useState<Grid>(initGrid);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);
  const [history, setHistory] = useState<{ grid: Grid; score: number }[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bestScore = getPersonalBest(GAME_ID);

  const handleMove = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (isGameOver || isAnimating) return;

    const { newGrid, score: gained, moved } = moveGrid(grid, direction);
    if (!moved) return;

    // Save undo state (store a deep clone with no animation flags)
    setHistory(prev => [...prev.slice(-10), { grid: cloneGrid(grid), score }]);

    if (gained > 0) sounds.eat();

    // Phase 1: Show the slide/merge result
    setIsAnimating(true);
    setGrid(newGrid);
    setScore(s => s + gained);

    // Phase 2: After slide animation, spawn new tile
    animTimeoutRef.current = setTimeout(() => {
      const withNewTile = addRandomTile(newGrid);
      setGrid(withNewTile);
      setIsAnimating(false);

      if (!canMove(withNewTile)) {
        setTimeout(() => {
          const finalScore = score + gained;
          sounds.gameOver();
          const isBest = finalScore > bestScore;
          setIsNewBest(isBest);
          if (isBest) savePersonalBest(GAME_ID, finalScore);
          incrementGamesPlayed(GAME_ID);
          setIsGameOver(true);
        }, 200);
      }
    }, 150);
  }, [grid, score, isGameOver, isAnimating, bestScore, savePersonalBest, incrementGamesPlayed]);

  const handleUndo = useCallback(() => {
    if (history.length === 0 || isGameOver || isAnimating) return;
    const last = history[history.length - 1];
    setGrid(last.grid);
    setScore(last.score);
    setHistory(prev => prev.slice(0, -1));
  }, [history, isGameOver, isAnimating]);

  // Cleanup
  useEffect(() => {
    return () => { if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current); };
  }, []);

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'ArrowUp') handleMove('up');
      else if (e.key === 'ArrowDown') handleMove('down');
      else if (e.key === 'ArrowLeft') handleMove('left');
      else if (e.key === 'ArrowRight') handleMove('right');
      else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove, handleUndo]);

  const restartGame = () => {
    tileIdCounter = 0;
    setGrid(initGrid());
    setScore(0);
    setIsGameOver(false);
    setIsNewBest(false);
    setHistory([]);
    setIsAnimating(false);
  };

  // Collect all tiles for rendering
  const tiles: Tile[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c]) tiles.push(grid[r][c]!);
    }
  }

  const boardSize = GRID_SIZE * CELL_SIZE + (GRID_SIZE + 1) * CELL_GAP;

  return (
    <GameShell
      title="2048"
      score={score}
      bestScore={bestScore}
      color="neon-cyan"
      instructions={[
        'Use ARROW KEYS to slide tiles.',
        'Matching tiles merge and double.',
        'Reach 2048 and keep going!',
        'Press CTRL+Z to undo.'
      ]}
    >
      <div className="relative p-4">
        {/* Board container */}
        <div
          className="relative rounded-lg"
          style={{
            width: boardSize,
            height: boardSize,
            backgroundColor: '#130a24',
            padding: CELL_GAP,
          }}
        >
          {/* Background cells */}
          {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
            const r = Math.floor(i / GRID_SIZE);
            const c = i % GRID_SIZE;
            return (
              <div
                key={`bg-${r}-${c}`}
                className="absolute rounded-md"
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  left: CELL_GAP + c * (CELL_SIZE + CELL_GAP),
                  top: CELL_GAP + r * (CELL_SIZE + CELL_GAP),
                  backgroundColor: '#1c0f33',
                }}
              />
            );
          })}

          {/* Animated tiles */}
          {tiles.map(tile => {
            const style = getTileStyle(tile.value);
            const x = CELL_GAP + tile.col * (CELL_SIZE + CELL_GAP);
            const y = CELL_GAP + tile.row * (CELL_SIZE + CELL_GAP);

            return (
              <div
                key={tile.id}
                className="absolute rounded-md flex items-center justify-center font-mono font-bold"
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  left: x,
                  top: y,
                  backgroundColor: style.bg,
                  color: style.text,
                  fontSize: tile.value >= 1024 ? '20px' : tile.value >= 128 ? '24px' : '28px',
                  boxShadow: style.glow ? `0 0 20px ${style.glow}` : 'none',
                  transition: 'left 120ms ease-out, top 120ms ease-out',
                  animation: tile.isNew
                    ? 'tile-pop-in 200ms ease-out'
                    : tile.mergedFrom
                      ? 'tile-merge 200ms ease-out'
                      : 'none',
                  zIndex: tile.mergedFrom ? 10 : 5,
                }}
              >
                {tile.value}
              </div>
            );
          })}
        </div>

        {/* Undo Button */}
        <div className="flex justify-center mt-4">
          <button
            onClick={handleUndo}
            disabled={history.length === 0 || isGameOver || isAnimating}
            className="px-4 py-2 border border-cyber-line text-text-muted font-mono text-sm
              hover:border-neon-cyan hover:text-neon-cyan transition-colors
              disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ↩ UNDO
          </button>
        </div>

        {isGameOver && (
          <GameOverScreen
            score={score}
            isNewBest={isNewBest}
            onRestart={restartGame}
            color="neon-cyan"
          />
        )}
      </div>

      {/* Keyframe animations injected inline */}
      <style>{`
        @keyframes tile-pop-in {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes tile-merge {
          0% { transform: scale(1); }
          30% { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
      `}</style>
    </GameShell>
  );
}
