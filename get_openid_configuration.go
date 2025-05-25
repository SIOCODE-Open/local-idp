package main

import (
	"encoding/json"
	"net/http"
)

type OpenIDConfiguration struct {
	Issuer                           string   `json:"issuer"`
	AuthorizationEndpoint            string   `json:"authorization_endpoint"`
	TokenEndpoint                    string   `json:"token_endpoint"`
	UserinfoEndpoint                 string   `json:"userinfo_endpoint"`
	JwksURI                          string   `json:"jwks_uri"`
	ResponseTypesSupported           []string `json:"response_types_supported"`
	SubjectTypesSupported            []string `json:"subject_types_supported"`
	IDTokenSigningAlgValuesSupported []string `json:"id_token_signing_alg_values_supported"`
	GrantTypesSupported              []string `json:"grant_types_supported"`
}

func GET_openid_configuration(w http.ResponseWriter, r *http.Request) {
	config := OpenIDConfiguration{
		Issuer:                           AppConfig.Issuer,
		AuthorizationEndpoint:            AppConfig.BaseUrl + "/oauth2/authorize",
		TokenEndpoint:                    AppConfig.BaseUrl + "/oauth2/token",
		UserinfoEndpoint:                 AppConfig.BaseUrl + "/userinfo",
		JwksURI:                          AppConfig.BaseUrl + "/.well-known/jwks.json",
		ResponseTypesSupported:           []string{"code"},
		SubjectTypesSupported:            []string{"public"},
		IDTokenSigningAlgValuesSupported: []string{"RS256"},
		GrantTypesSupported:              []string{"authorization_code"},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(config)
}
