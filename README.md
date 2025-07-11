# Library Management System - Backend API

A comprehensive backend API for a library management system with user authentication, book management, file uploads, and more.

## Features

- **User Management**
  - User registration and authentication
  - JWT-based authorization
  - User profiles with preferences
  - Password management
  - Admin functionality

- **Book Management**
  - Book CRUD operations
  - File uploads (PDF, EPUB, MOBI, TXT, DOC, DOCX)
  - Cover image uploads
  - Book search and filtering
  - Rating and review system
  - Download tracking

- **Security**
  - JWT authentication
  - Password hashing with bcrypt
  - Rate limiting
  - CORS protection
  - Input validation
  - File type validation

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **File Upload**: Multer
- **Security**: Helmet, CORS, bcryptjs
- **Validation**: express-validator
- **Environment**: dotenv

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env` file in the root directory with:
```env
MONGODB_URL=your_mongodb_connection_string
PORT=5000
JWT_SECRET=your_super_secret_jwt_key
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

3. Start the server:
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user

### User Management
- `GET /api/users/profile` - Get user profile (auth required)
- `PUT /api/users/profile` - Update user profile (auth required)
- `PUT /api/users/change-password` - Change password (auth required)
- `DELETE /api/users/account` - Delete account (auth required)
- `GET /api/users/all` - Get all users (admin only)

### Book Management
- `GET /api/books` - Get all books (with filtering/pagination)
- `GET /api/books/:id` - Get book by ID
- `POST /api/books` - Create new book (auth required)
- `PUT /api/books/:id` - Update book (auth required, owner only)
- `DELETE /api/books/:id` - Delete book (auth required, owner only)
- `GET /api/books/:id/download` - Download book file
- `POST /api/books/:id/review` - Add review (auth required)
- `GET /api/books/user/:userId` - Get user's books (auth required)
- `GET /api/books/stats` - Get book statistics

### Utility
- `GET /health` - Health check
- `GET /api/docs` - API documentation

## File Upload

The API supports file uploads for books and cover images:

- **Book Files**: PDF, EPUB, MOBI, TXT, DOC, DOCX (max 50MB)
- **Cover Images**: JPEG, PNG, WebP (max 5MB)

Upload endpoint: `POST /api/books` with `multipart/form-data`

Fields:
- `bookFile` - The book file
- `coverImage` - The cover image
- Other book metadata as form fields

## Authentication

Protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Error Handling

The API returns consistent error responses:
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"]
}
```

## File Structure

```
src/
├── app.js              # Express app configuration
├── index.js            # Server entry point
├── controllers/        # Route controllers
│   ├── user.controller.js
│   └── book.controller.js
├── models/             # Mongoose models
│   ├── user.model.js
│   └── book.model.js
├── routes/             # Express routes
│   ├── user.route.js
│   └── book.route.js
├── middleware/         # Custom middleware
│   └── auth.middleware.js
└── db/                 # Database connection
    └── index.js
uploads/                # File upload directory
├── books/              # Book files
└── covers/             # Cover images
```

## Development

1. Install nodemon for development:
```bash
npm install -g nodemon
```

2. Run in development mode:
```bash
npm run dev
```

3. The server will restart automatically on file changes.

## Production Deployment

1. Set `NODE_ENV=production` in your environment
2. Use a process manager like PM2:
```bash
npm install -g pm2
pm2 start src/index.js --name "library-api"
```

3. Set up a reverse proxy (nginx) for static file serving and SSL termination

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.#   L i b r a r y B a c k e n d  
 