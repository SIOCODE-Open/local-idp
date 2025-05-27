# API Reference – SIOCODE Local IDP

This document describes all API endpoints exposed by the SIOCODE Local Identity Provider.

---

## 🧠 Health and Discovery

### `GET /healthz`

Returns a health check response.

**Response:**
```json
{ "status": "OK" }
````

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

## 🔐 Cognito-Style Login

### `POST /login/init`

Starts a login challenge.

Accepts `client_id` from:

* JSON body, or
* Query param: `?client_id=...`

**Request:**

```json
{
  "username": "alice",
  "password": "password",
  "issue_refresh_token": true,
  "client_id": "client-id" // optional if passed via query
}
```

**Response:**

```json
{
  "challenge_id": "uuid"
}
```

### `POST /login/complete`

Completes login and issues tokens.

**Request:**

```json
{
  "challenge_id": "uuid",
  "challenge_data": "any-value"
}
```

**Response:**

```json
{
  "access_token": "jwt",
  "identity_token": "jwt",
  "refresh_token": "opaque-string"
}
```

### `POST /login/refresh`

Issues new tokens using a valid refresh token.

**Request:**

```json
{
  "refresh_token": "opaque-string"
}
```

**Response:**

```json
{
  "access_token": "jwt",
  "identity_token": "jwt",
  "refresh_token": "opaque-string"
}
```

### `GET /me`

Returns user info based on the `Authorization: Bearer` access token.

**Response:**

```json
{
  "id": "u1",
  "username": "alice",
  "disabled": false,
  "attributes": {
    "email": "alice@example.com",
    "name": "Alice"
  }
}
```

## 🧑‍💻 OAuth 2.0 / OpenID Connect

### `GET /oauth2/authorize`

Initiates the authorization code flow. Accepts query parameters:

* `response_type=code`
* `client_id`
* `redirect_uri`
* `scope`
* `state`

Renders a basic login form.

### `POST /oauth2/authorize/submit`

Handles login form submission.

**Form Fields:**

* `username`
* `password`
* `client_id`
* `redirect_uri`
* `scope`
* `state`

Redirects to:

```
<redirect_uri>?code=<code>&state=<state>
```

### `POST /oauth2/token`

Exchanges a valid authorization code for tokens.

**Form-encoded request:**

```
grant_type=authorization_code
code=...
client_id=...
client_secret=...
redirect_uri=...
```

**Response:**

```json
{
  "access_token": "jwt",
  "id_token": "jwt",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### `GET /userinfo`

Returns claims from a valid access token.

**Header:**

```
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "name": "User Name"
}
```

## 🛠️ User Management (In-Memory)

### `GET /users`

List all users.

**Response:**

```json
[
  {
    "id": "1234",
    "username": "alice",
    "disabled": false,
    "attributes": {
      "email": "alice@example.com",
      "name": "Alice"
    }
  }
]
```

### `GET /users/:id`

Get a user by ID.

**Response:**

```json
{
  "id": "1234",
  "username": "alice",
  "disabled": false,
  "attributes": {
    "email": "alice@example.com",
    "name": "Alice"
  }
}
```

### `PUT /users/:id`

Upserts a user by ID.

**Request:**

```json
{
  "username": "alice",
  "password": "password",
  "attributes": {
    "email": "alice@example.com",
    "name": "Alice"
  }
}
```

**Response:**

* `204 No Content` on success

### `POST /users/:id/disable`

Disables the user (login blocked).

**Response:**

* `204 No Content` or `404 Not Found`

### `POST /users/:id/enable`

Enables a previously disabled user.

**Response:**

* `204 No Content` or `404 Not Found`

### `DELETE /users/:id`

Deletes the user from memory.

**Response:**

* `204 No Content` or `404 Not Found`

## 📦 Token Format

All access and ID tokens are JWTs (`RS256`), containing:

```json
{
  "sub": "user-id",
  "aud": "client-id",
  "iss": "http://localhost:8080",
  "iat": 1710000000,
  "exp": 1710003600,
  "token_use": "access", // or "id"
  "auth_time": 1710000000,
  "client_id": "client-id",
  "jti": "uuid"
}
```

Refresh tokens are opaque 32-byte base64url strings.

## 🔐 Notes

* All state is **in-memory only**
* Ideal for **testing, dev, and CI**
* **Do not use in production**

## 📄 License

MIT © SIOCODE
