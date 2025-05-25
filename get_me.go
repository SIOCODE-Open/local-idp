package main

import (
	"net/http"

	"github.com/golang-jwt/jwt/v5"
)

func GET_me(w http.ResponseWriter, r *http.Request) {
	// Extract token from header
	tokenString, err := extractTokenFromHeader(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Invalid authorization header"})
		return
	}

	// Validate token
	token, err := validateAccessToken(tokenString)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Invalid token"})
		return
	}

	// Verify token use
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Invalid token claims"})
		return
	}

	if claims["token_use"] != TokenUseAccess {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Invalid token use"})
		return
	}

	// Get user ID from token
	userId, ok := claims["sub"].(string)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Invalid user ID in token"})
		return
	}

	// Find user
	var foundUser *IdpUser
	for i, user := range AppContext.Users {
		if user.Id == userId {
			foundUser = &AppContext.Users[i]
			break
		}
	}

	if foundUser == nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "User not found"})
		return
	}

	// Create response without password
	response := *foundUser
	response.Password = ""

	writeJSON(w, http.StatusOK, response)
}
