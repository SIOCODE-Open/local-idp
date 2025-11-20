package main

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/goccy/go-yaml"
)

var AppConfig *IdpConfig

func LoadConfig() *IdpConfig {
	config := new(IdpConfig)

	configPath := os.Getenv("CONFIG_PATH")

	if configPath == "" {
		configPath = "/config.yaml"
	}

	if data, err := os.ReadFile(configPath); err == nil {
		_ = yaml.Unmarshal(data, config)
	} else {
		log.Printf("Error reading config file: %v", err)
	}

	if portEnv := os.Getenv("PORT"); portEnv != "" {
		if p, err := strconv.Atoi(portEnv); err == nil {
			config.Port = p
		}
	}

	if config.Port == 0 {
		// default port
		config.Port = 8080
	}

	// Set default base URL if not provided
	if config.BaseUrl == "" {
		config.BaseUrl = fmt.Sprintf("http://localhost:%d", config.Port)
	}

	// Set default issuer if not provided
	if config.Issuer == "" {
		config.Issuer = fmt.Sprintf("http://localhost:%d", config.Port)
	}

	// Set default access token expiration if not provided (15 minutes)
	if config.AccessTokenExpirationSeconds == 0 {
		config.AccessTokenExpirationSeconds = 900
	}

	// Set default refresh token expiration if not provided (1 day)
	if config.RefreshTokenExpirationSeconds == 0 {
		config.RefreshTokenExpirationSeconds = 86400
	}

	return config
}
