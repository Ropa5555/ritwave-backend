const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

const users = {};
const JAMENDO_CLIENT_ID = "e3c4c4d0";

app.get('/api/songs', async (req, res) => {
  try {
    const response = await axios.get('https://api.jamendo.com/v3.0/tracks', {
      params: {
        client_id: JAMENDO_CLIENT_ID,
        format: 'json',
        limit: 20,
        audioformat: 'mp32',
        include: 'musicinfo',
        order: 'popularity_total',
      }
    });

    const songs = response.data.results.map(track => ({
      title: track.name,
      artist: track.artist_name,
      duration: track.duration,
      url: track.audio,
    }));

    res.json(songs);
  } catch (err) {
    console.error('Error fetching from Jamendo:', err.message);
    res.status(500).json({ error: 'Failed to fetch songs' });
  }
});

io.on('connection', socket => {
  console.log('A user connected:', socket.id);

  socket.on('joinParty', (username) => {
    users[socket.id] = username || `User-${socket.id.slice(0, 4)}`;
    socket.join('partyRoom');
    console.log(`${users[socket.id]} joined partyRoom`);
    io.to('partyRoom').emit('userJoined', { username: users[socket.id] });
  });

  socket.on('play', data => socket.to('partyRoom').emit('play', data));
  socket.on('pause', data => socket.to('partyRoom').emit('pause', data));
  socket.on('seek', data => socket.to('partyRoom').emit('seek', data));

  socket.on('disconnect', () => {
    const username = users[socket.id];
    console.log(`${username} disconnected`);
    socket.to('partyRoom').emit('userLeft', { username });
    delete users[socket.id];
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
