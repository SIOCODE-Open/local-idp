package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/goccy/go-yaml"
)

var AppConfig *IdpConfig
var ConfigPathFlag string

func init() {
	flag.StringVar(&ConfigPathFlag, "config-path", "", "Path to configuration file")
	flag.StringVar(&ConfigPathFlag, "c", "", "Path to configuration file (shorthand)")
}

func LoadConfig() *IdpConfig {
	config := new(IdpConfig)

	configPath := ConfigPathFlag
	if configPath == "" {
		configPath = os.Getenv("CONFIG_PATH")
	}

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

	// Set default allowed origins if not provided
	if config.AllowedOrigins == "" {
		config.AllowedOrigins = "*"
	}

	// Set default OAuth2 configuration
	if config.OAuth2.Enabled == nil {
		trueVal := true
		config.OAuth2.Enabled = &trueVal
	}
	if config.OAuth2.RequireChallengeOnLogin == nil {
		falseVal := false
		config.OAuth2.RequireChallengeOnLogin = &falseVal
	}
	if config.OAuth2.DefaultScopes == "" {
		config.OAuth2.DefaultScopes = "openid profile"
	}

	// Set default LoginApi configuration
	if config.LoginApi.Enabled == nil {
		trueVal := true
		config.LoginApi.Enabled = &trueVal
	}
	if config.LoginApi.DefaultScopes == "" {
		config.LoginApi.DefaultScopes = "openid profile"
	}

	return config
}
