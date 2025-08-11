const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { Server: SocketIOServer } = require('socket.io');

const config = require('./config/config');
const database = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const classRoutes = require('./routes/classes');
const quizRoutes = require('./routes/quizzes');
const submissionRoutes = require('./routes/submissions');
const adminRoutes = require('./routes/admin');

// Import middleware
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const AuditLogger = require('./middleware/auditLogger');

class Server {
    constructor() {
        this.app = express();
        this.port = config.server.port;
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();

        // Create HTTP server and attach Socket.IO
        this.httpServer = http.createServer(this.app); // <-- ADD THIS LINE
        this.io = new SocketIOServer(this.httpServer, {
            cors: {
                origin: "http://localhost:3000",
                methods: ["GET", "POST"],
                        credentials: true // <-- Add this line!
            }
        });

        // Make io available globally for emitting events
        global.io = this.io;
        
        // Setup Socket.IO connection handling
        this.setupSocketIO();
    }

    setupSocketIO() {
        this.io.on('connection', (socket) => {
            console.log('📡 Socket connected:', socket.id);

            // Join user-specific room for receiving personal notifications
            socket.on('join_user_room', (userId) => {
                socket.join(`user_${userId}`);
                console.log(`📡 Socket ${socket.id} joined user room user_${userId}`);
            });

            // Join room for quiz to get real-time updates
            socket.on('join_quiz_room', (quizId) => {
                socket.join(`quiz_${quizId}`);
                console.log(`📡 Socket ${socket.id} joined room quiz_${quizId}`);
            });

            // Join professor room for receiving quiz management updates
            socket.on('join_professor_room', (professorId) => {
                socket.join(`professor_${professorId}`);
                console.log(`📡 Socket ${socket.id} joined professor room professor_${professorId}`);
            });

            // Handle live answer updates (no DB storage)
            socket.on('live_answer_update', (data) => {
                console.log('📡 Live answer update received:', data);
                // Broadcast to professor and other students in the quiz room
                socket.to(`quiz_${data.quizId}`).emit('live_answer_update', {
                    studentId: data.studentId,
                    studentName: data.studentName,
                    quizId: data.quizId,
                    questionId: data.questionId,
                    selectedOptionId: data.selectedOptionId,
                    optionText: data.optionText,
                    timestamp: data.timestamp
                });
            });

            // Handle quiz live status changes (Pure Frontend Socket-Only!)
            socket.on('quiz_live_status_change', (data) => {
                console.log('📡 SOCKET-ONLY: Quiz status change relay (NO DATABASE!):', data);
                
                // Get all sockets in the class room to verify broadcasting
                const classRoom = `class_${data.classId}`;
                const socketsInRoom = this.io.sockets.adapter.rooms.get(classRoom);
                const roomSize = socketsInRoom ? socketsInRoom.size : 0;
                
                console.log(`🔍 ROOM DEBUG: Broadcasting to ${classRoom}, ${roomSize} clients in room`);
                
                if (roomSize === 0) {
                    console.log('⚠️ WARNING: No students in class room ' + classRoom + '! Students may not have joined properly.');
                }
                
                // Broadcast to all students in the class
                this.io.to(classRoom).emit('quiz_live_status_change', {
                    quizId: data.quizId,
                    quizTitle: data.quizTitle,
                    isLiveActive: data.isLiveActive,
                    professorId: data.professorId,
                    professorName: data.professorName,
                    timestamp: data.timestamp
                });
                
                console.log(`📡 PURE FRONTEND: Quiz ${data.quizId} status broadcasted to ${classRoom} - ${data.isLiveActive ? 'ACTIVATED' : 'PAUSED'}`);
                console.log(`🚀 NO DATABASE WRITES - Pure socket communication!`);
                console.log(`📊 Broadcast sent to ${roomSize} students in ${classRoom}`);
            });
            
            // Test ping handler for debugging
            socket.on('test_ping', (data) => {
                console.log('🏓 BACKEND: Received test ping:', data);
                socket.emit('test_pong', { message: 'Pong from backend', originalMessage: data.message, timestamp: Date.now() });
            });

            // Join class room for students to receive quiz activation updates
            socket.on('join_class_room', (classId) => {
                socket.join(`class_${classId}`);
                console.log(`📡 Socket ${socket.id} joined class room class_${classId}`);
                
                // Verify the join was successful
                const classRoom = `class_${classId}`;
                const socketsInRoom = this.io.sockets.adapter.rooms.get(classRoom);
                const roomSize = socketsInRoom ? socketsInRoom.size : 0;
                console.log(`✅ Room ${classRoom} now has ${roomSize} clients`);
                
                // Send confirmation back to the client
                socket.emit('room_joined', { classId: classId, roomSize: roomSize });
            });

            // Join quiz room for live answer updates
            socket.on('join_quiz_room', (quizId) => {
                socket.join(`quiz_${quizId}`);
                console.log(`📡 Socket ${socket.id} joined quiz room quiz_${quizId}`);
            });

            socket.on('disconnect', () => {
                console.log('📡 Socket disconnected:', socket.id);
            });
        });

        // Make io available to routes via app.set
        this.app.set('io', this.io);
    }


    setupMiddleware() {
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                },
            },
        }));

        this.app.use(cors({
            origin: config.server.corsOrigin,
            credentials: true,
            optionsSuccessStatus: 200,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }));

        const limiter = rateLimit({
            windowMs: config.rateLimit.windowMs,
            max: config.rateLimit.max,
            message: {
                error: 'Too many requests from this IP, please try again later.',
                retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
            },
            standardHeaders: true,
            legacyHeaders: false,
        });
        this.app.use('/api/', limiter);

        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
        this.app.use(AuditLogger.logActivity);

        this.app.use((req, res, next) => {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
            next();
        });
    }

    setupRoutes() {
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'OK',
                timestamp: new Date().toISOString(),
                env: config.server.env,
                uptime: process.uptime()
            });
        });

        this.app.use('/api/auth', authRoutes);
        this.app.use('/api/users', userRoutes);
        this.app.use('/api/classes', classRoutes);
        this.app.use('/api/quizzes', quizRoutes);
        this.app.use('/api/submissions', submissionRoutes);
        this.app.use('/api/admin', adminRoutes);

        this.app.get('/api', (req, res) => {
            res.json({
                message: 'Quiz Management System API',
                version: '1.0.0',
                documentation: '/api/docs',
                endpoints: {
                    auth: '/api/auth',
                    users: '/api/users',
                    classes: '/api/classes',
                    quizzes: '/api/quizzes',
                    submissions: '/api/submissions',
                    admin: '/api/admin'
                }
            });
        });

        this.app.all('*', (req, res) => {
            res.status(404).json({
                error: 'Route not found',
                message: `The requested route ${req.method} ${req.path} does not exist.`,
                availableRoutes: [
                    'GET /health',
                    'GET /api',
                    'POST /api/auth/login',
                    'POST /api/auth/register',
                    'GET /api/users/profile',
                    'GET /api/classes',
                    'GET /api/quizzes',
                    'GET /api/submissions'
                ]
            });
        });
    }

    setupErrorHandling() {
        this.app.use(errorHandler);

        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });

        process.on('SIGTERM', () => {
            console.log('SIGTERM received, shutting down gracefully');
            this.shutdown();
        });

        process.on('SIGINT', () => {
            console.log('SIGINT received, shutting down gracefully');
            this.shutdown();
        });
    }

    async shutdown() {
        console.log('Closing server...');
        await database.close();
        process.exit(0);
    }

    async start() {
        try {
            const dbConnected = await database.testConnection();
            if (!dbConnected) {
                throw new Error('Database connection failed');
            }

            const uploadDir = path.join(__dirname, '../uploads');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            this.httpServer.listen(this.port, () => {
                console.log(`
🚀 Quiz Management System Server Started!
📍 Server running on port ${this.port}
🌍 Environment: ${config.server.env}
📊 Database: Connected to ${config.database.name}
🔒 CORS Origin: ${config.server.corsOrigin}
⏰ Started at: ${new Date().toISOString()}

API Endpoints:
- Health Check: http://localhost:${this.port}/health
- API Documentation: http://localhost:${this.port}/api
- Authentication: http://localhost:${this.port}/api/auth
- Users: http://localhost:${this.port}/api/users
- Classes: http://localhost:${this.port}/api/classes
- Quizzes: http://localhost:${this.port}/api/quizzes
- Submissions: http://localhost:${this.port}/api/submissions
- Admin: http://localhost:${this.port}/api/admin

Press Ctrl+C to stop the server
                `);
            });
        } catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    }
}

// Create and start server
const server = new Server();
server.start();

module.exports = server;