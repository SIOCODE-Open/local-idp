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
	ChallengeExpiry = 5 * time.Minute
)

func generateRandomToken() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

func generateAccessToken(user *IdpUser, client *IdpClient, scopes string) (string, error) {
	now := time.Now()
	jwksKey := AppContext.JwksKeys[0]
	expirationDuration := time.Duration(AppConfig.AccessTokenExpirationSeconds) * time.Second

	// Use provided scopes or fallback to default
	if scopes == "" {
		scopes = "openid profile"
	}

	claims := jwt.MapClaims{
		"sub":       user.Id,
		"iss":       AppConfig.Issuer,
		"aud":       client.Audience,
		"iat":       now.Unix(),
		"exp":       now.Add(expirationDuration).Unix(),
		"auth_time": now.Unix(),
		"token_use": TokenUseAccess,
		"client_id": client.Id,
		"scope":     scopes,
		"jti":       generateRandomToken(),
	}

	// Map user attributes to claims if configured
	if AppConfig.MapAccessTokenClaims != nil {
		for claimName, attributeName := range AppConfig.MapAccessTokenClaims {
			if attributeValue, exists := user.Attributes[attributeName]; exists {
				claims[claimName] = attributeValue
			}
		}
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = jwksKey.Kid

	return token.SignedString(jwksKey.PrivateKey)
}

func generateIdentityToken(user *IdpUser, client *IdpClient, nonce string) (string, error) {
	now := time.Now()
	jwksKey := AppContext.JwksKeys[0]
	expirationDuration := time.Duration(AppConfig.AccessTokenExpirationSeconds) * time.Second
	claims := jwt.MapClaims{
		"sub":       user.Id,
		"iss":       AppConfig.Issuer,
		"iat":       now.Unix(),
		"exp":       now.Add(expirationDuration).Unix(),
		"auth_time": now.Unix(),
		"token_use": TokenUseId,
		"client_id": client.Id,
		"aud":       client.Audience,
		"jti":       generateRandomToken(),
	}

	// Add nonce if provided
	if nonce != "" {
		claims["nonce"] = nonce
	}

	// Map user attributes to claims if configured
	if AppConfig.MapIdentityTokenClaims != nil {
		for claimName, attributeName := range AppConfig.MapIdentityTokenClaims {
			if attributeValue, exists := user.Attributes[attributeName]; exists {
				claims[claimName] = attributeValue
			}
		}
	} else {
		// Fallback: Add all user attributes if no mapping is configured
		for k, v := range user.Attributes {
			claims[k] = v
		}
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = jwksKey.Kid

	return token.SignedString(jwksKey.PrivateKey)
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
