const express = require('express');
const router = express.Router();
const Room = require('./rooms');  // Asegúrate de que el archivo 'rooms.js' esté en la ubicación correcta

router.get('/', (req, res) => {
  res.json({ message: 'hello world!'});
});

router.get('/data', (req, res) => {
  res.json({ message: 'Hola.. aca deberia haber algo de data', datos: [1, 2, 3] });
});

router.post('/v1/create/room', async (req, res) => {
  try {
    const { name, language } = req.body;
    const newRoom = new Room({ name, language });
    await newRoom.save();
    req.io.emit('roomCreated', newRoom);  // Utiliza req.io para emitir eventos
    res.status(201).json({ message: 'Room created successfully', room: newRoom });
  } catch (error) {
    console.error("Error creating the room:", error);
    res.status(500).json({ message: 'Error creating the room', error: error.message });
  }
});

router.get('/v1/get/rooms', async (req, res) => {
  try {
    const rooms = await Room.find();
    res.status(200).json(rooms);
  } catch (error) {
    console.error("Error retrieving the rooms:", error);
    res.status(500).json({ message: 'Error retrieving the rooms', error: error.message });
  }
});

module.exports = router;
