import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

let io;
const userSockets = new Map();

const socketUtil = {
  init: (server) => {
    const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    io = new Server(server, {
      cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true }
    });

    io.use(async (socket, next) => {
      try {
        const bearer = socket.handshake.headers.authorization;
        const token = socket.handshake.auth?.token
          || (bearer?.startsWith('Bearer ') ? bearer.slice(7) : null);

        if (!token) return next(new Error('AUTH_REQUIRED'));
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('_id role isVerified');
        if (!user || !user.isVerified) return next(new Error('AUTH_INVALID'));
        socket.user = { id: user._id.toString(), role: user.role };
        next();
      } catch {
        next(new Error('AUTH_INVALID'));
      }
    });

    return io;
  },
  getIo: () => {
    if (!io) throw new Error("Socket.io chưa khởi tạo!");
    return io;
  },
  addUser: (userId, socketId) => {
    const key = userId.toString();
    const sockets = userSockets.get(key) || new Set();
    sockets.add(socketId);
    userSockets.set(key, sockets);
  },
  removeUser: (socketId) => {
    for (const [userId, socketIds] of userSockets.entries()) {
      socketIds.delete(socketId);
      if (socketIds.size === 0) {
        userSockets.delete(userId);
      }
    }
  },
  getUserSocket: (userId) => {
    const socketIds = userSockets.get(userId.toString());
    return socketIds ? Array.from(socketIds).at(-1) : undefined;
  }
};

export default socketUtil;
