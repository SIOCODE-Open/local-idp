# Local IdP

A fully in-memory, configurable **local identity provider** for development and testing of authentication flows.

Supports:

- Cognito-like challenge-response logins
- OAuth 2.0 Authorization Code Grant
- OpenID Connect Discovery
- In-memory user management
- Dockerized and architecture-portable (x86_64 and arm64)

## 🚀 Purpose

This project simulates a **realistic identity provider** (like AWS Cognito or Auth0) that you can run locally without any external dependencies. It's perfect for:

- Testing OIDC/OAuth clients (e.g. frontend apps, API gateways)
- Simulating user login flows (including refresh, JWT issuance, and userinfo retrieval)
- Developing or debugging integrations **without needing a cloud setup**
- Running in CI/CD or air-gapped environments

All state is **in-memory** and defined via a simple YAML config file.

## 🐳 Docker

Pre-built images available at:

```
docker pull siocode/local-idp
````

Available for:
- `linux/amd64` (x86 64-bit)
- `linux/arm64` (ARM 64-bit)

## 🛠️ Configuration

YAML configuration is passed via `CONFIG_PATH` env var or defaults to `/config.yaml`.

See [`CONFIG.md`](./CONFIG.md) for full details.

### Example: `example/local-idp.config.yaml`

```yaml
port: 8080
# No need to set issuer / base_url, but you can
issuer: http://localhost:8080
base_url: http://localhost:8080
users:
  - id: "1"
    username: "user1"
    password: "password1"
    # User attributes are arbitrary
    attributes:
      role_name: "admin"
      email: "user1@example.com"
  - id: "2"
    username: "user2"
    password: "password2"
    attributes:
      role_name: "user"
      email: "user2@example.com"
clients:
  - id: "client1"
    audience: "example.com"
    secret: "super_secret"
    redirect_uri: "http://localhost:3000/callback"
```

## 🔐 Endpoints

[📄 See `API.md` for a complete reference of the API endpoints](./API.md)

### 🔧 Health & Metadata

| Method | Path                                | Description               |
| ------ | ----------------------------------- | ------------------------- |
| GET    | `/healthz`                          | Health check              |
| GET    | `/.well-known/jwks.json`            | Public RSA key set (JWKS) |
| GET    | `/.well-known/openid-configuration` | OIDC discovery metadata   |

### 🔑 Direct Login (Challenge Flow)

| Method | Path              | Description                        |
| ------ | ----------------- | ---------------------------------- |
| POST   | `/login/init`     | Start login with username/password |
| POST   | `/login/complete` | Complete login using challenge ID  |
| POST   | `/login/refresh`  | Refresh tokens using refresh token |
| GET    | `/me`             | Get user info from access token    |

### 🧑‍💻 OAuth 2.0 & OpenID Connect

| Method | Path                       | Description                    |
| ------ | -------------------------- | ------------------------------ |
| GET    | `/oauth2/authorize`        | Start authorization code flow  |
| POST   | `/oauth2/authorize/submit` | Handle login form              |
| POST   | `/oauth2/token`            | Exchange code for tokens       |
| GET    | `/userinfo`                | Return user profile from token |

### 👤 User Management (Admin)

| Method | Path                 | Description             |
| ------ | -------------------- | ----------------------- |
| GET    | `/users`             | List all users          |
| GET    | `/users/:id`         | Get user by ID          |
| PUT    | `/users/:id`         | Create or update a user |
| POST   | `/users/:id/disable` | Disable a user          |
| POST   | `/users/:id/enable`  | Enable a user           |
| DELETE | `/users/:id`         | Delete a user           |

## 📦 Tokens

* Access Tokens and ID Tokens are **RS256-signed JWTs**
* Refresh Tokens are opaque, random strings
* JWT Claims follow **Cognito-style structure**, including:
  * `sub`, `aud`, `client_id`, `auth_time`, `token_use`, `iat`, `exp`

## 🔗 OIDC Integration

Any OIDC-compliant client can integrate using the discovery URL:

```
http://<host>:<port>/.well-known/openid-configuration
```

Use grant type `authorization_code`, client ID/secret from config, and redirect URI as registered.

Supported client libraries:

* [`openid-client` (Node.js)](https://github.com/panva/node-openid-client)
* [`aws-jwt-verify` (Node.js / browser)](https://github.com/awslabs/aws-jwt-verify)
* OAuth2-Proxy
* NextAuth.js
* Keycloak Gatekeeper
* Any compliant OAuth2/OpenID tool

## 🧪 Example Docker Compose

### `example/docker-compose.yaml`

```yaml
services:
  local-idp:
    image: siocode/local-idp
    ports:
      - "8080:8080"
    volumes:
      - ./local-idp.config.yaml:/config.yaml:ro
```

Start it:

```bash
cd example
docker compose up
```

## 🏗️ Building

Build the container via the following command (builds for both X86 & ARM architectures):

```bash
docker buildx build --platform=linux/arm64,linux/amd64 -t siocode/local-idp:latest .
```

## 📜 License

MIT © 2025 SIOCODE
