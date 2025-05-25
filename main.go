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

	// Health check
	router.HandleFunc("/healthz", GET_healthz).Methods("GET")

	// JWKS endpoint
	router.HandleFunc("/.well-known/jwks.json", GET_well_known_jwks).Methods("GET")

	// OpenID Connect endpoints
	router.HandleFunc("/.well-known/openid-configuration", GET_openid_configuration).Methods("GET")
	router.HandleFunc("/userinfo", GET_userinfo).Methods("GET")

	// OAuth2 endpoints
	router.HandleFunc("/oauth2/authorize", GET_oauth2_authorize).Methods("GET")
	router.HandleFunc("/oauth2/authorize/submit", POST_oauth2_authorize_submit).Methods("POST")
	router.HandleFunc("/oauth2/token", POST_oauth2_token).Methods("POST")

	// Custom authentication endpoints
	router.HandleFunc("/login/init", POST_login_init).Methods("POST")
	router.HandleFunc("/login/complete", POST_login_complete).Methods("POST")
	router.HandleFunc("/login/refresh", POST_login_refresh).Methods("POST")

	// User profile endpoint
	router.HandleFunc("/me", GET_me).Methods("GET")

	loggedRouter := accessLogger(router)

	addr := ":" + strconv.Itoa(port)
	if err := http.ListenAndServe(addr, loggedRouter); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
