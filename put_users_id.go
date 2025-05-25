package main

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
)

type PutUserRequest struct {
	Username   string                 `json:"username"`
	Password   string                 `json:"password"`
	Attributes map[string]interface{} `json:"attributes"`
}

func PUT_users_id(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userId := vars["id"]

	var req PutUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request"})
		return
	}

	// Find existing user
	_, existingUser := FindUserIndexById(userId)

	if existingUser != nil {
		// Update existing user
		if req.Username != "" {
			existingUser.Username = req.Username
		}
		if req.Password != "" {
			existingUser.Password = req.Password
		}
		if req.Attributes != nil {
			existingUser.Attributes = req.Attributes
		}
		writeJSON(w, http.StatusOK, existingUser)
		return
	}

	// Create new user
	newUser := IdpUser{
		Id:         userId,
		Username:   req.Username,
		Password:   req.Password,
		Disabled:   false,
		Attributes: req.Attributes,
	}

	AppContext.Users = append(AppContext.Users, newUser)

	responseUser := IdpUser{
		Id:         newUser.Id,
		Username:   newUser.Username,
		Disabled:   newUser.Disabled,
		Attributes: newUser.Attributes,
	}

	writeJSON(w, http.StatusCreated, responseUser)
}
