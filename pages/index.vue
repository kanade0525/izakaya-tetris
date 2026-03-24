<template>
  <div id="game-container">
    <div class="game-header">
      <div class="score-display">
        <span>🍺 Lv.{{ gameState.level }}</span>
      </div>
      <button v-if="gameState.started && !gameState.gameOver" @click="openMenu" class="pause-btn">
        <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
      </button>
    </div>

    <div class="game-canvas-wrapper">
      <div ref="gameContainer"></div>
      <div v-if="!gameState.started" class="title-overlay" @click="handleStart" @touchstart.prevent="handleStart">
        <div class="title-text">居酒屋<br>TETRIS</div>
        <div class="start-text">TAP TO START</div>
      </div>
      <div v-else-if="gameState.gameOver" class="title-overlay" @click="handleStart" @touchstart.prevent="handleStart">
        <div class="gameover-text">GAME OVER</div>
        <div class="gameover-score">🍻 お疲れさま!</div>
        <div class="start-text">TAP TO RETRY</div>
      </div>
      <div v-else-if="showMenu" class="title-overlay" @click.self="handleResume" @touchstart.self.prevent="handleResume">
        <div class="menu-box">
          <div class="menu-title">🍶 中断中</div>
          <button class="menu-item" @click="handleResume">▶ 再開</button>
          <button class="menu-item" @click="handleRestart">🔄 最初から</button>
          <button class="menu-item menu-item-quit" @click="handleQuit">🚪 やめる</button>
        </div>
      </div>
    </div>

    <div class="controls-container">
      <div class="control-left">
        <button
          @touchstart.prevent="handleMove('left')"
          @mousedown.prevent="handleMove('left')"
          class="move-btn"
        >
          <svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>
        </button>
        <button
          @touchstart.prevent="handleMove('down')"
          @mousedown.prevent="handleMove('down')"
          class="move-btn"
        >
          <svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>
        </button>
        <button
          @touchstart.prevent="handleMove('right')"
          @mousedown.prevent="handleMove('right')"
          class="move-btn"
        >
          <svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
        </button>
      </div>

      <div class="control-right">
        <button
          @touchstart.prevent="handleRotate"
          @mousedown.prevent="handleRotate"
          class="action-btn rotate-btn"
        >
          <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-1.76-4.24l-2.12 2.12H20V4l-2.35 2.35z"/></svg>
        </button>
        <button
          @touchstart.prevent="handleHardDrop"
          @mousedown.prevent="handleHardDrop"
          class="action-btn drop-btn"
        >
          <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/><path fill="currentColor" d="M7.41 3.59L12 8.17l4.59-4.58L18 5l-6 6-6-6z"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type Phaser from 'phaser'

const { $Phaser } = useNuxtApp()
const { gameState, movePiece, rotate, hardDrop, startGame, togglePause, isValidMove, commitClear, BOARD_WIDTH, BOARD_HEIGHT, PIECES } = useTetris()

const gameContainer = ref<HTMLElement>()
let game: Phaser.Game | null = null
let gameScene: Phaser.Scene | null = null

const BLOCK_SIZE = 30
const CANVAS_WIDTH = BOARD_WIDTH * BLOCK_SIZE
const CANVAS_HEIGHT = BOARD_HEIGHT * BLOCK_SIZE

class TetrisScene extends $Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics
  private dropTimer = 0
  private dropSpeed = 1000
  private clearTimer = 0
  private clearDuration = 400
  private isClearing = false

  constructor() {
    super({ key: 'TetrisScene' })
  }

  create() {
    this.graphics = this.add.graphics()
    gameScene = this
    this.renderEmpty()
  }

  renderEmpty() {
    this.graphics.clear()
    this.graphics.fillStyle(0x0a0a0a, 1)
    this.graphics.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    this.graphics.lineStyle(1, 0x222222, 0.3)
    for (let x = 0; x <= BOARD_WIDTH; x++) {
      this.graphics.lineBetween(x * BLOCK_SIZE, 0, x * BLOCK_SIZE, CANVAS_HEIGHT)
    }
    for (let y = 0; y <= BOARD_HEIGHT; y++) {
      this.graphics.lineBetween(0, y * BLOCK_SIZE, CANVAS_WIDTH, y * BLOCK_SIZE)
    }
  }

  update(time: number, delta: number) {
    if (!gameState.value.started || gameState.value.gameOver || gameState.value.paused) return

    // Hit-stop during line clear
    if (gameState.value.clearingRows.length > 0) {
      if (!this.isClearing) {
        this.isClearing = true
        this.clearTimer = 0
      }
      this.clearTimer += delta
      this.renderWithFlash()
      if (this.clearTimer >= this.clearDuration) {
        this.isClearing = false
        commitClear()
        this.dropTimer = 0
      }
      return
    }

    this.dropTimer += delta
    const speed = Math.max(100, this.dropSpeed - (gameState.value.level - 1) * 100)

    if (this.dropTimer > speed) {
      movePiece('down')
      this.dropTimer = 0
    }

    this.render()
  }

  render() {
    this.graphics.clear()
    this.cameras.main.setScroll(0, 0)

    // Draw board background
    this.graphics.fillStyle(0x0a0a0a, 1)
    this.graphics.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw grid
    this.graphics.lineStyle(1, 0x222222, 0.3)
    for (let x = 0; x <= BOARD_WIDTH; x++) {
      this.graphics.lineBetween(x * BLOCK_SIZE, 0, x * BLOCK_SIZE, CANVAS_HEIGHT)
    }
    for (let y = 0; y <= BOARD_HEIGHT; y++) {
      this.graphics.lineBetween(0, y * BLOCK_SIZE, CANVAS_WIDTH, y * BLOCK_SIZE)
    }

    // Draw placed blocks
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const block = gameState.value.board[y][x]
        if (block) {
          const color = parseInt(PIECES[block - 1].color.replace('#', '0x'))
          this.drawBlock(x, y, color)
        }
      }
    }

    // Draw ghost piece (shadow)
    if (gameState.value.currentPiece) {
      const piece = gameState.value.currentPiece
      const color = parseInt(piece.color.replace('#', '0x'))

      let ghostY = 0
      while (isValidMove(piece, gameState.value.board, 0, ghostY + 1)) {
        ghostY++
      }

      if (ghostY > 0) {
        for (let y = 0; y < piece.shape.length; y++) {
          for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
              this.drawGhost(piece.x + x, piece.y + y + ghostY, color)
            }
          }
        }
      }

      // Draw current piece
      for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
          if (piece.shape[y][x]) {
            this.drawBlock(piece.x + x, piece.y + y, color)
          }
        }
      }
    }

  }

  renderWithFlash() {
    this.graphics.clear()

    this.graphics.fillStyle(0x0a0a0a, 1)
    this.graphics.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    this.graphics.lineStyle(1, 0x222222, 0.3)
    for (let x = 0; x <= BOARD_WIDTH; x++) {
      this.graphics.lineBetween(x * BLOCK_SIZE, 0, x * BLOCK_SIZE, CANVAS_HEIGHT)
    }
    for (let y = 0; y <= BOARD_HEIGHT; y++) {
      this.graphics.lineBetween(0, y * BLOCK_SIZE, CANVAS_WIDTH, y * BLOCK_SIZE)
    }

    const clearingSet = new Set(gameState.value.clearingRows)
    const flashPhase = Math.floor(this.clearTimer / 60) % 2 === 0

    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const block = gameState.value.board[y][x]
        if (block) {
          if (clearingSet.has(y)) {
            if (flashPhase) {
              this.graphics.fillStyle(0xffffff, 0.9)
              this.graphics.fillRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2)
            }
          } else {
            const color = parseInt(PIECES[block - 1].color.replace('#', '0x'))
            this.drawBlock(x, y, color)
          }
        }
      }
    }

    // Screen shake effect
    if (this.clearTimer < 200) {
      const intensity = 3
      const ox = (Math.random() - 0.5) * intensity * 2
      const oy = (Math.random() - 0.5) * intensity * 2
      this.cameras.main.setScroll(ox, oy)
    } else {
      this.cameras.main.setScroll(0, 0)
    }
  }

  drawGhost(x: number, y: number, color: number) {
    const px = x * BLOCK_SIZE
    const py = y * BLOCK_SIZE
    this.graphics.lineStyle(2, color, 0.4)
    this.graphics.strokeRect(px + 2, py + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4)
  }

  drawBlock(x: number, y: number, color: number) {
    const px = x * BLOCK_SIZE
    const py = y * BLOCK_SIZE

    // Main block
    this.graphics.fillStyle(color, 1)
    this.graphics.fillRect(px + 1, py + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2)

    // Highlight
    this.graphics.fillStyle(0xffffff, 0.3)
    this.graphics.fillRect(px + 1, py + 1, BLOCK_SIZE - 2, 3)
    this.graphics.fillRect(px + 1, py + 1, 3, BLOCK_SIZE - 2)

    // Shadow
    this.graphics.fillStyle(0x000000, 0.3)
    this.graphics.fillRect(px + BLOCK_SIZE - 3, py + 1, 2, BLOCK_SIZE - 2)
    this.graphics.fillRect(px + 1, py + BLOCK_SIZE - 3, BLOCK_SIZE - 2, 2)
  }
}

const handleMove = (direction: 'left' | 'right' | 'down') => {
  movePiece(direction)
}

const handleRotate = () => {
  rotate()
}

const handleHardDrop = () => {
  hardDrop()
}

const showMenu = ref(false)

const handleStart = () => {
  startGame()
}

const openMenu = () => {
  if (!gameState.value.paused) {
    togglePause()
  }
  showMenu.value = true
}

const handleResume = () => {
  showMenu.value = false
  if (gameState.value.paused) {
    togglePause()
  }
}

const handleRestart = () => {
  showMenu.value = false
  startGame()
}

const handleQuit = () => {
  showMenu.value = false
  gameState.value.started = false
  gameState.value.paused = false
  gameState.value.gameOver = false
  gameState.value.currentPiece = null
}

onMounted(() => {
  if (!gameContainer.value || !$Phaser) return

  const config: Phaser.Types.Core.GameConfig = {
    type: $Phaser.AUTO,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    parent: gameContainer.value,
    backgroundColor: '#0a0a0a',
    scene: TetrisScene,
    scale: {
      mode: $Phaser.Scale.FIT,
      autoCenter: $Phaser.Scale.CENTER_BOTH,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT
    }
  }

  game = new $Phaser.Game(config)
})

onUnmounted(() => {
  if (game) {
    game.destroy(true)
    game = null
  }
})

// Keyboard controls for desktop
onMounted(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (gameState.value.gameOver) {
      if (e.key === 'Enter') {
        startGame()
      }
      return
    }

    switch (e.key) {
      case 'ArrowLeft':
        movePiece('left')
        break
      case 'ArrowRight':
        movePiece('right')
        break
      case 'ArrowDown':
        movePiece('down')
        break
      case 'ArrowUp':
        rotate()
        break
      case ' ':
        hardDrop()
        break
      case 'p':
      case 'P':
        if (showMenu.value) {
          handleResume()
        } else {
          openMenu()
        }
        break
      case 'Escape':
        if (showMenu.value) {
          handleResume()
        } else if (gameState.value.started && !gameState.value.gameOver) {
          openMenu()
        }
        break
    }
  }

  window.addEventListener('keydown', handleKeyPress)

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyPress)
  })
})
</script>