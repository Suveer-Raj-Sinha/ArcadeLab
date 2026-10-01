import { useState, useRef, useEffect, useCallback } from 'react';
import { GameShell } from '../../components/game/GameShell';
import { GameOverScreen } from '../../components/game/GameOverScreen';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useLocalArcadeData } from '../../hooks/useLocalArcadeData';
import { sounds } from '../../utils/audio';

const GAME_ID = 'tetris';
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const CANVAS_WIDTH = COLS * BLOCK_SIZE;
const CANVAS_HEIGHT = ROWS * BLOCK_SIZE;

// Colors mapping to neon palette
const COLORS = [
  null,
  '#00e5ff', // I - Cyan
  '#3b82f6', // J - Blue
  '#f59e0b', // L - Orange
  '#fbbf24', // O - Yellow
  '#22c55e', // S - Green
  '#d946ef', // T - Purple
  '#ff007f', // Z - Pink
];

// Tetromino shapes
const TETROMINOES = [
  [],
  // I
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  // J
  [
    [2, 0, 0],
    [2, 2, 2],
    [0, 0, 0],
  ],
  // L
  [
    [0, 0, 3],
    [3, 3, 3],
    [0, 0, 0],
  ],
  // O
  [
    [4, 4],
    [4, 4],
  ],
  // S
  [
    [0, 5, 5],
    [5, 5, 0],
    [0, 0, 0],
  ],
  // T
  [
    [0, 6, 0],
    [6, 6, 6],
    [0, 0, 0],
  ],
  // Z
  [
    [7, 7, 0],
    [0, 7, 7],
    [0, 0, 0],
  ],
];

type Matrix = number[][];
type Player = { pos: { x: number; y: number }; matrix: Matrix };

function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function randomTetromino() {
  const index = Math.floor(Math.random() * 7) + 1;
  return TETROMINOES[index];
}

export default function Tetris() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useKeyboard();
  const { getPersonalBest, savePersonalBest, incrementGamesPlayed } = useLocalArcadeData();

  const [board, setBoard] = useState<Matrix>(createEmptyBoard());
  const [player, setPlayer] = useState<Player>({ pos: { x: 3, y: 0 }, matrix: randomTetromino() });
  const [nextPiece, setNextPiece] = useState<Matrix>(randomTetromino());
  
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);
  
  const bestScore = getPersonalBest(GAME_ID);
  
  const dropCounter = useRef(0);
  const dropInterval = useRef(1000);
  const moveCounter = useRef(0); // For DAS (Delayed Auto Shift)
  const lastKeyRef = useRef<string | null>(null);
  
  const handleGameOver = useCallback(() => {
    setIsGameOver(true);
    sounds.gameOver();
    const isBest = score > bestScore;
    setIsNewBest(isBest);
    if (isBest) savePersonalBest(GAME_ID, score);
    incrementGamesPlayed(GAME_ID);
  }, [score, bestScore, savePersonalBest, incrementGamesPlayed]);

  // Collision detection
  const collide = (boardMat: Matrix, playerObj: Player) => {
    const m = playerObj.matrix;
    const o = playerObj.pos;
    for (let y = 0; y < m.length; ++y) {
      for (let x = 0; x < m[y].length; ++x) {
        if (m[y][x] !== 0 && (boardMat[y + o.y] && boardMat[y + o.y][x + o.x]) !== 0) {
          return true;
        }
      }
    }
    return false;
  };

  // Merge piece into board
  const merge = (boardMat: Matrix, playerObj: Player) => {
    const newBoard = boardMat.map(row => [...row]);
    playerObj.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          newBoard[y + playerObj.pos.y][x + playerObj.pos.x] = value;
        }
      });
    });
    return newBoard;
  };

  // Rotate matrix
  const rotate = (matrix: Matrix, dir: number) => {
    const rotated = matrix.map((_, index) => matrix.map(col => col[index]));
    if (dir > 0) return rotated.map(row => row.reverse());
    return rotated.reverse();
  };

  const playerRotate = (dir: number) => {
    const clonedPlayer = { ...player, matrix: rotate(player.matrix, dir) };
    const pos = clonedPlayer.pos.x;
    let offset = 1;
    // Wall kick simple implementation
    while (collide(board, clonedPlayer)) {
      clonedPlayer.pos.x += offset;
      offset = -(offset + (offset > 0 ? 1 : -1));
      if (offset > clonedPlayer.matrix[0].length) {
        return; // Rotation failed
      }
    }
    setPlayer(clonedPlayer);
  };

  const playerDrop = () => {
    const cloned = { ...player, pos: { x: player.pos.x, y: player.pos.y + 1 } };
    if (collide(board, cloned)) {
      // Lock piece
      sounds.paddleHit(); // Lock sound
      const newBoard = merge(board, player);
      
      // Clear lines
      let linesCleared = 0;
      const sweptBoard = newBoard.reduce((acc, row) => {
        if (row.every(cell => cell !== 0)) {
          linesCleared++;
          acc.unshift(Array(COLS).fill(0));
          return acc;
        }
        acc.push(row);
        return acc;
      }, [] as Matrix);

      if (linesCleared > 0) {
        sounds.levelUp(); // Clear line sound
        const lineScores = [0, 100, 300, 500, 800];
        setScore(s => s + lineScores[linesCleared] * level);
        setLines(l => {
          const newLines = l + linesCleared;
          const newLevel = Math.floor(newLines / 10) + 1;
          if (newLevel > level) {
            setLevel(newLevel);
            dropInterval.current = Math.max(100, 1000 - (newLevel - 1) * 100);
          }
          return newLines;
        });
      }

      setBoard(sweptBoard);
      
      // Spawn next
      const newPlayer = { pos: { x: Math.floor(COLS/2)-1, y: 0 }, matrix: nextPiece };
      setNextPiece(randomTetromino());
      setPlayer(newPlayer);
      dropCounter.current = 0;

      if (collide(sweptBoard, newPlayer)) {
        handleGameOver();
      }
    } else {
      setPlayer(cloned);
    }
    dropCounter.current = 0;
  };

  const playerMove = (dir: number) => {
    const cloned = { ...player, pos: { x: player.pos.x + dir, y: player.pos.y } };
    if (!collide(board, cloned)) {
      setPlayer(cloned);
    }
  };

  const update = useCallback((deltaTime: number) => {
    if (isGameOver) return;

    // Movement (DAS - delayed auto shift)
    if (keys.current['ArrowLeft'] || keys.current['ArrowRight'] || keys.current['ArrowDown']) {
      moveCounter.current += deltaTime;
      
      let key = null;
      if (keys.current['ArrowLeft']) key = 'Left';
      if (keys.current['ArrowRight']) key = 'Right';
      if (keys.current['ArrowDown']) key = 'Down';

      if (lastKeyRef.current !== key) {
        // Initial press
        moveCounter.current = 0;
        lastKeyRef.current = key;
        if (key === 'Left') playerMove(-1);
        if (key === 'Right') playerMove(1);
        if (key === 'Down') { playerDrop(); setScore(s => s + 1); }
      } else if (moveCounter.current > 100) {
        // Hold repeat (every 100ms)
        moveCounter.current = 0;
        if (key === 'Left') playerMove(-1);
        if (key === 'Right') playerMove(1);
        if (key === 'Down') { playerDrop(); setScore(s => s + 1); }
      }
    } else {
      lastKeyRef.current = null;
      moveCounter.current = 0;
    }

    // Gravity drop
    dropCounter.current += deltaTime;
    if (dropCounter.current > dropInterval.current) {
      playerDrop();
    }
  }, [isGameOver, player, board, keys, level, nextPiece]);

  // Handle single-press keys (Rotation, Hard Drop)
  useEffect(() => {
    if (isGameOver) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        playerRotate(1);
        sounds.eat(); // Small click for rotate
      }
      if (e.key === ' ') {
        e.preventDefault();
        // Hard drop
        let p = { ...player };
        let dropDistance = 0;
        while (!collide(board, { ...p, pos: { x: p.pos.x, y: p.pos.y + 1 } })) {
          p.pos.y += 1;
          dropDistance++;
        }
        setPlayer(p);
        setScore(s => s + dropDistance * 2);
        playerDrop(); // Instantly lock
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player, board, isGameOver]);

  useGameLoop(update, isGameOver);

  // Render game board
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0a0514';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid lines
    ctx.strokeStyle = '#1c0f33';
    ctx.lineWidth = 1;
    for(let r=0; r<=ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r*BLOCK_SIZE); ctx.lineTo(CANVAS_WIDTH, r*BLOCK_SIZE); ctx.stroke();
    }
    for(let c=0; c<=COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c*BLOCK_SIZE, 0); ctx.lineTo(c*BLOCK_SIZE, CANVAS_HEIGHT); ctx.stroke();
    }

    const drawMatrix = (matrix: Matrix, offset: {x: number, y: number}, glow = false) => {
      matrix.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            ctx.fillStyle = COLORS[value]!;
            ctx.shadowBlur = glow ? 15 : 0;
            ctx.shadowColor = glow ? COLORS[value]! : 'transparent';
            
            // Block body
            ctx.fillRect((x + offset.x) * BLOCK_SIZE + 1, (y + offset.y) * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
            
            // Inner highlight for arcade feel
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect((x + offset.x) * BLOCK_SIZE + 1, (y + offset.y) * BLOCK_SIZE + 1, BLOCK_SIZE - 2, 4);
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect((x + offset.x) * BLOCK_SIZE + 1, (y + offset.y) * BLOCK_SIZE + BLOCK_SIZE - 5, BLOCK_SIZE - 2, 4);
          }
        });
      });
    };

    drawMatrix(board, { x: 0, y: 0 });
    drawMatrix(player.matrix, player.pos, true); // Current piece glows
  }, [board, player]);

  // Render next piece preview
  useEffect(() => {
    const canvas = nextCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#130a24';
    ctx.fillRect(0, 0, 120, 120);

    // Center piece in 4x4 preview box
    const offsetX = (4 - nextPiece[0].length) / 2;
    const offsetY = (4 - nextPiece.length) / 2;

    nextPiece.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          ctx.fillStyle = COLORS[value]!;
          ctx.shadowBlur = 10;
          ctx.shadowColor = COLORS[value]!;
          ctx.fillRect((x + offsetX) * 25 + 10, (y + offsetY) * 25 + 10, 23, 23);
          
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.fillRect((x + offsetX) * 25 + 10, (y + offsetY) * 25 + 10, 23, 3);
        }
      });
    });
  }, [nextPiece]);

  const restartGame = () => {
    setBoard(createEmptyBoard());
    setPlayer({ pos: { x: 3, y: 0 }, matrix: randomTetromino() });
    setNextPiece(randomTetromino());
    setScore(0);
    setLevel(1);
    setLines(0);
    setIsGameOver(false);
    setIsNewBest(false);
    dropInterval.current = 1000;
  };

  return (
    <GameShell
      title="TETRIS"
      score={score}
      bestScore={bestScore}
      color="neon-cyan"
      instructions={[
        'ARROW LEFT/RIGHT to move.',
        'ARROW UP to rotate.',
        'ARROW DOWN to soft drop.',
        'SPACEBAR to hard drop.',
        'Clear lines to advance levels.'
      ]}
    >
      <div className="relative flex gap-6 p-6">
        
        {/* Main Game Canvas */}
        <div className="relative border-4 border-cyber-line rounded shadow-[0_0_20px_rgba(0,229,255,0.15)] bg-[#0a0514]">
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
              color="neon-cyan"
            />
          )}
        </div>

        {/* Side Panel */}
        <div className="flex flex-col gap-6 w-[140px]">
          
          {/* Next Piece */}
          <div className="bg-cyber-panel border border-cyber-line p-3 rounded flex flex-col items-center">
            <span className="text-text-muted font-mono text-xs mb-2 tracking-widest">NEXT</span>
            <canvas
              ref={nextCanvasRef}
              width={120}
              height={120}
              className="block rounded bg-[#130a24]"
            />
          </div>

          {/* Stats */}
          <div className="bg-cyber-panel border border-cyber-line p-4 rounded flex flex-col gap-4 font-mono">
            <div>
              <span className="text-text-muted text-xs block tracking-widest">LEVEL</span>
              <span className="text-neon-cyan text-xl font-bold">{level}</span>
            </div>
            <div>
              <span className="text-text-muted text-xs block tracking-widest">LINES</span>
              <span className="text-white text-xl font-bold">{lines}</span>
            </div>
          </div>
        </div>
      </div>
    </GameShell>
  );
}
