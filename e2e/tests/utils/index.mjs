import path from 'path';
import fs from 'fs';
import cp from 'child_process';
import { z } from 'zod';

export async function waitAvailable(baseUrl, timeoutMs = 120000, intervalMs = 1000) {
    const startTime = Date.now();
    while (true) {
        try {
            const response = await fetch(`${baseUrl}/healthz`);
            if (response.ok) {
                return;
            }
        } catch (err) {
            // Ignore errors and retry
        }
        if (Date.now() - startTime > timeoutMs) {
            throw new Error(`Service at ${baseUrl} did not become available within ${timeoutMs} ms`);
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
}

export async function launchSnapshot (snapshotName) {
    const snapshotsDir = path.resolve(process.cwd(), 'snapshots', snapshotName);
    if (!fs.existsSync(snapshotsDir)) {
        throw new Error(`Snapshot directory does not exist: ${snapshotsDir}`);
    }

    const snapshotDockerCompose = path.join(snapshotsDir, 'docker-compose.yaml');
    if (!fs.existsSync(snapshotDockerCompose)) {
        throw new Error(`docker-compose.yaml not found in snapshot directory: ${snapshotDockerCompose}`);
    }

    return new Promise((resolve, reject) => {
        try {
            const dockerComposeProcess = cp.spawn('docker', ['compose', '-f', snapshotDockerCompose, 'up', '-d', '--build'], {
                cwd: snapshotsDir,
            });
            dockerComposeProcess.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`docker-compose process exited with code ${code}`));
                }
            });
        } catch (err) {
            reject(err);
        }
    });
}

export async function teardownSnapshot (snapshotName) {
    const snapshotsDir = path.resolve(process.cwd(), 'snapshots', snapshotName);
    const snapshotDockerCompose = path.join(snapshotsDir, 'docker-compose.yaml');

    return new Promise((resolve, reject) => {
        try {
            const dockerComposeProcess = cp.spawn('docker', ['compose', '-f', snapshotDockerCompose, 'down', '-v'], {
                cwd: snapshotsDir,
            });
            dockerComposeProcess.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`docker-compose process exited with code ${code}`));
                }
            });
        } catch (err) {
            reject(err);
        }
    });
}

/** Simple client for testing */

// Request schemas
const Z_LoginInitRequest = z.object({
    username: z.string(),
    password: z.string(),
    client_id: z.string(),
    issue_refresh_token: z.boolean().optional(),
    scopes: z.string().optional().default('openid profile email'),
});

const Z_LoginCompleteRequest = z.object({
    challenge_id: z.string(),
    challenge_data: z.string().optional(),
});

const Z_LoginRefreshRequest = z.object({
    refresh_token: z.string(),
});

const Z_PutUserRequest = z.object({
    username: z.string().optional(),
    password: z.string().optional(),
    attributes: z.record(z.any(), z.any()).optional(),
});

export class IdpClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    // Health and Discovery
    async healthz() {
        const response = await fetch(`${this.baseUrl}/healthz`);
        if (!response.ok) {
            throw new Error(`Health check failed with status ${response.status}`);
        }
        return await response.json();
    }

    async getJwks() {
        const response = await fetch(`${this.baseUrl}/.well-known/jwks.json`);
        if (!response.ok) {
            throw new Error(`JWKS fetch failed with status ${response.status}`);
        }
        return await response.json();
    }

    async getOpenIdConfiguration() {
        const response = await fetch(`${this.baseUrl}/.well-known/openid-configuration`);
        if (!response.ok) {
            throw new Error(`OpenID configuration fetch failed with status ${response.status}`);
        }
        return await response.json();
    }

    // OAuth2 / OpenID Connect Flow
    async oauth2Authorize(params) {
        const queryParams = new URLSearchParams(params);
        const response = await fetch(`${this.baseUrl}/oauth2/authorize?${queryParams}`);
        if (!response.ok) {
            throw new Error(`OAuth2 authorize failed with status ${response.status}`);
        }
        return await response.text();
    }

    async oauth2AuthorizeSubmit(formData) {
        const params = new URLSearchParams(formData);
        const response = await fetch(`${this.baseUrl}/oauth2/authorize/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params,
            redirect: 'manual',
        });
        return response;
    }

    async oauth2Token(formData) {
        const params = new URLSearchParams(formData);
        const response = await fetch(`${this.baseUrl}/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params,
        });
        if (!response.ok) {
            throw new Error(`OAuth2 token exchange failed with status ${response.status}`);
        }
        return await response.json();
    }

    async getUserinfo(accessToken) {
        const response = await fetch(`${this.baseUrl}/userinfo`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });
        if (!response.ok) {
            throw new Error(`Userinfo fetch failed with status ${response.status}`);
        }
        return await response.json();
    }

    // Login API
    async loginInit(
        /** @type {z.infer<typeof Z_LoginInitRequest>} */
        params
    ) {
        const parsedParams = Z_LoginInitRequest.parse(params);
        const response = await fetch(`${this.baseUrl}/login/init`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(parsedParams),
        });
        if (!response.ok) {
            throw new Error(`Login init failed with status ${response.status}`);
        }
        return await response.json();
    }

    async loginComplete(
        /** @type {z.infer<typeof Z_LoginCompleteRequest>} */
        params
    ) {
        const parsedParams = Z_LoginCompleteRequest.parse(params);
        const response = await fetch(`${this.baseUrl}/login/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(parsedParams),
        });
        if (!response.ok) {
            throw new Error(`Login complete failed with status ${response.status}`);
        }
        return await response.json();
    }

    async loginRefresh(
        /** @type {z.infer<typeof Z_LoginRefreshRequest>} */
        params
    ) {
        const parsedParams = Z_LoginRefreshRequest.parse(params);
        const response = await fetch(`${this.baseUrl}/login/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(parsedParams),
        });
        if (!response.ok) {
            throw new Error(`Login refresh failed with status ${response.status}`);
        }
        return await response.json();
    }

    // User Profile
    async getMe(accessToken) {
        const response = await fetch(`${this.baseUrl}/me`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });
        if (!response.ok) {
            throw new Error(`Get me failed with status ${response.status}`);
        }
        return await response.json();
    }

    // User Management
    async getUsers() {
        const response = await fetch(`${this.baseUrl}/users`);
        if (!response.ok) {
            throw new Error(`Get users failed with status ${response.status}`);
        }
        return await response.json();
    }

    async getUserById(userId) {
        const response = await fetch(`${this.baseUrl}/users/${userId}`);
        if (!response.ok) {
            throw new Error(`Get user failed with status ${response.status}`);
        }
        return await response.json();
    }

    async putUser(
        userId,
        /** @type {z.infer<typeof Z_PutUserRequest>} */
        params
    ) {
        const parsedParams = Z_PutUserRequest.parse(params);
        const response = await fetch(`${this.baseUrl}/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(parsedParams),
        });
        if (!response.ok) {
            throw new Error(`Put user failed with status ${response.status}`);
        }
        return await response.json();
    }

    async disableUser(userId) {
        const response = await fetch(`${this.baseUrl}/users/${userId}/disable`, {
            method: 'POST',
        });
        if (!response.ok) {
            throw new Error(`Disable user failed with status ${response.status}`);
        }
    }

    async enableUser(userId) {
        const response = await fetch(`${this.baseUrl}/users/${userId}/enable`, {
            method: 'POST',
        });
        if (!response.ok) {
            throw new Error(`Enable user failed with status ${response.status}`);
        }
    }

    async deleteUser(userId) {
        const response = await fetch(`${this.baseUrl}/users/${userId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error(`Delete user failed with status ${response.status}`);
        }
        return await response.json();
    }
}
