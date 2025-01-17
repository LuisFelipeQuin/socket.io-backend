const Room = require('./rooms');
const activeUsers = new Map();

const setupSocketHandlers = (io) => {
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        // When user joins a room
        socket.on('joinRoom', (roomId, user_id) => {
            socket.join(roomId);
            socket.join(user_id); // Joining a room based on user_id for targeted communication
            activeUsers.set(socket.id, { user_id, room_id: roomId });
            console.log(`User: ${user_id}, joined room: ${roomId}, in the socket id of: ${socket.id}`);
        });

        // Heartbeat handling to keep track of active users
        socket.on('heartbeatPing', (data) => {
            const currentDate = new Date();
            const dateString = currentDate.toLocaleString();
            console.log(`Heartbeat received from user == > ${data.user_id} at [${dateString}]`);
            const { user_id, room_id } = data;
            activeUsers.set(socket.id, { user_id, room_id, lastPing: Date.now() });
        });

        // When a message is created in a room
        socket.on('messageCreated', (newMessage) => {
            io.to(newMessage.room_id).emit('messageCreated', newMessage);
        });

        // Handling user disconnection
        socket.on('disconnect', async () => {
            console.log(`User disconnected: ${socket.id}`);

            const userData = activeUsers.get(socket.id);
            if (userData) {
                const { user_id, room_id } = userData;

                // Remove user from activeUsers map
                activeUsers.delete(socket.id);

                try {
                    const updatedRoom = await Room.findOneAndUpdate(
                        { _id: room_id },
                        { $pull: { users: { user_id: user_id } } },
                        { new: true }
                    );

                    if (updatedRoom) {
                        console.log(`User ${user_id} removed from the users array of room ${room_id}`);
                        socket.broadcast.emit('userLeftRoom', updatedRoom);
                    }
                } catch (error) {
                    console.error(`Error removing user ${user_id} from room ${room_id}:`, error);
                }
            }
        });

        // Cleanup inactive users periodically
        setInterval(() => {
            const now = Date.now();
            activeUsers.forEach((value, key) => {
                if (now - value.lastPing > 15000) { // 15 seconds timeout
                    const currentDate = new Date();
                    const dateString = currentDate.toLocaleString();
                    console.log(`Removing user ${value.user_id} from room ${value.room_id} due to inactivity. at [${dateString}]`);
                    io.to(value.room_id).emit('userRemovedFromRoom', { user_id: value.user_id, room_id: value.room_id });
                    activeUsers.delete(key);
                }
            });
        }, 5000); // Check every 5 seconds
    });
};

module.exports = setupSocketHandlers;
