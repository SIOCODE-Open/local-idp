import { expect } from 'chai';
import { IdpClient, launchSnapshot, teardownSnapshot, waitAvailable } from "./utils/index.mjs";

describe('simple', () => {

    const client = new IdpClient('http://localhost:8080');
    let testAccessToken;
    let testUserId;

    before(async () => {
        await launchSnapshot('simple');
        await waitAvailable('http://localhost:8080');
    });

    after(async () => {
        await teardownSnapshot('simple');
    });

    describe('Health and Discovery', () => {

        it('GET /healthz should return OK', async () => {
            const health = await client.healthz();
            expect(health).to.have.property('status', 'OK');
        });

        it('GET /.well-known/jwks.json should return public keys', async () => {
            const jwks = await client.getJwks();
            expect(jwks).to.have.property('keys');
            expect(jwks.keys).to.be.an('array');
            expect(jwks.keys.length).to.be.greaterThan(0);
            const key = jwks.keys[0];
            expect(key).to.have.property('kid');
            expect(key).to.have.property('kty', 'RSA');
            expect(key).to.have.property('alg', 'RS256');
            expect(key).to.have.property('use', 'sig');
            expect(key).to.have.property('n');
            expect(key).to.have.property('e', 'AQAB');
        });

        it('GET /.well-known/openid-configuration should return OIDC config', async () => {
            const config = await client.getOpenIdConfiguration();
            expect(config).to.have.property('issuer', 'http://localhost:8080');
            expect(config).to.have.property('authorization_endpoint', 'http://localhost:8080/oauth2/authorize');
            expect(config).to.have.property('token_endpoint', 'http://localhost:8080/oauth2/token');
            expect(config).to.have.property('userinfo_endpoint', 'http://localhost:8080/userinfo');
            expect(config).to.have.property('jwks_uri', 'http://localhost:8080/.well-known/jwks.json');
            expect(config.response_types_supported).to.include('code');
            expect(config.subject_types_supported).to.include('public');
            expect(config.id_token_signing_alg_values_supported).to.include('RS256');
            expect(config.grant_types_supported).to.include('authorization_code');
        });
    });

    describe('OAuth2/OIDC Flow', () => {

        it('GET /oauth2/authorize should return login form', async () => {
            const html = await client.oauth2Authorize({
                client_id: 'client1',
                redirect_uri: 'http://localhost:3000/callback',
                response_type: 'code',
                scope: 'openid profile',
                state: 'test-state',
            });
            expect(html).to.be.a('string');
            expect(html).to.include('<form');
            expect(html).to.include('username');
            expect(html).to.include('password');
        });

        it('POST /oauth2/authorize/submit should redirect with code', async () => {
            const response = await client.oauth2AuthorizeSubmit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
                redirect_uri: 'http://localhost:3000/callback',
                scope: 'openid profile',
                state: 'test-state',
            });
            expect(response.status).to.equal(302);
            const location = response.headers.get('location');
            expect(location).to.include('http://localhost:3000/callback');
            expect(location).to.include('code=');
            expect(location).to.include('state=test-state');
        });

        it('POST /oauth2/authorize/submit should fail with invalid credentials', async () => {
            const response = await client.oauth2AuthorizeSubmit({
                username: 'user1',
                password: 'wrongpassword',
                client_id: 'client1',
                redirect_uri: 'http://localhost:3000/callback',
            });
            expect(response.status).to.equal(200);
            const html = await response.text();
            expect(html).to.include('Invalid username or password');
        });

        it('POST /oauth2/token should exchange code for tokens', async () => {
            // First get an authorization code
            const authResponse = await client.oauth2AuthorizeSubmit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
                redirect_uri: 'http://localhost:3000/callback',
                scope: 'openid profile email',
            });
            const location = authResponse.headers.get('location');
            const url = new URL(location);
            const code = url.searchParams.get('code');
            expect(code).to.be.a('string');

            // Exchange code for tokens
            const tokens = await client.oauth2Token({
                grant_type: 'authorization_code',
                code: code,
                client_id: 'client1',
                client_secret: 'super_secret',
                redirect_uri: 'http://localhost:3000/callback',
            });
            expect(tokens).to.have.property('access_token');
            expect(tokens).to.have.property('id_token');
            expect(tokens).to.have.property('token_type', 'Bearer');
            expect(tokens).to.have.property('expires_in');
        });

        it('POST /oauth2/token should fail with invalid code', async () => {
            try {
                await client.oauth2Token({
                    grant_type: 'authorization_code',
                    code: 'invalid-code',
                    client_id: 'client1',
                    client_secret: 'super_secret',
                    redirect_uri: 'http://localhost:3000/callback',
                });
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err.message).to.include('400');
            }
        });

        it('POST /oauth2/token should fail with invalid client secret', async () => {
            // First get an authorization code
            const authResponse = await client.oauth2AuthorizeSubmit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
                redirect_uri: 'http://localhost:3000/callback',
            });
            const location = authResponse.headers.get('location');
            const url = new URL(location);
            const code = url.searchParams.get('code');

            try {
                await client.oauth2Token({
                    grant_type: 'authorization_code',
                    code: code,
                    client_id: 'client1',
                    client_secret: 'wrong_secret',
                    redirect_uri: 'http://localhost:3000/callback',
                });
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err.message).to.include('40');
            }
        });

        it('GET /userinfo should return user information', async () => {
            // First get an access token
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
            expect(userinfo).to.have.property('role_name', 'admin');
        });

        it('GET /userinfo should fail with invalid token', async () => {
            try {
                await client.getUserinfo('invalid-token');
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err.message).to.include('401');
            }
        });
    });

    describe('OAuth2 Nonce Support', () => {

        it('Should include nonce in ID token when provided in authorization request', async () => {
            const testNonce = 'test-nonce-' + Date.now();
            
            const authResponse = await client.oauth2AuthorizeSubmit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
                redirect_uri: 'http://localhost:3000/callback',
                nonce: testNonce,
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

            // Decode ID token
            const parts = tokens.id_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            
            expect(payload).to.have.property('nonce', testNonce);
        });

        it('Should NOT include nonce in ID token when not provided', async () => {
            const authResponse = await client.oauth2AuthorizeSubmit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
                redirect_uri: 'http://localhost:3000/callback',
                // No nonce provided
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

            // Decode ID token
            const parts = tokens.id_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            
            expect(payload).to.not.have.property('nonce');
        });

        it('Should preserve nonce through the entire OAuth flow', async () => {
            const testNonce = 'unique-nonce-' + Math.random().toString(36).substring(7);
            
            // First, get the authorization form with nonce
            const formHtml = await client.oauth2Authorize({
                client_id: 'client1',
                redirect_uri: 'http://localhost:3000/callback',
                response_type: 'code',
                nonce: testNonce,
            });
            expect(formHtml).to.include(testNonce);
            
            // Submit the form (which should preserve nonce)
            const authResponse = await client.oauth2AuthorizeSubmit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
                redirect_uri: 'http://localhost:3000/callback',
                nonce: testNonce,
            });
            
            // Exchange code for tokens
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

            // Verify nonce in ID token
            const parts = tokens.id_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            expect(payload).to.have.property('nonce', testNonce);
        });

        it('Should handle different nonce values for different requests', async () => {
            const nonce1 = 'nonce-request-1';
            const nonce2 = 'nonce-request-2';
            
            // First request with nonce1
            const authResponse1 = await client.oauth2AuthorizeSubmit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
                redirect_uri: 'http://localhost:3000/callback',
                nonce: nonce1,
            });
            const location1 = authResponse1.headers.get('location');
            const url1 = new URL(location1);
            const code1 = url1.searchParams.get('code');
            const tokens1 = await client.oauth2Token({
                grant_type: 'authorization_code',
                code: code1,
                client_id: 'client1',
                client_secret: 'super_secret',
                redirect_uri: 'http://localhost:3000/callback',
            });

            // Second request with nonce2
            const authResponse2 = await client.oauth2AuthorizeSubmit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
                redirect_uri: 'http://localhost:3000/callback',
                nonce: nonce2,
            });
            const location2 = authResponse2.headers.get('location');
            const url2 = new URL(location2);
            const code2 = url2.searchParams.get('code');
            const tokens2 = await client.oauth2Token({
                grant_type: 'authorization_code',
                code: code2,
                client_id: 'client1',
                client_secret: 'super_secret',
                redirect_uri: 'http://localhost:3000/callback',
            });

            // Verify each token has the correct nonce
            const payload1 = JSON.parse(Buffer.from(tokens1.id_token.split('.')[1], 'base64url').toString());
            const payload2 = JSON.parse(Buffer.from(tokens2.id_token.split('.')[1], 'base64url').toString());
            
            expect(payload1).to.have.property('nonce', nonce1);
            expect(payload2).to.have.property('nonce', nonce2);
        });

        it('Should support long nonce values', async () => {
            const longNonce = 'a'.repeat(256); // 256 character nonce
            
            const authResponse = await client.oauth2AuthorizeSubmit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
                redirect_uri: 'http://localhost:3000/callback',
                nonce: longNonce,
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

            const parts = tokens.id_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            expect(payload).to.have.property('nonce', longNonce);
        });

        it('Should support nonce with special characters', async () => {
            const specialNonce = 'nonce-with-!@#$%^&*()_+=[]{}|;:,.<>?';
            
            const authResponse = await client.oauth2AuthorizeSubmit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
                redirect_uri: 'http://localhost:3000/callback',
                nonce: specialNonce,
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

            const parts = tokens.id_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            expect(payload).to.have.property('nonce', specialNonce);
        });

        it('Nonce should only appear in ID token, not access token', async () => {
            const testNonce = 'access-vs-id-token-test';
            
            const authResponse = await client.oauth2AuthorizeSubmit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
                redirect_uri: 'http://localhost:3000/callback',
                nonce: testNonce,
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

            // Check ID token has nonce
            const idParts = tokens.id_token.split('.');
            const idPayload = JSON.parse(Buffer.from(idParts[1], 'base64url').toString());
            expect(idPayload).to.have.property('nonce', testNonce);

            // Check access token does NOT have nonce
            const accessParts = tokens.access_token.split('.');
            const accessPayload = JSON.parse(Buffer.from(accessParts[1], 'base64url').toString());
            expect(accessPayload).to.not.have.property('nonce');
        });

        it('Should handle empty string nonce', async () => {
            const authResponse = await client.oauth2AuthorizeSubmit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
                redirect_uri: 'http://localhost:3000/callback',
                nonce: '',
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

            const parts = tokens.id_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            // Empty string should be treated as no nonce
            expect(payload).to.not.have.property('nonce');
        });
    });

    describe('Login API', () => {

        it('POST /login/init should start login challenge', async () => {
            const respInit = await client.loginInit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
            });
            expect(respInit).to.have.property('challenge_id');
            expect(respInit.challenge_id).to.be.a('string');
        });

        it('POST /login/init should fail with invalid credentials', async () => {
            try {
                await client.loginInit({
                    username: 'user1',
                    password: 'wrongpassword',
                    client_id: 'client1',
                });
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err.message).to.include('401');
            }
        });

        it('POST /login/init should fail with invalid client_id', async () => {
            try {
                await client.loginInit({
                    username: 'user1',
                    password: 'password1',
                    client_id: 'invalid-client',
                });
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err.message).to.match(/40[01]/);
            }
        });

        it('POST /login/complete should issue tokens', async () => {
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
            expect(respComplete).to.not.have.property('refresh_token');

            testAccessToken = respComplete.access_token;
        });

        it('POST /login/complete should fail with invalid challenge_id', async () => {
            try {
                await client.loginComplete({
                    challenge_id: 'invalid-challenge',
                    challenge_data: 'XXXXXX',
                });
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err.message).to.include('401');
            }
        });

        it('POST /login/init + complete should issue refresh token when requested', async () => {
            const respInit = await client.loginInit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
                issue_refresh_token: true,
            });
            const respComplete = await client.loginComplete({
                challenge_id: respInit.challenge_id,
                challenge_data: 'XXXXXX',
            });
            expect(respComplete).to.have.property('access_token');
            expect(respComplete).to.have.property('identity_token');
            expect(respComplete).to.have.property('refresh_token');
        });

        it('POST /login/refresh should refresh tokens', async () => {
            const respInit = await client.loginInit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
                issue_refresh_token: true,
            });
            const respComplete = await client.loginComplete({
                challenge_id: respInit.challenge_id,
                challenge_data: 'XXXXXX',
            });
            const refreshToken = respComplete.refresh_token;

            const refreshed = await client.loginRefresh({
                refresh_token: refreshToken,
            });
            expect(refreshed).to.have.property('access_token');
            expect(refreshed).to.have.property('identity_token');
            expect(refreshed).to.have.property('refresh_token');
            expect(refreshed.access_token).to.not.equal(respComplete.access_token);
            expect(refreshed.refresh_token).to.not.equal(refreshToken);
        });

        it('POST /login/refresh should fail with invalid refresh token', async () => {
            try {
                await client.loginRefresh({
                    refresh_token: 'invalid-token',
                });
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err.message).to.include('401');
            }
        });

        it('POST /login/refresh should fail with reused refresh token', async () => {
            const respInit = await client.loginInit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
                issue_refresh_token: true,
            });
            const respComplete = await client.loginComplete({
                challenge_id: respInit.challenge_id,
                challenge_data: 'XXXXXX',
            });
            const refreshToken = respComplete.refresh_token;

            // First refresh should work
            await client.loginRefresh({
                refresh_token: refreshToken,
            });

            // Second refresh with same token should fail
            try {
                await client.loginRefresh({
                    refresh_token: refreshToken,
                });
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err.message).to.include('401');
            }
        });
    });

    describe('User Profile', () => {

        it('GET /me should return current user profile', async () => {
            const userInfo = await client.getMe(testAccessToken);
            expect(userInfo).to.have.property('id', '1');
            expect(userInfo).to.have.property('username', 'user1');
            expect(userInfo).to.have.property('disabled', false);
            expect(userInfo).to.have.property('attributes');
            expect(userInfo.attributes).to.have.property('email', 'user1@example.com');
            expect(userInfo.attributes).to.have.property('role_name', 'admin');
            expect(userInfo).to.not.have.property('password');
        });

        it('GET /me should fail with invalid token', async () => {
            try {
                await client.getMe('invalid-token');
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err.message).to.include('401');
            }
        });
    });

    describe('User Management', () => {

        it('GET /users should return all users', async () => {
            const users = await client.getUsers();
            expect(users).to.be.an('array');
            expect(users.length).to.be.greaterThan(0);
            const user = users.find(u => u.username === 'user1');
            expect(user).to.exist;
            expect(user).to.have.property('id', '1');
            expect(user).to.have.property('username', 'user1');
            expect(user).to.have.property('disabled', false);
            expect(user).to.not.have.property('password');
        });

        it('GET /users/{id} should return specific user', async () => {
            const user = await client.getUserById('1');
            expect(user).to.have.property('id', '1');
            expect(user).to.have.property('username', 'user1');
            expect(user).to.have.property('disabled', false);
            expect(user).to.have.property('attributes');
            expect(user).to.not.have.property('password');
        });

        it('GET /users/{id} should fail for non-existent user', async () => {
            try {
                await client.getUserById('9999');
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err.message).to.include('404');
            }
        });

        it('PUT /users/{id} should create new user', async () => {
            const newUser = await client.putUser('test-user-123', {
                username: 'testuser',
                password: 'testpass',
                attributes: {
                    email: 'test@example.com',
                    name: 'Test User',
                },
            });
            expect(newUser).to.have.property('id', 'test-user-123');
            expect(newUser).to.have.property('username', 'testuser');
            expect(newUser).to.have.property('disabled', false);
            expect(newUser.attributes).to.have.property('email', 'test@example.com');

            testUserId = 'test-user-123';
        });

        it('PUT /users/{id} should update existing user', async () => {
            await client.putUser(testUserId, {
                username: 'testuser',
                password: 'testpass',
                attributes: {
                    email: 'test@example.com',
                },
            });

            const updatedUser = await client.putUser(testUserId, {
                attributes: {
                    email: 'newemail@example.com',
                },
            });
            expect(updatedUser).to.have.property('id', testUserId);
            expect(updatedUser.attributes).to.have.property('email', 'newemail@example.com');
        });

        it('POST /users/{id}/disable should disable user', async () => {
            await client.disableUser(testUserId);
            const user = await client.getUserById(testUserId);
            expect(user).to.have.property('disabled', true);
        });

        it('POST /users/{id}/disable should fail for non-existent user', async () => {
            try {
                await client.disableUser('9999');
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err.message).to.include('404');
            }
        });

        it('Disabled user should not be able to login', async () => {
            try {
                await client.loginInit({
                    username: 'testuser',
                    password: 'testpass',
                    client_id: 'client1',
                });
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err.message).to.include('401');
            }
        });

        it('POST /users/{id}/enable should enable user', async () => {
            await client.enableUser(testUserId);
            const user = await client.getUserById(testUserId);
            expect(user).to.have.property('disabled', false);
        });

        it('POST /users/{id}/enable should fail for non-existent user', async () => {
            try {
                await client.enableUser('9999');
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err.message).to.include('404');
            }
        });

        it('Enabled user should be able to login', async () => {
            const respInit = await client.loginInit({
                username: 'testuser',
                password: 'testpass',
                client_id: 'client1',
            });
            expect(respInit).to.have.property('challenge_id');
        });

        it('DELETE /users/{id} should delete user', async () => {
            const response = await client.deleteUser(testUserId);
            expect(response).to.have.property('message', 'User deleted');
        });

        it('DELETE /users/{id} should fail for non-existent user', async () => {
            try {
                await client.deleteUser('9999');
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err.message).to.include('404');
            }
        });

        it('Deleted user should not be found', async () => {
            try {
                await client.getUserById(testUserId);
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err.message).to.include('404');
            }
        });

        it('Deleted user should not be able to login', async () => {
            try {
                await client.loginInit({
                    username: 'testuser',
                    password: 'testpass',
                    client_id: 'client1',
                });
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err.message).to.include('401');
            }
        });
    });

    describe('Edge Cases and Validation', () => {

        it('OAuth2 flow should preserve scopes in tokens', async () => {
            const authResponse = await client.oauth2AuthorizeSubmit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
                redirect_uri: 'http://localhost:3000/callback',
                scope: 'openid profile email custom',
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

            // Decode JWT to check scopes (simple base64 decode)
            const parts = tokens.access_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            expect(payload).to.have.property('scope');
            expect(payload.scope).to.include('openid');
            expect(payload.scope).to.include('profile');
            expect(payload.scope).to.include('email');
            expect(payload.scope).to.include('custom');
        });

        it('Login API should preserve scopes in tokens', async () => {
            const respInit = await client.loginInit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
                scopes: 'openid profile email custom',
            });
            const respComplete = await client.loginComplete({
                challenge_id: respInit.challenge_id,
                challenge_data: 'XXXXXX',
            });

            const parts = respComplete.access_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            expect(payload).to.have.property('scope');
            expect(payload.scope).to.include('openid');
            expect(payload.scope).to.include('profile');
            expect(payload.scope).to.include('email');
            expect(payload.scope).to.include('custom');
        });

        it('Refresh token should preserve original scopes', async () => {
            const respInit = await client.loginInit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
                issue_refresh_token: true,
                scopes: 'openid profile email custom',
            });
            const respComplete = await client.loginComplete({
                challenge_id: respInit.challenge_id,
                challenge_data: 'XXXXXX',
            });
            const refreshed = await client.loginRefresh({
                refresh_token: respComplete.refresh_token,
            });

            const parts = refreshed.access_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            expect(payload).to.have.property('scope');
            expect(payload.scope).to.include('openid');
            expect(payload.scope).to.include('profile');
            expect(payload.scope).to.include('email');
            expect(payload.scope).to.include('custom');
        });

        it('Access token should have proper claims', async () => {
            const respInit = await client.loginInit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
            });
            const respComplete = await client.loginComplete({
                challenge_id: respInit.challenge_id,
                challenge_data: 'XXXXXX',
            });

            const parts = respComplete.access_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            expect(payload).to.have.property('iss', 'http://localhost:8080');
            expect(payload).to.have.property('sub', '1');
            expect(payload).to.have.property('aud', 'example.com');
            expect(payload).to.have.property('exp');
            expect(payload).to.have.property('iat');
            expect(payload).to.have.property('auth_time');
            expect(payload).to.have.property('token_use', 'access');
            expect(payload).to.have.property('client_id', 'client1');
            expect(payload).to.have.property('scope');
            expect(payload).to.have.property('jti');
        });

        it('ID token should have proper claims', async () => {
            const respInit = await client.loginInit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
            });
            const respComplete = await client.loginComplete({
                challenge_id: respInit.challenge_id,
                challenge_data: 'XXXXXX',
            });

            const parts = respComplete.identity_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            expect(payload).to.have.property('iss', 'http://localhost:8080');
            expect(payload).to.have.property('sub', '1');
            expect(payload).to.have.property('aud', 'example.com');
            expect(payload).to.have.property('exp');
            expect(payload).to.have.property('iat');
            expect(payload).to.have.property('auth_time');
            expect(payload).to.have.property('token_use', 'id');
            expect(payload).to.have.property('client_id', 'client1');
            expect(payload).to.have.property('email', 'user1@example.com');
            expect(payload).to.have.property('role_name', 'admin');
        });

        it('Token expiration times should be correct', async () => {
            const respInit = await client.loginInit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
            });
            const respComplete = await client.loginComplete({
                challenge_id: respInit.challenge_id,
                challenge_data: 'XXXXXX',
            });

            const parts = respComplete.access_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            
            const now = Math.floor(Date.now() / 1000);
            const expectedExpiration = 900; // 15 minutes as per config
            const actualExpiration = payload.exp - payload.iat;
            
            expect(actualExpiration).to.equal(expectedExpiration);
            expect(payload.iat).to.be.closeTo(now, 5); // Within 5 seconds
        });
    });
});