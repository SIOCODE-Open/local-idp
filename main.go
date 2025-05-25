package main

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

type AppServerContext struct {
	// Extend with shared resources as needed
}

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC)
	AppConfig = LoadConfig()
	port := AppConfig.GetPort()

	log.Printf("Starting server on port %d", port)

	appCtx := &AppServerContext{}

	router := mux.NewRouter()
	router.HandleFunc("/healthz", GET_healthz(appCtx)).Methods("GET")
	loggedRouter := accessLogger(router)

	addr := ":" + strconv.Itoa(port)
	if err := http.ListenAndServe(addr, loggedRouter); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
