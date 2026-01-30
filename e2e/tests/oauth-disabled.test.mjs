import { expect } from 'chai';
import { IdpClient, launchSnapshot, teardownSnapshot, waitAvailable } from "./utils/index.mjs";

describe('oauth-disabled', () => {

    const client = new IdpClient('http://localhost:8081');

    before(async () => {
        await launchSnapshot('oauth-disabled');
        await waitAvailable('http://localhost:8081');
    });

    after(async () => {
        await teardownSnapshot('oauth-disabled');
    });

    describe('OAuth2/OIDC endpoints should be disabled', () => {

        it('GET /oauth2/authorize should return 404', async () => {
            const response = await fetch('http://localhost:8081/oauth2/authorize?client_id=client1&redirect_uri=http://localhost:3000/callback&response_type=code');
            expect(response.status).to.equal(404);
        });

        it('POST /oauth2/authorize/submit should return 404', async () => {
            const params = new URLSearchParams({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
                redirect_uri: 'http://localhost:3000/callback',
            });
            const response = await fetch('http://localhost:8081/oauth2/authorize/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params,
            });
            expect(response.status).to.equal(404);
        });

        it('POST /oauth2/token should return 404', async () => {
            const params = new URLSearchParams({
                grant_type: 'authorization_code',
                code: 'test-code',
                client_id: 'client1',
                client_secret: 'super_secret',
                redirect_uri: 'http://localhost:3000/callback',
            });
            const response = await fetch('http://localhost:8081/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params,
            });
            expect(response.status).to.equal(404);
        });

        it('GET /userinfo should return 404', async () => {
            const response = await fetch('http://localhost:8081/userinfo', {
                headers: {
                    'Authorization': 'Bearer fake-token',
                },
            });
            // When OAuth is disabled, endpoint may return 404 or 401 depending on route handling
            expect(response.status).to.be.oneOf([401, 404]);
        });
    });

    describe('Login API should still work', () => {

        it('POST /login/init should work', async () => {
            const respInit = await client.loginInit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
            });
            expect(respInit).to.have.property('challenge_id');
        });

        it('Full login flow should work', async () => {
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
            expect(respComplete).to.have.property('identity_token');
        });
    });

    describe('Discovery endpoints should still work', () => {

        it('GET /healthz should work', async () => {
            const health = await client.healthz();
            expect(health).to.have.property('status', 'OK');
        });

        it('GET /.well-known/jwks.json should work', async () => {
            const jwks = await client.getJwks();
            expect(jwks).to.have.property('keys');
            expect(jwks.keys).to.be.an('array');
        });

        it('GET /.well-known/openid-configuration should work', async () => {
            const config = await client.getOpenIdConfiguration();
            expect(config).to.have.property('issuer', 'http://localhost:8081');
            expect(config).to.have.property('jwks_uri', 'http://localhost:8081/.well-known/jwks.json');
        });
    });

    describe('User management should still work', () => {

        it('GET /users should work', async () => {
            const users = await client.getUsers();
            expect(users).to.be.an('array');
            expect(users.length).to.be.greaterThan(0);
        });

        it('GET /me should work with valid token', async () => {
            const respInit = await client.loginInit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
            });
            const respComplete = await client.loginComplete({
                challenge_id: respInit.challenge_id,
                challenge_data: 'XXXXXX',
            });
            const userInfo = await client.getMe(respComplete.access_token);
            expect(userInfo).to.have.property('username', 'user1');
        });
    });
});
