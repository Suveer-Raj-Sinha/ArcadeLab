import { useState, useEffect, useCallback } from 'react';
import { GameShell } from '../../components/game/GameShell';
import { GameOverScreen } from '../../components/game/GameOverScreen';
import { useLocalArcadeData } from '../../hooks/useLocalArcadeData';
import { sounds } from '../../utils/audio';

const GAME_ID = 'minesweeper';

type CellState = {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
};

type Difficulty = { name: string; rows: number; cols: number; mines: number };

const DIFFICULTIES: Difficulty[] = [
  { name: 'EASY', rows: 8, cols: 8, mines: 10 },
  { name: 'MEDIUM', rows: 12, cols: 12, mines: 30 },
  { name: 'HARD', rows: 16, cols: 16, mines: 60 },
];

function createBoard(rows: number, cols: number, mines: number, safeR: number, safeC: number): CellState[][] {
  const board: CellState[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
    }))
  );

  // Place mines, avoiding safe cell and its neighbors
  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (board[r][c].mine) continue;
    if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
    board[r][c].mine = true;
    placed++;
  }

  // Calculate adjacents
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) {
            count++;
          }
        }
      }
      board[r][c].adjacent = count;
    }
  }

  return board;
}

function floodReveal(board: CellState[][], r: number, c: number, rows: number, cols: number): CellState[][] {
  const newBoard = board.map(row => row.map(cell => ({ ...cell })));
  const stack: [number, number][] = [[r, c]];

  while (stack.length > 0) {
    const [cr, cc] = stack.pop()!;
    if (cr < 0 || cr >= rows || cc < 0 || cc >= cols) continue;
    if (newBoard[cr][cc].revealed || newBoard[cr][cc].flagged) continue;

    newBoard[cr][cc].revealed = true;

    if (newBoard[cr][cc].adjacent === 0 && !newBoard[cr][cc].mine) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          stack.push([cr + dr, cc + dc]);
        }
      }
    }
  }

  return newBoard;
}

const ADJ_COLORS: Record<number, string> = {
  1: '#00e5ff',
  2: '#22c55e',
  3: '#ff007f',
  4: '#d946ef',
  5: '#f59e0b',
  6: '#06b6d4',
  7: '#ffffff',
  8: '#94a3b8',
};

export default function Minesweeper() {
  const { getPersonalBest, savePersonalBest, incrementGamesPlayed } = useLocalArcadeData();

  const [difficulty, setDifficulty] = useState<Difficulty>(DIFFICULTIES[0]);
  const [board, setBoard] = useState<CellState[][] | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [flagCount, setFlagCount] = useState(0);

  const bestScore = getPersonalBest(GAME_ID);

  // Timer
  useEffect(() => {
    if (!isRunning || isGameOver) return;
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning, isGameOver]);

  // Score = speed of completion (lower is better, so we invert for high score)
  // We'll store "cells revealed per second * 100" as score
  const calculateScore = useCallback(() => {
    if (!board || timer === 0) return 0;
    const totalSafe = difficulty.rows * difficulty.cols - difficulty.mines;
    return Math.max(1, Math.round((totalSafe / timer) * 1000));
  }, [board, timer, difficulty]);

  const handleCellClick = useCallback((r: number, c: number) => {
    if (isGameOver) return;

    // First click — generate the board
    if (!board) {
      const newBoard = createBoard(difficulty.rows, difficulty.cols, difficulty.mines, r, c);
      const revealed = floodReveal(newBoard, r, c, difficulty.rows, difficulty.cols);
      setBoard(revealed);
      setIsRunning(true);
      sounds.eat();
      return;
    }

    const cell = board[r][c];
    if (cell.revealed || cell.flagged) return;

    if (cell.mine) {
      // Game Over — reveal all mines
      sounds.gameOver();
      const newBoard = board.map(row => row.map(c => ({
        ...c,
        revealed: c.mine ? true : c.revealed,
      })));
      setBoard(newBoard);
      setIsGameOver(true);
      setHasWon(false);
      incrementGamesPlayed(GAME_ID);
      return;
    }

    sounds.eat();
    const newBoard = floodReveal(board, r, c, difficulty.rows, difficulty.cols);
    setBoard(newBoard);

    // Check win
    const allSafeRevealed = newBoard.every(row =>
      row.every(cell => cell.mine || cell.revealed)
    );
    if (allSafeRevealed) {
      sounds.levelUp();
      setIsGameOver(true);
      setHasWon(true);
      setIsRunning(false);
      const finalScore = calculateScore();
      const isBest = finalScore > bestScore;
      setIsNewBest(isBest);
      if (isBest) savePersonalBest(GAME_ID, finalScore);
      incrementGamesPlayed(GAME_ID);
    }
  }, [board, isGameOver, difficulty, bestScore, savePersonalBest, incrementGamesPlayed, calculateScore]);

  const handleRightClick = useCallback((e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (isGameOver || !board) return;
    const cell = board[r][c];
    if (cell.revealed) return;

    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    newBoard[r][c].flagged = !newBoard[r][c].flagged;
    setBoard(newBoard);
    setFlagCount(prev => newBoard[r][c].flagged ? prev + 1 : prev - 1);
  }, [board, isGameOver]);

  const restartGame = () => {
    setBoard(null);
    setIsGameOver(false);
    setHasWon(false);
    setIsNewBest(false);
    setTimer(0);
    setIsRunning(false);
    setFlagCount(0);
  };

  const changeDifficulty = (diff: Difficulty) => {
    setDifficulty(diff);
    restartGame();
  };

  const currentScore = isGameOver && hasWon ? calculateScore() : 0;
  const cellSize = difficulty.cols <= 8 ? 44 : difficulty.cols <= 12 ? 36 : 28;

  return (
    <GameShell
      title="MINESWEEPER"
      score={currentScore}
      bestScore={bestScore}
      color="neon-pink"
      instructions={[
        'LEFT CLICK to reveal a cell.',
        'RIGHT CLICK to flag a mine.',
        'Numbers show adjacent mines.',
        'Reveal all safe cells to win. Speed is your score.'
      ]}
    >
      <div className="relative p-4 flex flex-col items-center">
        {/* Difficulty Selector */}
        <div className="flex gap-2 mb-4">
          {DIFFICULTIES.map(diff => (
            <button
              key={diff.name}
              onClick={() => changeDifficulty(diff)}
              className={`px-3 py-1 font-mono text-xs border transition-all
                ${difficulty.name === diff.name
                  ? 'border-neon-pink text-neon-pink shadow-[0_0_10px_rgba(255,0,127,0.3)]'
                  : 'border-cyber-line text-text-muted hover:border-neon-pink/50'
                }`}
            >
              {diff.name}
            </button>
          ))}
        </div>

        {/* Status Bar */}
        <div className="flex justify-between w-full font-mono text-sm mb-3" style={{ maxWidth: cellSize * difficulty.cols + 'px' }}>
          <div className="text-neon-pink">💣 {difficulty.mines - flagCount}</div>
          <div className="text-text-muted">⏱ {timer}s</div>
        </div>

        {/* Grid */}
        <div
          className="grid gap-px p-1 rounded"
          style={{
            gridTemplateColumns: `repeat(${difficulty.cols}, ${cellSize}px)`,
            backgroundColor: '#130a24',
          }}
          onContextMenu={e => e.preventDefault()}
        >
          {Array.from({ length: difficulty.rows }, (_, r) =>
            Array.from({ length: difficulty.cols }, (_, c) => {
              const cell = board ? board[r][c] : null;
              const isRevealed = cell?.revealed ?? false;
              const isFlagged = cell?.flagged ?? false;
              const isMine = cell?.mine ?? false;
              const adj = cell?.adjacent ?? 0;

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  onContextMenu={(e) => handleRightClick(e, r, c)}
                  className="flex items-center justify-center font-mono font-bold transition-all duration-100"
                  style={{
                    width: cellSize,
                    height: cellSize,
                    fontSize: cellSize <= 28 ? '12px' : '14px',
                    backgroundColor: isRevealed
                      ? (isMine ? '#3d0a0a' : '#1c0f33')
                      : '#2a1b40',
                    color: isRevealed && !isMine ? (ADJ_COLORS[adj] || 'transparent') : '#ffffff',
                    cursor: isGameOver ? 'default' : 'pointer',
                    border: '1px solid',
                    borderColor: isRevealed ? '#130a24' : '#3d2a5c',
                  }}
                >
                  {isRevealed && isMine && '💣'}
                  {isRevealed && !isMine && adj > 0 && adj}
                  {!isRevealed && isFlagged && '🚩'}
                </button>
              );
            })
          )}
        </div>

        {isGameOver && (
          <GameOverScreen
            score={hasWon ? currentScore : 0}
            isNewBest={isNewBest}
            onRestart={restartGame}
            color="neon-pink"
          />
        )}
      </div>
    </GameShell>
  );
}
