package main

import (
	"encoding/json"
	"net/http"
	"time"
)

func POST_login_complete(w http.ResponseWriter, r *http.Request) {
	var req IdpCompleteLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request"})
		return
	}

	// Find pending login
	pendingLogin, exists := AppContext.PendingLogins[req.ChallengeId]
	if !exists {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Invalid challenge"})
		return
	}

	// Check if challenge is expired
	if time.Since(pendingLogin.CreatedAt) > ChallengeExpiry {
		delete(AppContext.PendingLogins, req.ChallengeId)
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Challenge expired"})
		return
	}

	// Find user
	var foundUser *IdpUser
	for i, user := range AppContext.Users {
		if user.Id == pendingLogin.UserId {
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
		if client.Id == pendingLogin.ClientId {
			foundClient = &AppContext.Clients[i]
			break
		}
	}

	if foundClient == nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Client not found"})
		return
	}

	// Generate tokens
	accessToken, err := generateAccessToken(foundUser, foundClient)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to generate access token"})
		return
	}

	identityToken, err := generateIdentityToken(foundUser, foundClient)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to generate identity token"})
		return
	}

	response := IdpCompleteLoginResponse{
		AccessToken:   accessToken,
		IdentityToken: identityToken,
	}

	// Generate refresh token if requested
	if pendingLogin.IssueRefreshToken {
		refreshToken := generateRandomToken()
		AppContext.RefreshTokens[refreshToken] = IssuedRefreshToken{
			UserId:    foundUser.Id,
			ExpiresAt: time.Now().Add(RefreshExpiry),
		}
		response.RefreshToken = refreshToken
	}

	// Clean up pending login
	delete(AppContext.PendingLogins, req.ChallengeId)

	writeJSON(w, http.StatusOK, response)
}
