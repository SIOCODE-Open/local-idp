package main

import (
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

	return config
}
