package main

import (
	"net/http"
)

func GET_users(w http.ResponseWriter, r *http.Request) {

	// Find existing user
	allUsers := []IdpUser{}
	for _, user := range AppContext.Users {
		responseUser := IdpUser{
			Id:         user.Id,
			Username:   user.Username,
			Disabled:   user.Disabled,
			Attributes: user.Attributes,
		}
		allUsers = append(allUsers, responseUser)
	}
	writeJSON(w, http.StatusOK, allUsers)

}
