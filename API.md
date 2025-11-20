# API Reference – SIOCODE Local IDP

This document describes all API endpoints exposed by the SIOCODE Local Identity Provider.

**Note:** Some endpoints can be disabled via configuration:
- OAuth2/OIDC endpoints can be disabled by setting `oauth2.enabled: false` in the configuration
- Login API endpoints can be disabled by setting `login_api.enabled: false` in the configuration

---

## 🧠 Health and Discovery

### `GET /healthz`

Returns a health check response.

**Response:**
```json
{
  "status": "OK"
}
```

---

### `GET /.well-known/jwks.json`

Returns the public keys used to sign JWT tokens (JWK Set format).

**Response:**

```json
{
  "keys": [
    {
      "kid": "abc123",
      "kty": "RSA",
      "alg": "RS256",
      "use": "sig",
      "n": "base64url...",
      "e": "AQAB"
    }
  ]
}
```

---

### `GET /.well-known/openid-configuration`

Returns OpenID Connect discovery metadata.

**Response:**

```json
{
  "issuer": "http://localhost:8080",
  "authorization_endpoint": "http://localhost:8080/oauth2/authorize",
  "token_endpoint": "http://localhost:8080/oauth2/token",
  "userinfo_endpoint": "http://localhost:8080/userinfo",
  "jwks_uri": "http://localhost:8080/.well-known/jwks.json",
  "response_types_supported": ["code"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "grant_types_supported": ["authorization_code"]
}
```

---

## 🔐 OAuth2 / OpenID Connect Flow

**Configuration:** These endpoints are available when `oauth2.enabled: true` (default).

### `GET /oauth2/authorize`

Displays a login form for the OAuth2 authorization code flow.

**Query Parameters:**

| Parameter       | Type   | Required | Description                                    |
|----------------|--------|----------|------------------------------------------------|
| `client_id`    | string | Yes      | The client application identifier              |
| `redirect_uri` | string | Yes      | The URI to redirect to after authentication    |
| `response_type`| string | Yes      | Must be `"code"`                               |
| `scope`        | string | No       | Requested scopes                               |
| `state`        | string | No       | Opaque value used to maintain state            |

**Response:**

Returns an HTML login form. If `oauth2.require_challenge_on_login: true` is set in the configuration, the form will include a challenge field where users can enter any value.

**Errors:**

- `400 Bad Request` - If `response_type` is not `"code"` or if `client_id`/`redirect_uri` are invalid

---

### `POST /oauth2/authorize/submit`

Submits the login form and initiates the authorization code flow.

**Content-Type:** `application/x-www-form-urlencoded`

**Form Parameters:**

| Parameter       | Type   | Required | Description                              |
|----------------|--------|----------|------------------------------------------|
| `username`     | string | Yes      | The user's username                       |
| `password`     | string | Yes      | The user's password                       |
| `client_id`    | string | Yes      | The client application identifier         |
| `redirect_uri` | string | Yes      | The URI to redirect to                    |
| `scope`        | string | No       | Requested scopes                          |
| `state`        | string | No       | Opaque value used to maintain state       |
| `challenge`    | string | Conditional | Required if `oauth2.require_challenge_on_login: true` |

**Response:**

- `302 Found` - Redirects to `redirect_uri` with authorization code: `{redirect_uri}?code={code}&state={state}`
- Re-renders login form with error if credentials are invalid

**Errors:**

- `400 Bad Request` - If form data is invalid or client credentials are wrong
- Re-displays form with error message if authentication fails

---

### `POST /oauth2/token`

Exchanges an authorization code for access and ID tokens.

**Content-Type:** `application/x-www-form-urlencoded`

**Form Parameters:**

| Parameter       | Type   | Required | Description                                    |
|----------------|--------|----------|------------------------------------------------|
| `grant_type`   | string | Yes      | Must be `"authorization_code"`                 |
| `code`         | string | Yes      | The authorization code received from `/oauth2/authorize` |
| `client_id`    | string | Yes      | The client application identifier              |
| `client_secret`| string | Yes      | The client application secret                  |
| `redirect_uri` | string | Yes      | Must match the original authorization request  |

**Response:**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Errors:**

- `400 Bad Request` - If form data is invalid, `grant_type` is wrong, or authorization code is invalid/expired
- `401 Unauthorized` - If client credentials are invalid

---

### `GET /userinfo`

Returns user information based on the provided access token (OpenID Connect UserInfo endpoint).

**Headers:**

| Header          | Value                  |
|----------------|------------------------|
| `Authorization`| `Bearer {access_token}`|

**Response:**

```json
{
  "sub": "user-id-123",
  "email": "alice@example.com",
  "name": "Alice Smith",
  "...": "...other user attributes..."
}
```

**Errors:**

- `401 Unauthorized` - If token is missing, invalid, or not an access token

---

## 🔑 Cognito-Style Login API

**Configuration:** These endpoints are available when `login_api.enabled: true` (default).

These endpoints provide a Cognito-style admin API flow with challenge/response authentication.

### `POST /login/init`

Starts a login challenge.

Accepts `client_id` from JSON body or query parameter: `?client_id=...`

**Content-Type:** `application/json`

**Request:**

```json
{
  "username": "alice",
  "password": "password",
  "client_id": "client-id",
  "issue_refresh_token": true
}
```

**Response:**

```json
{
  "challenge_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Errors:**

- `400 Bad Request` - If request body is invalid or `client_id` is missing/invalid
- `401 Unauthorized` - If credentials are invalid or user is disabled

---

### `POST /login/complete`

Completes login and issues tokens.

**Content-Type:** `application/json`

**Request:**

```json
{
  "challenge_id": "550e8400-e29b-41d4-a716-446655440000",
  "challenge_data": "any-value"
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "identity_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "a1b2c3d4e5f6..."
}
```

**Note:** `refresh_token` is only included if `issue_refresh_token` was `true` in `/login/init`.

**Errors:**

- `400 Bad Request` - If request body is invalid
- `401 Unauthorized` - If challenge is invalid or expired
- `500 Internal Server Error` - If user or client not found, or token generation fails

---

### `POST /login/refresh`

Refreshes access and identity tokens using a refresh token.

**Content-Type:** `application/json`

**Request:**

```json
{
  "refresh_token": "a1b2c3d4e5f6..."
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "identity_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "x9y8z7w6v5u4..."
}
```

**Note:** A new refresh token is issued and the old one is invalidated.

**Errors:**

- `400 Bad Request` - If request body is invalid
- `401 Unauthorized` - If refresh token is invalid or expired
- `500 Internal Server Error` - If user or client not found, or token generation fails

---

## 👤 User Profile

### `GET /me`

Returns the authenticated user's profile (without password).

**Headers:**

| Header          | Value                  |
|----------------|------------------------|
| `Authorization`| `Bearer {access_token}`|

**Response:**

```json
{
  "id": "user-id-123",
  "username": "alice",
  "disabled": false,
  "attributes": {
    "email": "alice@example.com",
    "name": "Alice Smith"
  }
}
```

**Errors:**

- `401 Unauthorized` - If token is missing, invalid, or not an access token
- `500 Internal Server Error` - If user not found

---

## 👥 User Management

### `GET /users`

Returns a list of all users (without passwords).

**Response:**

```json
[
  {
    "id": "user-id-123",
    "username": "alice",
    "disabled": false,
    "attributes": {
      "email": "alice@example.com"
    }
  },
  {
    "id": "user-id-456",
    "username": "bob",
    "disabled": true,
    "attributes": {
      "email": "bob@example.com"
    }
  }
]
```

---

### `GET /users/{id}`

Returns a specific user by ID (without password).

**Path Parameters:**

| Parameter | Type   | Description        |
|----------|--------|--------------------|
| `id`     | string | The user's ID      |

**Response:**

```json
{
  "id": "user-id-123",
  "username": "alice",
  "disabled": false,
  "attributes": {
    "email": "alice@example.com",
    "name": "Alice Smith"
  }
}
```

**Errors:**

- `404 Not Found` - If user does not exist

---

### `PUT /users/{id}`

Creates or updates a user.

**Path Parameters:**

| Parameter | Type   | Description        |
|----------|--------|--------------------|
| `id`     | string | The user's ID      |

**Content-Type:** `application/json`

**Request:**

```json
{
  "username": "alice",
  "password": "new-password",
  "attributes": {
    "email": "alice@example.com",
    "name": "Alice Smith"
  }
}
```

**Note:** All fields are optional when updating an existing user. Only provided fields will be updated.

**Response (Update):**

```json
{
  "id": "user-id-123",
  "username": "alice",
  "password": "new-password",
  "disabled": false,
  "attributes": {
    "email": "alice@example.com",
    "name": "Alice Smith"
  }
}
```

**Response (Create):**

Returns the created user with status `201 Created`.

```json
{
  "id": "user-id-123",
  "username": "alice",
  "disabled": false,
  "attributes": {
    "email": "alice@example.com"
  }
}
```

**Errors:**

- `400 Bad Request` - If request body is invalid

---

### `POST /users/{id}/disable`

Disables a user account.

**Path Parameters:**

| Parameter | Type   | Description        |
|----------|--------|--------------------|
| `id`     | string | The user's ID      |

**Response:**

- `204 No Content` - User successfully disabled

**Errors:**

- `404 Not Found` - If user does not exist

---

### `POST /users/{id}/enable`

Enables a user account.

**Path Parameters:**

| Parameter | Type   | Description        |
|----------|--------|--------------------|
| `id`     | string | The user's ID      |

**Response:**

- `204 No Content` - User successfully enabled

**Errors:**

- `404 Not Found` - If user does not exist

---

### `DELETE /users/{id}`

Deletes a user.

**Path Parameters:**

| Parameter | Type   | Description        |
|----------|--------|--------------------|
| `id`     | string | The user's ID      |

**Response:**

```json
{
  "message": "User deleted"
}
```

**Errors:**

- `404 Not Found` - If user does not exist

---

## 📋 Response Codes Summary

| Code | Description                                                      |
|------|------------------------------------------------------------------|
| 200  | Success - Request completed successfully                          |
| 201  | Created - Resource created successfully                           |
| 204  | No Content - Success with no response body                        |
| 302  | Found - Redirect (used in OAuth2 flow)                           |
| 400  | Bad Request - Invalid request format or parameters               |
| 401  | Unauthorized - Authentication failed or token invalid            |
| 404  | Not Found - Resource does not exist                              |
| 500  | Internal Server Error - Server encountered an error              |

---

## 🔒 Authentication

Most endpoints require authentication via Bearer token:

```http
Authorization: Bearer {access_token}
```

Access tokens are JWT tokens signed with RS256. They contain:
- `sub` - User ID
- `token_use` - Token type (`"access"` or `"id"`)
- `client_id` - Client ID
- `aud` - Audience (client's audience value)
- `iss` - Issuer
- `exp` - Expiration timestamp
- `iat` - Issued at timestamp

Identity tokens (ID tokens) contain similar claims plus user attributes.
