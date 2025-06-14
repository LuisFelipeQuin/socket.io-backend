const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
const routes = require('./routes');
const session = require('express-session');
const passport = require('./auth');
const fs = require('fs');
const https = require('https');
const { Server } = require("socket.io");
const setupSocketHandlers = require('./socketHandlers');
const setupWebRTCSignaling = require('./webrtcHandlers');
const setupChessHandlers = require('./chess');

// SSL
const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/talktalkrommie-api.online/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/talktalkrommie-api.online/fullchain.pem'),
};

// CORS
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://ec2-3-137-181-105.us-east-2.compute.amazonaws.com:3000',
    'http://3.137.181.105:3000',
    "https://talktalkrommie.online"
  ],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Sessions and Passport
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: true,
    sameSite: 'None'
  }
}));


app.use(passport.initialize());
app.use(passport.session());

// MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/test')
  .then(() => console.log("✅ Connected to MongoDB!"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  console.log("✅ We are connected to the database!");
});



// Test Route
app.get('/testing', (req, res) => {
  res.json({ message: 'Backend is a nigger' });
});

// 🔥 Create HTTPS server with Express
const httpsServer = https.createServer(options, app);

// 🔌 Setup Socket.IO on the HTTPS server
const io = new Server(httpsServer, {
  cors: corsOptions
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/', routes);
app.use('/api', routes);


// Setup socket handlers
setupSocketHandlers(io);
setupWebRTCSignaling(io);
setupChessHandlers(io);

// Start HTTPS server
httpsServer.listen(443, () => {
  console.log('✅ HTTPS Backend running at https://talktalkrommie-api.online');
});