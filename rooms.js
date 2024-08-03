const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  image: String,

}, { _id: false });

const roomSchema = new mongoose.Schema({
  name: String,
  language: String,
  users: [userSchema],
}, { versionKey: false });
module.exports = mongoose.model('Room', roomSchema);
