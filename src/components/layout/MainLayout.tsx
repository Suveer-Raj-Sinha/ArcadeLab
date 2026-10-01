import { Outlet, Link, useLocation } from 'react-router-dom';
import { Gamepad2, Volume2, VolumeX, MonitorPlay } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toggleMute, isMuted, startBGM, sounds } from '../../utils/audio';

function CustomCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);
  const requestRef = useRef<number>();
  const targetPos = useRef({ x: -100, y: -100 });

  useEffect(() => {
    // Only enable on desktop
    if (window.matchMedia("(pointer: coarse)").matches) return;

    document.body.classList.add('custom-cursor-enabled');

    const updateMousePos = (e: MouseEvent) => {
      targetPos.current = { x: e.clientX, y: e.clientY };
      
      const target = e.target as HTMLElement;
      setIsHovering(
        target.tagName === 'BUTTON' || 
        target.tagName === 'A' || 
        target.closest('button') !== null || 
        target.closest('a') !== null
      );
    };

    const renderLoop = () => {
      setPos(prev => ({
        x: prev.x + (targetPos.current.x - prev.x) * 0.2,
        y: prev.y + (targetPos.current.y - prev.y) * 0.2
      }));
      requestRef.current = requestAnimationFrame(renderLoop);
    };

    window.addEventListener('mousemove', updateMousePos);
    requestRef.current = requestAnimationFrame(renderLoop);

    return () => {
      document.body.classList.remove('custom-cursor-enabled');
      window.removeEventListener('mousemove', updateMousePos);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <>
      <div 
        className="fixed w-2 h-2 bg-neon-cyan rounded-full pointer-events-none z-[10000] mix-blend-screen"
        style={{ transform: `translate3d(${targetPos.current.x - 4}px, ${targetPos.current.y - 4}px, 0)` }}
      />
      <div 
        className={`fixed border border-neon-cyan rounded-full pointer-events-none z-[9999] transition-all duration-150 ${isHovering ? 'w-12 h-12 bg-neon-cyan/10' : 'w-8 h-8'}`}
        style={{ transform: `translate3d(${pos.x - (isHovering ? 24 : 16)}px, ${pos.y - (isHovering ? 24 : 16)}px, 0)` }}
      />
    </>
  );
}

export default function MainLayout() {
  const [muted, setMuted] = useState(isMuted);
  const [crtMode, setCrtMode] = useState(false);
  const location = useLocation();

  const handleToggleMute = () => {
    setMuted(toggleMute());
    sounds.paddleHit();
  };

  const handleToggleCrt = () => {
    setCrtMode(prev => {
      const next = !prev;
      if (next) document.body.classList.add('crt-mode');
      else document.body.classList.remove('crt-mode');
      sounds.paddleHit();
      return next;
    });
  };

  useEffect(() => {
    const startAudio = () => {
      startBGM();
      window.removeEventListener('click', startAudio);
      window.removeEventListener('keydown', startAudio);
    };
    window.addEventListener('click', startAudio);
    window.addEventListener('keydown', startAudio);
    return () => {
      window.removeEventListener('click', startAudio);
      window.removeEventListener('keydown', startAudio);
    };
  }, []);

  // Page transition wrap
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState('fadeIn');

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage('fadeOut');
      setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage('fadeIn');
      }, 300);
    }
  }, [location, displayLocation]);

  return (
    <>
      <CustomCursor />
      <div className="ambient-bg" />
      <div className="min-h-screen flex flex-col z-10 relative">
        <header className="border-b border-cyber-line bg-cyber-bg/80 backdrop-blur-md sticky top-0 z-50 transition-all">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group hover:-translate-y-[1px] transition-transform" onClick={() => sounds.paddleHit()}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="w-6 h-6 text-neon-cyan group-hover:text-neon-pink transition-colors"
              >
                <line x1="6" x2="10" y1="12" y2="12" />
                <line x1="8" x2="8" y1="10" y2="14" />
                <line x1="15" x2="15.01" y1="13" y2="13" />
                <line x1="18" x2="18.01" y1="11" y2="11" />
                <rect width="20" height="12" x="2" y="6" rx="2" />
              </svg>
              <h1 className="text-xl font-bold tracking-wider">
                Arcade<span className="text-neon-cyan group-hover:text-neon-pink transition-colors">Lab</span>
              </h1>
            </Link>
            <nav className="flex items-center gap-6">
              <Link to="/" className="text-sm font-mono text-text-muted hover:text-white transition-colors relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-[2px] after:bg-neon-cyan after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-right hover:after:origin-left" onClick={() => sounds.paddleHit()}>
                [ LIBRARY ]
              </Link>
              <Link to="/creator" className="text-sm font-mono text-text-muted hover:text-neon-pink transition-colors relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-full after:h-[2px] after:bg-neon-pink after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-right hover:after:origin-left" onClick={() => sounds.paddleHit()}>
                [ CREATOR ]
              </Link>
              <button 
                onClick={handleToggleCrt}
                className={`transition-colors focus:outline-none hover:-translate-y-[1px] ${crtMode ? 'text-neon-cyan' : 'text-text-muted hover:text-white'}`}
                title="Toggle CRT Mode"
              >
                <MonitorPlay className="w-5 h-5" />
              </button>
              <button 
                onClick={handleToggleMute}
                className="text-text-muted hover:text-neon-pink transition-colors focus:outline-none hover:-translate-y-[1px]"
                title="Toggle Audio"
              >
                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </nav>
          </div>
        </header>
        <main 
          className={`flex-1 container mx-auto px-4 py-8 transition-all duration-300 transform ${transitionStage === 'fadeOut' ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}`}
        >
          <Outlet />
        </main>
        <footer className="border-t border-cyber-line py-6 text-center text-sm font-mono text-text-muted hover:text-white transition-colors cursor-default">
          <p className="tracking-widest">SYSTEM READY_</p>
        </footer>
      </div>
    </>
  );
}
