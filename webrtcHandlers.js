// server/webrtcHandlers.js

function setupWebRTCSignaling(io) {
    io.on('connection', (socket) => {

        // User wants to start voice chat in a specific room
        socket.on('startVoiceChat', (roomId) => {
            // Broadcast to other users in the room that someone wants to start a voice chat
            socket.broadcast.to(roomId).emit('startVoiceChat', {
                initiatorSocketId: socket.id
            });
        });

        // Client sends an offer to the server, server relays it to the target peer
        socket.on('offer', ({ targetSocketId, offer }) => {
            io.to(targetSocketId).emit('offer', {
                offer,
                senderSocketId: socket.id
            });
        });

        // Client sends an answer to the server, server relays it to the target peer
        socket.on('answer', ({ targetSocketId, answer }) => {
            io.to(targetSocketId).emit('answer', {
                answer,
                senderSocketId: socket.id
            });
        });

        // ICE Candidates
        socket.on('iceCandidate', ({ targetSocketId, candidate }) => {
            io.to(targetSocketId).emit('iceCandidate', {
                candidate,
                senderSocketId: socket.id
            });
        });
    });
}

module.exports = setupWebRTCSignaling;
