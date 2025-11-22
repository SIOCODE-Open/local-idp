package main

import (
	"encoding/json"
	"net/http"
	"time"
)

func POST_login_refresh(w http.ResponseWriter, r *http.Request) {
	var req IdpRefreshTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request"})
		return
	}

	// Find refresh token
	refreshToken, exists := AppContext.RefreshTokens[req.RefreshToken]
	if !exists {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Invalid refresh token"})
		return
	}

	// Check if token is expired
	if time.Now().After(refreshToken.ExpiresAt) {
		delete(AppContext.RefreshTokens, req.RefreshToken)
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Refresh token expired"})
		return
	}

	// Find user
	var foundUser *IdpUser
	for i, user := range AppContext.Users {
		if user.Id == refreshToken.UserId {
			foundUser = &AppContext.Users[i]
			break
		}
	}

	if foundUser == nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "User not found"})
		return
	}

	// Find client from stored client ID
	var foundClient *IdpClient
	for i, client := range AppContext.Clients {
		if client.Id == refreshToken.ClientId {
			foundClient = &AppContext.Clients[i]
			break
		}
	}

	if foundClient == nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Client not found"})
		return
	}

	// Generate new tokens
	accessToken, err := generateAccessToken(foundUser, foundClient, refreshToken.Scopes)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to generate access token"})
		return
	}

	identityToken, err := generateIdentityToken(foundUser, foundClient, "")
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to generate identity token"})
		return
	}

	// Generate new refresh token
	newRefreshToken := generateRandomToken()
	refreshExpirationDuration := time.Duration(AppConfig.RefreshTokenExpirationSeconds) * time.Second
	AppContext.RefreshTokens[newRefreshToken] = IssuedRefreshToken{
		UserId:    foundUser.Id,
		ClientId:  foundClient.Id,
		Scopes:    refreshToken.Scopes,
		ExpiresAt: time.Now().Add(refreshExpirationDuration),
	}

	// Remove old refresh token
	delete(AppContext.RefreshTokens, req.RefreshToken)

	writeJSON(w, http.StatusOK, IdpRefreshTokenResponse{
		AccessToken:   accessToken,
		IdentityToken: identityToken,
		RefreshToken:  newRefreshToken,
	})
}
