package main

import "net/http"

func GET_well_known_jwks(w http.ResponseWriter, r *http.Request) {
	payload := map[string]interface{}{
		"keys": AppContext.JwksKeys,
	}
	writeJSON(w, http.StatusOK, payload)
}
