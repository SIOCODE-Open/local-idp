package main

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	TokenUseAccess  = "access"
	TokenUseId      = "id"
	TokenExpiry     = 1 * time.Hour
	RefreshExpiry   = 30 * 24 * time.Hour // 30 days
	ChallengeExpiry = 5 * time.Minute
)

func generateRandomToken() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

func generateAccessToken(user *IdpUser, client *IdpClient) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub":       user.Id,
		"iss":       "local-idp",
		"iat":       now.Unix(),
		"exp":       now.Add(TokenExpiry).Unix(),
		"auth_time": now.Unix(),
		"token_use": TokenUseAccess,
		"client_id": client.Id,
		"aud":       client.Audience,
		"scope":     "openid profile",
		"jti":       generateRandomToken(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	return token.SignedString(AppContext.JwksKeys[0].PrivateKey)
}

func generateIdentityToken(user *IdpUser, client *IdpClient) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub":       user.Id,
		"iss":       "local-idp",
		"iat":       now.Unix(),
		"exp":       now.Add(TokenExpiry).Unix(),
		"auth_time": now.Unix(),
		"token_use": TokenUseId,
		"client_id": client.Id,
		"aud":       client.Audience,
		"jti":       generateRandomToken(),
	}

	// Add user attributes
	for k, v := range user.Attributes {
		claims[k] = v
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	return token.SignedString(AppContext.JwksKeys[0].PrivateKey)
}

func validateAccessToken(tokenString string) (*jwt.Token, error) {
	return jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return &AppContext.JwksKeys[0].PrivateKey.PublicKey, nil
	})
}

func extractTokenFromHeader(r *http.Request) (string, error) {
	auth := r.Header.Get("Authorization")
	if len(auth) < 7 || auth[:7] != "Bearer " {
		return "", jwt.ErrSignatureInvalid
	}
	return auth[7:], nil
}
