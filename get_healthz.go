package main

import (
	"net/http"
)

func GET_healthz(w http.ResponseWriter, r *http.Request) {
	payload := map[string]string{"status": "OK"}
	writeJSON(w, http.StatusOK, payload)
}
