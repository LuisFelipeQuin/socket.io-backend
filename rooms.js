const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  user_id: String,
  name: String,
  image: String,
}, { _id: false });

const adminSchema = new mongoose.Schema({
  user_id: String,
  name: String,
  image: String,
}, { _id: false });

const roomSchema = new mongoose.Schema({
  name: String,
  language: String,
  users: [userSchema],
  admin: {
    type: [adminSchema],
    validate: [arrayLimit, 'Just one admin.']
  },
  max_users: Number,
  level: { type: String, default: null },
  lastActivity: { type: Date, default: Date.now },
  created_date: { type: Date, default: Date.now },
  deleted_date: { type: Date, default: null }
}, { versionKey: false });

// Validation to ensure only one admin per room
function arrayLimit(val) {
  return val.length <= 1;
}

// Virtual field to keep track of delete timers for inactive rooms
roomSchema.virtual('deleteTimer');

// Export Room model
module.exports = mongoose.model('Room', roomSchema);