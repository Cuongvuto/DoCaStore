import { Server } from 'socket.io';
import { authenticateSession } from '../services/sessionService.js';

let io;
const userSockets = new Map();

function revokeSocket(socket) {
  socket.emit('AUTH_REVOKED', { message: 'Phiên đăng nhập hoặc quyền tài khoản đã thay đổi. Vui lòng đăng nhập lại.' });
  socket.disconnect(true);
}

const socketUtil = {
  init: (server, { sessionCheckIntervalMs = 30_000 } = {}) => {
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
        socket.user = await authenticateSession(token);
        socket.data.sessionToken = token;
        next();
      } catch {
        next(new Error('AUTH_INVALID'));
      }
    });

    io.on('connection', socket => {
      const checkSession = async () => {
        const current = await authenticateSession(socket.data.sessionToken);
        // Never allow handlers that captured a previous role to continue using it.
        if (!socket.connected || current.role !== socket.user.role) throw new Error('AUTH_INVALID');
        return current;
      };
      socket.use(async (packet, next) => {
        try {
          await checkSession();
          next();
        } catch {
          const ack = packet.at(-1);
          if (typeof ack === 'function') ack({ success: false, code: 'AUTH_INVALID', message: 'Phiên đăng nhập đã hết hiệu lực.' });
          revokeSocket(socket);
          next(new Error('AUTH_INVALID'));
        }
      });
      socket.on('error', () => {}); // Packet rejection was already acknowledged.

      // Catch out-of-band account changes even when the socket only receives events.
      let checking = false;
      const interval = setInterval(async () => {
        if (checking) return;
        checking = true;
        try { await checkSession(); } catch { revokeSocket(socket); }
        finally { checking = false; }
      }, sessionCheckIntervalMs);
      interval.unref();
      let expiry;
      const scheduleExpiry = () => {
        if (!socket.user.exp) return;
        const remaining = socket.user.exp * 1000 - Date.now();
        if (remaining <= 0) { revokeSocket(socket); return; }
        expiry = setTimeout(scheduleExpiry, Math.min(remaining, 2_147_483_647));
        expiry.unref();
      };
      scheduleExpiry();
      socket.on('disconnect', () => { clearInterval(interval); clearTimeout(expiry); });
    });

    return io;
  },
  getIo: () => {
    if (!io) throw new Error("Socket.io chưa khởi tạo!");
    return io;
  },
  revokeUser: (userId) => {
    if (!io) return;
    for (const socket of io.of('/').sockets.values()) {
      if (socket.user?.id === String(userId)) revokeSocket(socket);
    }
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
