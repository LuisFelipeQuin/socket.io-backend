const express = require('express');
const router = express.Router();
const Room = require('./rooms');
const Message = require('./messages');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');


const path = require('path');
const app = express();

app.use(cookieParser());

router.get('/', (req, res) => {
  res.json({ message: 'hello world!' });
});

router.get('/data', (req, res) => {
  res.json({ message: 'Hola.. aca deberia haber algo de data', datos: [1, 2, 3] });
});


// Informacion que se envia en el jsonwebtoken
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

    res.cookie('token', token, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax'
    });

    res.redirect('http://localhost:3001/');
  }
);



router.get('/v1/get/rooms', async (req, res) => {
  try {
    const rooms = await Room.find();
    res.status(200).json(rooms);
  } catch (error) {
    console.error("Error retrieving the rooms:", error);
    res.status(200).json({ message: 'Error retrieving the rooms', error: error.message });
  }
});


router.post('/v1/create/room', async (req, res) => {
  try {
    const { name, language, max_users, user_id, user_name, user_image, level } = req.body;

    if (!language || max_users === undefined || !user_id || !user_name || !user_image) {
      return res.status(200).json({ message: 'Name, Language, Max Users, User ID, User Name, and User Image are required to create a room' });
    }

    let validLevel = level || null;

    if (typeof validLevel !== 'string') {
      return res.status(200).json({ message: 'Invalid value for level. It must be a string.' });
    }

    const admin = {
      user_id: user_id,
      name: user_name,
      image: user_image
    };

    const newRoom = new Room({
      name,
      language,
      max_users,
      users: [],
      admin: [admin],
      level: validLevel
    });

    await newRoom.save();

    req.io.emit('roomCreated', newRoom);

    res.status(200).json({ success: 1, response: "OK" });
  } catch (error) {
    console.error("Error creating the room:", error);
    res.status(200).json({ message: 'Error creating the room', error: error.message });
  }
});


router.post('/v1/join/room', async (req, res, next) => {
  const { room_id, user_id, name, image, debugging } = req.body;

  if (!room_id || !user_id || !name || !image) {
    return res.status(200).json(debugging ? { success: 1, message: 'Room ID, User ID, Name, and Image are required' } : { success: 1, response: "NO" });
  }

  try {
    const room = await Room.findById(room_id);
    if (!room) {
      return res.status(200).json(debugging ? { success: 1, message: 'Room not found' } : { success: 1, response: "NO" });
    }

    if (!room.users) {
      room.users = [];
    }

    const userExists = room.users.some(user => user.user_id === user_id);
    if (userExists) {
      return res.status(200).json({ success: 1, response: 'User already in the room' });
    }

    const userInAnotherRoom = await Room.findOne({ 'users.user_id': user_id });
    if (userInAnotherRoom) {
      return res.status(200).json({ success: 1, response: 'User in another room' });
    }

    if (room.users.length >= room.max_users) {
      return res.status(200).json({ success: 1, response: 'Room is full' });
    }

    room.users.push({ user_id, name, image });
    room.lastActivity = Date.now();
    await room.save();

    req.io.emit('userEnteredRoom', room);

    res.status(200).json({ success: 1, response: "OK" });
  } catch (error) {
    console.error("Error updating the room:", error);
    return next(error);
  }
});


router.get('/v1/room/single', async (req, res) => {
  const { room_id } = req.query;

  if (!room_id) {
    return res.status(200).json({ message: 'room_id is required' });
  }

  try {
    const room = await Room.findById(room_id);

    if (!room) {
      return res.status(200).json({ message: 'Room not found' });
    }

    res.status(200).json(room);
  } catch (error) {
    console.error("Error retrieving the room:", error);
    res.status(200).json({ message: 'Error retrieving the room', error: error.message });
  }
});


router.post('/v1/leave/room', async (req, res, next) => {
  const { room_id, user_id, name, image, debugging } = req.body;

  if (!room_id || !user_id || !name || !image) {
    return res.status(200).json(debugging ? { success: 1, message: 'Room ID, User ID, Name, and Image are required' } : { success: 1, response: "NO" });
  }

  try {
    const room = await Room.findById(room_id);
    if (!room) {
      return res.status(200).json(debugging ? { success: 1, message: 'Room not found' } : { success: 1, response: "NO" });
    }

    if (!room.users) {
      room.users = [];
    }

    const userIndex = room.users.findIndex(user => user.user_id === user_id);
    if (userIndex === -1) {
      return res.status(200).json({ success: 1, message: 'User not found in the room' });
    }

    room.users.splice(userIndex, 1);
    await room.save();

    req.io.emit('userLeftRoom', room);

    res.status(200).json({ success: 1, response: "OK" });
  } catch (error) {
    console.error("Error updating the room:", error);
    return next(error);
  }
});


router.post('/v1/admin/request/leave/room', async (req, res, next) => {
  const { room_id, admin_id, user_id } = req.body;

  if (!room_id || !admin_id || !user_id) {
    return res.status(200).json({ success: 1, message: 'Room ID, Admin ID, and User ID are required' });
  }

  try {
    const room = await Room.findById(room_id);
    if (!room) {
      return res.status(200).json({ success: 1, message: 'Room not found' });
    }

    const isAdmin = room.admin.some(admin => admin.user_id === admin_id);
    if (!isAdmin) {
      return res.status(200).json({ success: 1, message: 'Only the admin can remove a user from the room' });
    }

    req.io.to(user_id).emit('kickedOut', { room_id });

    res.status(200).json({ success: 1, response: 'OK' });
  } catch (error) {
    console.error({ success: 1, response: error });
    return next(error);
  }
});


router.get('/v1/get/messages', async (req, res) => {
  try {
    const { room_id } = req.query;

    if (!room_id) {
      return res.status(200).json({ message: 'Room ID is required to get messages' });
    }

    const room = await Room.findById(room_id);
    if (!room) {
      return res.status(200).json({ message: 'Room not found' });
    }

    const messages = await Message.find({ room_id });

    const transformedMessages = messages.map(message => ({
      _id: message._id,
      room_id: message.room_id,
      user_id: message.user_id,
      name: message.name,
      content: message.content,
      timestamp: message.timestamp,
      userImage: message.userImage
    }));

    res.status(200).json({ messages: transformedMessages });
  } catch (error) {
    console.error("Error getting the messages:", error);
    res.status(200).json({ message: 'Error getting the messages', error: error.message });
  }
});


router.post('/v1/create/message', async (req, res) => {
  try {
    const { room_id, user_id, name, content, userImage } = req.body;

    if (!room_id || !user_id || !name || !content || !userImage) {
      return res.status(400).json({ message: 'Room ID, User ID, Name, Content, image missing' });
    }

    const room = await Room.findById(room_id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const newMessage = new Message({ room_id, user_id, name, content, userImage });
    await newMessage.save();

    req.io.to(room_id).emit('messageCreated', newMessage);

    res.status(200).json({ success: 1, response: "OK" });
  } catch (error) {
    console.error("Error creating the message:", error);
    res.status(500).json({ message: 'Error creating the message', error: error.message });
  }
});


router.post('/v1/edit/room', async (req, res) => {
  try {
    const { room_id, name, language, max_users, admin_id, level } = req.body;

    if (!room_id || !admin_id) {
      return res.status(200).json({ message: 'Room ID and Admin ID are required to edit the room' });
    }

    const room = await Room.findById(room_id);

    if (!room) {
      return res.status(200).json({ message: 'Room not found' });
    }

    const isAdmin = room.admin.some(admin => admin.user_id === admin_id);

    if (!isAdmin) {
      return res.status(200).json({ message: 'Only the room admin can update the room' });
    }


    if (name) room.name = name;
    if (language) room.language = language;
    if (level) room.level = level;
    if (max_users !== undefined) room.max_users = max_users;

    await room.save();

    req.io.emit('roomUpdated', room);

    res.status(200).json({ success: 1, response: "OK" });
  } catch (error) {
    console.error("Error updating the room:", error);
    res.status(200).json({ message: 'Error updating the room', error: error.message });
  }
});


router.delete('/v1/delete/room', async (req, res) => {
  try {
    const { room_id, admin_id } = req.body;

    // Check if room_id and admin_id are provided
    if (!room_id || !admin_id) {
      return res.status(400).json({ message: 'Room ID and Admin ID are required to delete a room' });
    }

    // Find the room by ID
    const room = await Room.findById(room_id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if the provided admin_id matches the room's admin
    if (!room.admin || room.admin[0].user_id !== admin_id) {
      return res.status(403).json({ message: 'Only the admin can delete this room' });
    }

    // Check if there are users in the room
    if (room.users && room.users.length > 0) {
      return res.status(400).json({ message: 'Room cannot be deleted because there are users inside' });
    }

    // Delete the room
    await Room.findByIdAndDelete(room_id);

    // Emit a roomDeleted event
    req.io.emit('roomDeleted', room);


    res.status(200).json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error("Error deleting the room:", error);
    res.status(500).json({ message: 'Error deleting the room', error: error.message });
  }
});


//  -- i think we dont need it--
// const emitUserLeftRoom = (io, room) => {
//   if (io && room) {
//     io.emit('userLeftRoom', room);
//   }
// };



module.exports = router;
