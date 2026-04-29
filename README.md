# WhatsApp Clone - Backend API

A production-ready authentication and user management backend for a WhatsApp clone application built with Node.js, Express, MongoDB, Redis, and JWT.

---

## 🚀 Features

### Authentication

- **User Registration** — Phone-based registration with password, display name, and optional avatar
- **OTP Verification** — 6-digit OTP sent via Twilio SMS for phone verification
- **OTP Resend** — Rate-limited OTP resend functionality
- **Login** — Phone + password authentication with JWT tokens
- **Token Refresh** — Access token (15min) and refresh token (7d) rotation
- **Logout** — Token invalidation with Redis blacklist support
- **Forgot Password** — Password reset via OTP
- **Reset Password** — Secure password reset with OTP validation

### User Management

- **Profile Management** — View and update user profile
- **Avatar Upload** — Image upload to Cloudinary with auto-resize (200x200)
- **Account Deactivation** — Soft delete / account deactivation
- **Role-based Access** — Admin role support

### Security

- **Password Hashing** — bcrypt with configurable salt rounds
- **JWT Tokens** — Separate access & refresh token strategy
- **Token Blacklisting** — Redis-based token revocation
- **Helmet.js** — Security headers (HSTS, CSP, etc.)
- **CORS** — Configurable cross-origin requests
- **Input Validation** — Zod schema validation on all endpoints
- **Rate Limiting** — Different limits per endpoint

---

## 📁 Project Structure

```
wattsapp-backend/
├── api/
│   ├── app.js                      # Express application setup
│   ├── server.js                   # Server initialization & graceful shutdown
│   ├── config/
│   │   ├── db.config.js            # MongoDB connection with retry logic
│   │   ├── env.config.js           # Environment variable validation (Zod)
│   │   └── redis.config.js         # Redis client initialization
│   ├── controllers/
│   │   └── auth.controller.js      # Authentication controllers (thin layer)
│   ├── middlewares/
│   │   ├── auth.middleware.js      # JWT verification & role-based access
│   │   ├── error.middleware.js     # Global error handling
│   │   ├── rateLimiter.middleware.js # Rate limiting for endpoints
│   │   └── validation.middleware.js  # Zod validation middleware
│   ├── models/
│   │   └── user.model.js           # User schema with hooks & methods
│   ├── routes/
│   │   └── auth.routes.js          # Authentication API routes
│   ├── services/
│   │   └── auth.service.js         # Business logic (all DB/Redis operations)
│   ├── utils/
│   │   ├── ApiResponse.util.js     # ApiResponse & ApiError classes
│   │   ├── cloudinary.util.js      # Avatar upload/delete utilities
│   │   ├── hash.utils.js           # Password hashing utilities
│   │   ├── jwt.utils.js            # JWT token generation & verification
│   │   └── otp.util.js             # OTP generation, storage & SMS
│   └── validation/
│       └── auth.validator.js       # Zod validation schemas
├── commitlint.config.cjs           # Commit message linting
├── eslint.config.mjs               # ESLint configuration
├── package.json                    # Dependencies & scripts
└── .prettierignore                 # Prettier ignore patterns
```

---

## 🛠️ Tech Stack

| Category   | Technology                               |
| ---------- | ---------------------------------------- |
| Runtime    | Node.js v20+                             |
| Framework  | Express.js v5                            |
| Database   | MongoDB + Mongoose                       |
| Cache      | Redis via ioredis                        |
| Auth       | JWT (access: 15min, refresh: 7d)         |
| OTP        | Twilio SMS                               |
| Uploads    | Multer + Cloudinary                      |
| Validation | Zod                                      |
| Security   | bcrypt, helmet, cors, express-rate-limit |

---

## 📡 API Endpoints

### Public Routes

| Method | Endpoint                       | Description                |
| ------ | ------------------------------ | -------------------------- |
| POST   | `/api/v1/auth/register`        | Register new user          |
| POST   | `/api/v1/auth/verify-otp`      | Verify phone with OTP      |
| POST   | `/api/v1/auth/resend-otp`      | Resend OTP (rate limited)  |
| POST   | `/api/v1/auth/login`           | User login                 |
| POST   | `/api/v1/auth/refresh-token`   | Rotate access token        |
| POST   | `/api/v1/auth/logout`          | Invalidate refresh token   |
| POST   | `/api/v1/auth/forgot-password` | Request password reset OTP |
| POST   | `/api/v1/auth/reset-password`  | Reset password with OTP    |

### Protected Routes (Bearer Token Required)

| Method | Endpoint               | Description                     |
| ------ | ---------------------- | ------------------------------- |
| GET    | `/api/v1/auth/profile` | Get current user profile        |
| PATCH  | `/api/v1/auth/profile` | Update display name or avatar   |
| PATCH  | `/api/v1/auth/avatar`  | Upload new avatar to Cloudinary |
| DELETE | `/api/v1/auth/account` | Deactivate account              |

### Infrastructure

| Method | Endpoint  | Description           |
| ------ | --------- | --------------------- |
| GET    | `/health` | Health check endpoint |

---

## 🔐 Rate Limits

| Endpoint        | Limit                   |
| --------------- | ----------------------- |
| Login           | 5 requests / 15 minutes |
| Register        | 3 requests / 1 hour     |
| OTP Request     | 3 requests / 5 minutes  |
| Resend OTP      | 2 requests / 10 minutes |
| Forgot Password | 3 requests / 30 minutes |
| General API     | 10 requests / 1 minute  |

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/wattsapp
REDIS_URL=redis://localhost:6379

# JWT Secrets (min 32 characters)
ACCESS_TOKEN_SECRET=your-super-secret-access-token-key-min-32-chars
REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key-min-32-chars

# Bcrypt
BCRYPT_SALT_ROUNDS=12

# Twilio
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Client
CLIENT_URL=http://localhost:5173
```

---

## 🚦 Getting Started

### Prerequisites

- Node.js v20+
- MongoDB
- Redis
- Twilio Account
- Cloudinary Account

### Installation

```bash
# Clone the repository
cd wattsapp-backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Production Build

```bash
# Start production server
npm start
```

---

## 🔧 Available Scripts

| Script             | Description                           |
| ------------------ | ------------------------------------- |
| `npm start`        | Start production server               |
| `npm run dev`      | Start development server with nodemon |
| `npm run lint`     | Run ESLint                            |
| `npm run lint:fix` | Fix ESLint errors                     |
| `npm run format`   | Format code with Prettier             |

---

## 📝 API Response Format

### Success Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🔒 Security Features

- ✅ Passwords hashed with bcrypt (configurable rounds)
- ✅ JWT tokens with separate access/refresh secrets
- ✅ Token blacklisting on logout
- ✅ Helmet.js security headers
- ✅ CORS restricted to client URL
- ✅ Zod input validation on all endpoints
- ✅ Rate limiting on auth endpoints
- ✅ HttpOnly cookies for refresh tokens
- ✅ Account lockout after failed attempts

---

## 📄 License

MIT License - Copyright (c) 2024 Muhammad Umar

---

## 👤 Author

**Muhammad Umar**

- GitHub: [@umarxcodes](https://github.com/umarxcodes)
