# Configuration Reference – SIOCODE Local IDP

This document describes all configuration options for the SIOCODE Local Identity Provider.

---

## Configuration File

The identity provider is configured via a YAML file. By default, the server looks for `/config.yaml`, but you can specify a custom path using the `CONFIG_PATH` environment variable.

### Configuration File Path

- **Environment Variable**: `CONFIG_PATH`
- **Default**: `/config.yaml`
- **Example**: `CONFIG_PATH=/app/my-config.yaml`

---

## Configuration Structure

### YAML Format

```yaml
port: 8080
issuer: http://localhost:8080
base_url: http://localhost:8080
access_token_expiration_seconds: 900
refresh_token_expiration_seconds: 86400
users:
  - id: "1"
    username: "user1"
    password: "password1"
    disabled: false
    attributes:
      email: "user1@example.com"
      role_name: "admin"
clients:
  - id: "client1"
    secret: "super_secret"
    redirect_uri: "http://localhost:3000/callback"
    audience: "example.com"
```

---

## Configuration Options

### `port` (integer, optional)

The port on which the server will listen.

- **Type**: Integer
- **Default**: `8080`
- **Environment Variable Override**: `PORT`
- **Example**: `port: 8080`

If the `PORT` environment variable is set, it will override the value in the configuration file.

---

### `issuer` (string, optional)

The issuer identifier for JWT tokens. This value appears in the `iss` claim of all issued tokens and in the OpenID Connect discovery metadata.

- **Type**: String
- **Default**: `http://localhost:<port>`
- **Example**: `issuer: http://localhost:8080`

If not provided, defaults to `http://localhost:<port>` using the configured port.

---

### `base_url` (string, optional)

The base URL used for constructing endpoint URLs in OpenID Connect discovery metadata.

- **Type**: String
- **Default**: `http://localhost:<port>`
- **Example**: `base_url: http://localhost:8080`

If not provided, defaults to `http://localhost:<port>` using the configured port. This is used to build URLs for:
- Authorization endpoint
- Token endpoint
- Userinfo endpoint
- JWKS URI

---

### `access_token_expiration_seconds` (integer, optional)

The expiration time in seconds for access tokens and ID tokens.

- **Type**: Integer
- **Default**: `900` (15 minutes)
- **Example**: `access_token_expiration_seconds: 900`

This value determines:
- The lifetime of JWT access tokens issued by the `/oauth2/token` endpoint
- The lifetime of ID tokens issued by the `/oauth2/token` endpoint
- The `exp` claim in both access and ID tokens
- The `expires_in` value in OAuth2 token responses

---

### `refresh_token_expiration_seconds` (integer, optional)

The expiration time in seconds for refresh tokens.

- **Type**: Integer
- **Default**: `86400` (1 day)
- **Example**: `refresh_token_expiration_seconds: 86400`

This value determines how long refresh tokens remain valid before they must be replaced. When a refresh token expires, the user must re-authenticate.

---

### `users` (array, required)

An array of user objects that will be available for authentication.

- **Type**: Array of User objects
- **Required**: Yes (can be empty array)

#### User Object Properties

Each user in the array has the following properties:

##### `id` (string, required)

Unique identifier for the user. This value appears as the `sub` claim in JWT tokens.

- **Type**: String
- **Required**: Yes
- **Example**: `id: "1"`

##### `username` (string, required)

Username for authentication.

- **Type**: String
- **Required**: Yes
- **Example**: `username: "alice"`

##### `password` (string, required)

Password for authentication. Stored in plain text (suitable for testing only).

- **Type**: String
- **Required**: Yes
- **Example**: `password: "password123"`

##### `disabled` (boolean, optional)

Whether the user account is disabled. Disabled users cannot log in.

- **Type**: Boolean
- **Default**: `false`
- **Example**: `disabled: false`

##### `attributes` (object, optional)

Arbitrary key-value pairs representing user attributes. These attributes are:
- Included in ID tokens as custom claims
- Returned in the `/userinfo` endpoint
- Returned in the `/me` endpoint

- **Type**: Object (map of string keys to any value)
- **Default**: Empty object `{}`
- **Example**:
  ```yaml
  attributes:
    email: "alice@example.com"
    name: "Alice Smith"
    role_name: "admin"
    department: "Engineering"
  ```

#### User Example

```yaml
users:
  - id: "1"
    username: "alice"
    password: "password123"
    disabled: false
    attributes:
      email: "alice@example.com"
      name: "Alice Smith"
      role_name: "admin"
  - id: "2"
    username: "bob"
    password: "password456"
    disabled: false
    attributes:
      email: "bob@example.com"
      name: "Bob Jones"
      role_name: "user"
```

---

### `clients` (array, required)

An array of OAuth2/OIDC client configurations.

- **Type**: Array of Client objects
- **Required**: Yes (can be empty array)

#### Client Object Properties

Each client in the array has the following properties:

##### `id` (string, required)

The client identifier used in OAuth2/OIDC flows.

- **Type**: String
- **Required**: Yes
- **Example**: `id: "my-app"`

##### `secret` (string, required)

The client secret used for authentication when exchanging authorization codes for tokens.

- **Type**: String
- **Required**: Yes
- **Example**: `secret: "super_secret_value"`

##### `redirect_uri` (string, required)

The allowed redirect URI for this client. Must match exactly during authorization.

- **Type**: String
- **Required**: Yes
- **Example**: `redirect_uri: "http://localhost:3000/callback"`

##### `audience` (string, required)

The audience value included in the `aud` claim of issued JWT tokens.

- **Type**: String
- **Required**: Yes
- **Example**: `audience: "my-api.example.com"`

#### Client Example

```yaml
clients:
  - id: "web-app"
    secret: "web-app-secret-123"
    redirect_uri: "http://localhost:3000/auth/callback"
    audience: "api.example.com"
  - id: "mobile-app"
    secret: "mobile-app-secret-456"
    redirect_uri: "myapp://callback"
    audience: "api.example.com"
```

---

## Environment Variables

### `CONFIG_PATH`

Path to the YAML configuration file.

- **Default**: `/config.yaml`
- **Example**: `CONFIG_PATH=/app/config/idp.yaml`

### `PORT`

Server port (overrides the `port` setting in the configuration file).

- **Default**: `8080` (if not specified in config file)
- **Example**: `PORT=9000`

---

## Complete Configuration Example

```yaml
# Server configuration
port: 8080
issuer: http://localhost:8080
base_url: http://localhost:8080

# Token expiration settings (in seconds)
access_token_expiration_seconds: 900    # 15 minutes
refresh_token_expiration_seconds: 86400 # 1 day

# Users
users:
  - id: "1"
    username: "admin"
    password: "admin123"
    disabled: false
    attributes:
      email: "admin@example.com"
      name: "Admin User"
      role_name: "admin"
      department: "IT"
  
  - id: "2"
    username: "alice"
    password: "alice123"
    disabled: false
    attributes:
      email: "alice@example.com"
      name: "Alice Johnson"
      role_name: "developer"
      department: "Engineering"
  
  - id: "3"
    username: "bob"
    password: "bob123"
    disabled: true
    attributes:
      email: "bob@example.com"
      name: "Bob Smith"
      role_name: "user"

# OAuth2/OIDC Clients
clients:
  - id: "web-client"
    secret: "web-secret-abc123"
    redirect_uri: "http://localhost:3000/callback"
    audience: "api.example.com"
  
  - id: "mobile-client"
    secret: "mobile-secret-xyz789"
    redirect_uri: "myapp://auth/callback"
    audience: "api.example.com"
  
  - id: "test-client"
    secret: "test-secret"
    redirect_uri: "http://localhost:8080/callback"
    audience: "test.example.com"
```

---

## Docker Configuration

When running in Docker, mount your configuration file to `/config.yaml` or set the `CONFIG_PATH` environment variable:

```yaml
services:
  local-idp:
    image: siocode/local-idp
    ports:
      - "8080:8080"
    volumes:
      - ./my-config.yaml:/config.yaml:ro
    environment:
      - PORT=8080
```

Or with a custom path:

```yaml
services:
  local-idp:
    image: siocode/local-idp
    ports:
      - "9000:9000"
    volumes:
      - ./configs/idp.yaml:/app/idp-config.yaml:ro
    environment:
      - CONFIG_PATH=/app/idp-config.yaml
      - PORT=9000
```

---

## Notes

- **All data is in-memory**: Users, clients, tokens, and sessions are stored in memory and will be lost when the server restarts.
- **Plain text passwords**: Passwords are stored in plain text. This is suitable for testing and development only.
- **No persistence**: This IDP is designed for local testing and development, not production use.
- **User attributes are flexible**: You can add any attributes to users, and they will be included in ID tokens and userinfo responses.

---

## 📄 License

MIT © 2025 SIOCODE
