const express = require('express');
const router = express.Router();
const Room = require('./rooms');  // Asegúrate de que el archivo 'rooms.js' esté en la ubicación correcta
const passport = require('passport');
const jwt = require('jsonwebtoken');

const path = require('path');

router.get('/', (req, res) => {
  res.json({ message: 'hello world!'});
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


function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, 'tfJgRKrWcmqGX2F', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}


router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback', 

passport.authenticate('google', { failureRedirect: '/login' }),
(req, res) => { 
  const token = generateToken(req.user);
  // Ejemplo de redirección con el token como query param
  res.redirect(`http://localhost:3001/?token=${token}`);
});


router.post('/v1/create/room', async (req, res) => {
  try {
    const { name, language } = req.body;
    const newRoom = new Room({ name, language });
    await newRoom.save();
    req.io.emit('roomCreated', newRoom);  // Utiliza req.io para emitir eventos
    res.status(201).json({ message: 'Room created successfully'});
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
