require('dotenv').config();

const config = {
    server: {
        port: process.env.PORT || 5000,
        env: process.env.NODE_ENV || 'development',
        corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
    },
    
    database: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        name: process.env.DB_NAME || 'quiz_management',
        port: process.env.DB_PORT || 3306
    },
    
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    },
    
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100 // limit each IP to 100 requests per windowMs
    },
    
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
        uploadPath: process.env.UPLOAD_PATH || 'uploads/',
        allowedFileTypes: ['csv', 'json', 'txt']
    },
    
    quiz: {
        maxTimeMinutes: 120,
        maxQuestionsPerQuiz: 50,
        defaultTimeLimit: 30,
        allowLateSubmissions: false
    },
    
    email: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASSWORD || ''
        }
    },
    
    security: {
        bcryptRounds: 12,
        maxLoginAttempts: 5,
        lockoutTimeMinutes: 15,
        passwordMinLength: 6,
        sessionTimeout: 24 * 60 * 60 * 1000 // 24 hours
    },
    
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        auditLog: true,
        maxLogSize: '10m',
        maxLogFiles: 5
    }
};

// Validate required environment variables
const requiredVars = [
    'DB_PASSWORD',
    'JWT_SECRET'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0 && config.server.env === 'production') {
    console.error('❌ Missing required environment variables:', missingVars);
    process.exit(1);
}

// Environment-specific configurations
if (config.server.env === 'production') {
    config.rateLimit.max = 50; // More restrictive in production
    config.security.bcryptRounds = 12;
    config.logging.level = 'warn';
} else if (config.server.env === 'development') {
    config.rateLimit.max = 1000; // More lenient in development
    config.security.bcryptRounds = 10;
    config.logging.level = 'debug';
}

module.exports = config; 