import { Server } from 'socket.io';

let io;
const userSockets = new Map();

const socketUtil = {
  init: (server) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    io = new Server(server, {
      cors: { origin: clientUrl, methods: ["GET", "POST"], credentials: true }
    });
    return io;
  },
  getIo: () => {
    if (!io) throw new Error("Socket.io chưa khởi tạo!");
    return io;
  },
  addUser: (userId, socketId) => {
    userSockets.set(userId.toString(), socketId);
  },
  removeUser: (socketId) => {
    for (let [userId, sId] of userSockets.entries()) {
      if (sId === socketId) {
        userSockets.delete(userId);
        break;
      }
    }
  },
  getUserSocket: (userId) => userSockets.get(userId.toString())
};

export default socketUtil;