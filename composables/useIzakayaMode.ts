import type { DrawnResult, IzakayaPhase } from './useTetris'

export const useIzakayaMode = () => {
  const {
    gameState, movePiece, isValidMove, commitClear, createPiece,
    initBoard, findFullRows,
    BOARD_WIDTH, BOARD_HEIGHT, MAX_BOARD_HEIGHT, PIECES
  } = useTetris()

  // --- Stock Management ---
  const addStock = (n: number = 1) => {
    gameState.value.stocks += n
  }

  const removeStock = (n: number = 1) => {
    gameState.value.stocks = Math.max(0, gameState.value.stocks - n)
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
      // Check if player has enough stocks (1 base + current exclusions + 1 new)
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
    const result = drawPiece(gameState.value.excludedPieces)
    const totalCost = 1 + exclusionCost()
    removeStock(totalCost)
    gameState.value.drawnResult = result
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
  }

  // --- Piece Spawn for Izakaya Mode ---
  const spawnIzakayaPiece = (pieceIndex: number) => {
    const piece = createPiece(pieceIndex)
    // Spawn at top of the board
    piece.y = 0
    // Find first row with space if top is occupied
    while (!isValidMove(piece, gameState.value.board) && piece.y > -4) {
      piece.y--
    }
    gameState.value.currentPiece = piece
  }

  // --- Piece Placed (izakaya mode) ---
  // Called AFTER movePiece already merged the piece and set currentPiece = null
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
      } else {
        setPhase('placed')
      }
    }
  }

  // Called after line clear animation in izakaya mode
  const onIzakayaClearDone = () => {
    gameState.value.currentPiece = null
    gameState.value.drawnResult = null
    gameState.value.excludedPieces = []

    if (checkWin()) {
      setPhase('won')
    } else {
      setPhase('placed')
    }
  }

  // --- Win Condition ---
  const checkWin = (): boolean => {
    return gameState.value.board.every(row => row.every(cell => cell === 0))
  }

  // --- Board Expansion ---
  const expandBoardIfNeeded = () => {
    const board = gameState.value.board
    // Check if top rows have blocks
    let needExpand = false
    for (let y = 0; y < 4; y++) {
      if (board[y] && board[y].some(cell => cell !== 0)) {
        needExpand = true
        break
      }
    }
    if (needExpand && board.length < MAX_BOARD_HEIGHT) {
      const addRows = Math.min(10, MAX_BOARD_HEIGHT - board.length)
      const emptyRows = []
      for (let i = 0; i < addRows; i++) {
        emptyRows.push(new Array(BOARD_WIDTH).fill(0))
      }
      gameState.value.board = [...emptyRows, ...board]
    }
  }

  // --- Init Izakaya Mode ---
  const initIzakayaFromClassic = () => {
    // Take the current 20-row board as-is (don't expand yet)
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
  }

  const initIzakayaRandom = () => {
    // Generate a 10x25 board: top 5 rows empty, bottom 20 rows randomly filled
    const totalRows = 25
    const board = initBoard(totalRows)
    const emptyTop = 5
    for (let y = emptyTop; y < totalRows; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        // ~65% chance of a block
        if (Math.random() < 0.65) {
          board[y][x] = Math.floor(Math.random() * PIECES.length) + 1
        }
      }
      // Make sure no row is completely full (would auto-clear)
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
  }

  return {
    gameState,
    // Stock
    addStock,
    removeStock,
    canDrop,
    // Draw
    DRAW_WILDCARD,
    DRAW_MISS,
    ALL_DRAW_TYPES,
    exclusionCost,
    // Phase transitions
    requestDrop,
    cancelDrop,
    openExclusion,
    confirmExclusion,
    skipExclusion,
    confirmDraw,
    selectWildcard,
    startDropping,
    dismissMiss,
    toggleExclude,
    // Piece placed
    onIzakayaPiecePlaced,
    onIzakayaClearDone,
    checkWin,
    // Init
    initIzakayaFromClassic,
    initIzakayaRandom,
    // Re-export from useTetris
    movePiece,
    isValidMove,
    commitClear,
    BOARD_WIDTH,
    BOARD_HEIGHT,
    MAX_BOARD_HEIGHT,
    PIECES,
  }
}
