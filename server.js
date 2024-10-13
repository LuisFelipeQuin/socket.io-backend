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
const setupSocketHandlers = require('./socketHandlers');

// CORS and middlewares
const corsOptions = {
  origin: 'http://localhost:3001',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: 'auto' }
}));

app.use(passport.initialize());
app.use(passport.session());

const io = new Server(server, {
  cors: corsOptions
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

// Setup socket handlers
setupSocketHandlers(io);

// Connect to MongoDB
mongoose.connect('mongodb://localhost/test', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  console.log("we are connected to the database!");
});

app.use('/', routes);
app.use('/api', routes);

// Start the server
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
