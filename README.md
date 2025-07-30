# Quiz Management System

A comprehensive role-based quiz poll web application built with Node.js, Express, React, and MySQL.

## Overview

This application supports three user roles: **Admin**, **Professor**, and **Student**, each with specific functionalities:

- **Admin**: Complete system management with user oversight and analytics
- **Professor**: Class and quiz management with detailed analytics and CSV export
- **Student**: Quiz participation with results tracking and performance analytics

## Tech Stack

- **Backend**: Node.js, Express.js, MySQL, JWT Authentication
- **Frontend**: React.js, React Router, Bootstrap 5, Context API
- **Database**: MySQL with comprehensive relational design
- **Authentication**: JWT-based with role-based access control
- **Security**: Helmet, CORS, Rate limiting, Password hashing, Input validation
- **Features**: File upload/download, CSV export, Audit logging, Real-time updates

## Project Structure

```
```
quizManagement/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Business logic controllers
│   │   ├── middleware/      # Auth, validation, error handling
│   │   ├── models/          # Database models and queries
│   │   ├── routes/          # API endpoints
│   │   │   ├── auth.js      # Authentication routes
│   │   │   ├── users.js     # User management
│   │   │   ├── classes.js   # Class management
│   │   │   ├── quizzes.js   # Quiz operations
│   │   │   ├── submissions.js # Quiz submissions
│   │   │   └── admin.js     # Admin operations
│   │   ├── utils/           # Helper functions
│   │   ├── config/          # Configuration files
│   │   └── server.js        # Main server file
│   ├── database/
│   │   └── schema.sql       # Complete database schema
│   ├── uploads/             # File storage directory
│   ├── env.template         # Environment template
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/      # Shared components (Navbar, LoadingSpinner, etc.)
│   │   │   ├── auth/        # Login/Register components
│   │   │   ├── admin/       # Admin dashboard components
│   │   │   ├── professor/   # Professor dashboard components
│   │   │   └── student/     # Student dashboard components
│   │   ├── pages/           # Main page components
│   │   │   ├── admin/       # Admin pages
│   │   │   ├── professor/   # Professor pages
│   │   │   └── student/     # Student pages
│   │   ├── services/        # API service layer
│   │   ├── context/         # React context (Auth)
│   │   ├── hooks/           # Custom React hooks
│   │   └── utils/           # Utility functions
│   ├── public/
│   └── package.json
├── docs/                    # Documentation
└── README.md

## Features

### Authentication & Security
- JWT-based authentication with secure token handling
- Role-based access control (Admin, Professor, Student)
- Password hashing with bcrypt
- Rate limiting and CORS protection
- Comprehensive audit logging
- Session management and automatic logout

### Admin Features
- **User Management**: View, edit, delete users across all roles
- **Role Management**: Change user roles (student ↔ professor)
- **System Analytics**: Comprehensive dashboard with performance metrics
- **Audit Logs**: Complete activity monitoring with filtering
- **Data Export**: CSV export for users, classes, quizzes, submissions
- **System Health**: Database and storage monitoring
- **First User Privilege**: First registered user automatically becomes admin

### Professor Features
- **Class Management**: Create, edit, and manage classes
- **Student Management**: View and manage enrolled students
- **Quiz Creation**: Create comprehensive quizzes with multiple question types
- **Quiz Management**: Set deadlines, time limits, and reuse existing quizzes
- **Analytics Dashboard**: Detailed performance analytics and statistics
- **Results Management**: View detailed quiz results with sorting and filtering
- **CSV Export**: Export quiz results and student data
- **Poll Statistics**: Real-time quiz participation statistics
- **Template System**: Create and reuse quiz templates

### Student Features
- **Dashboard**: Personal performance overview with statistics
- **Quiz Participation**: Take quizzes with time limits and auto-submission
- **Results Viewing**: View quiz results after submission
- **Performance Tracking**: Personal analytics and progress tracking
- **Class Enrollment**: View enrolled classes and available quizzes
- **History**: Complete quiz history with sorting and filtering

### Technical Features
- **Responsive Design**: Bootstrap 5 with mobile-first approach
- **Real-time Updates**: Live quiz timers and automatic submissions
- **File Management**: Secure file upload and download system
- **Database Optimization**: Indexed queries and optimized relationships
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Loading States**: Smooth loading indicators throughout the application
- **Form Validation**: Client and server-side validation

## Database Schema

The application uses a comprehensive MySQL database with 11 main tables:

- **users**: User accounts with role-based access
- **classes**: Course management
- **class_enrollments**: Student-class relationships
- **quizzes**: Quiz metadata and settings
- **questions**: Quiz questions
- **answer_options**: Multiple choice options
- **quiz_submissions**: Student quiz attempts
- **student_answers**: Individual question responses
- **quiz_templates**: Reusable quiz templates
- **audit_logs**: Complete activity logging
- **system_settings**: Application configuration

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd quizManagement
   ```

2. **Database Setup**
   ```bash
   # Create MySQL database
   mysql -u root -p
   CREATE DATABASE quiz_management;
   exit
   
   # Import schema
   mysql -u root -p quiz_management < database/schema.sql
   ```

3. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Copy and configure environment file
   cp env.template .env
   # Edit .env with your database credentials and JWT secret
   ```

4. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   
   # Create environment file (optional)
   echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
   ```

### Environment Configuration

Create a `.env` file in the backend directory:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=quiz_management
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=uploads/
```

### Running the Application

1. **Start the Backend**
   ```bash
   cd backend
   npm start
   # Server will run on http://localhost:5000
   ```

2. **Start the Frontend**
   ```bash
   cd frontend
   npm start
   # Application will open on http://localhost:3000
   ```

### First Time Setup

1. **Register First User**: The first registered user automatically becomes an admin
2. **Create Professor Account**: Admin can change any user's role to professor
3. **Create Classes**: Professors can create classes and enroll students
4. **Create Quizzes**: Professors can create quizzes and assign them to classes

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Token verification
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### User Management
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get specific user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `PUT /api/users/:id/role` - Change user role
- `GET /api/users/professors` - Get all professors
- `GET /api/users/students` - Get all students

### Class Management
- `GET /api/classes` - Get classes (role-based)
- `POST /api/classes` - Create class
- `GET /api/classes/:id` - Get specific class
- `PUT /api/classes/:id` - Update class
- `DELETE /api/classes/:id` - Delete class
- `GET /api/classes/:id/students` - Get class students
- `POST /api/classes/:id/students` - Enroll student
- `DELETE /api/classes/:id/students/:studentId` - Remove student

### Quiz Management
- `GET /api/quizzes` - Get quizzes (role-based)
- `POST /api/quizzes` - Create quiz
- `GET /api/quizzes/:id` - Get specific quiz
- `PUT /api/quizzes/:id` - Update quiz
- `DELETE /api/quizzes/:id` - Delete quiz
- `GET /api/quizzes/:id/results` - Get quiz results
- `POST /api/quizzes/from-template` - Create from template

### Quiz Submissions
- `POST /api/submissions/start` - Start quiz attempt
- `PUT /api/submissions/answer` - Submit answer
- `POST /api/submissions/complete` - Complete quiz
- `GET /api/submissions/my-submissions` - Get user submissions
- `GET /api/submissions/:id` - Get specific submission
- `GET /api/submissions/poll-results/:quizId` - Get poll results

### Admin Operations
- `GET /api/admin/dashboard` - Admin dashboard stats
- `GET /api/admin/audit-logs` - System audit logs
- `GET /api/admin/analytics` - System analytics
- `GET /api/admin/export` - Data export (CSV)
- `GET /api/admin/health` - System health check

## User Guide

### For Admins
1. **Access Admin Panel**: Navigate to `/admin` after login
2. **Manage Users**: View, edit, and delete users from User Management
3. **Monitor System**: Use Analytics and Audit Logs for system oversight
4. **Export Data**: Use Export functionality for data backups

### For Professors
1. **Create Classes**: Go to Classes → Create New Class
2. **Enroll Students**: Use class management to add students
3. **Create Quizzes**: Navigate to Quizzes → Create Quiz
4. **View Results**: Access quiz results and export CSV reports

### For Students
1. **Take Quizzes**: View available quizzes in student dashboard
2. **Submit Answers**: Complete quizzes within time limits
3. **View Results**: Check scores and performance after submission
4. **Track Progress**: Monitor performance in Quiz History

## Development

### Development Mode
```bash
# Backend with nodemon
cd backend
npm run dev

# Frontend with hot reload
cd frontend
npm start
```

### Testing
```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
cd frontend
npm test
```

### Building for Production
```bash
# Build frontend
cd frontend
npm run build

# The build folder will contain optimized production files
```

## Deployment

### Backend Deployment
1. Set production environment variables
2. Use PM2 or similar process manager
3. Configure reverse proxy (nginx)
4. Set up SSL certificates

### Frontend Deployment
1. Build the application: `npm run build`
2. Serve static files with nginx or Apache
3. Configure API URL for production

## Security Considerations

- **JWT Tokens**: Secure token storage in localStorage with automatic expiry
- **Password Security**: Bcrypt hashing with salt rounds
- **Input Validation**: Comprehensive validation on both client and server
- **SQL Injection Prevention**: Parameterized queries throughout
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Protection**: Configured for specific origins
- **Audit Logging**: Complete activity tracking for security monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Support

For issues and questions:
1. Check the documentation in the `docs/` folder
2. Review existing issues in the repository
3. Create a new issue with detailed information

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Acknowledgments

- Built with modern web technologies
- Follows REST API best practices
- Implements comprehensive security measures
- Designed for scalability and maintainability 