const express = require('express');
const app = express();
const port = 3001;
const mongoose = require('mongoose');
const cors = require('cors');
const routes = require('./routes');
const session = require('express-session');
const passport = require('./auth');
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const setupSocketHandlers = require('./socketHandlers');
const setupWebRTCSignaling = require('./webrtcHandlers');

// CORS and middlewares
const corsOptions = {
  // origin: ['http://localhost:3000', 'http://ec2-3-137-181-105.us-east-2.compute.amazonaws.com:3000/', "http://3.137.181.105:3000/"],
  origin: [
    'http://localhost:3000',
    'http://ec2-3-137-181-105.us-east-2.compute.amazonaws.com:3000',
    'http://3.137.181.105:3000'
  ],
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
setupWebRTCSignaling(io);

// Connect to MongoDB
// mongoose.connect('mongodb://localhost/test', { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connect('mongodb://127.0.0.1:27017/test')
  .then(() => console.log("✅ Connected to MongoDB!"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

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
