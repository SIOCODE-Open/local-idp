# Configuration Reference – SIOCODE Local IDP

This document describes all configuration options for the SIOCODE Local Identity Provider.

---

## Configuration File

The identity provider is configured via a YAML file. By default, the server looks for `/config.yaml`, but you can specify a custom path using:

1. Command-line flag: `-c` or `--config-path`
2. Environment variable: `CONFIG_PATH`

### Configuration File Path

- **Command-Line Flag**: `-c <path>` or `--config-path <path>`
- **Environment Variable**: `CONFIG_PATH`
- **Default**: `/config.yaml`
- **Example**: 
  - `local-idp -c /app/my-config.yaml`
  - `local-idp --config-path /app/my-config.yaml`
  - `CONFIG_PATH=/app/my-config.yaml local-idp`

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

### `allowed_origins` (string, optional)

The allowed origins for Cross-Origin Resource Sharing (CORS) requests.

- **Type**: String
- **Default**: `*` (all origins allowed)
- **Example**: `allowed_origins: http://localhost:3000`

This value configures CORS headers for cross-origin requests. The server will:
- Set the `Access-Control-Allow-Origin` header to the configured value
- Handle preflight OPTIONS requests automatically
- Allow credentials for cross-origin requests

For multiple origins, separate them with commas or use a wildcard `*` to allow all origins. In production environments, it's recommended to specify exact origins instead of using the wildcard.

Common configurations:
- `*` - Allow all origins (default, convenient for local testing)
- `http://localhost:3000` - Allow single specific origin
- `http://localhost:3000,https://example.com` - Allow multiple specific origins

---

### `oauth2` (object, optional)

OAuth2 provider configuration options.

- **Type**: Object
- **Default**: `{ enabled: true, require_challenge_on_login: false }`

#### OAuth2 Object Properties

##### `enabled` (boolean, optional)

Whether OAuth2/OIDC authorization code flow endpoints are enabled.

- **Type**: Boolean
- **Default**: `true`
- **Example**: `enabled: true`

When enabled, the following endpoints are available:
- `GET /oauth2/authorize`
- `POST /oauth2/authorize/submit`
- `POST /oauth2/token`

When disabled, these endpoints will not be registered and OAuth2 flows will not be available.

##### `require_challenge_on_login` (boolean, optional)

Whether to show and require a challenge field on the login page.

- **Type**: Boolean
- **Default**: `false`
- **Example**: `require_challenge_on_login: false`

When enabled, the login form will display an additional challenge input field. Users can enter any value (this is a dummy challenge for testing purposes). This can be useful for testing applications that expect additional authentication factors.

##### `default_scopes` (string, optional)

Default OAuth2 scopes to use when no scope parameter is provided in the authorization request.

- **Type**: String
- **Default**: `"openid profile"`
- **Example**: `default_scopes: "openid profile email"`

When a client initiates an OAuth2 authorization flow without specifying the `scope` parameter, this default value will be used. The scopes are space-separated and will be included in the issued access tokens.

Common scope values:
- `openid` - Required for OpenID Connect flows, enables ID token issuance
- `profile` - Access to user profile information
- `email` - Access to user email address
- Custom scopes specific to your application

#### OAuth2 Example

```yaml
oauth2:
  enabled: true
  require_challenge_on_login: false
  default_scopes: "openid profile email"
```

---

### `login_api` (object, optional)

Login API configuration options for Cognito-style admin API endpoints.

- **Type**: Object
- **Default**: `{ enabled: true }`

#### LoginApi Object Properties

##### `enabled` (boolean, optional)

Whether the Cognito-style login API endpoints are enabled.

- **Type**: Boolean
- **Default**: `true`
- **Example**: `enabled: true`

When enabled, the following endpoints are available:
- `POST /login/init`
- `POST /login/complete`
- `POST /login/refresh`

When disabled, these endpoints will not be registered.

##### `default_scopes` (string, optional)

Default OAuth2 scopes to use when no scopes are provided in the login API request.

- **Type**: String
- **Default**: `"openid profile"`
- **Example**: `default_scopes: "openid profile email"`

When a client calls `POST /login/init` without specifying the `scopes` field in the request body, this default value will be used. The scopes are space-separated and will be included in the issued access tokens. The scopes are preserved throughout the entire authentication flow, including when refresh tokens are used.

Common scope values:
- `openid` - Required for OpenID Connect flows, enables ID token issuance
- `profile` - Access to user profile information
- `email` - Access to user email address
- Custom scopes specific to your application

#### LoginApi Example

```yaml
login_api:
  enabled: true
  default_scopes: "openid profile email"
```

---

### `map_access_token_claims` (object, optional)

Configuration for mapping user attributes to claims in access tokens.

- **Type**: Object (map of string keys to string values)
- **Default**: Empty/not set (no custom claim mapping)
- **Example**:
  ```yaml
  map_access_token_claims:
    roles: role_name
    department: dept
  ```

This configuration allows you to selectively map user attributes to claims in access tokens. Each key-value pair in this object represents a mapping:
- **Key**: The name of the claim to include in the access token
- **Value**: The name of the user attribute to read from

**Behavior:**
- Only specified attributes are mapped to access token claims
- If a user attribute does not exist, the claim is omitted from the token
- Standard JWT claims (`sub`, `iss`, `aud`, `iat`, `exp`, `auth_time`, `token_use`, `client_id`, `scope`, `jti`) are always included
- If this configuration is not provided or is empty, no custom claims are added to access tokens

**Example Configuration:**

```yaml
map_access_token_claims:
  roles: role_name      # Maps user.attributes.role_name to access token claim "roles"
  email: email          # Maps user.attributes.email to access token claim "email"
  org: organization     # Maps user.attributes.organization to access token claim "org"
```

**Example Access Token Claims:**

Given the configuration above and a user with attributes:
```yaml
attributes:
  role_name: "admin"
  email: "user@example.com"
  organization: "engineering"
```

The resulting access token will contain:
```json
{
  "sub": "user-id",
  "iss": "http://localhost:8080",
  "aud": "example.com",
  "roles": "admin",
  "email": "user@example.com",
  "org": "engineering",
  ...
}
```

---

### `map_identity_token_claims` (object, optional)

Configuration for mapping user attributes to claims in identity (ID) tokens.

- **Type**: Object (map of string keys to string values)
- **Default**: Empty/not set (all user attributes are included)
- **Example**:
  ```yaml
  map_identity_token_claims:
    email: email
    name: full_name
    roles: role_name
  ```

This configuration allows you to selectively map user attributes to claims in identity tokens. Each key-value pair in this object represents a mapping:
- **Key**: The name of the claim to include in the identity token
- **Value**: The name of the user attribute to read from

**Behavior:**
- If configured: Only specified attributes are mapped to identity token claims
- If not configured: All user attributes are automatically included in identity tokens (legacy behavior)
- If a user attribute does not exist, the claim is omitted from the token
- Standard JWT claims (`sub`, `iss`, `aud`, `iat`, `exp`, `auth_time`, `token_use`, `client_id`, `jti`, `nonce`) are always included

**Example Configuration:**

```yaml
map_identity_token_claims:
  email: email          # Maps user.attributes.email to identity token claim "email"
  name: full_name       # Maps user.attributes.full_name to identity token claim "name"
  roles: role_name      # Maps user.attributes.role_name to identity token claim "roles"
  picture: avatar_url   # Maps user.attributes.avatar_url to identity token claim "picture"
```

**Example Identity Token Claims:**

Given the configuration above and a user with attributes:
```yaml
attributes:
  email: "user@example.com"
  full_name: "John Doe"
  role_name: "admin"
  avatar_url: "https://example.com/avatar.jpg"
  internal_id: "12345"  # This will NOT be included in the token
```

The resulting identity token will contain:
```json
{
  "sub": "user-id",
  "iss": "http://localhost:8080",
  "aud": "example.com",
  "email": "user@example.com",
  "name": "John Doe",
  "roles": "admin",
  "picture": "https://example.com/avatar.jpg",
  ...
}
```

Note that `internal_id` is not included because it's not in the mapping configuration.

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

##### `secret` (string, optional)

The client secret used for authentication when exchanging authorization codes for tokens.

- **Type**: String
- **Required**: No (omit for public clients)
- **Example**: `secret: "super_secret_value"`

**Client Types:**

- **Confidential clients**: Provide a `secret` value. The client must send this secret when calling `/oauth2/token`.
- **Public clients**: Omit the `secret` field or set it to an empty string `""`. These clients can obtain tokens without providing a secret.

Public clients are typically used for:
- Single Page Applications (SPAs) running in browsers
- Mobile applications
- Desktop applications
- Any client where the secret cannot be securely stored

**Security Note**: Public clients rely on other security mechanisms like PKCE (Proof Key for Code Exchange), redirect URI validation, and short-lived authorization codes. In production environments, consider implementing PKCE for additional security.

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
  # Confidential client (backend server)
  - id: "web-app"
    secret: "web-app-secret-123"
    redirect_uri: "http://localhost:3000/auth/callback"
    audience: "api.example.com"
  
  # Public client (SPA - no secret)
  - id: "spa-app"
    redirect_uri: "http://localhost:3000/callback"
    audience: "api.example.com"
  
  # Confidential client (mobile backend)
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

# OAuth2 configuration (optional)
oauth2:
  enabled: true                      # Enable OAuth2/OIDC authorization code flow
  require_challenge_on_login: false  # Show challenge field on login page

# Login API configuration (optional)
login_api:
  enabled: true                      # Enable Cognito-style login API endpoints

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
