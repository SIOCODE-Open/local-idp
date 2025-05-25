package main

import (
	"net/http"

	"github.com/gorilla/mux"
)

func POST_users_id_enable(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userId := vars["id"]

	_, user := FindUserIndexById(userId)
	if user == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "User not found"})
		return
	}

	user.Disabled = false
	w.WriteHeader(http.StatusNoContent)
}
