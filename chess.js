// Add near the top
const { Chess } = require('chess.js');   // same lib you use on the client
const activeMatches = new Map();         // matchId -> matchState

io.on('connection', socket => {

    /* ---------- A. INVITES ---------- */

    // A invites B
    socket.on('chessInvite', ({ roomId, fromUserId, toUserId }) => {
        io.to(toUserId).emit('chessInviteReceived', { roomId, fromUserId });
    });

    // B answers (accept/decline)
    socket.on('chessInviteResponse', ({ roomId, fromUserId, toUserId, accept }) => {
        if (!accept) {
            io.to(fromUserId).emit('chessInviteDeclined', { toUserId });
            return;
        }

        // create match
        const matchId = `${roomId}-${Date.now()}`;
        const white = Math.random() < 0.5 ? fromUserId : toUserId;
        const black = white === fromUserId ? toUserId : fromUserId;

        activeMatches.set(matchId, {
            id: matchId,
            roomId,
            white,
            black,
            chess: new Chess(),
            lastMoveTS: Date.now(),
        });

        // join sockets to match room for easy broadcast
        io.to(fromUserId).socketsJoin(matchId);
        io.to(toUserId).socketsJoin(matchId);

        io.to(matchId).emit('chessMatchStarted', {
            matchId,
            white,
            black,
            fen: 'start',
            history: [],
        });
    });

    /* ---------- B. MOVES ---------- */

    socket.on('chessMove', ({ matchId, from, to, promotion = 'q', playerId }) => {
        const match = activeMatches.get(matchId);
        if (!match) return;

        // check turn
        const turnColor = match.chess.turn() === 'w' ? 'white' : 'black';
        if ((turnColor === 'white' && playerId !== match.white) ||
            (turnColor === 'black' && playerId !== match.black)) {
            socket.emit('chessIllegalMove', { reason: 'Not your turn' });
            return;
        }

        const move = match.chess.move({ from, to, promotion, sloppy: true });
        if (!move) {
            socket.emit('chessIllegalMove', { reason: 'Illegal move' });
            return;
        }

        match.lastMoveTS = Date.now();

        // broadcast to both players
        io.to(matchId).emit('chessMoveMade', {
            matchId,
            move,
            fen: match.chess.fen(),
            history: match.chess.history({ verbose: true }),
            inCheck: match.chess.inCheck?.() || match.chess.in_check?.(),
            inCheckmate:
                match.chess.isCheckmate?.() || match.chess.in_checkmate?.(),
            inDraw: match.chess.isDraw?.() || match.chess.in_draw?.(),
        });

        // cleanup finished games
        if (match.chess.game_over()) activeMatches.delete(matchId);
    });

    /* ---------- C. RESIGN / OFFER DRAW (optional) ---------- */

    socket.on('chessResign', ({ matchId, playerId }) => {
        const match = activeMatches.get(matchId);
        if (!match) return;
        const winner = playerId === match.white ? match.black : match.white;
        io.to(matchId).emit('chessMatchEnded', { winner, by: 'resignation' });
        activeMatches.delete(matchId);
    });

    /* ---------- D. GARBAGE COLLECTION ---------- */

    setInterval(() => {
        const now = Date.now();
        activeMatches.forEach((m, id) => {
            if (now - m.lastMoveTS > 1000 * 60 * 30) { // 30 min idle
                io.to(id).emit('chessMatchEnded', { by: 'timeout' });
                activeMatches.delete(id);
            }
        });
    }, 60_000);
});
