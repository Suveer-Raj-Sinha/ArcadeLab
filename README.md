# 🕹️ ArcadeLab

ArcadeLab is a premium, modern digital arcade built entirely with React, TypeScript, and HTML5 Canvas. It features **20 fully playable retro-inspired games**, smooth UI transitions, procedural audio, a custom unified high-score system, and a sleek neon-cyberpunk aesthetic.

## ✨ Features

- **20 Complete Games**: A massive collection spanning puzzles, shooters, platformers, and arcade classics.
- **Unified Engine**: All games run on a highly optimized, custom `useGameLoop` hook that detaches rendering from the React state cycle for a buttery-smooth 60 FPS experience.
- **Procedural Sound**: Audio is generated dynamically via the Web Audio API—no external sound files required!
- **CRT Mode**: Toggleable retro scanlines, vignette, and screen curvature.
- **Local Persistence**: High scores, win streaks, and games-played stats are saved automatically to your local storage.
- **Premium UI Polish**: Magnetic buttons, custom trailing cursors, page transitions, and smooth scroll locking.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ArcadeLab.git
   cd ArcadeLab
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173` (or the port specified by Vite).

## 🛠️ Tech Stack

- **Framework:** React 18
- **Language:** TypeScript
- **Bundler:** Vite
- **Styling:** Tailwind CSS (v4)
- **Routing:** React Router v6
- **Icons:** Lucide React
- **Rendering:** HTML5 Canvas API (for performance-critical games) & React DOM (for UI/Grid games)

## 📚 Game Documentation

For a deep dive into the mechanics, logic, controls, and instructions for every single game in ArcadeLab, please see the [GAMES.md](./GAMES.md) file.
