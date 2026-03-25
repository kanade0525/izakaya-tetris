import type { DrawnResult, IzakayaPhase } from './useTetris'

// --- Undo/Redo History ---
interface HistoryEntry {
  board: number[][]
  stocks: number
}

const STORAGE_KEY = 'izakaya-tetris-save'

export const useIzakayaMode = () => {
  const {
    gameState, movePiece, isValidMove, commitClear, createPiece,
    initBoard, findFullRows,
    BOARD_WIDTH, BOARD_HEIGHT, MAX_BOARD_HEIGHT, PIECES
  } = useTetris()

  // --- History for Undo/Redo ---
  const undoStack = ref<HistoryEntry[]>([])
  const redoStack = ref<HistoryEntry[]>([])

  const pushHistory = () => {
    undoStack.value.push({
      board: gameState.value.board.map(row => [...row]),
      stocks: gameState.value.stocks
    })
    redoStack.value = []
    // Limit history size
    if (undoStack.value.length > 50) {
      undoStack.value.shift()
    }
  }

  const undo = () => {
    if (undoStack.value.length === 0) return
    // Save current state to redo
    redoStack.value.push({
      board: gameState.value.board.map(row => [...row]),
      stocks: gameState.value.stocks
    })
    const prev = undoStack.value.pop()!
    gameState.value.board = prev.board
    gameState.value.stocks = prev.stocks
    gameState.value.currentPiece = null
    gameState.value.izakayaPhase = 'idle'
    gameState.value.drawnResult = null
    gameState.value.excludedPieces = []
    gameState.value.clearingRows = []
    saveToStorage()
  }

  const redo = () => {
    if (redoStack.value.length === 0) return
    undoStack.value.push({
      board: gameState.value.board.map(row => [...row]),
      stocks: gameState.value.stocks
    })
    const next = redoStack.value.pop()!
    gameState.value.board = next.board
    gameState.value.stocks = next.stocks
    gameState.value.currentPiece = null
    gameState.value.izakayaPhase = 'idle'
    gameState.value.drawnResult = null
    gameState.value.excludedPieces = []
    gameState.value.clearingRows = []
    saveToStorage()
  }

  const canUndo = () => undoStack.value.length > 0
  const canRedo = () => redoStack.value.length > 0

  // --- LocalStorage Persistence ---
  const saveToStorage = () => {
    if (gameState.value.mode !== 'izakaya') return
    try {
      const data = {
        board: gameState.value.board,
        stocks: gameState.value.stocks,
        undoStack: undoStack.value,
        redoStack: redoStack.value,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {}
  }

  const loadFromStorage = (): boolean => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return false
      const data = JSON.parse(raw)
      if (!data.board || !Array.isArray(data.board)) return false

      gameState.value.board = data.board
      gameState.value.stocks = data.stocks ?? 0
      gameState.value.mode = 'izakaya'
      gameState.value.izakayaPhase = 'idle'
      gameState.value.currentPiece = null
      gameState.value.nextPiece = null
      gameState.value.gameOver = false
      gameState.value.paused = false
      gameState.value.started = true
      gameState.value.drawnResult = null
      gameState.value.excludedPieces = []
      gameState.value.clearingRows = []
      undoStack.value = data.undoStack ?? []
      redoStack.value = data.redoStack ?? []
      return true
    } catch {
      return false
    }
  }

  const clearStorage = () => {
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  // --- Stock Management ---
  const addStock = (n: number = 1) => {
    gameState.value.stocks += n
    saveToStorage()
  }

  const removeStock = (n: number = 1) => {
    gameState.value.stocks = Math.max(0, gameState.value.stocks - n)
    saveToStorage()
  }

  const canDrop = () => gameState.value.stocks > 0

  // --- Draw System (9 types: 0-6 standard, 7 wildcard, 8 miss) ---
  const DRAW_WILDCARD = 7
  const DRAW_MISS = 8
  const ALL_DRAW_TYPES = [0, 1, 2, 3, 4, 5, 6, DRAW_WILDCARD, DRAW_MISS]

  const drawPiece = (excluded: number[]): DrawnResult => {
    const pool = ALL_DRAW_TYPES.filter(t => !excluded.includes(t))
    if (pool.length === 0) return { type: 'miss' }

    const drawn = pool[Math.floor(Math.random() * pool.length)]

    if (drawn === DRAW_MISS) return { type: 'miss' }
    if (drawn === DRAW_WILDCARD) return { type: 'wildcard' }
    return { type: 'piece', pieceIndex: drawn }
  }

  // --- Exclusion ---
  const toggleExclude = (drawType: number) => {
    const idx = gameState.value.excludedPieces.indexOf(drawType)
    if (idx >= 0) {
      gameState.value.excludedPieces.splice(idx, 1)
    } else {
      const totalCost = 1 + gameState.value.excludedPieces.length + 1
      if (totalCost <= gameState.value.stocks) {
        gameState.value.excludedPieces.push(drawType)
      }
    }
  }

  const exclusionCost = () => gameState.value.excludedPieces.length

  // --- Phase Transitions ---
  const setPhase = (phase: IzakayaPhase) => {
    gameState.value.izakayaPhase = phase
  }

  const requestDrop = () => {
    if (!canDrop()) return
    setPhase('confirm')
  }

  const cancelDrop = () => {
    gameState.value.excludedPieces = []
    setPhase('idle')
  }

  const openExclusion = () => {
    gameState.value.excludedPieces = []
    setPhase('exclusion')
  }

  const confirmExclusion = () => {
    executeDraw()
  }

  const skipExclusion = () => {
    gameState.value.excludedPieces = []
    executeDraw()
  }

  const executeDraw = () => {
    // Save state before the draw for undo
    pushHistory()

    const totalCost = 1 + exclusionCost()
    removeStock(totalCost)
    // Result is determined now but revealed after rolling animation
    const result = drawPiece(gameState.value.excludedPieces)
    gameState.value.drawnResult = result
    setPhase('rolling')
  }

  // Called after rolling animation completes
  const revealDraw = () => {
    setPhase('drawing')
  }

  const confirmDraw = () => {
    const result = gameState.value.drawnResult
    if (!result) return

    if (result.type === 'miss') {
      setPhase('miss')
    } else if (result.type === 'wildcard') {
      setPhase('wildcard')
    } else {
      spawnIzakayaPiece(result.pieceIndex)
      setPhase('countdown')
    }
  }

  const selectWildcard = (pieceIndex: number) => {
    gameState.value.drawnResult = { type: 'piece', pieceIndex }
    spawnIzakayaPiece(pieceIndex)
    setPhase('countdown')
  }

  const startDropping = () => {
    setPhase('dropping')
  }

  const dismissMiss = () => {
    gameState.value.drawnResult = null
    gameState.value.excludedPieces = []
    setPhase('idle')
    saveToStorage()
  }

  // --- Piece Spawn for Izakaya Mode ---
  const spawnIzakayaPiece = (pieceIndex: number) => {
    const piece = createPiece(pieceIndex)
    piece.y = 0
    while (!isValidMove(piece, gameState.value.board) && piece.y > -4) {
      piece.y--
    }
    gameState.value.currentPiece = piece
  }

  // --- Piece Placed (izakaya mode) ---
  const onIzakayaPiecePlaced = () => {
    expandBoardIfNeeded()
    const fullRows = findFullRows(gameState.value.board)

    if (fullRows.length > 0) {
      gameState.value.clearingRows = fullRows
    } else {
      gameState.value.drawnResult = null
      gameState.value.excludedPieces = []

      if (checkWin()) {
        setPhase('won')
        clearStorage()
      } else {
        setPhase('placed')
        saveToStorage()
      }
    }
  }

  const onIzakayaClearDone = () => {
    gameState.value.currentPiece = null
    gameState.value.drawnResult = null
    gameState.value.excludedPieces = []

    if (checkWin()) {
      setPhase('won')
      clearStorage()
    } else {
      setPhase('placed')
      saveToStorage()
    }
  }

  // --- Win Condition: last row (bottom) is empty ---
  const checkWin = (): boolean => {
    const board = gameState.value.board
    if (board.length === 0) return false
    return board[board.length - 1].every(cell => cell === 0)
  }

  // --- Board Expansion ---
  // Always maintain 5 empty rows at the top. Add rows one at a time, up to MAX.
  const expandBoardIfNeeded = () => {
    const board = gameState.value.board
    // Count empty rows at top
    let emptyTop = 0
    for (let y = 0; y < board.length; y++) {
      if (board[y].every(cell => cell === 0)) emptyTop++
      else break
    }
    // Need at least 5 empty rows at top
    const needed = 5 - emptyTop
    if (needed > 0 && board.length < MAX_BOARD_HEIGHT) {
      const addRows = Math.min(needed, MAX_BOARD_HEIGHT - board.length)
      const newRows = []
      for (let i = 0; i < addRows; i++) {
        newRows.push(new Array(BOARD_WIDTH).fill(0))
      }
      gameState.value.board = [...newRows, ...board]
    }
  }

  // --- Init Izakaya Mode ---
  const initIzakayaFromClassic = () => {
    gameState.value.mode = 'izakaya'
    gameState.value.izakayaPhase = 'idle'
    gameState.value.stocks = 0
    gameState.value.currentPiece = null
    gameState.value.nextPiece = null
    gameState.value.gameOver = false
    gameState.value.paused = false
    gameState.value.started = true
    gameState.value.drawnResult = null
    gameState.value.excludedPieces = []
    gameState.value.clearingRows = []
    undoStack.value = []
    redoStack.value = []
    expandBoardIfNeeded()
    saveToStorage()
  }

  const initIzakayaRandom = () => {
    const totalRows = 25
    const board = initBoard(totalRows)
    const emptyTop = 5
    for (let y = emptyTop; y < totalRows; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (Math.random() < 0.65) {
          board[y][x] = Math.floor(Math.random() * PIECES.length) + 1
        }
      }
      if (board[y].every(cell => cell !== 0)) {
        board[y][Math.floor(Math.random() * BOARD_WIDTH)] = 0
      }
    }

    gameState.value.board = board as number[][]
    gameState.value.mode = 'izakaya'
    gameState.value.izakayaPhase = 'idle'
    gameState.value.stocks = 0
    gameState.value.currentPiece = null
    gameState.value.nextPiece = null
    gameState.value.score = 0
    gameState.value.lines = 0
    gameState.value.level = 1
    gameState.value.gameOver = false
    gameState.value.paused = false
    gameState.value.started = true
    gameState.value.drawnResult = null
    gameState.value.excludedPieces = []
    gameState.value.clearingRows = []
    undoStack.value = []
    redoStack.value = []
    saveToStorage()
  }

  return {
    gameState,
    addStock, removeStock, canDrop,
    DRAW_WILDCARD, DRAW_MISS, ALL_DRAW_TYPES, exclusionCost,
    requestDrop, cancelDrop, openExclusion, confirmExclusion,
    skipExclusion, confirmDraw, revealDraw, selectWildcard, startDropping,
    dismissMiss, toggleExclude,
    onIzakayaPiecePlaced, onIzakayaClearDone, checkWin,
    initIzakayaFromClassic, initIzakayaRandom,
    loadFromStorage, clearStorage, saveToStorage,
    undo, redo, canUndo, canRedo,
    movePiece, isValidMove, commitClear,
    BOARD_WIDTH, BOARD_HEIGHT, MAX_BOARD_HEIGHT, PIECES,
  }
}
