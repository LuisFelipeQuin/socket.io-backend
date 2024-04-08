const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: String,
  language: String,
});

const Room = mongoose.model('Room', roomSchema);
module.exports = Room; // Asegúrate de que esta línea está presente para poder importar Room donde sea necesario
