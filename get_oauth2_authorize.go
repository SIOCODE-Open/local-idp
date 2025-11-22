package main

import (
	"html/template"
	"net/http"
)

const loginFormTemplate = `
<!DOCTYPE html>
<html>
<head>
    <title>Login</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .error { color: red; margin-bottom: 10px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; }
        input[type="text"], input[type="password"] { width: 100%; padding: 8px; }
        button { padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer; }
    </style>
</head>
<body>
    <h2>Login</h2>
    {{if .Error}}
    <div class="error">{{.Error}}</div>
    {{end}}
    <form method="POST" action="/oauth2/authorize/submit">
        <input type="hidden" name="client_id" value="{{.ClientID}}">
        <input type="hidden" name="redirect_uri" value="{{.RedirectURI}}">
        <input type="hidden" name="scope" value="{{.Scope}}">
        <input type="hidden" name="state" value="{{.State}}">
        <input type="hidden" name="nonce" value="{{.Nonce}}">
        
        <div class="form-group">
            <label for="username">Username:</label>
            <input type="text" id="username" name="username" required>
        </div>
        
        <div class="form-group">
            <label for="password">Password:</label>
            <input type="password" id="password" name="password" required>
        </div>
        
        {{if .ShowChallenge}}
        <div class="form-group">
            <label for="challenge">Challenge (enter anything):</label>
            <input type="text" id="challenge" name="challenge" required>
        </div>
        {{end}}
        
        <button type="submit">Login</button>
    </form>
</body>
</html>
`

type loginFormData struct {
	Error         string
	ClientID      string
	RedirectURI   string
	Scope         string
	State         string
	Nonce         string
	ShowChallenge bool
}

func GET_oauth2_authorize(w http.ResponseWriter, r *http.Request) {
	// Get and validate required parameters
	clientID := r.URL.Query().Get("client_id")
	redirectURI := r.URL.Query().Get("redirect_uri")
	responseType := r.URL.Query().Get("response_type")
	scope := r.URL.Query().Get("scope")
	state := r.URL.Query().Get("state")
	nonce := r.URL.Query().Get("nonce")

	// Validate response_type
	if responseType != "code" {
		http.Error(w, "response_type must be 'code'", http.StatusBadRequest)
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

	// Use default scopes if not provided
	if scope == "" {
		scope = AppConfig.OAuth2.DefaultScopes
	}

	// Parse and render the template
	tmpl, err := template.New("login").Parse(loginFormTemplate)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	data := loginFormData{
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
		return
	}
}
