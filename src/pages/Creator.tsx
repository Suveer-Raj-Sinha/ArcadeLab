import { ExternalLink, Heart, Coffee, Code2, Gamepad2 } from 'lucide-react';

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export default function Creator() {
  return (
    <div className="max-w-2xl mx-auto py-8 font-mono">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-block border-2 border-neon-cyan p-1 mb-6">
          <div className="bg-cyber-panel px-8 py-4 border border-neon-cyan/30">
            <div className="text-neon-cyan text-xs tracking-[0.5em] mb-2">// CREDITS</div>
            <h1 className="text-3xl font-bold tracking-widest text-white">THE CREATOR</h1>
          </div>
        </div>
      </div>

      {/* Creator Card */}
      <div className="bg-cyber-panel border border-cyber-line p-8 mb-8 shadow-[0_0_20px_rgba(0,229,255,0.1)]">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 border-2 border-neon-cyan bg-[#0a0514] flex items-center justify-center shrink-0">
            <Code2 className="w-10 h-10 text-neon-cyan" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Suveer Raj Sinha</h2>
            <p className="text-neon-cyan text-sm tracking-wider mb-3">FULL-STACK DEVELOPER & CREATIVE ENGINEER</p>
            <p className="text-text-muted text-sm leading-relaxed">
              Building real-time web applications, geospatial dashboards, and interactive 3D experiences 
              with React, TypeScript, Three.js, and FastAPI.
            </p>
          </div>
        </div>
      </div>

      {/* Funny Description */}
      <div className="bg-cyber-panel border border-neon-pink/40 p-6 mb-8 shadow-[0_0_15px_rgba(255,0,127,0.1)]">
        <div className="text-neon-pink text-xs tracking-[0.3em] mb-3 flex items-center gap-2">
          <Gamepad2 className="w-4 h-4" /> PROJECT STATUS
        </div>
        <div className="space-y-4 text-text-muted text-sm leading-relaxed">
          <p>
            ArcadeLab is a <span className="text-white font-bold">passion project</span> with absolutely{' '}
            <span className="text-neon-pink font-bold">no end goal</span>. It started as "let me just build a quick snake game" 
            and somehow spiraled into 20 games, a procedural sound engine, pseudo-3D tunnel rendering, 
            and a custom cursor that follows your mouse around like a lost puppy.
          </p>
          <p>
            This project will <span className="text-neon-cyan font-bold">never be completed</span>. 
            Every time the creator thinks "okay, this is done," a new game idea shows up at 3 AM, 
            and suddenly it's 6 AM and there's a gravity-switching endless runner that didn't exist 
            three hours ago.
          </p>
          <p>
            If you're reading this, congratulations — you've found the one page on this site 
            that doesn't have a high score.{' '}
            <span className="text-amber-400">Yet.</span>
          </p>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="bg-cyber-panel border border-cyber-line p-6 mb-8">
        <div className="text-text-muted text-xs tracking-[0.3em] mb-4">BUILT WITH</div>
        <div className="flex flex-wrap gap-2">
          {['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'HTML5 Canvas', 'Web Audio API', 'React Router', 'Lucide Icons'].map(tech => (
            <span 
              key={tech} 
              className="px-3 py-1 border border-cyber-line text-xs text-text-muted hover:text-neon-cyan hover:border-neon-cyan transition-colors"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <a 
          href="https://github.com/SuveerRaj" 
          target="_blank" 
          rel="noopener noreferrer"
          className="group flex items-center gap-3 bg-cyber-panel border border-cyber-line p-4 hover:border-white transition-all"
        >
          <GithubIcon className="w-6 h-6 text-text-muted group-hover:text-white transition-colors" />
          <div>
            <div className="text-white text-sm font-bold group-hover:text-neon-cyan transition-colors">GitHub</div>
            <div className="text-text-muted text-xs">@SuveerRaj</div>
          </div>
          <ExternalLink className="w-4 h-4 text-text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
        
        <a 
          href="https://suveer-raj-sinha.vercel.app" 
          target="_blank" 
          rel="noopener noreferrer"
          className="group flex items-center gap-3 bg-cyber-panel border border-cyber-line p-4 hover:border-neon-cyan transition-all"
        >
          <ExternalLink className="w-6 h-6 text-text-muted group-hover:text-neon-cyan transition-colors" />
          <div>
            <div className="text-white text-sm font-bold group-hover:text-neon-cyan transition-colors">Portfolio</div>
            <div className="text-text-muted text-xs">suveer-raj-sinha.vercel.app</div>
          </div>
          <ExternalLink className="w-4 h-4 text-text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      </div>

      {/* Footer */}
      <div className="text-center text-text-muted text-xs tracking-wider border-t border-cyber-line pt-6">
        <p className="flex items-center justify-center gap-2">
          Made with <Heart className="w-3 h-3 text-neon-pink" /> and an unreasonable amount of <Coffee className="w-3 h-3 text-amber-400" />
        </p>
        <p className="mt-2 text-text-muted/50">// TODO: add more games (this comment will never be removed)</p>
      </div>
    </div>
  );
}
