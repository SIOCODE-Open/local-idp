package main

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC)
	AppConfig = LoadConfig()
	AppContext = NewAppContext()
	port := AppConfig.Port

	log.Printf("Starting server on port %d", port)
	log.Printf("Number of configured users: %d", len(AppConfig.Users))
	log.Printf("Number of configured clients: %d", len(AppConfig.Clients))
	log.Printf("Number of configured JWKS keys: %d", len(AppContext.JwksKeys))

	router := mux.NewRouter()
	router.HandleFunc("/healthz", GET_healthz).Methods("GET")
	router.HandleFunc("/.well-known/jwks.json", GET_well_known_jwks).Methods("GET")
	loggedRouter := accessLogger(router)

	addr := ":" + strconv.Itoa(port)
	if err := http.ListenAndServe(addr, loggedRouter); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
