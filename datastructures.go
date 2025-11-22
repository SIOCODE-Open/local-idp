package main

import "crypto/rsa"

type IdpUser struct {
	Id         string                 `json:"id"`
	Username   string                 `json:"username"`
	Password   string                 `json:"password,omitempty"`
	Disabled   bool                   `json:"disabled"`
	Attributes map[string]interface{} `json:"attributes"`
}

type IdpClient struct {
	Id          string `json:"id"`
	Secret      string `json:"secret"`
	RedirectUri string `json:"redirect_uri"`
	Audience    string `json:"audience"`
}

type OAuth2Config struct {
	Enabled                 *bool  `json:"enabled,omitempty"`
	RequireChallengeOnLogin *bool  `json:"require_challenge_on_login,omitempty"`
	DefaultScopes           string `json:"default_scopes,omitempty"`
}

type LoginApiConfig struct {
	Enabled       *bool  `json:"enabled,omitempty"`
	DefaultScopes string `json:"default_scopes,omitempty"`
}

type IdpConfig struct {
	Port                          int               `json:"port"`
	Issuer                        string            `json:"issuer,omitempty"`
	BaseUrl                       string            `json:"base_url,omitempty"`
	AccessTokenExpirationSeconds  int               `json:"access_token_expiration_seconds,omitempty"`
	RefreshTokenExpirationSeconds int               `json:"refresh_token_expiration_seconds,omitempty"`
	AllowedOrigins                string            `json:"allowed_origins,omitempty"`
	OAuth2                        OAuth2Config      `json:"oauth2,omitempty"`
	LoginApi                      LoginApiConfig    `json:"login_api,omitempty"`
	MapAccessTokenClaims          map[string]string `json:"map_access_token_claims,omitempty"`
	MapIdentityTokenClaims        map[string]string `json:"map_identity_token_claims,omitempty"`
	Users                         []IdpUser         `json:"users"`
	Clients                       []IdpClient       `json:"clients"`
}

type IdpInitLoginRequest struct {
	Username          string `json:"username"`
	Password          string `json:"password"`
	ClientId          string `json:"client_id"`
	IssueRefreshToken bool   `json:"issue_refresh_token"`
	Scopes            string `json:"scopes,omitempty"`
}

type IdpInitLoginResponse struct {
	ChallengeId string `json:"challenge_id"`
}

type IdpCompleteLoginRequest struct {
	ChallengeId   string `json:"challenge_id"`
	ChallengeData string `json:"challenge_data"`
}

type IdpCompleteLoginResponse struct {
	AccessToken   string `json:"access_token"`
	RefreshToken  string `json:"refresh_token,omitempty"`
	IdentityToken string `json:"identity_token,omitempty"`
}

type IdpRefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type IdpRefreshTokenResponse struct {
	AccessToken   string `json:"access_token"`
	RefreshToken  string `json:"refresh_token"`
	IdentityToken string `json:"identity_token"`
}

type IdpJwksKey struct {
	Kid        string          `json:"kid"`
	Kty        string          `json:"kty"`
	Alg        string          `json:"alg"`
	Use        string          `json:"use"`
	N          string          `json:"n"`
	E          string          `json:"e"`
	PrivateKey *rsa.PrivateKey `json:"-"`
}
