let io;

module.exports = {
  init: (server) => {
    const socketio = require('socket.io');
    io = socketio(server, {
      cors: {
        origin: '*',  // Update with frontend origin in prod
        methods: ['GET', 'POST']
      }
    });

    io.on('connection', (socket) => {
      console.log('Socket connected:', socket.id);

      // Join room for quiz to get real-time updates
      socket.on('join_quiz_room', (quizId) => {
        socket.join(`quiz_${quizId}`);
        console.log(`Socket ${socket.id} joined room quiz_${quizId}`);
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
      });
    });

    return io;
  },

  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  }
};
