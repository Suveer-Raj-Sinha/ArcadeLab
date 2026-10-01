import { useState, useRef, useEffect, useCallback } from 'react';
import { GameShell } from '../../components/game/GameShell';
import { GameOverScreen } from '../../components/game/GameOverScreen';
import { useLocalArcadeData } from '../../hooks/useLocalArcadeData';
import { sounds } from '../../utils/audio';

const GAME_ID = 'typing';
const TIME_LIMIT = 60; // 60 seconds

// A mix of arcade/retro themed words and tech jargon
const WORD_BANK = [
  'arcade', 'pixel', 'retro', 'cyber', 'neon', 'system', 'override', 'glitch', 
  'matrix', 'hacker', 'terminal', 'console', 'joystick', 'insert', 'coin', 
  'high', 'score', 'leaderboard', 'virtual', 'reality', 'cyberspace', 'data',
  'stream', 'bandwidth', 'packet', 'loss', 'latency', 'frame', 'buffer', 'render',
  'sprite', 'polygon', 'texture', 'shader', 'vector', 'bit', 'byte', 'memory',
  'overclock', 'processor', 'kernel', 'panic', 'execute', 'command', 'syntax',
  'error', 'debug', 'compile', 'loop', 'variable', 'function', 'boolean', 'string',
  'array', 'object', 'class', 'module', 'network', 'firewall', 'security', 'breach',
  'encryption', 'password', 'access', 'denied', 'granted', 'upload', 'download',
  'server', 'client', 'protocol', 'interface', 'hardware', 'software', 'firmware',
  'update', 'patch', 'version', 'release', 'alpha', 'beta', 'final', 'player',
  'enemy', 'boss', 'level', 'stage', 'zone', 'world', 'map', 'quest', 'mission',
  'objective', 'reward', 'bonus', 'multiplier', 'combo', 'streak', 'perfect',
  'flawless', 'victory', 'defeat', 'game', 'over', 'continue', 'start', 'pause'
];

function generateWords(count: number): string {
  const words = [];
  for (let i = 0; i < count; i++) {
    words.push(WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)]);
  }
  return words.join(' ');
}

export default function TypingRush() {
  const { getPersonalBest, savePersonalBest, incrementGamesPlayed } = useLocalArcadeData();

  const [text, setText] = useState(() => generateWords(50));
  const [input, setInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isRunning, setIsRunning] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  
  const bestScore = getPersonalBest(GAME_ID); // Best WPM
  const [isNewBest, setIsNewBest] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const totalTypedRef = useRef(0);
  const errorsRef = useRef(0);

  // Focus management
  useEffect(() => {
    if (!isGameOver && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isGameOver]);

  const handleFocusClick = () => {
    if (!isGameOver && inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Timer
  useEffect(() => {
    if (!isRunning || isGameOver) return;
    
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timerId);
    } else {
      endGame();
    }
  }, [isRunning, timeLeft, isGameOver]);

  const endGame = useCallback(() => {
    setIsRunning(false);
    setIsGameOver(true);
    sounds.gameOver();
    
    // Calculate final stats
    // Standard WPM: (Total Chars / 5) / (Time in minutes)
    // We'll use the correct chars typed
    let correctChars = 0;
    for (let i = 0; i < input.length; i++) {
      if (input[i] === text[i]) correctChars++;
    }
    
    const minutes = TIME_LIMIT / 60;
    const finalWpm = Math.floor((correctChars / 5) / minutes);
    
    // Penalize heavily for low accuracy if wanted, or just raw WPM
    // Let's stick to raw net WPM
    setWpm(finalWpm);
    
    const isBest = finalWpm > bestScore;
    setIsNewBest(isBest);
    if (isBest) savePersonalBest(GAME_ID, finalWpm);
    incrementGamesPlayed(GAME_ID);
  }, [input, text, bestScore, savePersonalBest, incrementGamesPlayed]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isGameOver) return;
    
    const val = e.target.value;
    
    if (!isRunning && val.length === 1) {
      setIsRunning(true);
    }

    // Play sounds
    if (val.length > input.length) { // Typed a character
      const charIndex = val.length - 1;
      if (val[charIndex] === text[charIndex]) {
        sounds.paddleHit(); // soft tick
        totalTypedRef.current++;
      } else {
        sounds.wallHit(); // error blip
        errorsRef.current++;
      }
    }

    setInput(val);

    // Update real-time accuracy
    const total = Math.max(1, totalTypedRef.current + errorsRef.current);
    setAccuracy(Math.floor((totalTypedRef.current / total) * 100));

    // Generate more words if nearing the end
    if (val.length > text.length - 20) {
      setText(prev => prev + ' ' + generateWords(30));
    }
  };

  const restartGame = () => {
    setText(generateWords(50));
    setInput('');
    setTimeLeft(TIME_LIMIT);
    setIsRunning(false);
    setIsGameOver(false);
    setWpm(0);
    setAccuracy(100);
    setIsNewBest(false);
    totalTypedRef.current = 0;
    errorsRef.current = 0;
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <GameShell
      title="TYPING RUSH"
      score={isRunning ? Math.floor(((totalTypedRef.current / 5) / ((TIME_LIMIT - timeLeft + 1) / 60))) : wpm}
      bestScore={bestScore}
      color="neon-pink"
      instructions={[
        'Start typing to begin the countdown.',
        'Type as accurately and quickly as possible.',
        'Your score is Words Per Minute (WPM).',
        `You have ${TIME_LIMIT} seconds.`
      ]}
    >
      <div 
        className="relative w-full max-w-3xl min-h-[400px] flex flex-col p-8 bg-[#0a0514] font-mono cursor-text"
        onClick={handleFocusClick}
      >
        {/* HUD */}
        <div className="flex justify-between items-center mb-8 border-b border-cyber-line pb-4">
          <div className="flex gap-6">
            <div>
              <span className="text-text-muted text-sm block">TIME</span>
              <span className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-neon-pink'}`}>
                {timeLeft}s
              </span>
            </div>
            <div>
              <span className="text-text-muted text-sm block">ACCURACY</span>
              <span className="text-2xl font-bold text-neon-cyan">{accuracy}%</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-text-muted text-sm block">CURRENT WPM</span>
            <span className="text-2xl font-bold text-white">
              {isRunning ? Math.floor(((totalTypedRef.current / 5) / ((TIME_LIMIT - timeLeft + 1) / 60))) : wpm}
            </span>
          </div>
        </div>

        {/* Text Display */}
        <div className="relative text-2xl leading-relaxed tracking-wider break-words text-text-muted mb-8 h-[150px] overflow-hidden">
          {text.split('').map((char, index) => {
            let color = 'text-text-muted'; // Future text
            let bg = 'bg-transparent';
            
            if (index < input.length) {
              if (input[index] === char) {
                color = 'text-neon-cyan'; // Correct
              } else {
                color = 'text-white';
                bg = 'bg-red-600/80'; // Error
              }
            } else if (index === input.length) {
              // Cursor position
              bg = 'bg-neon-pink/30 border-l-2 border-neon-pink animate-pulse';
            }

            return (
              <span key={index} className={`${color} ${bg} rounded-sm`}>
                {char}
              </span>
            );
          })}
        </div>

        {/* Hidden Input */}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleChange}
          disabled={isGameOver}
          className="opacity-0 absolute top-0 left-0 w-full h-full cursor-default"
          spellCheck="false"
          autoComplete="off"
        />

        {isGameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm z-10">
            <GameOverScreen
              score={wpm}
              isNewBest={isNewBest}
              onRestart={restartGame}
              color="neon-pink"
            />
          </div>
        )}
      </div>
    </GameShell>
  );
}
