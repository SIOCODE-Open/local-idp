package main

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"math/big"
)

type AppServerContext struct {
	Users    []IdpUser
	Clients  []IdpClient
	JwksKeys []IdpJwksKey
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
		Kid: kid,
		Kty: "RSA",
		Alg: "RS256",
		Use: "sig",
		N:   base64UrlEncodeBigInt(publicKey.N),
		E:   base64UrlEncodeUint(uint64(publicKey.E)),
	}

	return &AppServerContext{
		Users:    AppConfig.Users,
		Clients:  AppConfig.Clients,
		JwksKeys: []IdpJwksKey{jwk},
	}
}
