const express = require('express');
const app = express();
const port = 3000;
const mongoose = require('mongoose');
const cors = require('cors');
const routes = require('./routes');
const session = require('express-session');
const passport = require('./auth');
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");

// Configuración de CORS
const corsOptions = {
  origin: 'http://localhost:3001',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
  credentials: true
};

// Aplicar middleware de CORS
app.use(cors(corsOptions));

// Parsear el cuerpo de las solicitudes como JSON
app.use(express.json());

app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: 'auto' }
}));


app.use(passport.initialize());
app.use(passport.session());

// Inicializar Socket.IO
const io = new Server(server, {
  cors: corsOptions
});

// Middleware para adjuntar io a cada solicitud
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Eventos de Socket.IO
io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});


// Conectar a MongoDB
mongoose.connect('mongodb://localhost/test', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  console.log("we are connected to the database!");
});

// Usar las rutas definidas en el archivo de rutas
app.use('/', routes);
app.use('/api', routes);

// Iniciar el servidor HTTP y Socket.IO
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
