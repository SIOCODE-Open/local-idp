import { expect } from 'chai';
import { IdpClient, launchSnapshot, teardownSnapshot, waitAvailable } from "./utils/index.mjs";

describe('login-disabled', () => {

    const client = new IdpClient('http://localhost:8082');

    before(async () => {
        await launchSnapshot('login-disabled');
        await waitAvailable('http://localhost:8082');
    });

    after(async () => {
        await teardownSnapshot('login-disabled');
    });

    describe('Login API endpoints should be disabled', () => {

        it('POST /login/init should return 404', async () => {
            const response = await fetch('http://localhost:8082/login/init', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: 'user1',
                    password: 'password1',
                    client_id: 'client1',
                }),
            });
            expect(response.status).to.equal(404);
        });

        it('POST /login/complete should return 404', async () => {
            const response = await fetch('http://localhost:8082/login/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    challenge_id: 'fake-id',
                    challenge_data: 'XXXXXX',
                }),
            });
            expect(response.status).to.equal(404);
        });

        it('POST /login/refresh should return 404', async () => {
            const response = await fetch('http://localhost:8082/login/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refresh_token: 'fake-token',
                }),
            });
            expect(response.status).to.equal(404);
        });
    });

    describe('OAuth2/OIDC flow should still work', () => {

        it('GET /oauth2/authorize should return login form', async () => {
            const html = await client.oauth2Authorize({
                client_id: 'client1',
                redirect_uri: 'http://localhost:3000/callback',
                response_type: 'code',
            });
            expect(html).to.be.a('string');
            expect(html).to.include('<form');
        });

        it('Full OAuth2 flow should work', async () => {
            const authResponse = await client.oauth2AuthorizeSubmit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
                redirect_uri: 'http://localhost:3000/callback',
            });
            expect(authResponse.status).to.equal(302);
            
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
            expect(tokens).to.have.property('id_token');
        });

        it('GET /userinfo should work with valid token', async () => {
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
            
            const userinfo = await client.getUserinfo(tokens.access_token);
            expect(userinfo).to.have.property('sub', '1');
            expect(userinfo).to.have.property('email', 'user1@example.com');
        });
    });

    describe('Discovery and management endpoints should still work', () => {

        it('GET /healthz should work', async () => {
            const health = await client.healthz();
            expect(health).to.have.property('status', 'OK');
        });

        it('GET /.well-known/jwks.json should work', async () => {
            const jwks = await client.getJwks();
            expect(jwks).to.have.property('keys');
        });

        it('GET /users should work', async () => {
            const users = await client.getUsers();
            expect(users).to.be.an('array');
        });
    });
});
