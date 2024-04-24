const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: String,
  language: String,
}, { versionKey: false });

const Room = mongoose.model('Room', roomSchema);
module.exports = Room;
