package main

import (
	"os"
	"strconv"

	"github.com/goccy/go-yaml"
)

type Config struct {
	Port int `yaml:"port"`
}

var AppConfig *Config

func LoadConfig() *Config {
	defaultPort := 8080
	config := &Config{Port: defaultPort}

	configPath := os.Getenv("CONFIG_PATH")
	if configPath != "" {
		if data, err := os.ReadFile(configPath); err == nil {
			_ = yaml.Unmarshal(data, config)
		}
	}

	if portEnv := os.Getenv("PORT"); portEnv != "" {
		if p, err := strconv.Atoi(portEnv); err == nil {
			config.Port = p
		}
	}
	return config
}

func (c *Config) GetPort() int {
	return c.Port
}
