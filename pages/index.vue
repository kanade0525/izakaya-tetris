<template>
  <div id="game-container">
    <!-- Header -->
    <div class="game-header">
      <div class="score-display" v-if="gameState.mode === 'classic'">
        <span>🍺 Lv.{{ gameState.level }}</span>
      </div>
      <div class="score-display" v-else>
        <span>🍺 ストック: {{ gameState.stocks }}</span>
        <button class="stock-btn" @click="izakaya.removeStock(1)">−</button>
        <button class="stock-btn" @click="izakaya.addStock(1)">＋</button>
      </div>
      <button
        v-if="gameState.started && !gameState.gameOver && gameState.mode === 'classic'"
        @click="openMenu"
        class="pause-btn"
      >
        <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
      </button>
      <button
        v-if="gameState.mode === 'izakaya' && gameState.izakayaPhase !== 'dropping' && gameState.izakayaPhase !== 'countdown'"
        @click="openMenu"
        class="pause-btn"
      >
        <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
      </button>
    </div>

    <!-- Game Canvas -->
    <div class="game-canvas-wrapper" ref="wrapperRef">
      <canvas ref="canvasRef"></canvas>

      <!-- Title Screen -->
      <div v-if="!gameState.started" class="title-overlay">
        <div class="title-text">居酒屋<br>TETRIS</div>
        <div class="mode-buttons">
          <button class="mode-btn" @click="handleStartClassic" @touchstart.prevent="handleStartClassic">クラシック</button>
          <button class="mode-btn mode-btn-izakaya" @click="handleStartIzakaya" @touchstart.prevent="handleStartIzakaya">居酒屋モード</button>
        </div>
      </div>

      <!-- Classic Game Over -->
      <div v-else-if="gameState.mode === 'classic' && gameState.gameOver" class="title-overlay">
        <div class="gameover-text">GAME OVER</div>
        <div class="gameover-score">🍻 お疲れさま!</div>
        <div class="mode-buttons">
          <button class="mode-btn" @click="handleStartClassic">もう一回</button>
          <button class="mode-btn mode-btn-izakaya" @click="handleIzakayaFromClassic">居酒屋モードへ</button>
        </div>
      </div>

      <!-- Pause Menu -->
      <div v-else-if="showMenu" class="title-overlay" @click.self="handleResume" @touchstart.self.prevent="handleResume">
        <div class="menu-box">
          <div class="menu-title">🍶 中断中</div>
          <button class="menu-item" @click="handleResume">▶ 再開</button>
          <button class="menu-item" @click="handleRestart">🔄 最初から</button>
          <button class="menu-item menu-item-quit" @click="handleQuit">🚪 やめる</button>
        </div>
      </div>

      <!-- Izakaya: Confirm Dialog -->
      <div v-else-if="gameState.izakayaPhase === 'confirm'" class="title-overlay">
        <div class="menu-box">
          <div class="menu-title">🍺 ブロックを落とす</div>
          <div class="confirm-text">ストックを1消費してブロックを落としますか？</div>
          <button class="menu-item" @click="izakaya.skipExclusion()">🎲 落とす</button>
          <button class="menu-item" @click="izakaya.openExclusion()">🚫 除外設定</button>
          <button class="menu-item menu-item-quit" @click="izakaya.cancelDrop()">キャンセル</button>
        </div>
      </div>

      <!-- Izakaya: Exclusion Selection -->
      <div v-else-if="gameState.izakayaPhase === 'exclusion'" class="title-overlay">
        <div class="menu-box exclusion-box">
          <div class="menu-title">🚫 除外設定</div>
          <div class="exclusion-desc">出てほしくないブロックを選択（1つにつき+1ストック）</div>
          <div class="exclusion-grid">
            <button
              v-for="(dt, i) in izakaya.ALL_DRAW_TYPES"
              :key="dt"
              class="exclusion-item"
              :class="{ selected: gameState.excludedPieces.includes(dt) }"
              @click="izakaya.toggleExclude(dt)"
            >
              <span v-if="dt < 7" class="piece-label">{{ pieceNames[dt] }}</span>
              <span v-else-if="dt === izakaya.DRAW_WILDCARD">🃏</span>
              <span v-else>💀</span>
            </button>
          </div>
          <div class="exclusion-cost">追加コスト: {{ izakaya.exclusionCost() }} ストック（合計 {{ 1 + izakaya.exclusionCost() }}）</div>
          <button class="menu-item" @click="izakaya.confirmExclusion()">決定</button>
          <button class="menu-item menu-item-quit" @click="izakaya.skipExclusion()">使わない</button>
        </div>
      </div>

      <!-- Izakaya: Drawing Result -->
      <div v-else-if="gameState.izakayaPhase === 'drawing'" class="title-overlay">
        <div class="drawing-result" @click="izakaya.confirmDraw()" @touchstart.prevent="izakaya.confirmDraw()">
          <template v-if="gameState.drawnResult?.type === 'piece'">
            <div class="drawn-piece-name">{{ pieceNames[gameState.drawnResult.pieceIndex] }}</div>
            <div class="drawn-label">ブロック出現！</div>
          </template>
          <template v-else-if="gameState.drawnResult?.type === 'wildcard'">
            <div class="drawn-piece-name">🃏</div>
            <div class="drawn-label">ワイルドカード！</div>
          </template>
          <template v-else>
            <div class="drawn-piece-name">💀</div>
            <div class="drawn-label">ハズレ</div>
          </template>
          <div class="start-text">TAP</div>
        </div>
      </div>

      <!-- Izakaya: Wildcard Selection -->
      <div v-else-if="gameState.izakayaPhase === 'wildcard'" class="title-overlay">
        <div class="menu-box">
          <div class="menu-title">🃏 ブロックを選ぶ</div>
          <div class="wildcard-grid">
            <button
              v-for="(piece, i) in PIECES"
              :key="i"
              class="wildcard-item"
              @click="izakaya.selectWildcard(i)"
            >
              <span class="piece-label">{{ pieceNames[i] }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Izakaya: Countdown -->
      <div v-else-if="gameState.izakayaPhase === 'countdown'" class="title-overlay countdown-overlay">
        <div class="countdown-number">{{ countdownValue }}</div>
      </div>

      <!-- Izakaya: Miss -->
      <div v-else-if="gameState.izakayaPhase === 'miss'" class="title-overlay" @click="izakaya.dismissMiss()" @touchstart.prevent="izakaya.dismissMiss()">
        <div class="miss-text">ハズレ</div>
        <div class="start-text">TAP</div>
      </div>

      <!-- Izakaya: Won -->
      <div v-else-if="gameState.izakayaPhase === 'won'" class="title-overlay">
        <div class="won-text">全消し達成!</div>
        <div class="won-emoji">🎉🍻🎉</div>
        <button class="mode-btn" @click="handleQuit">タイトルへ</button>
      </div>
    </div>

    <!-- Controls -->
    <div class="controls-container" v-if="showTetrisControls">
      <div class="control-left">
        <button @touchstart.prevent="handleMove('left')" @mousedown.prevent="handleMove('left')" class="move-btn">
          <svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>
        </button>
        <button @touchstart.prevent="handleMove('down')" @mousedown.prevent="handleMove('down')" class="move-btn">
          <svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>
        </button>
        <button @touchstart.prevent="handleMove('right')" @mousedown.prevent="handleMove('right')" class="move-btn">
          <svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
        </button>
      </div>
      <div class="control-right">
        <button @touchstart.prevent="handleRotate" @mousedown.prevent="handleRotate" class="action-btn rotate-btn">
          <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-1.76-4.24l-2.12 2.12H20V4l-2.35 2.35z"/></svg>
        </button>
        <button @touchstart.prevent="handleHardDrop" @mousedown.prevent="handleHardDrop" class="action-btn drop-btn">
          <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/><path fill="currentColor" d="M7.41 3.59L12 8.17l4.59-4.58L18 5l-6 6-6-6z"/></svg>
        </button>
      </div>
    </div>

    <!-- Izakaya idle controls -->
    <div class="controls-container izakaya-controls" v-else-if="gameState.mode === 'izakaya'">
      <button
        v-if="gameState.izakayaPhase === 'idle' || gameState.izakayaPhase === 'placed'"
        class="izakaya-drop-btn"
        :disabled="!izakaya.canDrop()"
        @click="izakaya.requestDrop()"
      >
        🎲 ブロックを落とす
      </button>
      <span v-else class="izakaya-phase-spacer">&nbsp;</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const { gameState, movePiece, rotate, hardDrop, startGame, togglePause, isValidMove, commitClear, BOARD_WIDTH, BOARD_HEIGHT, PIECES } = useTetris()
const izakaya = useIzakayaMode()

const pieceNames = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

const canvasRef = ref<HTMLCanvasElement>()
const wrapperRef = ref<HTMLElement>()

const BLOCK_SIZE = 30

// Countdown state
const countdownValue = ref(3)
let countdownInterval: ReturnType<typeof setInterval> | null = null

const showTetrisControls = computed(() => {
  if (gameState.value.mode === 'classic') {
    return gameState.value.started && !gameState.value.gameOver && !gameState.value.paused
  }
  return gameState.value.izakayaPhase === 'dropping'
})

// --- Canvas Rendering ---
const resizeCanvas = () => {
  const canvas = canvasRef.value
  const wrapper = wrapperRef.value
  if (!canvas || !wrapper) return

  const boardRows = gameState.value.board.length || BOARD_HEIGHT
  const logicalW = BOARD_WIDTH * BLOCK_SIZE
  const logicalH = boardRows * BLOCK_SIZE

  // Set the internal resolution
  canvas.width = logicalW
  canvas.height = logicalH

  // Fit to wrapper via CSS
  const availW = wrapper.clientWidth
  const availH = wrapper.clientHeight
  const scale = Math.min(availW / logicalW, availH / logicalH)
  canvas.style.width = Math.floor(logicalW * scale) + 'px'
  canvas.style.height = Math.floor(logicalH * scale) + 'px'
}

const drawBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
  const px = x * BLOCK_SIZE
  const py = y * BLOCK_SIZE

  ctx.fillStyle = color
  ctx.fillRect(px + 1, py + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2)

  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.fillRect(px + 1, py + 1, BLOCK_SIZE - 2, 3)
  ctx.fillRect(px + 1, py + 1, 3, BLOCK_SIZE - 2)

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.fillRect(px + BLOCK_SIZE - 3, py + 1, 2, BLOCK_SIZE - 2)
  ctx.fillRect(px + 1, py + BLOCK_SIZE - 3, BLOCK_SIZE - 2, 2)
}

const drawGhost = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
  const px = x * BLOCK_SIZE
  const py = y * BLOCK_SIZE
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.4
  ctx.lineWidth = 2
  ctx.strokeRect(px + 2, py + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4)
  ctx.globalAlpha = 1
}

let shakeOffset = { x: 0, y: 0 }

const renderBoard = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const board = gameState.value.board
  const boardRows = board.length
  const isIzakaya = gameState.value.mode === 'izakaya'
  const w = BOARD_WIDTH * BLOCK_SIZE
  const h = boardRows * BLOCK_SIZE

  ctx.save()
  ctx.translate(shakeOffset.x, shakeOffset.y)

  // Background
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, w, h)

  // Grid
  ctx.strokeStyle = 'rgba(34,34,34,0.3)'
  ctx.lineWidth = 1
  for (let x = 0; x <= BOARD_WIDTH; x++) {
    ctx.beginPath()
    ctx.moveTo(x * BLOCK_SIZE, 0)
    ctx.lineTo(x * BLOCK_SIZE, h)
    ctx.stroke()
  }
  for (let y = 0; y <= boardRows; y++) {
    ctx.beginPath()
    ctx.moveTo(0, y * BLOCK_SIZE)
    ctx.lineTo(w, y * BLOCK_SIZE)
    ctx.stroke()
  }

  // Red line (izakaya)
  if (isIzakaya) {
    const redLineY = (boardRows - 20) * BLOCK_SIZE
    ctx.strokeStyle = 'rgba(255,51,51,0.7)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, redLineY)
    ctx.lineTo(w, redLineY)
    ctx.stroke()
  }

  // Placed blocks
  for (let y = 0; y < boardRows; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      const block = board[y][x]
      if (block) {
        drawBlock(ctx, x, y, PIECES[block - 1].color)
      }
    }
  }

  // Ghost + current piece
  if (gameState.value.currentPiece) {
    const piece = gameState.value.currentPiece

    let ghostY = 0
    while (isValidMove(piece, board, 0, ghostY + 1)) {
      ghostY++
    }
    if (ghostY > 0) {
      for (let py = 0; py < piece.shape.length; py++) {
        for (let px = 0; px < piece.shape[py].length; px++) {
          if (piece.shape[py][px]) {
            drawGhost(ctx, piece.x + px, piece.y + py + ghostY, piece.color)
          }
        }
      }
    }

    for (let py = 0; py < piece.shape.length; py++) {
      for (let px = 0; px < piece.shape[py].length; px++) {
        if (piece.shape[py][px]) {
          drawBlock(ctx, piece.x + px, piece.y + py, piece.color)
        }
      }
    }
  }

  ctx.restore()
}

const renderWithFlash = (clearTimer: number) => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const board = gameState.value.board
  const boardRows = board.length
  const isIzakaya = gameState.value.mode === 'izakaya'
  const w = BOARD_WIDTH * BLOCK_SIZE
  const h = boardRows * BLOCK_SIZE

  // Shake
  if (clearTimer < 200) {
    shakeOffset.x = (Math.random() - 0.5) * 6
    shakeOffset.y = (Math.random() - 0.5) * 6
  } else {
    shakeOffset.x = 0
    shakeOffset.y = 0
  }

  ctx.save()
  ctx.translate(shakeOffset.x, shakeOffset.y)

  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, w, h)

  // Grid
  ctx.strokeStyle = 'rgba(34,34,34,0.3)'
  ctx.lineWidth = 1
  for (let x = 0; x <= BOARD_WIDTH; x++) {
    ctx.beginPath(); ctx.moveTo(x * BLOCK_SIZE, 0); ctx.lineTo(x * BLOCK_SIZE, h); ctx.stroke()
  }
  for (let y = 0; y <= boardRows; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * BLOCK_SIZE); ctx.lineTo(w, y * BLOCK_SIZE); ctx.stroke()
  }

  if (isIzakaya) {
    const redLineY = (boardRows - 20) * BLOCK_SIZE
    ctx.strokeStyle = 'rgba(255,51,51,0.7)'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(0, redLineY); ctx.lineTo(w, redLineY); ctx.stroke()
  }

  const clearingSet = new Set(gameState.value.clearingRows)
  const flashPhase = Math.floor(clearTimer / 60) % 2 === 0

  for (let y = 0; y < boardRows; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      const block = board[y][x]
      if (block) {
        if (clearingSet.has(y)) {
          if (flashPhase) {
            ctx.fillStyle = 'rgba(255,255,255,0.9)'
            ctx.fillRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2)
          }
        } else {
          drawBlock(ctx, x, y, PIECES[block - 1].color)
        }
      }
    }
  }

  ctx.restore()
}

// --- Game Loop ---
let dropTimer = 0
let clearTimer = 0
let isClearing = false
let izakayaDropTimer = 0
let lastTime = 0
let animFrameId = 0

const gameLoop = (time: number) => {
  const delta = lastTime ? time - lastTime : 16
  lastTime = time

  if (gameState.value.started) {
    if (gameState.value.mode === 'izakaya') {
      updateIzakaya(delta)
    } else {
      updateClassic(delta)
    }
  }

  animFrameId = requestAnimationFrame(gameLoop)
}

const updateClassic = (delta: number) => {
  if (gameState.value.gameOver || gameState.value.paused) return

  if (gameState.value.clearingRows.length > 0) {
    handleClearAnim(delta, false)
    return
  }

  dropTimer += delta
  const speed = Math.max(100, 1000 - (gameState.value.level - 1) * 100)
  if (dropTimer > speed) {
    movePiece('down')
    dropTimer = 0
  }

  shakeOffset.x = 0
  shakeOffset.y = 0
  renderBoard()
}

const updateIzakaya = (delta: number) => {
  if (gameState.value.clearingRows.length > 0) {
    handleClearAnim(delta, true)
    return
  }

  if (gameState.value.izakayaPhase === 'dropping') {
    izakayaDropTimer += delta
    if (izakayaDropTimer > 1500) {
      movePiece('down')
      izakayaDropTimer = 0
    }
    if (!gameState.value.currentPiece && gameState.value.clearingRows.length === 0) {
      izakaya.onIzakayaPiecePlaced()
    }
  }

  shakeOffset.x = 0
  shakeOffset.y = 0
  renderBoard()
}

const handleClearAnim = (delta: number, isIzakayaMode: boolean) => {
  if (!isClearing) {
    isClearing = true
    clearTimer = 0
  }
  clearTimer += delta
  renderWithFlash(clearTimer)

  if (clearTimer >= 400) {
    isClearing = false
    shakeOffset.x = 0
    shakeOffset.y = 0
    commitClear()
    dropTimer = 0
    izakayaDropTimer = 0

    if (isIzakayaMode) {
      izakaya.onIzakayaClearDone()
    }
  }
}

// --- Handlers ---
const handleMove = (direction: 'left' | 'right' | 'down') => { movePiece(direction) }
const handleRotate = () => { rotate() }
const handleHardDrop = () => {
  if (gameState.value.mode === 'izakaya') {
    hardDrop()
    if (!gameState.value.currentPiece && gameState.value.clearingRows.length === 0) {
      izakaya.onIzakayaPiecePlaced()
    }
  } else {
    hardDrop()
  }
}

const showMenu = ref(false)

const handleStartClassic = () => { startGame() }
const handleStartIzakaya = () => { izakaya.initIzakayaRandom() }
const handleIzakayaFromClassic = () => { izakaya.initIzakayaFromClassic() }

const openMenu = () => {
  if (!gameState.value.paused) togglePause()
  showMenu.value = true
}
const handleResume = () => {
  showMenu.value = false
  if (gameState.value.paused) togglePause()
}
const handleRestart = () => {
  showMenu.value = false
  if (gameState.value.mode === 'izakaya') {
    izakaya.initIzakayaRandom()
  } else {
    startGame()
  }
}
const handleQuit = () => {
  showMenu.value = false
  gameState.value.started = false
  gameState.value.paused = false
  gameState.value.gameOver = false
  gameState.value.currentPiece = null
  gameState.value.mode = 'classic'
  gameState.value.izakayaPhase = 'idle'
}

// Resize canvas when board changes
watch(() => gameState.value.board.length, () => {
  nextTick(() => resizeCanvas())
})

// Countdown logic
watch(() => gameState.value.izakayaPhase, (phase) => {
  if (phase === 'countdown') {
    countdownValue.value = 3
    if (countdownInterval) clearInterval(countdownInterval)
    countdownInterval = setInterval(() => {
      countdownValue.value--
      if (countdownValue.value <= 0) {
        if (countdownInterval) clearInterval(countdownInterval)
        countdownInterval = null
        izakaya.startDropping()
      }
    }, 1000)
  } else {
    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }
  }
})

onMounted(() => {
  resizeCanvas()
  animFrameId = requestAnimationFrame(gameLoop)

  window.addEventListener('resize', resizeCanvas)
})

onUnmounted(() => {
  cancelAnimationFrame(animFrameId)
  window.removeEventListener('resize', resizeCanvas)
  if (countdownInterval) clearInterval(countdownInterval)
})

// Keyboard controls
onMounted(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (gameState.value.mode === 'classic' && gameState.value.gameOver) {
      if (e.key === 'Enter') startGame()
      return
    }

    const canControl = gameState.value.mode === 'classic'
      ? (gameState.value.started && !gameState.value.gameOver && !gameState.value.paused)
      : gameState.value.izakayaPhase === 'dropping'

    if (canControl) {
      switch (e.key) {
        case 'ArrowLeft': movePiece('left'); break
        case 'ArrowRight': movePiece('right'); break
        case 'ArrowDown': movePiece('down'); break
        case 'ArrowUp': rotate(); break
        case ' ': handleHardDrop(); break
      }
    }

    switch (e.key) {
      case 'p':
      case 'P':
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
  onUnmounted(() => { window.removeEventListener('keydown', handleKeyPress) })
})
</script>
