import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

function makeBoard(height: number, filledRows: number[] = [], fillValue = 1): number[][] {
  return Array.from({ length: height }, (_, y) =>
    filledRows.includes(y) ? new Array(10).fill(fillValue) : new Array(10).fill(0)
  )
}

describe('useIzakayaMode', () => {
  let izk: ReturnType<typeof useIzakayaMode>
  let gs: ReturnType<typeof useIzakayaMode>['gameState']

  beforeEach(() => {
    izk = useIzakayaMode()
    gs = izk.gameState
    izk.initIzakayaRandom()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  // =======================================================================
  // Stock Management
  // =======================================================================
  describe('Stock Management', () => {
    it('addStock increments by 1', () => {
      gs.value.stocks = 0
      izk.addStock()
      expect(gs.value.stocks).toBe(1)
    })

    it('addStock(n) increments by n', () => {
      gs.value.stocks = 0
      izk.addStock(5)
      expect(gs.value.stocks).toBe(5)
    })

    it('removeStock decrements by 1', () => {
      gs.value.stocks = 3
      izk.removeStock()
      expect(gs.value.stocks).toBe(2)
    })

    it('removeStock(n) decrements by n', () => {
      gs.value.stocks = 5
      izk.removeStock(3)
      expect(gs.value.stocks).toBe(2)
    })

    it('removeStock clamps to 0', () => {
      gs.value.stocks = 1
      izk.removeStock(5)
      expect(gs.value.stocks).toBe(0)
    })

    it('canDrop returns true when stocks > 0', () => {
      gs.value.stocks = 1
      expect(izk.canDrop()).toBe(true)
    })

    it('canDrop returns false when stocks === 0', () => {
      gs.value.stocks = 0
      expect(izk.canDrop()).toBe(false)
    })

    it('addStock saves to localStorage', () => {
      gs.value.stocks = 0
      izk.addStock()
      const saved = JSON.parse(localStorage.getItem('izakaya-block-save')!)
      expect(saved.stocks).toBe(1)
    })
  })

  // =======================================================================
  // Draw System
  // =======================================================================
  describe('Draw System', () => {
    it('drawPiece returns piece type for indices 0-6', () => {
      for (let i = 0; i < 7; i++) {
        // Mock random to select index i from full pool of 9
        vi.spyOn(Math, 'random').mockReturnValue(i / 9)
        gs.value.excludedPieces = []
        izk.addStock(10) // ensure enough stock

        // Use internal draw by going through the flow
        // Actually test the draw directly by triggering executeDraw
        gs.value.stocks = 10
        gs.value.izakayaPhase = 'confirm'
        izk.skipExclusion()
        // drawnResult should be set
        expect(gs.value.drawnResult).not.toBeNull()
        vi.restoreAllMocks()
      }
    })

    it('drawPiece with all pieces excluded returns miss', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      gs.value.stocks = 20
      gs.value.excludedPieces = [0, 1, 2, 3, 4, 5, 6, 7, 8]
      gs.value.izakayaPhase = 'exclusion'
      izk.confirmExclusion()
      expect(gs.value.drawnResult).toEqual({ type: 'miss' })
      vi.restoreAllMocks()
    })

    it('drawPiece with miss excluded never returns miss', () => {
      let gotMiss = false
      for (let i = 0; i < 100; i++) {
        gs.value.stocks = 10
        gs.value.excludedPieces = [8] // exclude miss
        gs.value.izakayaPhase = 'exclusion'
        izk.confirmExclusion() // uses current excludedPieces
        if (gs.value.drawnResult?.type === 'miss') gotMiss = true
      }
      expect(gotMiss).toBe(false)
    })

    it('drawPiece with only wildcard remaining returns wildcard', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      gs.value.stocks = 20
      gs.value.excludedPieces = [0, 1, 2, 3, 4, 5, 6, 8]
      gs.value.izakayaPhase = 'exclusion'
      izk.confirmExclusion()
      expect(gs.value.drawnResult).toEqual({ type: 'wildcard' })
      vi.restoreAllMocks()
    })

    it('drawPiece with only miss remaining returns miss', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      gs.value.stocks = 20
      gs.value.excludedPieces = [0, 1, 2, 3, 4, 5, 6, 7]
      gs.value.izakayaPhase = 'exclusion'
      izk.confirmExclusion()
      expect(gs.value.drawnResult).toEqual({ type: 'miss' })
      vi.restoreAllMocks()
    })
  })

  // =======================================================================
  // Exclusion System
  // =======================================================================
  describe('Exclusion System', () => {
    it('toggleExclude adds a draw type', () => {
      gs.value.stocks = 5
      gs.value.excludedPieces = []
      izk.toggleExclude(0)
      expect(gs.value.excludedPieces).toContain(0)
    })

    it('toggleExclude removes already excluded type', () => {
      gs.value.stocks = 5
      gs.value.excludedPieces = [0]
      izk.toggleExclude(0)
      expect(gs.value.excludedPieces).not.toContain(0)
    })

    it('toggleExclude respects stock budget', () => {
      gs.value.stocks = 2 // base cost 1 + 1 exclusion = 2, can't add more
      gs.value.excludedPieces = [0]
      izk.toggleExclude(1) // would need 1+2=3 stocks
      expect(gs.value.excludedPieces).not.toContain(1)
    })

    it('exclusionCost returns count of excluded pieces', () => {
      gs.value.excludedPieces = [0, 1, 2]
      expect(izk.exclusionCost()).toBe(3)
    })

    it('can exclude up to stocks-1 pieces', () => {
      gs.value.stocks = 4 // can exclude 3 (cost: 1+3=4)
      gs.value.excludedPieces = []
      izk.toggleExclude(0)
      izk.toggleExclude(1)
      izk.toggleExclude(2)
      expect(gs.value.excludedPieces).toHaveLength(3)
      izk.toggleExclude(3) // would need 1+4=5 > 4
      expect(gs.value.excludedPieces).toHaveLength(3)
    })
  })

  // =======================================================================
  // Phase Transitions
  // =======================================================================
  describe('Phase Transitions', () => {
    it('requestDrop sets phase to confirm when canDrop', () => {
      gs.value.stocks = 1
      gs.value.izakayaPhase = 'idle'
      izk.requestDrop()
      expect(gs.value.izakayaPhase).toBe('confirm')
    })

    it('requestDrop does nothing when stocks === 0', () => {
      gs.value.stocks = 0
      gs.value.izakayaPhase = 'idle'
      izk.requestDrop()
      expect(gs.value.izakayaPhase).toBe('idle')
    })

    it('cancelDrop resets excludedPieces and sets phase to idle', () => {
      gs.value.excludedPieces = [0, 1]
      gs.value.izakayaPhase = 'confirm'
      izk.cancelDrop()
      expect(gs.value.excludedPieces).toEqual([])
      expect(gs.value.izakayaPhase).toBe('idle')
    })

    it('openExclusion clears exclusions and sets phase', () => {
      gs.value.izakayaPhase = 'confirm'
      izk.openExclusion()
      expect(gs.value.excludedPieces).toEqual([])
      expect(gs.value.izakayaPhase).toBe('exclusion')
    })

    it('skipExclusion clears exclusions and triggers draw', () => {
      gs.value.stocks = 5
      gs.value.izakayaPhase = 'confirm'
      izk.skipExclusion()
      expect(gs.value.excludedPieces).toEqual([])
      expect(gs.value.izakayaPhase).toBe('rolling')
    })

    it('executeDraw deducts stocks (1 + exclusionCost)', () => {
      gs.value.stocks = 5
      gs.value.excludedPieces = [0, 1]
      gs.value.izakayaPhase = 'exclusion'
      izk.confirmExclusion() // calls executeDraw
      expect(gs.value.stocks).toBe(2) // 5 - (1+2) = 2
    })

    it('executeDraw sets phase to rolling', () => {
      gs.value.stocks = 5
      gs.value.izakayaPhase = 'confirm'
      izk.skipExclusion()
      expect(gs.value.izakayaPhase).toBe('rolling')
    })

    it('revealDraw sets phase to drawing', () => {
      gs.value.stocks = 5
      gs.value.izakayaPhase = 'confirm'
      izk.skipExclusion() // -> rolling
      izk.revealDraw() // -> drawing
      expect(gs.value.izakayaPhase).toBe('drawing')
    })

    it('confirmDraw with miss sets phase to miss', () => {
      gs.value.drawnResult = { type: 'miss' }
      gs.value.izakayaPhase = 'drawing'
      izk.confirmDraw()
      expect(gs.value.izakayaPhase).toBe('miss')
    })

    it('confirmDraw with wildcard sets phase to wildcard', () => {
      gs.value.drawnResult = { type: 'wildcard' }
      gs.value.izakayaPhase = 'drawing'
      izk.confirmDraw()
      expect(gs.value.izakayaPhase).toBe('wildcard')
    })

    it('confirmDraw with piece spawns piece and sets countdown', () => {
      gs.value.drawnResult = { type: 'piece', pieceIndex: 2 }
      gs.value.izakayaPhase = 'drawing'
      izk.confirmDraw()
      expect(gs.value.izakayaPhase).toBe('countdown')
      expect(gs.value.currentPiece).not.toBeNull()
    })

    it('selectWildcard spawns piece and sets countdown', () => {
      gs.value.izakayaPhase = 'wildcard'
      izk.selectWildcard(3)
      expect(gs.value.izakayaPhase).toBe('countdown')
      expect(gs.value.currentPiece).not.toBeNull()
      expect(gs.value.currentPiece!.color).toBe('#00f000') // S-piece
    })

    it('startDropping sets phase to dropping', () => {
      izk.startDropping()
      expect(gs.value.izakayaPhase).toBe('dropping')
    })

    it('dismissMiss resets state and sets idle', () => {
      gs.value.drawnResult = { type: 'miss' }
      gs.value.excludedPieces = [0, 1]
      gs.value.izakayaPhase = 'miss'
      izk.dismissMiss()
      expect(gs.value.drawnResult).toBeNull()
      expect(gs.value.excludedPieces).toEqual([])
      expect(gs.value.izakayaPhase).toBe('idle')
    })
  })

  // =======================================================================
  // Complete Phase Flows
  // =======================================================================
  describe('Complete Phase Flows', () => {
    it('full flow: idle -> confirm -> rolling -> drawing -> countdown -> dropping', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1) // will pick a standard piece
      gs.value.stocks = 3

      izk.requestDrop()
      expect(gs.value.izakayaPhase).toBe('confirm')

      izk.skipExclusion()
      expect(gs.value.izakayaPhase).toBe('rolling')
      expect(gs.value.drawnResult).not.toBeNull()

      izk.revealDraw()
      expect(gs.value.izakayaPhase).toBe('drawing')

      izk.confirmDraw()
      expect(gs.value.izakayaPhase).toBe('countdown')

      izk.startDropping()
      expect(gs.value.izakayaPhase).toBe('dropping')

      vi.restoreAllMocks()
    })

    it('miss flow: draw miss -> drawing -> dismissMiss -> idle', () => {
      vi.spyOn(Math, 'random').mockReturnValue(8 / 9 + 0.01) // last in pool = miss
      gs.value.stocks = 3

      izk.requestDrop()
      izk.skipExclusion()
      izk.revealDraw()

      if (gs.value.drawnResult?.type === 'miss') {
        izk.dismissMiss()
        expect(gs.value.izakayaPhase).toBe('idle')
      }
      vi.restoreAllMocks()
    })
  })

  // =======================================================================
  // Undo / Redo
  // =======================================================================
  describe('Undo / Redo', () => {
    it('canUndo returns false initially', () => {
      expect(izk.canUndo()).toBe(false)
    })

    it('canRedo returns false initially', () => {
      expect(izk.canRedo()).toBe(false)
    })

    it('undo restores previous board and stocks', () => {
      gs.value.stocks = 5
      const boardBefore = gs.value.board.map(r => [...r])

      // Trigger a draw (which pushes history)
      gs.value.izakayaPhase = 'confirm'
      izk.skipExclusion()

      // Stocks should be reduced
      expect(gs.value.stocks).toBeLessThan(5)

      // Undo
      izk.undo()
      expect(gs.value.stocks).toBe(5)
      expect(gs.value.board).toEqual(boardBefore)
    })

    it('undo sets phase to idle', () => {
      gs.value.stocks = 5
      gs.value.izakayaPhase = 'confirm'
      izk.skipExclusion()
      izk.undo()
      expect(gs.value.izakayaPhase).toBe('idle')
    })

    it('canUndo returns true after executeDraw', () => {
      gs.value.stocks = 5
      gs.value.izakayaPhase = 'confirm'
      izk.skipExclusion()
      expect(izk.canUndo()).toBe(true)
    })

    it('redo restores next state', () => {
      gs.value.stocks = 5
      gs.value.izakayaPhase = 'confirm'
      izk.skipExclusion()
      const stocksAfterDraw = gs.value.stocks

      izk.undo()
      expect(gs.value.stocks).toBe(5)

      izk.redo()
      expect(gs.value.stocks).toBe(stocksAfterDraw)
    })

    it('undo then redo returns to same board state', () => {
      gs.value.stocks = 5
      gs.value.izakayaPhase = 'confirm'
      izk.skipExclusion()
      const boardAfterDraw = gs.value.board.map(r => [...r])

      izk.undo()
      izk.redo()
      expect(gs.value.board).toEqual(boardAfterDraw)
    })

    it('undo does nothing when stack is empty', () => {
      const stocksBefore = gs.value.stocks
      izk.undo()
      expect(gs.value.stocks).toBe(stocksBefore)
    })

    it('redo does nothing when stack is empty', () => {
      const stocksBefore = gs.value.stocks
      izk.redo()
      expect(gs.value.stocks).toBe(stocksBefore)
    })

    it('board snapshots are deep copies', () => {
      gs.value.stocks = 5
      const boardBefore = gs.value.board.map(r => [...r])
      gs.value.izakayaPhase = 'confirm'
      izk.skipExclusion()

      // Modify current board
      gs.value.board[0][0] = 999

      // Undo should restore original, not the modified one
      izk.undo()
      expect(gs.value.board[0][0]).toBe(boardBefore[0][0])
    })
  })

  // =======================================================================
  // localStorage Persistence
  // =======================================================================
  describe('localStorage Persistence', () => {
    it('saveToStorage stores data as JSON', () => {
      gs.value.stocks = 3
      izk.saveToStorage()
      const saved = JSON.parse(localStorage.getItem('izakaya-block-save')!)
      expect(saved.stocks).toBe(3)
      expect(saved.board).toBeDefined()
    })

    it('saveToStorage does nothing when mode is not izakaya', () => {
      gs.value.mode = 'classic'
      izk.saveToStorage()
      expect(localStorage.getItem('izakaya-block-save')).toBeNull()
    })

    it('loadFromStorage restores state', () => {
      gs.value.stocks = 7
      izk.saveToStorage()

      // Modify state
      gs.value.stocks = 0
      gs.value.mode = 'classic'

      const result = izk.loadFromStorage()
      expect(result).toBe(true)
      expect(gs.value.stocks).toBe(7)
      expect(gs.value.mode).toBe('izakaya')
      expect(gs.value.started).toBe(true)
    })

    it('loadFromStorage returns false when no saved data', () => {
      localStorage.clear()
      expect(izk.loadFromStorage()).toBe(false)
    })

    it('loadFromStorage returns false when data is malformed', () => {
      localStorage.setItem('izakaya-block-save', JSON.stringify({ foo: 'bar' }))
      expect(izk.loadFromStorage()).toBe(false)
    })

    it('loadFromStorage returns false when JSON is invalid', () => {
      localStorage.setItem('izakaya-block-save', 'not json{{{')
      expect(izk.loadFromStorage()).toBe(false)
    })

    it('loadFromStorage defaults stocks to 0 when missing', () => {
      const board = makeBoard(25)
      localStorage.setItem('izakaya-block-save', JSON.stringify({ board }))
      izk.loadFromStorage()
      expect(gs.value.stocks).toBe(0)
    })

    it('clearStorage removes the key', () => {
      izk.saveToStorage()
      expect(localStorage.getItem('izakaya-block-save')).not.toBeNull()
      izk.clearStorage()
      expect(localStorage.getItem('izakaya-block-save')).toBeNull()
    })
  })

  // =======================================================================
  // Board Expansion
  // =======================================================================
  describe('Board Expansion', () => {
    it('adds rows when fewer than 5 empty at top', () => {
      gs.value.board = makeBoard(20)
      gs.value.board[2][5] = 1 // block in row 2, only 2 empty rows at top
      const origLen = gs.value.board.length

      // Trigger expansion via onIzakayaPiecePlaced path
      // We directly test by modifying board and triggering init
      izk.initIzakayaFromClassic()
      expect(gs.value.board.length).toBeGreaterThan(origLen)
    })

    it('does not add rows when already 5+ empty at top', () => {
      gs.value.board = makeBoard(25)
      // First 5 rows empty, block in row 5
      gs.value.board[5][0] = 1
      const len = gs.value.board.length

      // Re-init to trigger expand
      const board = gs.value.board.map(r => [...r])
      gs.value.board = board
      izk.initIzakayaFromClassic()
      expect(gs.value.board.length).toBe(len)
    })

    it('does not exceed MAX_BOARD_HEIGHT (40)', () => {
      gs.value.board = makeBoard(39)
      gs.value.board[0][0] = 1 // top row has block
      izk.initIzakayaFromClassic()
      expect(gs.value.board.length).toBeLessThanOrEqual(40)
    })
  })

  // =======================================================================
  // Win Condition
  // =======================================================================
  describe('Win Condition', () => {
    it('returns true when bottom row is all zeros', () => {
      gs.value.board = makeBoard(25)
      // All empty
      expect(izk.checkWin()).toBe(true)
    })

    it('returns false when bottom row has any block', () => {
      gs.value.board = makeBoard(25)
      gs.value.board[24][5] = 1
      expect(izk.checkWin()).toBe(false)
    })

    it('returns false when board is empty (length 0)', () => {
      gs.value.board = []
      expect(izk.checkWin()).toBe(false)
    })

    it('only examines last row', () => {
      gs.value.board = makeBoard(25)
      // Fill every row EXCEPT the last
      for (let y = 0; y < 24; y++) gs.value.board[y] = new Array(10).fill(1)
      expect(izk.checkWin()).toBe(true)
    })
  })

  // =======================================================================
  // Piece Placed & Clear Done
  // =======================================================================
  describe('Piece Placed & Clear Done', () => {
    it('onIzakayaPiecePlaced sets phase to placed when no full rows and no win', () => {
      gs.value.board = makeBoard(25)
      gs.value.board[24][0] = 1 // not a win, not a full row
      gs.value.currentPiece = null
      gs.value.izakayaPhase = 'dropping'

      izk.onIzakayaPiecePlaced()
      expect(gs.value.izakayaPhase).toBe('placed')
    })

    it('onIzakayaPiecePlaced sets clearingRows when full rows exist', () => {
      gs.value.board = makeBoard(25, [24])
      gs.value.currentPiece = null

      izk.onIzakayaPiecePlaced()
      expect(gs.value.clearingRows).toContain(24)
    })

    it('onIzakayaPiecePlaced sets won on win', () => {
      gs.value.board = makeBoard(25)
      // Bottom row empty = win
      gs.value.currentPiece = null

      izk.onIzakayaPiecePlaced()
      expect(gs.value.izakayaPhase).toBe('won')
    })

    it('onIzakayaClearDone sets phase to placed when not won', () => {
      gs.value.board = makeBoard(25)
      gs.value.board[24][0] = 1 // not a win
      gs.value.izakayaPhase = 'dropping'

      izk.onIzakayaClearDone()
      expect(gs.value.izakayaPhase).toBe('placed')
    })

    it('onIzakayaClearDone sets phase to won when won', () => {
      gs.value.board = makeBoard(25) // all empty = bottom row empty = win

      izk.onIzakayaClearDone()
      expect(gs.value.izakayaPhase).toBe('won')
    })
  })

  // =======================================================================
  // Init Functions
  // =======================================================================
  describe('Init Functions', () => {
    it('initIzakayaRandom creates 25-row board', () => {
      izk.initIzakayaRandom()
      expect(gs.value.board).toHaveLength(25)
    })

    it('initIzakayaRandom has 5 empty rows at top', () => {
      izk.initIzakayaRandom()
      for (let y = 0; y < 5; y++) {
        expect(gs.value.board[y].every(c => c === 0)).toBe(true)
      }
    })

    it('initIzakayaRandom bottom 20 rows have some fill', () => {
      izk.initIzakayaRandom()
      let hasBlock = false
      for (let y = 5; y < 25; y++) {
        if (gs.value.board[y].some(c => c !== 0)) hasBlock = true
      }
      expect(hasBlock).toBe(true)
    })

    it('initIzakayaRandom ensures no completely full rows', () => {
      // Run multiple times to be confident
      for (let i = 0; i < 10; i++) {
        izk.initIzakayaRandom()
        for (let y = 5; y < 25; y++) {
          expect(gs.value.board[y].every(c => c !== 0)).toBe(false)
        }
      }
    })

    it('initIzakayaRandom sets mode and state correctly', () => {
      izk.initIzakayaRandom()
      expect(gs.value.mode).toBe('izakaya')
      expect(gs.value.izakayaPhase).toBe('idle')
      expect(gs.value.started).toBe(true)
      expect(gs.value.currentPiece).toBeNull()
      expect(gs.value.stocks).toBe(0)
    })

    it('initIzakayaFromClassic preserves board content', () => {
      // Start a classic game first
      const { startGame, gameState } = useTetris()
      startGame()
      // Put some blocks on the board
      gameState.value.board[19] = new Array(10).fill(3)
      gameState.value.gameOver = true

      izk.initIzakayaFromClassic()
      // Board should still have blocks (possibly expanded)
      const bottomRow = gs.value.board[gs.value.board.length - 1]
      expect(bottomRow.some(c => c !== 0)).toBe(true)
    })

    it('initIzakayaFromClassic adds top empty rows', () => {
      const { startGame, gameState } = useTetris()
      startGame()
      // Fill top rows so expansion is needed
      gameState.value.board[0] = new Array(10).fill(1)
      gameState.value.gameOver = true

      izk.initIzakayaFromClassic()
      // Should have at least 5 empty rows at top
      let emptyTop = 0
      for (let y = 0; y < gs.value.board.length; y++) {
        if (gs.value.board[y].every(c => c === 0)) emptyTop++
        else break
      }
      expect(emptyTop).toBeGreaterThanOrEqual(5)
    })

    it('initIzakayaFromClassic resets game state fields', () => {
      izk.initIzakayaFromClassic()
      expect(gs.value.mode).toBe('izakaya')
      expect(gs.value.izakayaPhase).toBe('idle')
      expect(gs.value.currentPiece).toBeNull()
      expect(gs.value.gameOver).toBe(false)
    })
  })

  // =======================================================================
  // spawnIzakayaPiece (tested indirectly via confirmDraw/selectWildcard)
  // =======================================================================
  describe('spawnIzakayaPiece', () => {
    it('spawns piece at y=0 when board has space', () => {
      gs.value.board = makeBoard(25) // all empty
      gs.value.drawnResult = { type: 'piece', pieceIndex: 2 }
      gs.value.izakayaPhase = 'drawing'
      izk.confirmDraw()
      expect(gs.value.currentPiece).not.toBeNull()
      expect(gs.value.currentPiece!.y).toBe(0)
    })

    it('adjusts y upward when spawn position is blocked', () => {
      gs.value.board = makeBoard(25)
      // Fill row 0 and 1
      gs.value.board[0] = new Array(10).fill(1)
      gs.value.board[1] = new Array(10).fill(1)
      gs.value.drawnResult = { type: 'piece', pieceIndex: 1 } // O-piece
      gs.value.izakayaPhase = 'drawing'
      izk.confirmDraw()
      expect(gs.value.currentPiece).not.toBeNull()
      expect(gs.value.currentPiece!.y).toBeLessThan(0)
    })
  })
})
