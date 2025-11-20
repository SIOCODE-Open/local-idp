This repository contains local-idp, an OIDC Identity Provider for local testing.

It is written in Go.

API.md MUST always contain all endpoints, fully documented, and MUST be linked from README.md. When changes are made to the API, API.md MUST be updated accordingly.

CONFIG.md MUST always contain all configuration options, fully documented, and MUST be linked from README.md. When changes are made to the configuration, CONFIG.md MUST be updated accordingly.

The local-idp.config.yaml file contains configuration options for local-idp. This is parsed by config.go.

Each .go file should go to the root of the repository.

General agent workflow:

- Understand the task, and gather context. Look through relevant existing files to learn about the codebase.
- Plan your modifications, and create a comprehensive TODO list.
- Go through the TODO list step-by-step.
- Reflect on the TODO list, see that:
    - You DID NOT make any unrelated changes.
    - You DID NOT leave any TODO comments.
    - You DID NOT leave any debugging code, or unnecessary logging.
    - You ADDRESSED ALL TODOS.
- Run `go build` and iterate on fixes until it builds without errors.
- Run `go fmt` to format the code before finalizing.
