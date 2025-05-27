package main

import (
	"net/http"

	"github.com/gorilla/mux"
)

func GET_users_id(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userId := vars["id"]

	// Find existing user
	_, existingUser := FindUserIndexById(userId)

	if existingUser != nil {
		responseUser := IdpUser{
			Id:         existingUser.Id,
			Username:   existingUser.Username,
			Disabled:   existingUser.Disabled,
			Attributes: existingUser.Attributes,
		}
		writeJSON(w, http.StatusOK, responseUser)
		return
	}

	// Response with not found
	writeJSON(w, http.StatusNotFound, map[string]string{"error": "User not found"})
}
