package main

import (
	"net/http"
)

func GET_healthz(ctx *AppServerContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		payload := map[string]string{"status": "OK"}
		writeJSON(w, http.StatusOK, payload)
	}
}
