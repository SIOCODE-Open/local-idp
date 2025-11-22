package main

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
)

func POST_login_init(w http.ResponseWriter, r *http.Request) {
	var req IdpInitLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request"})
		return
	}

	// Get client ID from query parameter or request body
	clientId := r.URL.Query().Get("client_id")
	if clientId == "" {
		clientId = req.ClientId
	}

	if clientId == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Client ID is required"})
		return
	}

	// Validate client ID
	var foundClient *IdpClient
	for i, client := range AppContext.Clients {
		if client.Id == clientId {
			foundClient = &AppContext.Clients[i]
			break
		}
	}

	if foundClient == nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid client ID"})
		return
	}

	// Find user
	var foundUser *IdpUser
	for i, user := range AppContext.Users {
		if user.Username == req.Username && user.Password == req.Password {
			foundUser = &AppContext.Users[i]
			break
		}
	}

	if foundUser == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Invalid credentials"})
		return
	}

	if foundUser.Disabled {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "User is disabled"})
		return
	}

	// Determine scopes to use
	scopes := req.Scopes
	if scopes == "" {
		// Use default scopes from config
		scopes = AppConfig.LoginApi.DefaultScopes
	}

	// Generate challenge ID
	challengeId := uuid.NewString()

	// Store pending login
	AppContext.PendingLogins[challengeId] = PendingLogin{
		UserId:            foundUser.Id,
		ClientId:          foundClient.Id,
		IssueRefreshToken: req.IssueRefreshToken,
		Scopes:            scopes,
		CreatedAt:         time.Now(),
	}

	// Return challenge ID
	writeJSON(w, http.StatusOK, IdpInitLoginResponse{
		ChallengeId: challengeId,
	})
}
