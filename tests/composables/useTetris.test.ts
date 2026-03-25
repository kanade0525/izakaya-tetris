import { describe, it, expect, beforeEach, vi } from 'vitest'

// Helper to make boards with specific patterns
function makeBoard(height: number, filledRows: number[] = [], fillValue = 1): number[][] {
  return Array.from({ length: height }, (_, y) =>
    filledRows.includes(y) ? new Array(10).fill(fillValue) : new Array(10).fill(0)
  )
}

describe('useTetris', () => {
  let tetris: ReturnType<typeof useTetris>

  beforeEach(() => {
    tetris = useTetris()
    tetris.startGame()
  })

  // =======================================================================
  // initBoard
  // =======================================================================
  describe('initBoard', () => {
    it('creates board with default 20 rows and 10 cols, all zeros', () => {
      const board = tetris.initBoard()
      expect(board).toHaveLength(20)
      expect(board[0]).toHaveLength(10)
      expect(board.every(row => row.every(cell => cell === 0))).toBe(true)
    })

    it('creates board with custom height', () => {
      const board = tetris.initBoard(25)
      expect(board).toHaveLength(25)
      expect(board[0]).toHaveLength(10)
    })

    it('each row is an independent array', () => {
      const board = tetris.initBoard()
      board[0][0] = 1
      expect(board[1][0]).toBe(0)
    })
  })

  // =======================================================================
  // createPiece
  // =======================================================================
  describe('createPiece', () => {
    it('creates a specific piece type when argument is provided', () => {
      const piece = tetris.createPiece(0) // I-piece
      expect(piece.color).toBe('#00f0f0')
      expect(piece.shape).toEqual([[1, 1, 1, 1]])
    })

    it('creates piece at correct starting x position (centered)', () => {
      const iPiece = tetris.createPiece(0) // width 4
      expect(iPiece.x).toBe(3) // floor((10-4)/2)

      const oPiece = tetris.createPiece(1) // width 2
      expect(oPiece.x).toBe(4) // floor((10-2)/2)
    })

    it('creates piece at y=0', () => {
      const piece = tetris.createPiece(2)
      expect(piece.y).toBe(0)
    })

    it('returns a deep copy of shape', () => {
      const piece = tetris.createPiece(0)
      piece.shape[0][0] = 999
      const piece2 = tetris.createPiece(0)
      expect(piece2.shape[0][0]).toBe(1)
    })

    it('creates random piece when no type argument', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const piece = tetris.createPiece()
      expect(piece).toBeDefined()
      expect(piece.shape.length).toBeGreaterThan(0)
      vi.restoreAllMocks()
    })
  })

  // =======================================================================
  // isValidMove
  // =======================================================================
  describe('isValidMove', () => {
    it('returns true for piece in valid empty board position', () => {
      const board = tetris.initBoard()
      const piece = tetris.createPiece(1) // O-piece
      expect(tetris.isValidMove(piece, board)).toBe(true)
    })

    it('returns false when piece would go left of board', () => {
      const board = tetris.initBoard()
      const piece = tetris.createPiece(0) // I-piece
      piece.x = -1
      expect(tetris.isValidMove(piece, board)).toBe(false)
    })

    it('returns false when piece would go right of board', () => {
      const board = tetris.initBoard()
      const piece = tetris.createPiece(0) // I-piece, width 4
      piece.x = 7 // positions 7,8,9,10 -> 10 is out
      expect(tetris.isValidMove(piece, board)).toBe(false)
    })

    it('returns false when piece would go below board', () => {
      const board = tetris.initBoard()
      const piece = tetris.createPiece(1) // O-piece, height 2
      piece.y = 19 // rows 19,20 -> 20 is out
      expect(tetris.isValidMove(piece, board)).toBe(false)
    })

    it('returns false when piece overlaps existing block', () => {
      const board = tetris.initBoard()
      board[5][4] = 1
      const piece = tetris.createPiece(1) // O-piece at x=4
      piece.y = 4 // occupies (4,4),(5,4),(4,5),(5,5) -> (5,4) conflicts
      expect(tetris.isValidMove(piece, board)).toBe(false)
    })

    it('returns true when piece is partially above board (y < 0)', () => {
      const board = tetris.initBoard()
      const piece = tetris.createPiece(1) // O-piece
      piece.y = -1 // row -1 is above board, should be ok
      expect(tetris.isValidMove(piece, board)).toBe(true)
    })

    it('correctly applies offsetX and offsetY', () => {
      const board = tetris.initBoard()
      const piece = tetris.createPiece(1)
      piece.x = 0
      // Moving left by 1 from x=0 should be invalid
      expect(tetris.isValidMove(piece, board, -1, 0)).toBe(false)
      // Moving right by 1 from x=0 should be valid
      expect(tetris.isValidMove(piece, board, 1, 0)).toBe(true)
    })
  })

  // =======================================================================
  // movePiece
  // =======================================================================
  describe('movePiece', () => {
    it('returns false when no currentPiece', () => {
      tetris.gameState.value.currentPiece = null
      expect(tetris.movePiece('left')).toBe(false)
    })

    it('returns false when gameOver', () => {
      tetris.gameState.value.gameOver = true
      expect(tetris.movePiece('left')).toBe(false)
    })

    it('returns false when paused', () => {
      tetris.gameState.value.paused = true
      expect(tetris.movePiece('left')).toBe(false)
    })

    it('left moves piece x-1 when valid', () => {
      const piece = tetris.gameState.value.currentPiece!
      const origX = piece.x
      expect(tetris.movePiece('left')).toBe(true)
      expect(piece.x).toBe(origX - 1)
    })

    it('right moves piece x+1 when valid', () => {
      const piece = tetris.gameState.value.currentPiece!
      const origX = piece.x
      expect(tetris.movePiece('right')).toBe(true)
      expect(piece.x).toBe(origX + 1)
    })

    it('down moves piece y+1 when valid', () => {
      const piece = tetris.gameState.value.currentPiece!
      const origY = piece.y
      expect(tetris.movePiece('down')).toBe(true)
      expect(piece.y).toBe(origY + 1)
    })

    it('down merges piece when blocked', () => {
      // Fill row 19 so piece lands on row 18
      tetris.gameState.value.board = tetris.initBoard()
      const piece = tetris.createPiece(1) // O-piece
      piece.y = 18 // next down would be y=19, O is 2 tall so y=18 means rows 18,19
      tetris.gameState.value.currentPiece = piece
      tetris.gameState.value.board[19] = new Array(10).fill(1) // block bottom

      // O-piece at y=18 can't go down because row 20 is out of bounds
      // Actually y=18, shape is 2 rows, so rows 18,19. going down to 19,20 which is out.
      // But row 19 is filled, so offset down from y=18: newY = 19+1=20 which is >= 20
      // Wait, let me reconsider. piece.y=18, shape rows 0,1. newY = 18+0+1=19, 18+1+1=20. 20>=20 invalid.
      const result = tetris.movePiece('down')
      expect(result).toBe(false)
    })

    it('down in classic mode spawns nextPiece', () => {
      tetris.gameState.value.mode = 'classic'
      tetris.gameState.value.board = tetris.initBoard()
      const piece = tetris.createPiece(1)
      piece.y = 18
      tetris.gameState.value.currentPiece = piece
      const nextPiece = tetris.createPiece(2)
      tetris.gameState.value.nextPiece = nextPiece

      tetris.movePiece('down') // lands
      // After merge, currentPiece should be the former nextPiece
      // (or a new piece if lines were cleared)
      expect(tetris.gameState.value.currentPiece).not.toBeNull()
    })

    it('down in izakaya mode does NOT spawn next piece', () => {
      tetris.gameState.value.mode = 'izakaya'
      tetris.gameState.value.board = tetris.initBoard()
      const piece = tetris.createPiece(1)
      piece.y = 18
      tetris.gameState.value.currentPiece = piece

      tetris.movePiece('down') // lands
      expect(tetris.gameState.value.currentPiece).toBeNull()
    })

    it('down sets gameOver in classic mode when new piece cannot fit', () => {
      tetris.gameState.value.mode = 'classic'
      // Fill top rows so the next piece can't spawn
      const board = tetris.initBoard()
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 10; x++) {
          board[y][x] = 1
        }
        // Keep one cell empty per row so they're not "full" (won't be cleared)
        board[y][9] = 0
      }
      tetris.gameState.value.board = board

      // Place a piece that will land immediately (one row gap at bottom)
      const piece = tetris.createPiece(1) // O-piece
      piece.y = 18
      tetris.gameState.value.currentPiece = piece
      // nextPiece spawns at y=0 centered - top rows are blocked
      tetris.gameState.value.nextPiece = tetris.createPiece(1) // O-piece spawns at x=4,y=0

      tetris.movePiece('down') // piece lands, nextPiece becomes current
      // nextPiece at y=0, x=4 overlaps board[0][4]=1 and board[1][4]=1
      expect(tetris.gameState.value.gameOver).toBe(true)
    })
  })

  // =======================================================================
  // rotate
  // =======================================================================
  describe('rotate', () => {
    it('rotates piece 90 degrees clockwise', () => {
      tetris.gameState.value.board = tetris.initBoard()
      const piece = tetris.createPiece(2) // T-piece: [[0,1,0],[1,1,1]]
      piece.y = 5
      tetris.gameState.value.currentPiece = piece

      tetris.rotate()
      // After 90 CW rotation of T: [[1,0],[1,1],[1,0]]
      expect(piece.shape).toEqual([[1, 0], [1, 1], [1, 0]])
    })

    it('full 4-rotation cycle returns to original shape', () => {
      tetris.gameState.value.board = tetris.initBoard()
      const piece = tetris.createPiece(2) // T-piece
      piece.y = 5
      piece.x = 4
      tetris.gameState.value.currentPiece = piece
      const original = piece.shape.map(r => [...r])

      tetris.rotate()
      tetris.rotate()
      tetris.rotate()
      tetris.rotate()
      expect(piece.shape).toEqual(original)
    })

    it('wall kick shifts piece when rotation would go out of bounds', () => {
      tetris.gameState.value.board = tetris.initBoard()
      const piece = tetris.createPiece(0) // I-piece [[1,1,1,1]]
      piece.x = 0
      piece.y = 10
      tetris.gameState.value.currentPiece = piece

      // I-piece at x=0 rotated to vertical would need kick
      tetris.rotate()
      // Should have rotated and kicked, not reverted
      expect(piece.shape.length).toBeGreaterThan(1) // vertical = 4 rows
    })

    it('reverts rotation when no valid kick position exists', () => {
      tetris.gameState.value.board = tetris.initBoard()
      const board = tetris.gameState.value.board
      // Fill almost entire board, leaving no room for rotation
      for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 10; x++) {
          board[y][x] = 1
        }
      }
      // Leave a tiny 1x1 hole - can't rotate anything into it
      board[10][5] = 0

      // Place O-piece (2x2) somewhere - rotation of O is same shape,
      // so use T-piece in a spot where it cannot rotate
      const piece = tetris.createPiece(2) // T-piece
      piece.x = 4
      piece.y = 9
      piece.shape = [[1, 0], [1, 1], [1, 0]] // already rotated once
      tetris.gameState.value.currentPiece = piece
      // Clear the cells the piece occupies
      board[9][4] = 0; board[9][5] = 0
      board[10][4] = 0; board[10][5] = 0
      board[11][4] = 0; board[11][5] = 0

      // But fill everything around so no kick position works
      const shapeBefore = piece.shape.map(r => [...r])
      tetris.rotate()
      // Rotation should be reverted because there's no room
      expect(piece.shape).toEqual(shapeBefore)
    })

    it('does nothing when no currentPiece', () => {
      tetris.gameState.value.currentPiece = null
      tetris.rotate() // should not throw
    })

    it('does nothing when gameOver', () => {
      tetris.gameState.value.gameOver = true
      const piece = tetris.gameState.value.currentPiece
      if (piece) {
        const shapeBefore = piece.shape.map(r => [...r])
        tetris.rotate()
        expect(piece.shape).toEqual(shapeBefore)
      }
    })
  })

  // =======================================================================
  // hardDrop
  // =======================================================================
  describe('hardDrop', () => {
    it('drops piece to lowest valid position', () => {
      tetris.gameState.value.board = tetris.initBoard()
      const piece = tetris.createPiece(1) // O-piece
      piece.y = 0
      tetris.gameState.value.currentPiece = piece

      tetris.hardDrop()
      // Piece should have been merged (currentPiece replaced or nulled)
      // Board should have blocks near the bottom
      const board = tetris.gameState.value.board
      expect(board[18].some(c => c !== 0) || board[19].some(c => c !== 0)).toBe(true)
    })

    it('adds 2 points per row dropped', () => {
      tetris.gameState.value.board = tetris.initBoard()
      tetris.gameState.value.score = 0
      const piece = tetris.createPiece(1) // O-piece
      piece.y = 0
      tetris.gameState.value.currentPiece = piece

      tetris.hardDrop()
      // O-piece drops from y=0 to y=18 (bottom for 2-tall piece), that's 18 rows
      expect(tetris.gameState.value.score).toBe(18 * 2)
    })

    it('does nothing when no currentPiece', () => {
      tetris.gameState.value.currentPiece = null
      tetris.hardDrop() // should not throw
    })

    it('does nothing when gameOver', () => {
      tetris.gameState.value.gameOver = true
      tetris.hardDrop() // should not throw
    })
  })

  // =======================================================================
  // findFullRows
  // =======================================================================
  describe('findFullRows', () => {
    it('returns empty array when no rows are full', () => {
      const board = tetris.initBoard()
      expect(tetris.findFullRows(board)).toEqual([])
    })

    it('returns single full row index', () => {
      const board = makeBoard(20, [19])
      expect(tetris.findFullRows(board)).toEqual([19])
    })

    it('returns multiple full row indices', () => {
      const board = makeBoard(20, [18, 19])
      const result = tetris.findFullRows(board)
      expect(result).toContain(18)
      expect(result).toContain(19)
      expect(result).toHaveLength(2)
    })

    it('does not include rows with any zero cell', () => {
      const board = makeBoard(20, [19])
      board[19][5] = 0 // make one cell empty
      expect(tetris.findFullRows(board)).toEqual([])
    })
  })

  // =======================================================================
  // commitClear
  // =======================================================================
  describe('commitClear', () => {
    it('removes full rows and prepends empty rows', () => {
      tetris.gameState.value.board = makeBoard(20, [19])
      tetris.gameState.value.clearingRows = [19]
      tetris.gameState.value.mode = 'izakaya' // avoid auto-spawn

      tetris.commitClear()

      const board = tetris.gameState.value.board
      expect(board).toHaveLength(20)
      // Row 0 should be the new empty row
      expect(board[0].every(c => c === 0)).toBe(true)
      // Row 19 should now be empty (the old row 18 which was empty)
      expect(board[19].every(c => c === 0)).toBe(true)
    })

    it('updates lines count', () => {
      tetris.gameState.value.lines = 0
      tetris.gameState.value.board = makeBoard(20, [18, 19])
      tetris.gameState.value.clearingRows = [18, 19]
      tetris.gameState.value.mode = 'izakaya'

      tetris.commitClear()
      expect(tetris.gameState.value.lines).toBe(2)
    })

    it('updates score: rows * 100 * level', () => {
      tetris.gameState.value.score = 0
      tetris.gameState.value.level = 2
      tetris.gameState.value.lines = 0
      tetris.gameState.value.board = makeBoard(20, [19])
      tetris.gameState.value.clearingRows = [19]
      tetris.gameState.value.mode = 'izakaya'

      tetris.commitClear()
      expect(tetris.gameState.value.score).toBe(1 * 100 * 2)
    })

    it('updates level: floor(lines / 10) + 1', () => {
      tetris.gameState.value.lines = 9
      tetris.gameState.value.board = makeBoard(20, [19])
      tetris.gameState.value.clearingRows = [19]
      tetris.gameState.value.mode = 'izakaya'

      tetris.commitClear()
      expect(tetris.gameState.value.lines).toBe(10)
      expect(tetris.gameState.value.level).toBe(2)
    })

    it('clears clearingRows array', () => {
      tetris.gameState.value.board = makeBoard(20, [19])
      tetris.gameState.value.clearingRows = [19]
      tetris.gameState.value.mode = 'izakaya'

      tetris.commitClear()
      expect(tetris.gameState.value.clearingRows).toEqual([])
    })

    it('in izakaya mode does NOT spawn next piece', () => {
      tetris.gameState.value.mode = 'izakaya'
      tetris.gameState.value.board = makeBoard(20, [19])
      tetris.gameState.value.clearingRows = [19]
      tetris.gameState.value.currentPiece = null

      tetris.commitClear()
      // Should still be null - no auto spawn
      expect(tetris.gameState.value.currentPiece).toBeNull()
    })

    it('in classic mode spawns next piece', () => {
      tetris.gameState.value.mode = 'classic'
      tetris.gameState.value.board = makeBoard(20, [19])
      tetris.gameState.value.clearingRows = [19]
      tetris.gameState.value.nextPiece = tetris.createPiece(0)

      tetris.commitClear()
      expect(tetris.gameState.value.currentPiece).not.toBeNull()
    })

    it('in classic mode sets gameOver after clear if next piece cannot fit', () => {
      tetris.gameState.value.mode = 'classic'
      // Board with bottom row full (will be cleared), but top rows blocked
      const board = tetris.initBoard()
      // Fill top 4 rows with partial blocks (not full, so they won't clear)
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 10; x++) board[y][x] = 1
        board[y][9] = 0 // keep one empty so row isn't "full"
      }
      // Fill bottom row completely (this will be cleared)
      board[19] = new Array(10).fill(1)
      tetris.gameState.value.board = board
      tetris.gameState.value.clearingRows = [19]
      // nextPiece that will collide with top blocked rows after spawn
      tetris.gameState.value.nextPiece = tetris.createPiece(1) // O-piece at y=0, x=4

      tetris.commitClear()
      // After clearing row 19, top rows shift down by 1. Row 0 becomes empty, rows 1-4 have blocks.
      // O-piece spawns at y=0, x=4. board[0] is now empty but board[1][4]=1.
      // O-piece occupies (0,4),(0,5),(1,4),(1,5) -> board[1][4]=1 conflicts
      expect(tetris.gameState.value.gameOver).toBe(true)
    })

    it('does nothing when clearingRows is empty', () => {
      tetris.gameState.value.clearingRows = []
      const scoresBefore = tetris.gameState.value.score

      tetris.commitClear()
      expect(tetris.gameState.value.score).toBe(scoresBefore)
    })
  })

  // =======================================================================
  // startGame
  // =======================================================================
  describe('startGame', () => {
    it('resets all state to defaults', () => {
      tetris.gameState.value.score = 999
      tetris.gameState.value.gameOver = true

      tetris.startGame()

      expect(tetris.gameState.value.score).toBe(0)
      expect(tetris.gameState.value.lines).toBe(0)
      expect(tetris.gameState.value.level).toBe(1)
      expect(tetris.gameState.value.gameOver).toBe(false)
      expect(tetris.gameState.value.paused).toBe(false)
      expect(tetris.gameState.value.started).toBe(true)
      expect(tetris.gameState.value.mode).toBe('classic')
    })

    it('creates board with 20 rows', () => {
      tetris.startGame()
      expect(tetris.gameState.value.board).toHaveLength(20)
    })

    it('creates currentPiece and nextPiece', () => {
      tetris.startGame()
      expect(tetris.gameState.value.currentPiece).not.toBeNull()
      expect(tetris.gameState.value.nextPiece).not.toBeNull()
    })
  })

  // =======================================================================
  // togglePause
  // =======================================================================
  describe('togglePause', () => {
    it('toggles paused from false to true', () => {
      tetris.gameState.value.paused = false
      tetris.togglePause()
      expect(tetris.gameState.value.paused).toBe(true)
    })

    it('toggles paused from true to false', () => {
      tetris.gameState.value.paused = true
      tetris.togglePause()
      expect(tetris.gameState.value.paused).toBe(false)
    })

    it('does nothing when gameOver', () => {
      tetris.gameState.value.gameOver = true
      tetris.gameState.value.paused = false
      tetris.togglePause()
      expect(tetris.gameState.value.paused).toBe(false)
    })
  })
})
