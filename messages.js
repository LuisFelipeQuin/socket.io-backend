const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    userImage: { type: String }
}, { versionKey: false });

module.exports = mongoose.model('Message', messageSchema);
