// Simple Web Audio API synthesizer for retro 8-bit sound effects

let audioCtx: AudioContext | null = null;

function getContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export let isMuted = false;

export const toggleMute = () => {
  isMuted = !isMuted;
  if (isMuted) {
    stopBGM();
  } else {
    startBGM();
  }
  return isMuted;
};

// BGM State
let bgmOscillators: OscillatorNode[] = [];
let bgmGain: GainNode | null = null;
let bgmInterval: ReturnType<typeof setInterval> | null = null;

export const startBGM = () => {
  if (isMuted || bgmGain) return; // Already running or muted
  try {
    const ctx = getContext();
    bgmGain = ctx.createGain();
    bgmGain.gain.value = 0.03; // Very quiet background drone
    bgmGain.connect(ctx.destination);

    // Deep pulsing drone (Cyberpunk feel)
    const drone1 = ctx.createOscillator();
    drone1.type = 'sawtooth';
    drone1.frequency.value = 55; // A1
    drone1.connect(bgmGain);
    drone1.start();

    const drone2 = ctx.createOscillator();
    drone2.type = 'square';
    drone2.frequency.value = 55.5; // Slight detune for thickness
    drone2.connect(bgmGain);
    drone2.start();

    bgmOscillators = [drone1, drone2];

    // Simple slow arpeggio overlay
    const notes = [110, 130.81, 164.81, 220]; // A2, C3, E3, A3 (A minor)
    let noteIdx = 0;
    
    bgmInterval = setInterval(() => {
      if (isMuted) return;
      playTone(notes[noteIdx], 'sine', 0.2, 0.02);
      noteIdx = (noteIdx + 1) % notes.length;
    }, 1000); // 1 beat per second

  } catch (e) {
    console.error("BGM Error:", e);
  }
};

export const stopBGM = () => {
  bgmOscillators.forEach(osc => {
    try { osc.stop(); osc.disconnect(); } catch (e) {}
  });
  bgmOscillators = [];
  if (bgmGain) {
    bgmGain.disconnect();
    bgmGain = null;
  }
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
};

export const playTone = (
  frequency: number,
  type: OscillatorType = 'square',
  duration: number = 0.1,
  vol: number = 0.1
) => {
  if (isMuted) return;
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(vol, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Ignore audio errors
  }
};

export const playNoise = (duration: number = 0.2, vol: number = 0.2) => {
  if (isMuted) return;
  try {
    const ctx = getContext();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    // Lowpass filter for explosion sound
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(vol, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start();
  } catch (e) {}
};

export const sounds = {
  // Common
  gameOver: () => {
    playTone(150, 'sawtooth', 0.5, 0.2);
    setTimeout(() => playTone(100, 'sawtooth', 0.8, 0.2), 200);
  },
  levelUp: () => {
    playTone(400, 'square', 0.1, 0.1);
    setTimeout(() => playTone(600, 'square', 0.1, 0.1), 100);
    setTimeout(() => playTone(800, 'square', 0.3, 0.1), 200);
  },
  
  // Snake
  eat: () => playTone(600, 'sine', 0.1, 0.1),
  crash: () => playTone(150, 'sawtooth', 0.4, 0.2),

  // Pong
  paddleHit: () => playTone(300, 'square', 0.1, 0.1),
  wallHit: () => playTone(450, 'square', 0.1, 0.1),
  score: () => playTone(800, 'sine', 0.3, 0.1),
  losePoint: () => playTone(200, 'sawtooth', 0.3, 0.2),

  // Breakout
  brickHit: () => playTone(500, 'square', 0.05, 0.1),
  paddleHitB: () => playTone(250, 'square', 0.1, 0.1),

  // Space Invaders
  shoot: () => playTone(800, 'square', 0.1, 0.05),
  enemyShoot: () => playTone(200, 'sawtooth', 0.15, 0.05),
  invaderHit: () => playNoise(0.1, 0.2),
  playerHit: () => playNoise(0.5, 0.5),
};
