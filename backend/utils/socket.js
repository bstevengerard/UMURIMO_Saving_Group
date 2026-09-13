const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const { getDB } = require('../lib/prisma');
const prisma = getDB();

const initSocketIO = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error"));
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error('JWT_SECRET is not configured');
        return next(new Error("Server configuration error"));
      }
      const decoded = jwt.verify(token, secret);
      const member = await prisma.member.findUnique({
        where: { id: decoded.member.id }
      });

      if (!member) {
        return next(new Error("Please authenticate"));
      }

      socket.member = member;
      next();
    } catch (err) {
      return next(new Error("Authentication error"));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.member.full_name} (${socket.member.id})`);

    socket.join(`user_${socket.member.id}`);

    if (socket.member.role === 'admin') {
      socket.join('admins');
    }

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.member.full_name}`);
    });

    socket.on('join_meeting', (meetingId) => {
      socket.join(`meeting_${meetingId}`);
      console.log(`User ${socket.member.id} joined meeting ${meetingId}`);
    });

    socket.on('leave_meeting', (meetingId) => {
      socket.leave(`meeting_${meetingId}`);
      console.log(`User ${socket.member.id} left meeting ${meetingId}`);
    });
  });

  return io;
};

module.exports = { initSocketIO };
