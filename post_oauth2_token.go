package main

import (
	"encoding/json"
	"net/http"
	"time"
)

type TokenResponse struct {
	AccessToken string `json:"access_token"`
	IDToken     string `json:"id_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

func POST_oauth2_token(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid form data", http.StatusBadRequest)
		return
	}

	// Get and validate required parameters
	grantType := r.Form.Get("grant_type")
	code := r.Form.Get("code")
	clientID := r.Form.Get("client_id")
	clientSecret := r.Form.Get("client_secret")
	redirectURI := r.Form.Get("redirect_uri")

	// Validate grant_type
	if grantType != "authorization_code" {
		http.Error(w, "grant_type must be 'authorization_code'", http.StatusBadRequest)
		return
	}

	// Validate client credentials
	var foundClient *IdpClient
	for i, client := range AppContext.Clients {
		if client.Id == clientID && client.Secret == clientSecret {
			foundClient = &AppContext.Clients[i]
			break
		}
	}

	if foundClient == nil {
		http.Error(w, "Invalid client credentials", http.StatusUnauthorized)
		return
	}

	// Find and validate authorization code
	authCode, exists := AppContext.OauthPendingAuthCodes[code]
	if !exists {
		http.Error(w, "Invalid authorization code", http.StatusBadRequest)
		return
	}

	// Check if code is expired
	if time.Now().After(authCode.ExpiresAt) {
		delete(AppContext.OauthPendingAuthCodes, code)
		http.Error(w, "Authorization code expired", http.StatusBadRequest)
		return
	}

	// Validate client_id and redirect_uri match
	if authCode.ClientId != clientID || authCode.RedirectUri != redirectURI {
		http.Error(w, "Invalid client_id or redirect_uri", http.StatusBadRequest)
		return
	}

	// Find user
	var foundUser *IdpUser
	for i, user := range AppContext.Users {
		if user.Id == authCode.UserId {
			foundUser = &AppContext.Users[i]
			break
		}
	}

	if foundUser == nil {
		http.Error(w, "User not found", http.StatusInternalServerError)
		return
	}

	// Generate tokens
	accessToken, err := generateAccessToken(foundUser, foundClient)
	if err != nil {
		http.Error(w, "Failed to generate access token", http.StatusInternalServerError)
		return
	}

	idToken, err := generateIdentityToken(foundUser, foundClient)
	if err != nil {
		http.Error(w, "Failed to generate ID token", http.StatusInternalServerError)
		return
	}

	// Clean up used authorization code
	delete(AppContext.OauthPendingAuthCodes, code)

	// Return tokens
	response := TokenResponse{
		AccessToken: accessToken,
		IDToken:     idToken,
		TokenType:   "Bearer",
		ExpiresIn:   AppConfig.AccessTokenExpirationSeconds,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
