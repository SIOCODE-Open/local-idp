package main

import "crypto/rsa"

type IdpUser struct {
	Id         string                 `json:"id"`
	Username   string                 `json:"username"`
	Password   string                 `json:"password"`
	Disabled   bool                   `json:"disabled"`
	Attributes map[string]interface{} `json:"attributes"`
}

type IdpClient struct {
	Id          string `json:"id"`
	Secret      string `json:"secret"`
	RedirectUri string `json:"redirect_uri"`
	Audience    string `json:"audience"`
}

type IdpConfig struct {
	Port    int         `json:"port"`
	Users   []IdpUser   `json:"users"`
	Clients []IdpClient `json:"clients"`
}

type IdpInitLoginRequest struct {
	Username          string `json:"username"`
	Password          string `json:"password"`
	IssueRefreshToken bool   `json:"issue_refresh_token"`
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
