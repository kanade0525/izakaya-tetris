export interface TetrisPiece {
  shape: number[][]
  color: string
  x: number
  y: number
}

export type IzakayaPhase =
  | 'idle'
  | 'confirm'
  | 'exclusion'
  | 'drawing'
  | 'countdown'
  | 'rolling'
  | 'dropping'
  | 'placed'
  | 'wildcard'
  | 'miss'
  | 'won'

export type DrawnResult =
  | { type: 'piece'; pieceIndex: number }
  | { type: 'wildcard' }
  | { type: 'miss' }

export interface GameState {
  board: number[][]
  currentPiece: TetrisPiece | null
  nextPiece: TetrisPiece | null
  score: number
  lines: number
  level: number
  gameOver: boolean
  paused: boolean
  started: boolean
  clearingRows: number[]
  mode: 'classic' | 'izakaya'
  stocks: number
  izakayaPhase: IzakayaPhase
  excludedPieces: number[]
  drawnResult: DrawnResult | null
  droppedCount: number
  stocksUsed: number
}

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const MAX_BOARD_HEIGHT = 40

const PIECES = [
  // I
  { shape: [[1, 1, 1, 1]], color: '#00f0f0' },
  // O
  { shape: [[1, 1], [1, 1]], color: '#f0f000' },
  // T
  { shape: [[0, 1, 0], [1, 1, 1]], color: '#a000f0' },
  // S
  { shape: [[0, 1, 1], [1, 1, 0]], color: '#00f000' },
  // Z
  { shape: [[1, 1, 0], [0, 1, 1]], color: '#f00000' },
  // J
  { shape: [[1, 0, 0], [1, 1, 1]], color: '#0000f0' },
  // L
  { shape: [[0, 0, 1], [1, 1, 1]], color: '#f0a000' }
]

const gameState = ref<GameState>({
  board: [],
  currentPiece: null,
  nextPiece: null,
  score: 0,
  lines: 0,
  level: 1,
  gameOver: false,
  paused: false,
  started: false,
  clearingRows: [],
  mode: 'classic',
  stocks: 0,
  izakayaPhase: 'idle',
  excludedPieces: [],
  drawnResult: null,
  droppedCount: 0,
  stocksUsed: 0
})

export const useTetris = () => {

  const initBoard = (height: number = BOARD_HEIGHT) => {
    const board = []
    for (let y = 0; y < height; y++) {
      board[y] = new Array(BOARD_WIDTH).fill(0)
    }
    return board
  }

  const createPiece = (type?: number): TetrisPiece => {
    const pieceType = type ?? Math.floor(Math.random() * PIECES.length)
    const piece = PIECES[pieceType]
    return {
      shape: piece.shape.map(row => [...row]),
      color: piece.color,
      x: Math.floor((BOARD_WIDTH - piece.shape[0].length) / 2),
      y: 0
    }
  }

  const isValidMove = (piece: TetrisPiece, board: number[][], offsetX = 0, offsetY = 0): boolean => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = piece.x + x + offsetX
          const newY = piece.y + y + offsetY

          if (newX < 0 || newX >= BOARD_WIDTH || newY >= board.length) {
            return false
          }

          if (newY >= 0 && board[newY][newX]) {
            return false
          }
        }
      }
    }
    return true
  }

  const rotatePiece = (piece: TetrisPiece): number[][] => {
    const rotated = piece.shape[0].map((_, index) =>
      piece.shape.map(row => row[index]).reverse()
    )
    return rotated
  }

  const mergePiece = (piece: TetrisPiece, board: number[][]) => {
    const colorIndex = PIECES.findIndex(p => p.color === piece.color) + 1
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardY = piece.y + y
          const boardX = piece.x + x
          if (boardY >= 0) {
            board[boardY][boardX] = colorIndex
          }
        }
      }
    }
  }

  const findFullRows = (board: number[][]): number[] => {
    const rows: number[] = []
    for (let y = board.length - 1; y >= 0; y--) {
      if (board[y].every(cell => cell !== 0)) {
        rows.push(y)
      }
    }
    return rows
  }

  const commitClear = () => {
    const rows = gameState.value.clearingRows
    if (rows.length === 0) return

    const board = gameState.value.board
    const sorted = [...rows].sort((a, b) => b - a)
    for (const y of sorted) {
      board.splice(y, 1)
      board.unshift(new Array(BOARD_WIDTH).fill(0))
    }

    gameState.value.lines += rows.length
    gameState.value.score += rows.length * 100 * gameState.value.level
    gameState.value.level = Math.floor(gameState.value.lines / 10) + 1
    gameState.value.clearingRows = []

    if (gameState.value.mode === 'izakaya') {
      // Don't auto-spawn in izakaya mode
      return
    }

    gameState.value.currentPiece = gameState.value.nextPiece
    gameState.value.nextPiece = createPiece()

    if (gameState.value.currentPiece && !isValidMove(gameState.value.currentPiece, gameState.value.board)) {
      gameState.value.gameOver = true
    }
  }

  const movePiece = (direction: 'left' | 'right' | 'down') => {
    if (!gameState.value.currentPiece || gameState.value.gameOver || gameState.value.paused) return false

    const offsetX = direction === 'left' ? -1 : direction === 'right' ? 1 : 0
    const offsetY = direction === 'down' ? 1 : 0

    if (isValidMove(gameState.value.currentPiece, gameState.value.board, offsetX, offsetY)) {
      gameState.value.currentPiece.x += offsetX
      gameState.value.currentPiece.y += offsetY
      return true
    }

    if (direction === 'down') {
      mergePiece(gameState.value.currentPiece, gameState.value.board)
      const fullRows = findFullRows(gameState.value.board)

      if (fullRows.length > 0) {
        gameState.value.clearingRows = fullRows
        gameState.value.currentPiece = null
      } else if (gameState.value.mode === 'izakaya') {
        // In izakaya mode, don't auto-spawn. Let the composable handle it.
        gameState.value.currentPiece = null
      } else {
        gameState.value.currentPiece = gameState.value.nextPiece
        gameState.value.nextPiece = createPiece()

        if (gameState.value.currentPiece && !isValidMove(gameState.value.currentPiece, gameState.value.board)) {
          gameState.value.gameOver = true
        }
      }
    }

    return false
  }

  const rotate = () => {
    if (!gameState.value.currentPiece || gameState.value.gameOver || gameState.value.paused) return

    const piece = gameState.value.currentPiece
    const rotated = rotatePiece(piece)
    const originalShape = piece.shape
    piece.shape = rotated

    // Wall kick: try shifting left/right and up (including I-piece at wall edge)
    const kicks = [
      [0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [-3, 0], [3, 0],
      [0, -1], [-1, -1], [1, -1], [-2, -1], [2, -1], [-3, -1],
      [0, -2], [-1, -2], [1, -2],
    ]
    for (const [dx, dy] of kicks) {
      if (isValidMove(piece, gameState.value.board, dx, dy)) {
        piece.x += dx
        piece.y += dy
        return
      }
    }

    // No valid position found, revert
    piece.shape = originalShape
  }

  const hardDrop = () => {
    if (!gameState.value.currentPiece || gameState.value.gameOver || gameState.value.paused) return

    while (movePiece('down')) {
      gameState.value.score += 2
    }
  }

  const startGame = () => {
    gameState.value.board = initBoard()
    gameState.value.currentPiece = createPiece()
    gameState.value.nextPiece = createPiece()
    gameState.value.score = 0
    gameState.value.lines = 0
    gameState.value.level = 1
    gameState.value.gameOver = false
    gameState.value.paused = false
    gameState.value.started = true
    gameState.value.mode = 'classic'
    gameState.value.stocks = 0
    gameState.value.izakayaPhase = 'idle'
    gameState.value.excludedPieces = []
    gameState.value.drawnResult = null
    gameState.value.droppedCount = 0
    gameState.value.stocksUsed = 0
  }

  const togglePause = () => {
    if (!gameState.value.gameOver) {
      gameState.value.paused = !gameState.value.paused
    }
  }

  return {
    gameState,
    movePiece,
    rotate,
    hardDrop,
    startGame,
    togglePause,
    isValidMove,
    commitClear,
    createPiece,
    initBoard,
    mergePiece,
    findFullRows,
    BOARD_WIDTH,
    BOARD_HEIGHT,
    MAX_BOARD_HEIGHT,
    PIECES
  }
}