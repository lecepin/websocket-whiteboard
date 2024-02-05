import express from "express";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static("public"));

wss.on("connection", function connection(ws) {
  const userConnected = {
    type: "user-event",
    event: "connected",
    userCount: wss.clients.size,
  };
  broadcast(ws, JSON.stringify(userConnected), false);

  ws.on("message", function incoming(data) {
    broadcast(ws, data.toString());
  });

  ws.on("close", function close() {
    const userDisconnected = {
      type: "user-event",
      event: "disconnected",
      userCount: wss.clients.size - 1,
    };
    broadcast(ws, JSON.stringify(userDisconnected), false);
  });
});

server.listen(8083, function () {
  console.log("Server is running on http://localhost:8083");
});

function broadcast(client, data, excludeSelf = true) {
  wss.clients.forEach(function each(otherClient) {
    if (
      excludeSelf
        ? otherClient !== client && otherClient.readyState === WebSocket.OPEN
        : true
    ) {
      otherClient.send(data);
    }
  });
}
