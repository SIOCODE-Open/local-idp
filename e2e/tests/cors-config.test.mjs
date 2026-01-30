import { expect } from 'chai';
import { IdpClient, launchSnapshot, teardownSnapshot, waitAvailable } from "./utils/index.mjs";

describe('cors-config', () => {

    const client = new IdpClient('http://localhost:8083');

    before(async () => {
        await launchSnapshot('cors-config');
        await waitAvailable('http://localhost:8083');
    });

    after(async () => {
        await teardownSnapshot('cors-config');
    });

    describe('CORS headers should be properly configured', () => {

        it('Should allow requests from http://localhost:3000', async () => {
            const response = await fetch('http://localhost:8083/healthz', {
                headers: {
                    'Origin': 'http://localhost:3000',
                },
            });
            expect(response.status).to.equal(200);
            const corsHeader = response.headers.get('Access-Control-Allow-Origin');
            expect(corsHeader).to.include('http://localhost:3000');
        });

        it('Should allow requests from http://example.com', async () => {
            const response = await fetch('http://localhost:8083/healthz', {
                headers: {
                    'Origin': 'http://example.com',
                },
            });
            expect(response.status).to.equal(200);
            const corsHeader = response.headers.get('Access-Control-Allow-Origin');
            expect(corsHeader).to.include('http://example.com');
        });

        it('Should reject requests from unauthorized origin', async () => {
            const response = await fetch('http://localhost:8083/healthz', {
                headers: {
                    'Origin': 'http://unauthorized.com',
                },
            });
            expect(response.status).to.equal(200);
            const corsHeader = response.headers.get('Access-Control-Allow-Origin');
            // Should not specifically authorize the unauthorized origin
            expect(corsHeader).to.not.equal('http://unauthorized.com');
            // Returns configured origins list
            expect(corsHeader).to.include('http://localhost:3000');
            expect(corsHeader).to.include('http://example.com');
        });

        it('Should handle preflight requests from allowed origin', async () => {
            const response = await fetch('http://localhost:8083/login/init', {
                method: 'OPTIONS',
                headers: {
                    'Origin': 'http://localhost:3000',
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'Content-Type',
                },
            });
            expect(response.status).to.equal(204);
            expect(response.headers.get('Access-Control-Allow-Origin')).to.include('http://localhost:3000');
            expect(response.headers.get('Access-Control-Allow-Methods')).to.include('POST');
            expect(response.headers.get('Access-Control-Allow-Headers')).to.include('Content-Type');
        });

        it('Should handle preflight requests from unauthorized origin', async () => {
            const response = await fetch('http://localhost:8083/login/init', {
                method: 'OPTIONS',
                headers: {
                    'Origin': 'http://unauthorized.com',
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'Content-Type',
                },
            });
            // Should still respond to OPTIONS but without allowing the origin
            expect(response.status).to.equal(204);
            const corsHeader = response.headers.get('Access-Control-Allow-Origin');
            expect(corsHeader).to.not.equal('http://unauthorized.com');
        });
    });

    describe('CORS should work on all endpoints', () => {

        it('POST /login/init should have CORS headers', async () => {
            const response = await fetch('http://localhost:8083/login/init', {
                method: 'POST',
                headers: {
                    'Origin': 'http://localhost:3000',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: 'user1',
                    password: 'password1',
                    client_id: 'client1',
                }),
            });
            expect(response.status).to.equal(200);
            expect(response.headers.get('Access-Control-Allow-Origin')).to.include('http://localhost:3000');
            expect(response.headers.get('Access-Control-Allow-Credentials')).to.equal('true');
        });

        it('GET /users should have CORS headers', async () => {
            const response = await fetch('http://localhost:8083/users', {
                headers: {
                    'Origin': 'http://example.com',
                },
            });
            expect(response.status).to.equal(200);
            expect(response.headers.get('Access-Control-Allow-Origin')).to.include('http://example.com');
        });

        it('GET /.well-known/jwks.json should have CORS headers', async () => {
            const response = await fetch('http://localhost:8083/.well-known/jwks.json', {
                headers: {
                    'Origin': 'http://localhost:3000',
                },
            });
            expect(response.status).to.equal(200);
            expect(response.headers.get('Access-Control-Allow-Origin')).to.include('http://localhost:3000');
        });

        it('POST /oauth2/token should have CORS headers', async () => {
            // First get a code
            const authResponse = await client.oauth2AuthorizeSubmit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
                redirect_uri: 'http://localhost:3000/callback',
            });
            const location = authResponse.headers.get('location');
            const url = new URL(location);
            const code = url.searchParams.get('code');

            const params = new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                client_id: 'client1',
                client_secret: 'super_secret',
                redirect_uri: 'http://localhost:3000/callback',
            });
            
            const response = await fetch('http://localhost:8083/oauth2/token', {
                method: 'POST',
                headers: {
                    'Origin': 'http://localhost:3000',
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params,
            });
            expect(response.status).to.equal(200);
            expect(response.headers.get('Access-Control-Allow-Origin')).to.include('http://localhost:3000');
        });
    });

    describe('Basic functionality should still work', () => {

        it('Should complete login flow', async () => {
            const respInit = await client.loginInit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
            });
            const respComplete = await client.loginComplete({
                challenge_id: respInit.challenge_id,
                challenge_data: 'XXXXXX',
            });
            expect(respComplete).to.have.property('access_token');
        });

        it('Should complete OAuth2 flow', async () => {
            const authResponse = await client.oauth2AuthorizeSubmit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
                redirect_uri: 'http://localhost:3000/callback',
            });
            const location = authResponse.headers.get('location');
            const url = new URL(location);
            const code = url.searchParams.get('code');
            const tokens = await client.oauth2Token({
                grant_type: 'authorization_code',
                code: code,
                client_id: 'client1',
                client_secret: 'super_secret',
                redirect_uri: 'http://localhost:3000/callback',
            });
            expect(tokens).to.have.property('access_token');
        });
    });
});
