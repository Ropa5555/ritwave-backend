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

// ✅ Song search route (YouTube fallback)
app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Missing query" });

  try {
    const response = await axios.get(
      `https://yt-api.p.rapidapi.com/search`,
      {
        params: { query, type: "music" },
        headers: {
          "X-RapidAPI-Key": "your-rapidapi-key-here", // Replace with your key
          "X-RapidAPI-Host": "yt-api.p.rapidapi.com",
        },
      }
    );

    const results = response.data.data.map((item) => ({
      title: item.title,
      artist: item.channelTitle,
      videoId: item.videoId,
      thumbnail: item.thumbnail[0]?.url,
      url: `https://www.youtube.com/watch?v=${item.videoId}`,
    }));

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
