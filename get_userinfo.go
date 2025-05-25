package main

import (
	"encoding/json"
	"net/http"

	"github.com/golang-jwt/jwt/v5"
)

func GET_userinfo(w http.ResponseWriter, r *http.Request) {
	// Extract token from header
	tokenString, err := extractTokenFromHeader(r)
	if err != nil {
		http.Error(w, "Invalid authorization header", http.StatusUnauthorized)
		return
	}

	// Validate token
	token, err := validateAccessToken(tokenString)
	if err != nil {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	// Verify token use
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		http.Error(w, "Invalid token claims", http.StatusUnauthorized)
		return
	}

	if claims["token_use"] != TokenUseAccess {
		http.Error(w, "Invalid token use", http.StatusUnauthorized)
		return
	}

	// Get user ID from token
	userId, ok := claims["sub"].(string)
	if !ok {
		http.Error(w, "Invalid user ID in token", http.StatusUnauthorized)
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
		http.Error(w, "User not found", http.StatusInternalServerError)
		return
	}

	// Create response with user attributes
	response := make(map[string]interface{})
	response["sub"] = foundUser.Id

	// Add all user attributes
	for k, v := range foundUser.Attributes {
		response[k] = v
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
