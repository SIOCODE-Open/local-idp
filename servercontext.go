package main

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"math/big"
	"time"
)

type PendingLogin struct {
	UserId            string
	ClientId          string
	IssueRefreshToken bool
	CreatedAt         time.Time
}

type IssuedRefreshToken struct {
	UserId    string
	ClientId  string
	ExpiresAt time.Time
}

type OauthPendingAuthorization struct {
	Code        string
	UserId      string
	ClientId    string
	RedirectUri string
	ExpiresAt   time.Time
}

type AppServerContext struct {
	Users                 []IdpUser
	Clients               []IdpClient
	JwksKeys              []IdpJwksKey
	PendingLogins         map[string]PendingLogin
	RefreshTokens         map[string]IssuedRefreshToken
	OauthPendingAuthCodes map[string]OauthPendingAuthorization
}

var AppContext *AppServerContext

func base64UrlEncodeBigInt(n *big.Int) string {
	return base64.RawURLEncoding.EncodeToString(n.Bytes())
}

func base64UrlEncodeUint(n uint64) string {
	b := big.NewInt(int64(n)).Bytes()
	return base64.RawURLEncoding.EncodeToString(b)
}

func generateRandomKid() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

func NewAppContext() *AppServerContext {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		panic(err)
	}

	publicKey := key.PublicKey
	kid := generateRandomKid()

	jwk := IdpJwksKey{
		Kid:        kid,
		Kty:        "RSA",
		Alg:        "RS256",
		Use:        "sig",
		N:          base64UrlEncodeBigInt(publicKey.N),
		E:          base64UrlEncodeUint(uint64(publicKey.E)),
		PrivateKey: key,
	}

	return &AppServerContext{
		Users:                 AppConfig.Users,
		Clients:               AppConfig.Clients,
		JwksKeys:              []IdpJwksKey{jwk},
		PendingLogins:         make(map[string]PendingLogin),
		RefreshTokens:         make(map[string]IssuedRefreshToken),
		OauthPendingAuthCodes: make(map[string]OauthPendingAuthorization),
	}
}
