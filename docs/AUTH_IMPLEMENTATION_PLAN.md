# Spring Security JWT Authentication Implementation Plan

## Overview
Implement authentication and authorization using Spring Security with JWT tokens stored in HttpOnly cookies, including refresh token support.

## Requirements Summary
- **Endpoints**: Login, Register, Logout, Refresh Token
- **Roles**: USER, ADMIN
- **Token Storage**: HttpOnly cookies
- **Token Strategy**: Short-lived access token (15 min) + long-lived refresh token (7 days, stored in database)

---

## File Structure
```
backend/src/main/java/byteblaze/backend/auth/
├── config/
│   └── SecurityConfig.java
├── controller/
│   └── AuthController.java
├── dto/
│   ├── LoginRequest.java
│   ├── RegisterRequest.java
│   └── AuthResponse.java
├── entity/
│   ├── User.java
│   ├── Role.java (enum)
│   └── RefreshToken.java
├── exception/
│   ├── AuthException.java
│   └── AuthExceptionHandler.java
├── filter/
│   └── JwtAuthenticationFilter.java
├── repository/
│   ├── UserRepository.java
│   └── RefreshTokenRepository.java
├── service/
│   ├── AuthService.java
│   ├── AuthServiceImpl.java
│   ├── JwtService.java
│   ├── JwtServiceImpl.java
│   ├── RefreshTokenService.java
│   ├── RefreshTokenServiceImpl.java
│   └── UserDetailsServiceImpl.java
└── util/
    └── CookieUtil.java
```

---

## Implementation Steps

### Phase 1: Dependencies & Configuration

1. **Add dependencies to `pom.xml`**
   - `spring-boot-starter-security`
   - `spring-boot-starter-validation`
   - JJWT library (jjwt-api, jjwt-impl, jjwt-jackson) version 0.12.6
   - `spring-security-test`

2. **Add configuration to `application.yml`**
   ```yaml
   jwt:
     secret-key: ${JWT_SECRET_KEY}
     access-token:
       expiration: 900000       # 15 minutes
     refresh-token:
       expiration: 604800000    # 7 days

   cookie:
     domain: ${COOKIE_DOMAIN:localhost}
     secure: ${COOKIE_SECURE:false}
     same-site: ${COOKIE_SAME_SITE:Lax}
   ```

3. **Create Flyway migration `V2__users_and_refresh_tokens.sql`**
   - Create `app` schema
   - Create `app.users` table (UUID id, email, password, firstName, lastName, username, role, timestamps)
   - Create `app.refresh_tokens` table (UUID id, token, user_id FK, expiry_date, revoked, created_at)
   - Add index on `refresh_tokens.user_id` for FK performance

### Phase 2: Entities & Repositories

4. **Create `Role` enum** - USER, ADMIN

5. **Create `User` entity**
   - Implements `UserDetails`
   - UUID primary key
   - Fields: email, password, firstName, lastName, username, role
   - Hardcode `UserDetails` methods (`isEnabled`, `isAccountNonLocked`, etc.) to return `true`
   - `@PrePersist` / `@PreUpdate` for timestamps

6. **Create `RefreshToken` entity**
   - UUID primary key
   - ManyToOne relationship with User
   - Fields: token, expiryDate, revoked
   - Helper methods: `isExpired()`, `isValid()`

7. **Create `UserRepository`**
   - `findByEmail()`, `existsByEmail()`

8. **Create `RefreshTokenRepository`**
   - `findByToken()`
   - `revokeAllUserTokens()` (JPQL update)
   - `deleteExpiredAndRevokedTokens()` (cleanup)

### Phase 3: Services

9. **Create `JwtService`/`JwtServiceImpl`**
   - Generate access token with claims (roles)
   - Extract username from token
   - Validate token
   - Uses JJWT library with HMAC-SHA signing

10. **Create `CookieUtil`**
    - Add access token cookie (HttpOnly, path="/")
    - Add refresh token cookie (HttpOnly, path="/api/v1/auth/refresh")
    - Clear auth cookies
    - Extract cookie from request

11. **Create `UserDetailsServiceImpl`**
    - Load user by email for Spring Security

12. **Create `RefreshTokenService`/`RefreshTokenServiceImpl`**
    - Create refresh token (UUID-based)
    - Find by token
    - Verify expiration
    - Revoke token(s)

13. **Create `AuthService`/`AuthServiceImpl`**
    - `register()` - create user, generate tokens, set cookies
    - `login()` - authenticate, revoke old tokens, generate new tokens
    - `logout()` - revoke tokens, clear cookies
    - `refreshToken()` - validate refresh token, issue new access token

### Phase 4: Security Configuration

14. **Create `JwtAuthenticationFilter`**
    - Extends `OncePerRequestFilter`
    - Extract JWT from cookie
    - Validate and set `SecurityContext`
    - Skip for `/api/v1/auth/**` paths

15. **Create `SecurityConfig`**
    - Disable CSRF (using HttpOnly + SameSite cookies)
    - Permit `/api/v1/auth/**` and `/actuator/health`
    - Require ADMIN role for `/api/v1/admin/**`
    - Require authentication for all other endpoints
    - Stateless session management
    - BCryptPasswordEncoder (strength 12)

### Phase 5: DTOs & API Layer

16. **Create DTOs**
    - `RegisterRequest` - email, password, firstName, lastName (with validation)
    - `LoginRequest` - email, password (with validation)
    - `AuthResponse` - id, email, firstName, lastName, role, message

17. **Create `AuthException`** - Runtime exception for auth errors

18. **Create `AuthExceptionHandler`**
    - Handle `AuthException` -> 401
    - Handle `BadCredentialsException` -> 401
    - Handle `MethodArgumentNotValidException` -> 400
    - Return RFC 7807 Problem Detail responses

19. **Create `AuthController`**
    - `POST /api/v1/auth/register` -> 201 Created
    - `POST /api/v1/auth/login` -> 200 OK
    - `POST /api/v1/auth/logout` -> 204 No Content
    - `POST /api/v1/auth/refresh` -> 200 OK

---

## Security Design Decisions

| Concern | Solution |
|---------|----------|
| XSS | HttpOnly cookies - JS cannot access tokens |
| CSRF | SameSite=Lax + stateless auth |
| Token theft | Short-lived access tokens (15 min) |
| Session hijacking | DB-backed refresh tokens with revocation |
| Brute force | BCrypt (strength 12) |
| Password storage | BCrypt hashing |

---

## Environment Variables Required
- `JWT_SECRET_KEY` - Base64-encoded secret (min 256 bits for HS256)
- `COOKIE_DOMAIN` - Cookie domain (default: localhost)
- `COOKIE_SECURE` - true for HTTPS (default: false)
- `COOKIE_SAME_SITE` - Lax/Strict/None (default: Lax)

---

## Files to Modify
- `backend/pom.xml` - Add dependencies
- `backend/src/main/resources/application.yml` - Add JWT/cookie config

## Files to Create (22 files)
1. `db/migration/V2__users_and_refresh_tokens.sql`
2. `auth/entity/Role.java`
3. `auth/entity/User.java`
4. `auth/entity/RefreshToken.java`
5. `auth/repository/UserRepository.java`
6. `auth/repository/RefreshTokenRepository.java`
7. `auth/service/JwtService.java`
8. `auth/service/JwtServiceImpl.java`
9. `auth/service/RefreshTokenService.java`
10. `auth/service/RefreshTokenServiceImpl.java`
11. `auth/service/AuthService.java`
12. `auth/service/AuthServiceImpl.java`
13. `auth/service/UserDetailsServiceImpl.java`
14. `auth/util/CookieUtil.java`
15. `auth/filter/JwtAuthenticationFilter.java`
16. `auth/config/SecurityConfig.java`
17. `auth/dto/RegisterRequest.java`
18. `auth/dto/LoginRequest.java`
19. `auth/dto/AuthResponse.java`
20. `auth/exception/AuthException.java`
21. `auth/exception/AuthExceptionHandler.java`
22. `auth/controller/AuthController.java`

---

## Verification

1. **Build**: `./mvnw clean compile` - Verify no compilation errors
2. **Database**: Start app, verify Flyway runs V2 migration
3. **Register**: `curl -X POST http://localhost:8080/api/v1/auth/register -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"password123"}' -c cookies.txt`
4. **Login**: `curl -X POST http://localhost:8080/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"password123"}' -c cookies.txt`
5. **Protected endpoint**: `curl http://localhost:8080/api/v1/some-protected -b cookies.txt` - Should succeed
6. **Without cookie**: `curl http://localhost:8080/api/v1/some-protected` - Should get 401
7. **Refresh**: `curl -X POST http://localhost:8080/api/v1/auth/refresh -b cookies.txt`
8. **Logout**: `curl -X POST http://localhost:8080/api/v1/auth/logout -b cookies.txt`
