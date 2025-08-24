# Auth Service

Authentication and user management service for the AI Quizzer platform.

## Base URL
`http://localhost:3001`

## Database
`quiz_auth_db`

## Purpose
User authentication, registration, profile management, and JWT token handling.

---

## 🔗 Endpoints

### 1. User Registration

**POST** `/api/auth/register`

**Purpose**: Register a new user account

**Authentication**: Not required

**Rate Limit**: 10 requests per 5 minutes

**Payload**:
```json
{
  "username": "string (required, 3-30 chars, alphanumeric)",
  "email": "string (required, valid email format)",
  "password": "string (required, 6-100 chars)",
  "profile": {
    "preferredSubjects": ["array of strings (optional)"]
  },
  "preferences": {
    "emailNotifications": "boolean (optional, default: true)",
    "difficulty": "string (optional: adaptive|easy|medium|hard, default: adaptive)"
  }
}
```

**Response**:


---

### 2. User Login

**POST** `/api/auth/login`

**Purpose**: Authenticate user and receive JWT token

**Authentication**: Not required

**Rate Limit**: 10 requests per 5 minutes

**Payload**:
```json
{
  "username": "string (required, 3-30 chars)",
  "password": "string (required, 6-100 chars)"
}
```

**Response**:


---

### 3. Token Validation

**POST** `/api/auth/validate`

**Purpose**: Validate JWT token and get user info

**Authentication**: Required (Bearer token)

**Rate Limit**: 100 requests per 15 minutes

**Payload**: None (token in Authorization header)

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response**:


---

### 4. Get User Profile

**GET** `/api/auth/profile`

**Purpose**: Get current user's profile information

**Authentication**: Required (Bearer token)

**Rate Limit**: 100 requests per 15 minutes

**Payload**: None

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response**:


---

### 5. Update User Profile

**PUT** `/api/auth/profile`

**Purpose**: Update user profile information

**Authentication**: Required (Bearer token)

**Rate Limit**: 50 requests per 15 minutes

**Payload**:
```json
{
  "profile": {
    "preferredSubjects": ["array of strings (optional)"]
  },
  "preferences": {
    "emailNotifications": "boolean (optional)",
    "difficulty": "string (optional: adaptive|easy|medium|hard)"
  }
}
```

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response**:


---

## 🔒 Security Features

### Password Security
- Minimum 6 characters
- Hashed using bcrypt with 12 rounds
- No password stored in plain text

### JWT Tokens
- Expires in 7 days (configurable)
- Contains user ID, username, and email
- Must be included in Authorization header for protected routes

### Rate Limiting
- Registration/Login: 10 requests per 5 minutes
- Profile operations: 100 requests per 15 minutes
- Profile updates: 50 requests per 15 minutes

---

## 🛠️ Environment Variables

```env
# Required
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
MONGODB_URI=mongodb://localhost:27017/quiz_auth_db

# Optional
LOG_LEVEL=info
NODE_ENV=development
```

---

## 🧪 Testing Examples

### Register New User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Login User
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### Get Profile (with token)
```bash
curl -X GET http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer <your-jwt-token>"
```

### Update Profile
```bash
curl -X PUT http://localhost:3001/api/auth/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "preferences": {
      "emailNotifications": false,
      "difficulty": "hard"
    }
  }'
```

---

## 📊 User Data Model

```json
{
  "_id": "ObjectId",
  "username": "string",
  "email": "string", 
  "password": "string (hashed)",
  "profile": {
    "preferredSubjects": ["array of strings"]
  },
  "preferences": {
    "emailNotifications": "boolean",
    "difficulty": "string"
  },
  "performance": {
    "totalQuizzesTaken": "number",
    "averageScore": "number", 
    "strongSubjects": ["array of strings"],
    "weakSubjects": ["array of strings"]
  },
  "lastLoginAt": "Date",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

## ⚠️ Error Responses

All errors follow this format:
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "timestamp": "ISO date string",
    "functionName": "Function where error occurred"
  }
}
```

Common HTTP status codes:
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid/missing token)
- `409`: Conflict (username/email already exists)
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error
}
```
Example ( with correct credentials ):
```json
{
  "username": "jaimin123",
  "password": "jaimin23"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "68a9f2d17a071e1e71ca5966",
      "username": "jaimin123",
      "email": "jaiminpatel03042005@gmail.com",
      "profile": {
        "firstName": "Jaimin",
        "lastName": "Detroja",
        "grade": 8,
        "preferredSubjects": [
          "Math",
          "Physics",
          "JavaScript",
          "Java"
        ]
      },
      "preferences": {
        "emailNotifications": true,
        "difficulty": "adaptive"
      },
      "performance": {
        "totalQuizzesTaken": 0,
        "averageScore": 0,
        "strongSubjects": [],
        "weakSubjects": []
      },
      "createdAt": "2025-08-23T16:56:49.532Z",
      "updatedAt": "2025-08-23T17:08:39.866Z",
      "lastLoginAt": "2025-08-23T17:08:39.865Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGE5ZjJkMTdhMDcxZTFlNzFjYTU5NjYiLCJ1c2VybmFtZSI6ImphaW1pbjEyMyIsImVtYWlsIjoiamFpbWlucGF0ZWwwMzA0MjAwNUBnbWFpbC5jb20iLCJpYXQiOjE3NTU5Njg5MTksImV4cCI6MTc1NjU3MzcxOX0.GrAWx5Be6f5-4F5dyH_lHAqpv6_p0Fn5Nvo3vcOXvpw",
    "expiresIn": "7d"
  }
}
```

### Register User
**POST** `/api/auth/register`  
**Authentication**: None  
**Rate Limit**: 10 requests per 15 minutes  
**Request Body**:
```json
{
  "username": "string (required, 3-30 chars)",
  "email": "string (required, valid email format)", 
  "password": "string (required, min 6 chars)",
  "profile": {
    "firstName": "string (optional)",
    "lastName": "string (optional)",
    "grade": "number (optional, 1-12)",
    "preferredSubjects": ["string array (optional)"]
  },
  "preferences": {
    "emailNotifications": "boolean (optional, default: true)",
    "difficulty": "string (optional, easy|medium|hard|adaptive, default: adaptive)"
  }
}
```
Example: 
```json
{
  "username": "jaimin123",
  "email": "jaiminpatel03042005@gmail.com",
  "password": "jaimin123",
  "profile": {
    "firstName": "Jaimin",
    "lastName": "Detroja",
    "grade": 8,
    "preferredSubjects": [
      "Math",
      "Physics",
      "JavaScript",
      "Java"
    ]
  },
  "preferences": {
    "emailNotifications": true,
    "difficulty": "adaptive"
  }
}
```
**Response**:
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "username": "jaimin123",
      "email": "jaiminpatel03042005@gmail.com",
      "profile": {
        "firstName": "Jaimin",
        "lastName": "Detroja",
        "grade": 8,
        "preferredSubjects": [
          "Math",
          "Physics",
          "JavaScript",
          "Java"
        ]
      },
      "preferences": {
        "emailNotifications": true,
        "difficulty": "adaptive"
      },
      "performance": {
        "totalQuizzesTaken": 0,
        "averageScore": 0,
        "strongSubjects": [],
        "weakSubjects": []
      },
      "_id": "68a9f2d17a071e1e71ca5966",
      "createdAt": "2025-08-23T16:56:49.532Z",
      "updatedAt": "2025-08-23T16:56:49.532Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1.......",
    "expiresIn": "7d"
  }
}
```
save **your** token and put into headers if auth error came while checking

### Validate Token
**POST** `/api/auth/validate`  
**Authentication**: Bearer token required  
**Headers**:
```
Authorization: Bearer <jwt_token>
```
**Request Body**: None  
**Response**:
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "user": {
      "_id": "68a9f2d17a071e1e71ca5966",
      "username": "jaimin123",
      "email": "jaiminpatel03042005@gmail.com",
      "profile": {
        "firstName": "Jaimin",
        "lastName": "Detroja",
        "grade": 8,
        "preferredSubjects": [
          "Math",
          "Physics",
          "JavaScript",
          "Java"
        ]
      },
      "preferences": {
        "emailNotifications": true,
        "difficulty": "adaptive"
      },
      "performance": {
        "totalQuizzesTaken": 0,
        "averageScore": 0,
        "strongSubjects": [],
        "weakSubjects": []
      },
      "createdAt": "2025-08-23T16:56:49.532Z",
      "updatedAt": "2025-08-23T17:08:39.866Z",
      "lastLoginAt": "2025-08-23T17:08:39.865Z"
    },
    "isValid": true
  }
}
```

### Get User Profile
**GET** `/api/user/profile`  
**Authentication**: Bearer token required  
**Headers**:
```
Authorization: Bearer <jwt_token>
```
**Response**:
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "_id": "60d5ecb54e24c30015d4f8a1",
      "username": "john_doe",
      "email": "john_doe@mock.com",
      "profile": {
        "firstName": "John",
        "lastName": "Doe",
        "grade": 10,
        "preferredSubjects": ["Math", "Physics", "Chemistry"]
      },
      "preferences": {
        "emailNotifications": false,
        "difficulty": "hard"
      },
      "performance": {
        "totalQuizzesTaken": 15,
        "averageScore": 87.5,
        "strongSubjects": ["Math", "Physics"],
        "weakSubjects": ["History"]
      },
      "lastLoginAt": "2025-08-23T15:45:00.000Z",
      "createdAt": "2025-08-15T10:30:00.000Z",
      "updatedAt": "2025-08-23T16:00:00.000Z"
    }
  }
}
```

### Update User Profile
**PUT** `/api/user/profile`  
**Authentication**: Bearer token required  
**Headers**:
```
Authorization: Bearer <jwt_token>
```
**Request Body** (all fields optional):
```json
{
  "profile": {
    "firstName": "string (optional)",
    "lastName": "string (optional)",
    "grade": "number (optional, 1-12)",
    "preferredSubjects": ["string array (optional)"]
  },
  "preferences": {
    "emailNotifications": "boolean (optional)",
    "difficulty": "string (optional, easy|medium|hard|adaptive)"
  }
}
```
**Response**:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "_id": "60d5ecb54e24c30015d4f8a1",
      "username": "john_doe",
      "email": "john_doe@mock.com",
      "profile": {
        "firstName": "John",
        "lastName": "Doe",
        "grade": 11,
        "preferredSubjects": ["Math", "Physics", "Computer Science"]
      },
      "preferences": {
        "emailNotifications": false,
        "difficulty": "adaptive"
      },
      "updatedAt": "2025-08-23T16:00:00.000Z"
    }
  }
}
```
---

## Error Responses

All endpoints return consistent error format:
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "functionName": "methodName",
    "timestamp": "2025-08-23T16:00:00.000Z",
    "details": "Additional error details (when applicable)"
  }
}
```

**Common HTTP Status Codes**:
- `200` - Success
- `201` - Created (registration)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `404` - Not Found
- `409` - Conflict (username/email exists)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---
## Rate Limits

- **Authentication endpoints** (`/api/auth/login`, `/api/auth/register`): 10 requests per 15 minutes per IP
- **Other endpoints**: 100 requests per 15 minutes per IP

When rate limit is exceeded:
```json
{
  "success": false,
  "error": {
    "message": "Too many authentication attempts, please try again later.",
    "code": "AUTH_RATE_LIMIT_EXCEEDED"
  }
}
```

--