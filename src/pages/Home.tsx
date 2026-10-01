import { Link } from 'react-router-dom';

const GAMES = [
  {
    id: 'snake',
    name: 'SNAKE',
    description: 'Classic grid-based survival.',
    path: '/games/snake',
    color: 'neon-cyan',
  },
  {
    id: 'pong',
    name: 'PONG',
    description: 'The retro paddle classic.',
    path: '/games/pong',
    color: 'neon-pink',
  },
  {
    id: 'breakout',
    name: 'BREAKOUT',
    description: 'Smash the bricks.',
    path: '/games/breakout',
    color: 'neon-cyan',
  },
  {
    id: 'space-invaders',
    name: 'SPACE INVADERS',
    description: 'Defend the galaxy.',
    path: '/games/space-invaders',
    color: 'neon-pink',
  },
  {
    id: '2048',
    name: '2048',
    description: 'Slide. Merge. Survive.',
    path: '/games/2048',
    color: 'neon-cyan',
  },
  {
    id: 'minesweeper',
    name: 'MINESWEEPER',
    description: 'Clear the minefield.',
    path: '/games/minesweeper',
    color: 'neon-pink',
  },
  {
    id: 'reaction',
    name: 'REACTION TEST',
    description: 'How fast are your reflexes?',
    path: '/games/reaction',
    color: 'neon-cyan',
  },
  {
    id: 'guess',
    name: 'TARGET LOCK',
    description: 'Guess the hidden code.',
    path: '/games/guess',
    color: 'neon-pink',
  },
  {
    id: 'memory',
    name: 'MEMORY MATCH',
    description: 'Flip, match, remember.',
    path: '/games/memory',
    color: 'neon-cyan',
  },
  {
    id: 'typing',
    name: 'TYPING RUSH',
    description: 'Cyberpunk speed typing.',
    path: '/games/typing',
    color: 'neon-pink',
  },
  {
    id: 'tetris',
    name: 'TETRIS',
    description: 'The ultimate block puzzle.',
    path: '/games/tetris',
    color: 'neon-cyan',
  },
  {
    id: 'color-rush',
    name: 'COLOR RUSH',
    description: 'A brain-bending Stroop test.',
    path: '/games/color-rush',
    color: 'neon-pink',
  },
  {
    id: 'flappy',
    name: 'CYBER FLAP',
    description: 'Navigate the cyber-gates.',
    path: '/games/flappy',
    color: 'neon-cyan',
  },
  {
    id: 'doodle',
    name: 'NEON JUMP',
    description: 'Bounce to the top.',
    path: '/games/doodle',
    color: 'neon-pink',
  },
  {
    id: 'whack',
    name: 'CYBER WHACK',
    description: 'Whack the rogue programs.',
    path: '/games/whack',
    color: 'neon-cyan',
  },
  {
    id: 'tower',
    name: 'TETRA STACK',
    description: 'Stack the blocks perfectly.',
    path: '/games/tower',
    color: 'neon-pink',
  },
  {
    id: 'helicopter',
    name: 'HELI SURVIVAL',
    description: 'Navigate the neon cavern.',
    path: '/games/helicopter',
    color: 'neon-cyan',
  },
  {
    id: 'gravity',
    name: 'GRAVITY SHIFT',
    description: 'Flip gravity to survive.',
    path: '/games/gravity',
    color: 'neon-pink',
  },
  {
    id: 'runner',
    name: 'NEON RUNNER',
    description: 'Endless jumping action.',
    path: '/games/runner',
    color: 'neon-cyan',
  },
  {
    id: 'tunnel',
    name: 'TUNNEL RUSH',
    description: 'Survive the 3D vortex.',
    path: '/games/tunnel',
    color: 'neon-pink',
  }
];

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="text-center space-y-4 py-12 animate-fade-in-down">
        <h2 className="text-4xl md:text-6xl font-bold tracking-tighter">
          SELECT <span className="text-neon-cyan drop-shadow-[0_0_15px_rgba(0,229,255,0.8)] animate-pulse">GAME</span>
        </h2>
        <p className="text-text-muted font-mono max-w-xl mx-auto">
          Insert coin to begin. Personal bests are saved locally. No account required.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {GAMES.map((game, index) => {
          const isCyan = game.color === 'neon-cyan';
          return (
            <Link
              key={game.id}
              to={game.path}
              style={{ animationDelay: `${index * 50}ms` }}
              className={`
                block p-6 rounded-xl border border-cyber-line bg-cyber-panel
                hover:bg-cyber-panel-raised transition-all duration-300 group
                animate-fade-in-up relative overflow-hidden
                ${isCyan ? 'hover:border-neon-cyan hover:shadow-[0_0_20px_rgba(0,229,255,0.3)]' : 'hover:border-neon-pink hover:shadow-[0_0_20px_rgba(255,0,127,0.3)]'}
              `}
            >
              {/* Scanline hover effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-[200%] -top-[200%] group-hover:animate-scanline pointer-events-none" />
              
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${isCyan ? 'bg-neon-cyan/10' : 'bg-neon-pink/10'}`}>
                <div className={`w-6 h-6 rounded-sm ${isCyan ? 'bg-neon-cyan shadow-[0_0_10px_#00e5ff]' : 'bg-neon-pink shadow-[0_0_10px_#ff007f]'}`} />
              </div>
              <h3 className="text-xl font-bold mb-2 tracking-wide group-hover:text-white transition-colors">{game.name}</h3>
              <p className="text-text-muted font-mono text-sm">{game.description}</p>
            </Link>
          );
        })}
      </div>

      <style>{`
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-down {
          0% { opacity: 0; transform: translateY(-20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes scanline {
          0% { top: -100%; }
          100% { top: 100%; }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out forwards;
          opacity: 0;
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.5s ease-out forwards;
        }
        .animate-scanline {
          animation: scanline 1.5s linear infinite;
        }
      `}</style>
    </div>
  );
}
