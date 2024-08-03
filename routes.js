const express = require('express');
const router = express.Router();
const Room = require('./rooms');  // Asegúrate de que el archivo 'rooms.js' esté en la ubicación correcta
const passport = require('passport');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');


const path = require('path');

router.get('/', (req, res) => {
  res.json({ message: 'hello world!' });
});

router.get('/data', (req, res) => {
  res.json({ message: 'Hola.. aca deberia haber algo de data', datos: [1, 2, 3] });
});


// informacion que se envia en el jsonwebtoken
function generateToken(user) {
  const payload = {
    _id: user._id,
    name: user.name,
    email: user.email,
    profileImageUrl: user.profileImageUrl
  };
  return jwt.sign(payload, 'tfJgRKrWcmqGX2F', { expiresIn: '1h' });
}





router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback',

  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    const token = generateToken(req.user);
    // Ejemplo de redirección con el token como query param
    res.redirect(`http://localhost:3001/?token=${token}`);
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

router.post('/v1/create/room', async (req, res) => {
  try {
    const { name, language } = req.body;
    const newRoom = new Room({ name, language });
    await newRoom.save();

    req.io.emit('roomCreated', newRoom);

    res.status(201).json({ message: 'Room created successfully', room: newRoom });
  } catch (error) {
    console.error("Error creating the room:", error);
    res.status(500).json({ message: 'Error creating the room', error: error.message });
  }
});



router.post('/v1/join/room', async (req, res, next) => {
  const { id, name, image, debugging } = req.body;

  if (!id || !name || !image) {
    return res.status(400).json(debugging ? { success: 0, message: 'ID, Name, and Image are required' } : { success: 1, response: "NO" });
  }

  try {
    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json(debugging ? { success: 0, message: 'Room not found' } : { success: 1, response: "NO" });
    }

    if (!room.users) {
      room.users = [];
    }

    room.users.push({ name, image });
    await room.save();

    req.io.emit('userEnteredRoom', { room });

    res.status(200).json({ success: 1, response: "OK" });
  } catch (error) {
    console.error("Error updating the room:", error);
    return next(error);
  }
});


router.post('/v1/leave/room', async (req, res, next) => {
  const { id, name, image, debugging } = req.body;

  if (!id || !name || !image) {
    return res.status(400).json(debugging ? { success: 0, message: 'ID, Name, and Image are required' } : { success: 1, response: "NO" });
  }

  try {
    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json(debugging ? { success: 0, message: 'Room not found' } : { success: 1, response: "NO" });
    }

    if (!room.users) {
      room.users = [];
    }

    const userIndex = room.users.findIndex(user => user.name === name && user.image === image);
    if (userIndex === -1) {
      return res.status(404).json(debugging ? { success: 0, message: 'User not found in the room' } : { success: 1, response: "NO" });
    }

    room.users.splice(userIndex, 1);
    await room.save();

    req.io.emit('userLeftRoom', { room });

    res.status(200).json({ success: 1, response: "OK" });
  } catch (error) {
    console.error("Error updating the room:", error);
    return next(error);
  }
});





// router.post('/v1/testing', (req, res) => {
//   const { name, id } = req.body;

//   if (!name || !id) {
//     return res.status(400).json({ message: 'Name and ID are required' });
//   }

//   req.io.emit('testingExecuted');
//   res.status(200).json({ message: 'Payload received and event emitted' });
// });

module.exports = router;
