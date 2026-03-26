<template>
  <div id="game-container">
    <!-- Header -->
    <div class="game-header" v-if="gameState.started">
      <!-- Classic header -->
      <template v-if="gameState.mode === 'classic'">
        <div class="score-display">Lv.{{ gameState.level }}</div>
        <button v-if="!gameState.gameOver" @click="openMenu" class="icon-btn">
          <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        </button>
      </template>
      <!-- Izakaya header -->
      <template v-else>
        <div class="izk-header">
          <div class="stock-group" :class="{ 'stock-highlight': showStockHint }">
            <span class="stock-label">ストック</span>
            <button class="icon-btn small" @click="izakaya.removeStock(1)">
              <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M19 13H5v-2h14v2z"/></svg>
            </button>
            <span class="stock-number">{{ gameState.stocks }}</span>
            <button class="icon-btn small" @click="izakaya.addStock(1)">
              <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            </button>
          </div>
          <div class="izk-header-actions">
            <button class="icon-btn small" :disabled="!izakaya.canUndo()" @click="izakaya.undo()">
              <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12.5 8c-2.65 0-5.05 1.04-6.83 2.73L3 8v8h8l-2.68-2.68A7.46 7.46 0 0 1 12.5 11c3.04 0 5.62 1.82 6.78 4.42l2.22-.93A9.96 9.96 0 0 0 12.5 8z"/></svg>
            </button>
            <button class="icon-btn small" :disabled="!izakaya.canRedo()" @click="izakaya.redo()">
              <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M11.5 8c2.65 0 5.05 1.04 6.83 2.73L21 8v8h-8l2.68-2.68A7.46 7.46 0 0 0 11.5 11c-3.04 0-5.62 1.82-6.78 4.42L2.5 14.5A9.96 9.96 0 0 1 11.5 8z"/></svg>
            </button>
            <button class="icon-btn small" @click="takeScreenshot" title="スクリーンショット">
              <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M21 6h-3.17L16 4h-8l-1.83 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-9 11c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.65 0-3 1.35-3 3s1.35 3 3 3 3-1.35 3-3-1.35-3-3-3z"/></svg>
            </button>
            <button class="icon-btn small" @click="openMenu">
              <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- Main Area -->
    <div class="game-main">
      <!-- Canvas -->
      <div class="game-canvas-wrapper" ref="wrapperRef">
        <canvas ref="canvasRef"></canvas>

        <!-- Overlays -->
        <div v-if="!gameState.started" class="title-overlay">
          <div class="title-text">居酒屋<br>ブロック落とし</div>
          <div class="mode-buttons">
            <button class="mode-btn" @click="handleStartClassic" @touchstart.prevent="handleStartClassic">まずゲームオーバーになるまで遊ぶ</button>
            <button class="mode-btn mode-btn-izakaya" @click="handleStartIzakaya" @touchstart.prevent="handleStartIzakaya">ゲームオーバー状態から開始する</button>
            <button v-if="hasSave" class="mode-btn mode-btn-resume" @click="handleResumeSave" @touchstart.prevent="handleResumeSave">続きから</button>
            <button class="mode-btn mode-btn-help" @click="showHelp = true">遊び方</button>
          </div>
        </div>

        <div v-else-if="gameState.mode === 'classic' && gameState.gameOver" class="title-overlay">
          <div class="gameover-text">GAME OVER</div>
          <div class="mode-buttons">
            <button class="mode-btn" @click="handleStartClassic">もう一回</button>
            <button class="mode-btn mode-btn-izakaya" @click="handleIzakayaFromClassic">この盤面から開始する</button>
          </div>
        </div>

        <div v-else-if="showMenu" class="title-overlay" @click.self="handleResume" @touchstart.self.prevent="handleResume">
          <div class="menu-box" v-if="!confirmAction">
            <div class="menu-title">中断中</div>
            <div v-if="gameState.mode === 'izakaya'" class="menu-stats">
              <div class="menu-stats-row">落としたブロック<span>{{ gameState.droppedCount }}</span></div>
              <div class="menu-stats-row">注文品数<span>{{ gameState.stocksUsed }}</span></div>
            </div>
            <button class="menu-item" @click="handleResume">再開</button>
            <button class="menu-item" @click="showHelp = true; showMenu = false">遊び方</button>
            <button class="menu-item" @click="confirmAction = 'restart'">最初から</button>
            <button class="menu-item menu-item-quit" @click="handleQuit">やめる</button>
          </div>
          <div class="menu-box" v-else>
            <div class="menu-title">最初からやり直しますか？</div>
            <div class="confirm-text">現在の盤面データは失われます</div>
            <button class="menu-item menu-item-quit" @click="handleRestart">はい</button>
            <button class="menu-item" @click="confirmAction = null">いいえ</button>
          </div>
        </div>

        <div v-else-if="gameState.izakayaPhase === 'confirm'" class="title-overlay">
          <div class="menu-box">
            <div class="menu-title">ブロックを落とす</div>
            <div class="confirm-text">ストックを1消費して<br>ブロックを落としますか？</div>
            <button class="menu-item" @click="izakaya.skipExclusion()">落とす</button>
            <button class="menu-item" @click="izakaya.openExclusion()">落としたくないブロックを選ぶ</button>
            <button class="menu-item menu-item-quit" @click="izakaya.cancelDrop()">キャンセル</button>
          </div>
        </div>

        <div v-else-if="gameState.izakayaPhase === 'exclusion'" class="title-overlay">
          <div class="menu-box exclusion-box">
            <div class="menu-title">落としたくないブロックを選ぶ</div>
            <div class="exclusion-desc">出てほしくないブロックを選択（1つにつき+1ストック）</div>
            <div class="exclusion-grid">
              <button v-for="dt in izakaya.ALL_DRAW_TYPES" :key="dt" class="exclusion-item" :class="{ selected: gameState.excludedPieces.includes(dt) }" @click="izakaya.toggleExclude(dt)">
                <PiecePreview v-if="dt < 7" :piece-index="dt" />
                <span v-else-if="dt === izakaya.DRAW_WILDCARD" class="draw-label">?</span>
                <span v-else class="draw-label">--</span>
              </button>
            </div>
            <div class="exclusion-cost">追加コスト: {{ izakaya.exclusionCost() }} （合計 {{ 1 + izakaya.exclusionCost() }}）</div>
            <button class="menu-item" @click="izakaya.confirmExclusion()">決定</button>
            <button class="menu-item menu-item-quit" @click="izakaya.skipExclusion()">使わない</button>
          </div>
        </div>

        <!-- Rolling animation -->
        <div v-else-if="gameState.izakayaPhase === 'rolling'" class="title-overlay">
          <div class="rolling-container">
            <div class="rolling-slot">
              <div class="rolling-items">
                <template v-if="rollingPool[rollingTick % rollingPool.length] < 7">
                  <PiecePreview :piece-index="rollingPool[rollingTick % rollingPool.length]" size="large" />
                </template>
                <span v-else-if="rollingPool[rollingTick % rollingPool.length] === izakaya.DRAW_WILDCARD" class="rolling-result-text">?</span>
                <span v-else class="rolling-result-text dim">--</span>
              </div>
            </div>
            <div class="rolling-label">抽選中...</div>
          </div>
        </div>

        <!-- Draw result: piece -->
        <div v-else-if="gameState.izakayaPhase === 'drawing' && gameState.drawnResult?.type === 'piece'" class="title-overlay" @click="izakaya.confirmDraw()" @touchstart.prevent="izakaya.confirmDraw()">
          <div class="drawing-result">
            <PiecePreview :piece-index="gameState.drawnResult.pieceIndex" size="large" />
            <div class="drawn-label">ブロック出現</div>
            <div class="start-text">タップするとブロックが落ちてきます</div>
          </div>
        </div>

        <!-- Draw result: wildcard -->
        <div v-else-if="gameState.izakayaPhase === 'drawing' && gameState.drawnResult?.type === 'wildcard'" class="title-overlay" @click="izakaya.confirmDraw()" @touchstart.prevent="izakaya.confirmDraw()">
          <div class="drawing-result">
            <div class="drawn-text">?</div>
            <div class="drawn-label">何でもブロック</div>
            <div class="start-text">タップしてブロックを選ぶ</div>
          </div>
        </div>

        <!-- Draw result: miss -->
        <div v-else-if="gameState.izakayaPhase === 'drawing' && gameState.drawnResult?.type === 'miss'" class="title-overlay" @click="izakaya.dismissMiss()" @touchstart.prevent="izakaya.dismissMiss()">
          <div class="drawing-result">
            <div class="drawn-text miss">ハズレ</div>
            <div class="start-text">タップして戻る</div>
          </div>
        </div>

        <!-- Wildcard selection -->
        <div v-else-if="gameState.izakayaPhase === 'wildcard'" class="title-overlay">
          <div class="menu-box">
            <div class="menu-title">何でもブロック</div>
            <div class="wildcard-grid">
              <button v-for="(_, i) in PIECES" :key="i" class="wildcard-item" @click="izakaya.selectWildcard(i)">
                <PiecePreview :piece-index="i" />
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="gameState.izakayaPhase === 'countdown'" class="title-overlay countdown-overlay">
          <div class="countdown-number">{{ countdownValue }}</div>
        </div>

        <div v-else-if="gameState.izakayaPhase === 'won'" class="title-overlay won-overlay">
          <div class="won-flash"></div>
          <div class="won-content">
            <div class="won-text">クリア!</div>
            <div class="won-sub">最終段を消しました</div>
            <button class="mode-btn" @click="handleQuit">タイトルへ</button>
          </div>
        </div>

        <!-- Toast -->
        <div v-if="showStockHint" class="toast" @click="showStockHint = false">
          ストックが足りません。<br>何か注文したら、上の「+」ボタンでストックを追加してください。
        </div>
      </div>
    </div>

    <!-- Bottom: Tetris controls (classic + izakaya dropping) -->
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

    <!-- Bottom: Izakaya idle/placed -->
    <div class="controls-container izk-bottom" v-else-if="gameState.mode === 'izakaya' && gameState.started && (gameState.izakayaPhase === 'idle' || gameState.izakayaPhase === 'placed')">
      <button class="izk-drop-btn" :class="{ disabled: !izakaya.canDrop() }" @click="handleDropButton">
        ブロックを落とす
      </button>
    </div>

    <!-- Help (full screen overlay, outside game-main for proper scrolling) -->
    <div v-if="showHelp" class="help-overlay">
      <div class="help-box">
        <div class="help-scroll">
          <div class="help-title">遊び方</div>

          <div class="help-section">
            <div class="help-heading">ゲームの流れ</div>
            <ol class="help-list">
              <li>まず普通にプレイしてゲームオーバーにする（またはランダム盤面で開始）</li>
              <li>居酒屋で何か注文するたびに「+」ボタンでストックを貯める</li>
              <li>ストックを消費して「ブロックを落とす」を実行</li>
              <li>ランダムでブロックが決まり、落として配置する</li>
              <li>一番下の行を消せばクリア!</li>
            </ol>
          </div>

          <div class="help-section">
            <div class="help-heading">ブロックの抽選</div>
            <p class="help-text">ストックを1つ消費して抽選します。9種類の中からランダムで1つ決まります。</p>
            <ul class="help-list">
              <li><b>通常ブロック（7種）</b> --- そのブロックが落ちてきます</li>
              <li><b>何でもブロック（?）</b> --- 好きなブロックを1つ選べます</li>
              <li><b>ハズレ（--）</b> --- 何も起きません。ストックだけ消費されます</li>
            </ul>
          </div>

          <div class="help-section">
            <div class="help-heading">落としたくないブロックを選ぶ</div>
            <p class="help-text">追加でストックを消費して、出てほしくないブロックやハズレを抽選から除外できます。1つ除外するごとに+1ストック消費。</p>
          </div>

          <div class="help-section">
            <div class="help-heading">ボタンの説明</div>
            <dl class="help-dl">
              <div class="help-dl-row"><dt>+ / −</dt><dd>ストックの増減（注文したら+）</dd></div>
              <div class="help-dl-row">
                <dt>
                  <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12.5 8c-2.65 0-5.05 1.04-6.83 2.73L3 8v8h8l-2.68-2.68A7.46 7.46 0 0 1 12.5 11c3.04 0 5.62 1.82 6.78 4.42l2.22-.93A9.96 9.96 0 0 0 12.5 8z"/></svg>
                  /
                  <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M11.5 8c2.65 0 5.05 1.04 6.83 2.73L21 8v8h-8l2.68-2.68A7.46 7.46 0 0 0 11.5 11c-3.04 0-5.62 1.82-6.78 4.42L2.5 14.5A9.96 9.96 0 0 1 11.5 8z"/></svg>
                </dt><dd>元に戻す / やり直し</dd></div>
              <div class="help-dl-row">
                <dt><svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg></dt>
                <dd>メニュー</dd>
              </div>
            </dl>
          </div>

          <div class="help-section">
            <div class="help-heading">操作（ブロック落下中）</div>
            <dl class="help-dl">
              <div class="help-dl-row"><dt>← →</dt><dd>左右移動</dd></div>
              <div class="help-dl-row"><dt>↓</dt><dd>下に移動</dd></div>
              <div class="help-dl-row">
                <dt><svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-1.76-4.24l-2.12 2.12H20V4l-2.35 2.35z"/></svg></dt>
                <dd>回転</dd>
              </div>
              <div class="help-dl-row"><dt>↓↓</dt><dd>一気に落とす</dd></div>
            </dl>
          </div>
        </div>
        <button class="mode-btn" @click="showHelp = false">閉じる</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const PiecePreview = defineComponent({
  props: { pieceIndex: { type: Number, required: true }, size: { type: String, default: 'small' } },
  setup(props) {
    const { PIECES } = useTetris()
    return () => {
      const piece = PIECES[props.pieceIndex]
      if (!piece) return null
      const s = props.size === 'large' ? 16 : 8
      return h('div', { class: 'piece-preview', style: { display: 'inline-grid', gridTemplateColumns: `repeat(${piece.shape[0].length}, ${s}px)`, gap: '1px' } },
        piece.shape.flatMap((row: number[]) => row.map((cell: number) =>
          h('div', { style: { width: s + 'px', height: s + 'px', borderRadius: '2px', background: cell ? piece.color : 'transparent' } })
        ))
      )
    }
  }
})

const { gameState, movePiece, rotate, hardDrop, startGame, togglePause, isValidMove, commitClear, BOARD_WIDTH, BOARD_HEIGHT, PIECES } = useTetris()
const izakaya = useIzakayaMode()

const canvasRef = ref<HTMLCanvasElement>()
const wrapperRef = ref<HTMLElement>()
const BLOCK_SIZE = 30
const countdownValue = ref(3)
let countdownInterval: ReturnType<typeof setInterval> | null = null
const hasSave = ref(false)
let resizeObserver: ResizeObserver | null = null

// Rolling animation state
const rollingDone = ref(false)
const rollingTick = ref(0)
let rollingInterval: ReturnType<typeof setInterval> | null = null

const rollingPool = computed(() => {
  const excluded = gameState.value.excludedPieces
  return izakaya.ALL_DRAW_TYPES.filter((t: number) => !excluded.includes(t))
})

const showTetrisControls = computed(() => {
  if (gameState.value.mode === 'classic') return gameState.value.started && !gameState.value.gameOver && !gameState.value.paused
  return gameState.value.izakayaPhase === 'dropping'
})

// --- Canvas ---
const resizeCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const boardRows = gameState.value.board.length || BOARD_HEIGHT
  canvas.width = BOARD_WIDTH * BLOCK_SIZE
  canvas.height = boardRows * BLOCK_SIZE
}

const drawBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
  const px = x * BLOCK_SIZE, py = y * BLOCK_SIZE
  ctx.fillStyle = color
  ctx.fillRect(px + 1, py + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2)
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.fillRect(px + 1, py + 1, BLOCK_SIZE - 2, 3)
  ctx.fillRect(px + 1, py + 1, 3, BLOCK_SIZE - 2)
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.fillRect(px + BLOCK_SIZE - 3, py + 1, 2, BLOCK_SIZE - 2)
  ctx.fillRect(px + 1, py + BLOCK_SIZE - 3, BLOCK_SIZE - 2, 2)
}

const drawGhost = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
  const px = x * BLOCK_SIZE, py = y * BLOCK_SIZE
  ctx.strokeStyle = color; ctx.globalAlpha = 0.4; ctx.lineWidth = 2
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
  const isIzk = gameState.value.mode === 'izakaya'
  const w = BOARD_WIDTH * BLOCK_SIZE, h = boardRows * BLOCK_SIZE

  ctx.save(); ctx.translate(shakeOffset.x, shakeOffset.y)
  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(34,34,34,0.3)'; ctx.lineWidth = 1
  for (let x = 0; x <= BOARD_WIDTH; x++) { ctx.beginPath(); ctx.moveTo(x * BLOCK_SIZE, 0); ctx.lineTo(x * BLOCK_SIZE, h); ctx.stroke() }
  for (let y = 0; y <= boardRows; y++) { ctx.beginPath(); ctx.moveTo(0, y * BLOCK_SIZE); ctx.lineTo(w, y * BLOCK_SIZE); ctx.stroke() }
  if (isIzk && boardRows >= 20) {
    const ry = (boardRows - 20) * BLOCK_SIZE
    ctx.strokeStyle = 'rgba(255,51,51,0.7)'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(w, ry); ctx.stroke()
  }
  for (let y = 0; y < boardRows; y++) for (let x = 0; x < BOARD_WIDTH; x++) { const b = board[y][x]; if (b) drawBlock(ctx, x, y, PIECES[b - 1].color) }
  if (gameState.value.currentPiece) {
    const p = gameState.value.currentPiece
    let gy = 0; while (isValidMove(p, board, 0, gy + 1)) gy++
    if (gy > 0) for (let py = 0; py < p.shape.length; py++) for (let px = 0; px < p.shape[py].length; px++) if (p.shape[py][px]) drawGhost(ctx, p.x + px, p.y + py + gy, p.color)
    for (let py = 0; py < p.shape.length; py++) for (let px = 0; px < p.shape[py].length; px++) if (p.shape[py][px]) drawBlock(ctx, p.x + px, p.y + py, p.color)
  }
  ctx.restore()
}

const renderWithFlash = (ct: number) => {
  const canvas = canvasRef.value; if (!canvas) return
  const ctx = canvas.getContext('2d'); if (!ctx) return
  const board = gameState.value.board, boardRows = board.length, isIzk = gameState.value.mode === 'izakaya'
  const w = BOARD_WIDTH * BLOCK_SIZE, h = boardRows * BLOCK_SIZE
  if (ct < 200) { shakeOffset.x = (Math.random() - 0.5) * 6; shakeOffset.y = (Math.random() - 0.5) * 6 } else { shakeOffset.x = 0; shakeOffset.y = 0 }
  ctx.save(); ctx.translate(shakeOffset.x, shakeOffset.y)
  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(34,34,34,0.3)'; ctx.lineWidth = 1
  for (let x = 0; x <= BOARD_WIDTH; x++) { ctx.beginPath(); ctx.moveTo(x * BLOCK_SIZE, 0); ctx.lineTo(x * BLOCK_SIZE, h); ctx.stroke() }
  for (let y = 0; y <= boardRows; y++) { ctx.beginPath(); ctx.moveTo(0, y * BLOCK_SIZE); ctx.lineTo(w, y * BLOCK_SIZE); ctx.stroke() }
  if (isIzk && boardRows >= 20) { const ry = (boardRows - 20) * BLOCK_SIZE; ctx.strokeStyle = 'rgba(255,51,51,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(w, ry); ctx.stroke() }
  const cs = new Set(gameState.value.clearingRows), fp = Math.floor(ct / 60) % 2 === 0
  for (let y = 0; y < boardRows; y++) for (let x = 0; x < BOARD_WIDTH; x++) { const b = board[y][x]; if (b) { if (cs.has(y)) { if (fp) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2) } } else drawBlock(ctx, x, y, PIECES[b - 1].color) } }
  ctx.restore()
}

// --- Game Loop ---
let dropTimer = 0, clearTimer = 0, isClearing = false, izakayaDropTimer = 0, lastTime = 0, animFrameId = 0

const gameLoop = (time: number) => {
  const delta = lastTime ? time - lastTime : 16; lastTime = time
  if (gameState.value.started) { if (gameState.value.mode === 'izakaya') updateIzakaya(delta); else updateClassic(delta) }
  animFrameId = requestAnimationFrame(gameLoop)
}
const updateClassic = (d: number) => {
  if (gameState.value.gameOver || gameState.value.paused) return
  if (gameState.value.clearingRows.length > 0) { handleClear(d, false); return }
  dropTimer += d; const sp = Math.max(100, 1000 - (gameState.value.level - 1) * 100)
  if (dropTimer > sp) { movePiece('down'); dropTimer = 0 }
  shakeOffset.x = 0; shakeOffset.y = 0; renderBoard()
}
const updateIzakaya = (d: number) => {
  if (gameState.value.clearingRows.length > 0) { handleClear(d, true); return }
  if (gameState.value.izakayaPhase === 'dropping') {
    izakayaDropTimer += d
    if (izakayaDropTimer > 1500) { movePiece('down'); izakayaDropTimer = 0 }
    if (!gameState.value.currentPiece && gameState.value.clearingRows.length === 0) izakaya.onIzakayaPiecePlaced()
  }
  shakeOffset.x = 0; shakeOffset.y = 0; renderBoard()
}
const handleClear = (d: number, izk: boolean) => {
  if (!isClearing) { isClearing = true; clearTimer = 0 }
  clearTimer += d; renderWithFlash(clearTimer)
  if (clearTimer >= 400) { isClearing = false; shakeOffset.x = 0; shakeOffset.y = 0; commitClear(); dropTimer = 0; izakayaDropTimer = 0; if (izk) izakaya.onIzakayaClearDone() }
}

// --- Screenshot ---
const takeScreenshot = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  // Re-render without shake
  shakeOffset.x = 0; shakeOffset.y = 0
  renderBoard()

  const link = document.createElement('a')
  link.download = `izakaya-block-turn${gameState.value.droppedCount}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

// --- Handlers ---
const handleMove = (dir: 'left' | 'right' | 'down') => { movePiece(dir) }
const handleRotate = () => { rotate() }
const handleHardDrop = () => {
  if (gameState.value.mode === 'izakaya') { hardDrop(); if (!gameState.value.currentPiece && gameState.value.clearingRows.length === 0) izakaya.onIzakayaPiecePlaced() }
  else hardDrop()
}
const showMenu = ref(false)
const showHelp = ref(false)
const showStockHint = ref(false)
let stockHintTimer: ReturnType<typeof setTimeout> | null = null

const handleDropButton = () => {
  if (izakaya.canDrop()) {
    showStockHint.value = false
    izakaya.requestDrop()
  } else {
    showStockHint.value = true
    if (stockHintTimer) clearTimeout(stockHintTimer)
    stockHintTimer = setTimeout(() => { showStockHint.value = false }, 3000)
  }
}
const confirmAction = ref<'restart' | 'quit' | null>(null)
const handleStartClassic = () => { startGame() }
const handleStartIzakaya = () => { izakaya.initIzakayaRandom() }
const handleIzakayaFromClassic = () => { izakaya.initIzakayaFromClassic() }
const handleResumeSave = () => { izakaya.loadFromStorage() }
const openMenu = () => { if (gameState.value.mode === 'classic' && !gameState.value.paused) togglePause(); showMenu.value = true }
const handleResume = () => { showMenu.value = false; confirmAction.value = null; if (gameState.value.paused) togglePause() }
const handleRestart = () => { showMenu.value = false; confirmAction.value = null; if (gameState.value.mode === 'izakaya') { izakaya.clearStorage(); izakaya.initIzakayaRandom() } else startGame() }
const handleQuit = () => {
  showMenu.value = false; confirmAction.value = null
  gameState.value.started = false; gameState.value.paused = false; gameState.value.gameOver = false
  gameState.value.currentPiece = null; gameState.value.mode = 'classic'; gameState.value.izakayaPhase = 'idle'
  try { hasSave.value = !!localStorage.getItem('izakaya-block-save') } catch {}
}


watch(() => gameState.value.board.length, () => { nextTick(() => resizeCanvas()) })
watch(() => gameState.value.izakayaPhase, (phase) => {
  // Countdown
  if (phase === 'countdown') { countdownValue.value = 3; if (countdownInterval) clearInterval(countdownInterval); countdownInterval = setInterval(() => { countdownValue.value--; if (countdownValue.value <= 0) { clearInterval(countdownInterval!); countdownInterval = null; izakaya.startDropping() } }, 1000) }
  else { if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null } }

  // Rolling animation
  if (phase === 'rolling') {
    rollingDone.value = false; rollingTick.value = 0
    if (rollingInterval) clearInterval(rollingInterval)
    rollingInterval = setInterval(() => { rollingTick.value++ }, 80)
    setTimeout(() => {
      if (rollingInterval) { clearInterval(rollingInterval); rollingInterval = null }
      rollingDone.value = true
      izakaya.revealDraw()
    }, 1500)
  } else {
    if (rollingInterval) { clearInterval(rollingInterval); rollingInterval = null }
  }
})

// Warn before leaving during izakaya mode
const beforeUnload = (e: BeforeUnloadEvent) => {
  if (gameState.value.mode === 'izakaya' && gameState.value.started) {
    e.preventDefault()
  }
}

// Prevent all zoom (pinch, double-tap, gesture)
const preventZoom = (e: TouchEvent) => {
  if (e.touches.length > 1) e.preventDefault()
}
const preventGestureZoom = (e: Event) => { e.preventDefault() }
let lastTouchEnd = 0
const preventDoubleTapZoom = (e: TouchEvent) => {
  const now = Date.now()
  if (now - lastTouchEnd < 300) e.preventDefault()
  lastTouchEnd = now
}

onMounted(() => {
  try { hasSave.value = !!localStorage.getItem('izakaya-block-save') } catch {}
  resizeCanvas()
  animFrameId = requestAnimationFrame(gameLoop)
  if (wrapperRef.value) { resizeObserver = new ResizeObserver(() => resizeCanvas()); resizeObserver.observe(wrapperRef.value) }
  window.addEventListener('beforeunload', beforeUnload)
  document.addEventListener('touchstart', preventZoom, { passive: false })
  document.addEventListener('touchend', preventDoubleTapZoom, { passive: false })
  document.addEventListener('gesturestart', preventGestureZoom)
  document.addEventListener('gesturechange', preventGestureZoom)
})
onUnmounted(() => {
  cancelAnimationFrame(animFrameId)
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null }
  if (countdownInterval) clearInterval(countdownInterval)
  if (rollingInterval) clearInterval(rollingInterval)
  window.removeEventListener('beforeunload', beforeUnload)
  document.removeEventListener('touchstart', preventZoom)
  document.removeEventListener('touchend', preventDoubleTapZoom)
  document.removeEventListener('gesturestart', preventGestureZoom)
  document.removeEventListener('gesturechange', preventGestureZoom)
})
onMounted(() => {
  const kp = (e: KeyboardEvent) => {
    if (gameState.value.mode === 'classic' && gameState.value.gameOver) { if (e.key === 'Enter') startGame(); return }
    const cc = gameState.value.mode === 'classic' ? (gameState.value.started && !gameState.value.gameOver && !gameState.value.paused) : gameState.value.izakayaPhase === 'dropping'
    if (cc) { switch (e.key) { case 'ArrowLeft': movePiece('left'); break; case 'ArrowRight': movePiece('right'); break; case 'ArrowDown': movePiece('down'); break; case 'ArrowUp': rotate(); break; case ' ': handleHardDrop(); break } }
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); izakaya.undo() }
    if (e.key === 'y' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); izakaya.redo() }
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { if (showMenu.value) handleResume(); else if (gameState.value.started && !gameState.value.gameOver) openMenu() }
  }
  window.addEventListener('keydown', kp)
  onUnmounted(() => window.removeEventListener('keydown', kp))
})
</script>
