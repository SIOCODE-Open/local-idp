package main

import (
	"net/http"

	"github.com/gorilla/mux"
)

func DELETE_users_id(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userId := vars["id"]

	index, _ := FindUserIndexById(userId)
	if index == -1 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "User not found"})
		return
	}

	// Remove user by swapping with last element and truncating
	AppContext.Users[index] = AppContext.Users[len(AppContext.Users)-1]
	AppContext.Users = AppContext.Users[:len(AppContext.Users)-1]

	writeJSON(w, http.StatusOK, map[string]string{"message": "User deleted"})
}
