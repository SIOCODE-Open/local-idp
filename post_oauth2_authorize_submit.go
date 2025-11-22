package main

import (
	"html/template"
	"net/http"
	"time"

	"github.com/google/uuid"
)

func POST_oauth2_authorize_submit(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid form data", http.StatusBadRequest)
		return
	}

	// Get form data
	username := r.Form.Get("username")
	password := r.Form.Get("password")
	clientID := r.Form.Get("client_id")
	redirectURI := r.Form.Get("redirect_uri")
	scope := r.Form.Get("scope")
	state := r.Form.Get("state")
	nonce := r.Form.Get("nonce")
	challenge := r.Form.Get("challenge")

	// Validate challenge if required
	if *AppConfig.OAuth2.RequireChallengeOnLogin && challenge == "" {
		// Re-render form with error
		tmpl, err := template.New("login").Parse(loginFormTemplate)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		data := loginFormData{
			Error:         "Challenge is required",
			ClientID:      clientID,
			RedirectURI:   redirectURI,
			Scope:         scope,
			State:         state,
			Nonce:         nonce,
			ShowChallenge: *AppConfig.OAuth2.RequireChallengeOnLogin,
		}

		w.Header().Set("Content-Type", "text/html")
		if err := tmpl.Execute(w, data); err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
		}
		return
	}

	// Validate client_id and redirect_uri
	var foundClient *IdpClient
	for i, client := range AppContext.Clients {
		if client.Id == clientID && client.RedirectUri == redirectURI {
			foundClient = &AppContext.Clients[i]
			break
		}
	}

	if foundClient == nil {
		http.Error(w, "Invalid client_id or redirect_uri", http.StatusBadRequest)
		return
	}

	// Find and validate user
	var foundUser *IdpUser
	for i, user := range AppContext.Users {
		if user.Username == username && user.Password == password {
			foundUser = &AppContext.Users[i]
			break
		}
	}

	if foundUser == nil || foundUser.Disabled {
		// Re-render form with error
		tmpl, err := template.New("login").Parse(loginFormTemplate)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		data := loginFormData{
			Error:         "Invalid username or password",
			ClientID:      clientID,
			RedirectURI:   redirectURI,
			Scope:         scope,
			State:         state,
			Nonce:         nonce,
			ShowChallenge: *AppConfig.OAuth2.RequireChallengeOnLogin,
		}

		w.Header().Set("Content-Type", "text/html")
		if err := tmpl.Execute(w, data); err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
		}
		return
	}

	// Generate authorization code
	code := uuid.NewString()

	// Store pending authorization
	AppContext.OauthPendingAuthCodes[code] = OauthPendingAuthorization{
		Code:        code,
		UserId:      foundUser.Id,
		ClientId:    clientID,
		RedirectUri: redirectURI,
		Nonce:       nonce,
		Scopes:      scope,
		ExpiresAt:   time.Now().Add(10 * time.Minute), // 10 minute expiry
	}

	// Redirect to client with code
	redirectURL := redirectURI + "?code=" + code
	if state != "" {
		redirectURL += "&state=" + state
	}

	http.Redirect(w, r, redirectURL, http.StatusFound)
}
