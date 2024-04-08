router.post('/v1/create/room', async (req, res) => {
    try {
      const { name, language } = req.body;
      const newRoom = new Room({ name, language });
      await newRoom.save();
      io.emit('roomCreated', newRoom); // Notifica a todos los clientes
      res.status(201).json({ message: 'Room created successfully', room: newRoom });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error creating the room' });
    }
  });
  