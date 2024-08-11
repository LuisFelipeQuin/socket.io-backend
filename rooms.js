const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  user_id: String,
  name: String,
  image: String,
}, { _id: false });

const roomSchema = new mongoose.Schema({
  name: String,
  language: String,
  users: [userSchema],
  max_users: Number,
  lastActivity: { type: Date, default: Date.now },
  deleted_date: { type: Date, default: null }
}, { versionKey: false });


module.exports = mongoose.model('Room', roomSchema);
