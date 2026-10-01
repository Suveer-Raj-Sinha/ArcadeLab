# 🎮 ArcadeLab Game Directory

ArcadeLab currently features **20** fully playable games. Some use pure React state (DOM manipulation) for grid-based puzzles, while others utilize the HTML5 Canvas API via a custom `useGameLoop` hook for high-performance physics and rendering.

Here is the complete breakdown of every game, its logic, controls, and instructions.

---

## 1. NEON SNAKE
- **Type:** Grid / Canvas
- **Logic:** The classic snake game. The board is divided into a grid. The snake is an array of coordinate objects. On each tick, a new head is calculated based on the current direction. If the head matches the food coordinates, the snake grows (the tail is not popped).
- **Difficulty Scaling:** Speed increases every 5 points scored.
- **Controls:** `Arrow Keys` to change direction.
- **Goal:** Eat the glowing food. Do not hit the walls or your own tail.

## 2. CYBER PONG
- **Type:** Canvas Physics
- **Logic:** A 2D physics simulation. The ball has X and Y velocity. It bounces off the top and bottom walls (inverting Y velocity). It bounces off the player (left) and CPU (right) paddles (inverting X velocity). The CPU paddle uses a simple linear interpolation to track the ball's Y position.
- **Difficulty Scaling:** The ball's velocity increases slightly every time it hits a paddle.
- **Controls:** `Arrow Up / Down` or `Mouse Y` to move the left paddle.
- **Goal:** Get the ball past the CPU's paddle. First to miss loses the rally.

## 3. NEON BREAKOUT
- **Type:** Canvas Physics
- **Logic:** The ball bounces off the walls, the player paddle, and a grid of destructible bricks. Collision detection uses AABB (Axis-Aligned Bounding Box) checks. When a brick is hit, its state is set to broken and the ball's velocity is reflected.
- **Difficulty Scaling:** The ball gradually speeds up as you destroy more bricks.
- **Controls:** `Arrow Left / Right` or `Mouse X` to move the paddle.
- **Goal:** Destroy all blocks without letting the ball fall past your paddle.

## 4. SPACE INVADERS
- **Type:** Canvas Physics
- **Logic:** A grid of enemy entities slowly moves horizontally, dropping down a row and reversing direction when hitting the screen edge. The player can fire exactly one laser at a time. AABB collision handles laser-to-alien and alien-to-player impacts.
- **Difficulty Scaling:** As the alien count decreases, their horizontal movement speed increases.
- **Controls:** `Arrow Left / Right` to move. `Space` to shoot.
- **Goal:** Eradicate the alien swarm before they reach the bottom of the screen.

## 5. 2048 (CYBER MERGE)
- **Type:** React DOM Grid
- **Logic:** A 4x4 array of numbers. Swiping/Pressing a direction compresses all numbers in that direction. If two adjacent numbers are identical, they merge into their sum. A new '2' or '4' spawns in a random empty cell after every move.
- **Controls:** `Arrow Keys` to slide the tiles.
- **Goal:** Merge matching tiles to reach the 2048 tile (and beyond). The game ends when the grid is full and no valid moves remain.

## 6. MINESWEEPER
- **Type:** React DOM Grid
- **Logic:** A classic grid puzzle. Mines are placed randomly at the start. Clicking a cell reveals it. If it’s a mine, Game Over. If it’s a number, it shows how many adjacent mines exist. If it’s 0, it triggers a recursive Flood-Fill algorithm to reveal all connected empty cells.
- **Controls:** `Left Click` to reveal. `Right Click` to place a flag.
- **Goal:** Reveal all safe cells without clicking a single mine.

## 7. REACTION TEST
- **Type:** State Machine
- **Logic:** The screen transitions between states: Idle -> Waiting (Red) -> Ready (Green) -> Result. A random timeout dictates the wait. Clicking early results in a "False Start". The final score is the average of 5 successful attempts.
- **Controls:** `Click` anywhere on the screen.
- **Goal:** Click as fast as humanly possible the exact moment the screen turns green.

## 8. TARGET LOCK (GUESS THE NUMBER)
- **Type:** React Terminal UI
- **Logic:** The system picks a random integer between 1 and 100. The player inputs a number. The system responds with "Higher" or "Lower".
- **Controls:** `Keyboard Numbers` to type, `Enter` to submit.
- **Goal:** Find the correct number in the fewest attempts possible.

## 9. MEMORY MATCH
- **Type:** React DOM Grid
- **Logic:** An infinite survival memory game. Cards are shuffled pairs. Flipping two cards checks for a match. Matching them leaves them face up.
- **Difficulty Scaling:** Upon clearing a board, time is added to the clock, and the grid size expands (e.g., 4x4 -> 6x4 -> 8x6) to make memorization harder.
- **Controls:** `Click` to flip a card.
- **Goal:** Clear as many boards as possible before the timer hits zero.

## 10. TYPING RUSH
- **Type:** React Input Handler
- **Logic:** A list of random words is displayed. An input listener tracks keystrokes. Correct keystrokes advance the cursor; incorrect ones highlight red and penalize accuracy. WPM (Words Per Minute) is calculated dynamically.
- **Controls:** `Keyboard` to type. `Space` or `Enter` to submit a word.
- **Goal:** Type as fast and accurately as possible within 60 seconds.

## 11. TETRIS (CYBER BLOCKS)
- **Type:** Canvas Grid
- **Logic:** A 10x20 grid matrix. Tetrominoes (I, J, L, O, S, T, Z) fall from the top. Rotation matrices spin the pieces, while Wall-Kick logic ensures pieces don't rotate into walls. Completed rows are spliced from the array and new empty rows are unshifted to the top.
- **Difficulty Scaling:** The fall speed (drop interval) decreases every time 10 lines are cleared (Level Up).
- **Controls:** `Left/Right` to move, `Up` to rotate, `Down` to soft drop, `Space` to hard drop.
- **Goal:** Clear lines to survive as long as possible.

## 12. COLOR RUSH (STROOP TEST)
- **Type:** State Machine
- **Logic:** The classic psychological Stroop Effect. The game displays a word (e.g., "RED") but renders the text in a different color (e.g., Blue). The player must click the button that matches the *text color*, not the word itself.
- **Controls:** `Click` the correct color button.
- **Goal:** Get as many correct answers as possible in 30 seconds.

## 13. CYBER FLAP
- **Type:** Canvas Physics
- **Logic:** A Flappy Bird clone. A bird entity has constant gravity applied to its Y velocity. Jumping applies a negative Y impulse. Pipes are spawned off-screen to the right and move left. AABB collision checks against the top and bottom pipes.
- **Difficulty Scaling:** The horizontal speed of the pipes and the frequency at which they spawn increases as your score goes up.
- **Controls:** `Space` or `Click` to flap.
- **Goal:** Navigate through as many cyber-gates as possible without touching them or the floor.

## 14. NEON JUMP (DOODLE JUMP)
- **Type:** Canvas Physics
- **Logic:** A vertical platformer. The player entity constantly falls. If its downward Y velocity intersects with a platform's bounding box, a massive upward Y impulse is applied. The camera logic pans the screen up when the player crosses the midline, shifting platforms down and recycling them at the top.
- **Controls:** `Arrow Left / Right` to steer mid-air. Screen edges wrap around.
- **Goal:** Bounce upward endlessly. Falling off the bottom of the screen ends the game.

## 15. CYBER WHACK (WHACK-A-MOLE)
- **Type:** React DOM Grid
- **Logic:** A 3x3 grid. A `setInterval` loop randomly flags a cell as "active" and assigns it a type (Normal, Gold, Bomb). An internal timeout hides the mole if not clicked.
- **Difficulty Scaling:** As the 30-second timer decreases, moles spawn faster and disappear faster.
- **Controls:** `Click` the pop-ups.
- **Goal:** Score maximum points in 30 seconds. (Blue = +10, Yellow = +50, Red = -30).

## 16. TETRA STACK (STACKER)
- **Type:** Canvas Grid
- **Logic:** A horizontal moving block segment. When the player clicks, the block "locks" into the grid. The game checks the row immediately below; any blocks that don't have support fall away. The remaining blocks define the width for the next row above.
- **Difficulty Scaling:** The block moves back and forth much faster as you climb higher up the grid.
- **Controls:** `Space` or `Click` to drop the blocks.
- **Goal:** Reach the very top row without letting your block width reach zero.

## 17. HELI SURVIVAL
- **Type:** Canvas Physics
- **Logic:** A side-scrolling cavern. The helicopter experiences constant gravity. Holding input applies constant lift. The terrain is a procedurally generated array of top/bottom ceiling boundaries that shift left over time.
- **Difficulty Scaling:** The forward scrolling speed increases based on total distance traveled, and the cavern gap slowly tightens.
- **Controls:** `Hold Space` or `Hold Click` to ascend. Release to descend.
- **Goal:** Fly as far as possible without touching the cavern walls or floating obstacles.

## 18. GRAVITY SHIFT
- **Type:** Canvas Physics
- **Logic:** An endless runner where the player runs on the floor and ceiling. Pressing input multiplies gravity by -1, pulling the player to the opposite surface. You can only shift gravity when currently grounded against a surface.
- **Difficulty Scaling:** Forward running speed steadily increases the further you survive.
- **Controls:** `Space` or `Click` to flip gravity.
- **Goal:** Dodge the grounded and ceiling obstacles for as long as possible.

## 19. NEON RUNNER
- **Type:** Canvas Physics
- **Logic:** A classic Chrome-Dino style runner. The player is locked on the X-axis and grounded to the floor. Jumping applies vertical impulse. Obstacles are spawned off-screen right and slide left.
- **Difficulty Scaling:** Game speed smoothly accelerates infinitely based on distance.
- **Controls:** `Space` or `Click` to jump over obstacles.
- **Goal:** Survive the longest distance possible.

## 20. TUNNEL RUSH
- **Type:** Canvas Pseudo-3D
- **Logic:** A perspective trick. The tunnel is an 8-sided polygon. Obstacles spawn with a Z-depth of 100. As they approach Z=0, their projected radius scales outwards using standard field-of-view division `(FOV / (FOV + Z))`. The player's angular position (0-7) must not match the obstacle's blocked segments when Z approaches 0.
- **Difficulty Scaling:** Forward Z-speed increases with distance, and the entire tunnel gradually begins to rotate faster to disorient the player.
- **Controls:** `Arrow Left / Right` to spin around the tunnel walls.
- **Goal:** Dodge the oncoming barriers in the vortex.
