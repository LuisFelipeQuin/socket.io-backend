const { Chess } = require('chess.js');
const activeMatches = new Map();     // matchId → matchState

const setupChessHandlers = (io) => {

    io.on('connection', (socket) => {

        /* ---- A. INVITES ---- */
        socket.on('chessInvite', ({ roomId, fromUserId, toUserId }) => {
            console.log('chess invite triggered');
            io.to(toUserId).emit('chessInviteReceived', { roomId, fromUserId });
        });

        socket.on('chessInviteResponse', ({ roomId, fromUserId, toUserId, accept }) => {
            console.log('chess invite response triggered');
            if (!accept) {
                io.to(fromUserId).emit('chessInviteDeclined', { toUserId });
                return;
            }

            const matchId = `${roomId}-${Date.now()}`;
            const white = Math.random() < 0.5 ? fromUserId : toUserId;
            const black = white === fromUserId ? toUserId : fromUserId;

            activeMatches.set(matchId, {
                id: matchId, roomId, white, black,
                chess: new Chess(), lastMoveTS: Date.now(),
            });

            io.to(fromUserId).socketsJoin(matchId);
            io.to(toUserId).socketsJoin(matchId);

            io.to(matchId).emit('chessMatchStarted', {
                matchId, white, black, fen: 'start', history: [],
            });
        });

        /* ---- B. MOVES ---- */
        socket.on('chessMove', ({ matchId, from, to, promotion = 'q', playerId }) => {
            const match = activeMatches.get(matchId);
            if (!match) return;

            const turnColor = match.chess.turn() === 'w' ? 'white' : 'black';
            if ((turnColor === 'white' && playerId !== match.white) ||
                (turnColor === 'black' && playerId !== match.black)) {
                socket.emit('chessIllegalMove', { reason: 'Not your turn' });
                return;
            }

            const move = match.chess.move({ from, to, promotion, sloppy: true });
            if (!move) {
                // socket.emit('chessIllegalMove', { reason: 'Illegal move' });
                socket.emit('chessIllegalMove', {
                    reason: 'Illegal move',
                    fen: match.chess.fen(),           // authoritative position
                });

                return;
            }

            match.lastMoveTS = Date.now();

            io.to(matchId).emit('chessMoveMade', {
                matchId,
                move,
                fen: match.chess.fen(),
                // history: match.chess.history({ verbose: true }),
                history: simpleHistory,
                inCheck: match.chess.inCheck?.() || match.chess.in_check?.(),
                inCheckmate: match.chess.inCheckmate?.() || match.chess.in_checkmate?.(),
                inDraw: match.chess.inDraw?.() || match.chess.in_draw?.(),
            });


            if (
                (typeof match.chess.game_over === 'function' && match.chess.game_over()) ||
                (typeof match.chess.gameOver === 'function' && match.chess.gameOver())
            ) {
                activeMatches.delete(matchId);
            }
        });

        /* ---- C. RESIGN ---- */
        socket.on('chessResign', ({ matchId, playerId }) => {
            const match = activeMatches.get(matchId);
            if (!match) return;
            const winner = playerId === match.white ? match.black : match.white;
            io.to(matchId).emit('chessMatchEnded', { winner, by: 'resignation' });
            activeMatches.delete(matchId);
        });
    });

    /* ---- D. SINGLE garbage-collector ---- */
    setInterval(() => {
        const now = Date.now();
        activeMatches.forEach((m, id) => {
            if (now - m.lastMoveTS > 1_800_000) {   // 30 minutes
                io.to(id).emit('chessMatchEnded', { by: 'timeout' });
                activeMatches.delete(id);
            }
        });
    }, 60_000);
};

module.exports = setupChessHandlers;
