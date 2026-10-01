import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Home from './pages/Home';
import Snake from './games/snake/Snake';
import Pong from './games/pong/Pong';
import Breakout from './games/breakout/Breakout';
import SpaceInvaders from './games/space-invaders/SpaceInvaders';
import Game2048 from './games/2048/Game2048';
import Minesweeper from './games/minesweeper/Minesweeper';
import ReactionTest from './games/reaction/ReactionTest';
import GuessNumber from './games/guess/GuessNumber';
import MemoryMatch from './games/memory/MemoryMatch';
import TypingRush from './games/typing/TypingRush';
import Tetris from './games/tetris/Tetris';
import ColorRush from './games/color-rush/ColorRush';
import FlappyBird from './games/flappy/FlappyBird';
import DoodleJump from './games/doodle/DoodleJump';
import WhackAMole from './games/whack/WhackAMole';
import TowerStack from './games/tower/TowerStack';
import Helicopter from './games/helicopter/Helicopter';
import GravitySwitch from './games/gravity/GravitySwitch';
import EndlessRunner from './games/runner/EndlessRunner';
import TunnelRush from './games/tunnel/TunnelRush';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="games/snake" element={<Snake />} />
          <Route path="games/pong" element={<Pong />} />
          <Route path="games/breakout" element={<Breakout />} />
          <Route path="games/space-invaders" element={<SpaceInvaders />} />
          <Route path="games/2048" element={<Game2048 />} />
          <Route path="games/minesweeper" element={<Minesweeper />} />
          <Route path="games/reaction" element={<ReactionTest />} />
          <Route path="games/guess" element={<GuessNumber />} />
          <Route path="games/memory" element={<MemoryMatch />} />
          <Route path="games/typing" element={<TypingRush />} />
          <Route path="games/tetris" element={<Tetris />} />
          <Route path="games/color-rush" element={<ColorRush />} />
          <Route path="games/flappy" element={<FlappyBird />} />
          <Route path="games/doodle" element={<DoodleJump />} />
          <Route path="games/whack" element={<WhackAMole />} />
          <Route path="games/tower" element={<TowerStack />} />
          <Route path="games/helicopter" element={<Helicopter />} />
          <Route path="games/gravity" element={<GravitySwitch />} />
          <Route path="games/runner" element={<EndlessRunner />} />
          <Route path="games/tunnel" element={<TunnelRush />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
