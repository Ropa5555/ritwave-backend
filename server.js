const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const axios = require("axios");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// ✅ Home route
app.get("/", (req, res) => {
  res.send("🎵 Welcome to Ritwave Backend (YouTube Version)");
});

// ✅ 🔁 Fixed YouTube Search API route
app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Missing query" });

  try {
    const response = await axios.get(
      'https://youtube-search-and-download.p.rapidapi.com/search',
      {
        params: { query, type: "v" },
        headers: {
          'X-RapidAPI-Key': 'd605846129mshe55f3548c262bd6p19151bjsn336b5c04e938',
          'X-RapidAPI-Host': 'youtube-search-and-download.p.rapidapi.com'
        }
      }
    );

    const results = response.data.contents
      .filter(item => item.video)
      .map(item => {
        const video = item.video;
        return {
          title: video.title,
          artist: video.channelName,
          videoId: video.videoId,
          thumbnail: video.thumbnails[0]?.url,
          url: `https://www.youtube.com/watch?v=${video.videoId}`
        };
      });

    res.json(results);
  } catch (error) {
    console.error("YouTube search error:", error.message);
    res.status(500).json({ error: "Failed to search YouTube" });
  }
});

// ✅ Socket.io party sync
const users = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("joinParty", (username) => {
    users[socket.id] = username || `User-${socket.id.slice(0, 4)}`;
    socket.join("partyRoom");
    console.log(`${users[socket.id]} joined partyRoom`);
    io.to("partyRoom").emit("userJoined", { username: users[socket.id] });
  });

  socket.on("play", (data) => socket.to("partyRoom").emit("play", data));
  socket.on("pause", (data) => socket.to("partyRoom").emit("pause", data));
  socket.on("seek", (data) => socket.to("partyRoom").emit("seek", data));

  socket.on("disconnect", () => {
    const username = users[socket.id];
    console.log(`${username} disconnected`);
    socket.to("partyRoom").emit("userLeft", { username });
    delete users[socket.id];
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Ritwave backend running on port ${PORT}`);
});
