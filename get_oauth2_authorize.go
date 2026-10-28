package main

import (
	"html/template"
	"net/http"
)

const loginFormTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In – SIOCODE Local IdP</title>
    <style>
        :root {
            --color-sioblue: #002266;
            --color-sioblue-hover: #001a4d;
            --color-sioblue-active: #001338;
            --color-sioblue-subtle: rgba(0, 34, 102, 0.08);
            --color-bg: #f8fafc;
            --color-card: #ffffff;
            --color-text: #0f172a;
            --color-muted: #64748b;
            --color-border: #e2e8f0;
            --color-input-border: #cbd5e1;
        }
        * {
            box-sizing: border-box;
        }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: var(--color-bg);
            background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
            background-size: 20px 20px;
            color: var(--color-text);
            margin: 0;
            padding: 24px 16px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            -webkit-font-smoothing: antialiased;
        }
        .login-card {
            background-color: var(--color-card);
            max-width: 420px;
            width: 100%;
            border-radius: 12px;
            border: 1px solid var(--color-border);
            box-shadow: 0 10px 25px -5px rgba(0, 34, 102, 0.08), 0 8px 10px -6px rgba(0, 34, 102, 0.04);
            overflow: hidden;
        }
        .brand-header {
            background-color: var(--color-sioblue);
            background-image: radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px);
            background-size: 16px 16px;
            color: #ffffff;
            padding: 28px 32px 24px;
            text-align: center;
        }
        .brand-logo {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            height: 48px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.12);
            border: 1px solid rgba(255, 255, 255, 0.2);
            margin-bottom: 12px;
        }
        .brand-logo svg {
            width: 28px;
            height: 28px;
            color: #ffffff;
        }
        .brand-title {
            font-size: 20px;
            font-weight: 800;
            letter-spacing: 0.06em;
            margin: 0;
            line-height: 1.2;
        }
        .brand-subtitle {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.78);
            margin: 4px 0 0;
            font-weight: 400;
        }
        .card-body {
            padding: 28px 32px 24px;
        }
        .heading-row {
            margin-bottom: 20px;
        }
        h2 {
            margin: 0 0 4px;
            font-size: 20px;
            font-weight: 700;
            color: var(--color-text);
            letter-spacing: -0.01em;
        }
        .heading-desc {
            margin: 0;
            font-size: 13px;
            color: var(--color-muted);
        }
        .error {
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            color: #dc2626;
            padding: 10px 12px;
            border-radius: 8px;
            font-size: 14px;
            margin-bottom: 16px;
            font-weight: 500;
        }
        .form-group {
            margin-bottom: 16px;
        }
        label {
            display: block;
            margin-bottom: 6px;
            color: #0f172a;
            font-weight: 500;
            font-size: 14px;
        }
        input[type="text"],
        input[type="password"] {
            width: 100%;
            box-sizing: border-box;
            padding: 10px 12px;
            border: 1px solid var(--color-input-border);
            border-radius: 8px;
            font-size: 14px;
            color: var(--color-text);
            background-color: #ffffff;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        input[type="text"]::placeholder,
        input[type="password"]::placeholder {
            color: #94a3b8;
        }
        input[type="text"]:focus,
        input[type="password"]:focus {
            outline: none;
            border-color: var(--color-sioblue);
            box-shadow: 0 0 0 3px rgba(0, 34, 102, 0.15);
        }
        button {
            width: 100%;
            background-color: var(--color-sioblue);
            color: #ffffff;
            font-weight: 600;
            font-size: 14px;
            padding: 11px 20px;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            margin-top: 4px;
            transition: background-color 0.15s ease, transform 0.05s ease;
        }
        button:hover {
            background-color: var(--color-sioblue-hover);
        }
        button:active {
            background-color: var(--color-sioblue-active);
        }
        .card-footer {
            padding: 14px 32px 18px;
            border-top: 1px solid var(--color-border);
            background-color: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            flex-wrap: wrap;
        }
        .client-badge {
            display: inline-flex;
            align-items: center;
            background-color: var(--color-sioblue-subtle);
            color: var(--color-sioblue);
            font-size: 12px;
            font-weight: 600;
            padding: 3px 8px;
            border-radius: 6px;
            max-width: 220px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .footer-caption {
            font-size: 12px;
            color: var(--color-muted);
        }
    </style>
</head>
<body>
    <div class="login-card">
        <div class="brand-header">
            <div class="brand-logo" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="M8 12.5c1.5-2 3-2 4.5 0s3 2 4.5 0"/>
                </svg>
            </div>
            <h1 class="brand-title">SIOCODE</h1>
            <p class="brand-subtitle">Local Identity Provider</p>
        </div>
        <div class="card-body">
            <div class="heading-row">
                <h2>Sign In</h2>
                <p class="heading-desc">Enter your credentials to authorize access</p>
            </div>
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
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" placeholder="Enter your username" autocomplete="username" required autofocus>
                </div>

                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" placeholder="Enter your password" autocomplete="current-password" required>
                </div>

                {{if .ShowChallenge}}
                <div class="form-group">
                    <label for="challenge">Challenge (enter anything)</label>
                    <input type="text" id="challenge" name="challenge" placeholder="Enter challenge response" required>
                </div>
                {{end}}

                <button type="submit">Sign In</button>
            </form>
        </div>
        <div class="card-footer">
            <span class="client-badge" title="Client ID: {{.ClientID}}">Client: {{.ClientID}}</span>
            <span class="footer-caption">SIOCODE Local IdP</span>
        </div>
    </div>
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
