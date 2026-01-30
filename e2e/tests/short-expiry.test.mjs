import { expect } from 'chai';
import { IdpClient, launchSnapshot, teardownSnapshot, waitAvailable } from "./utils/index.mjs";

describe('short-expiry', () => {

    const client = new IdpClient('http://localhost:8085');

    before(async () => {
        await launchSnapshot('short-expiry');
        await waitAvailable('http://localhost:8085');
    });

    after(async () => {
        await teardownSnapshot('short-expiry');
    });

    describe('Access token expiration', () => {

        it('Access token should work immediately after issuance', async () => {
            const respInit = await client.loginInit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
            });
            const respComplete = await client.loginComplete({
                challenge_id: respInit.challenge_id,
                challenge_data: 'XXXXXX',
            });
            
            // Should work immediately
            const userInfo = await client.getMe(respComplete.access_token);
            expect(userInfo).to.have.property('username', 'user1');
        });

        it('Access token should expire after 1 second', async () => {
            const respInit = await client.loginInit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
            });
            const respComplete = await client.loginComplete({
                challenge_id: respInit.challenge_id,
                challenge_data: 'XXXXXX',
            });
            
            // Wait for token to expire (1 second + buffer)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Should fail with 401
            try {
                await client.getMe(respComplete.access_token);
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err.message).to.include('401');
            }
        });

        it('Access token expiration time should be 1 second', async () => {
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
            
            const expiration = payload.exp - payload.iat;
            expect(expiration).to.equal(1);
        });

        it('OAuth2 access token should also expire after 1 second', async () => {
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

            // Verify expiration
            const parts = tokens.access_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            expect(payload.exp - payload.iat).to.equal(1);

            // Wait and verify it expires
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            try {
                await client.getUserinfo(tokens.access_token);
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err.message).to.include('401');
            }
        });
    });

    describe('Refresh token expiration', () => {

        it('Refresh token should work immediately after issuance', async () => {
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
            
            // Should work immediately
            const refreshed = await client.loginRefresh({
                refresh_token: respComplete.refresh_token,
            });
            expect(refreshed).to.have.property('access_token');
        });

        it('Refresh token should expire after 2 seconds', async () => {
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
            
            // Wait for refresh token to expire (2 seconds + buffer)
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Should fail with 401
            try {
                await client.loginRefresh({
                    refresh_token: respComplete.refresh_token,
                });
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err.message).to.include('401');
            }
        });

        it('Refreshed access token should also have 1 second expiry', async () => {
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
            
            const refreshed = await client.loginRefresh({
                refresh_token: respComplete.refresh_token,
            });

            const parts = refreshed.access_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            expect(payload.exp - payload.iat).to.equal(1);

            // Verify it works immediately
            const userInfo = await client.getMe(refreshed.access_token);
            expect(userInfo).to.have.property('username', 'user1');

            // Wait and verify it expires
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            try {
                await client.getMe(refreshed.access_token);
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err.message).to.include('401');
            }
        });
    });

    describe('Token lifecycle with short expiry', () => {

        it('Should be able to use refresh token multiple times before it expires', async () => {
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
            
            // First refresh (within 2 seconds)
            const refreshed1 = await client.loginRefresh({
                refresh_token: respComplete.refresh_token,
            });
            expect(refreshed1).to.have.property('access_token');
            expect(refreshed1).to.have.property('refresh_token');

            // Second refresh (still within 2 seconds from original)
            const refreshed2 = await client.loginRefresh({
                refresh_token: refreshed1.refresh_token,
            });
            expect(refreshed2).to.have.property('access_token');
            expect(refreshed2).to.have.property('refresh_token');
        });

        it('ID token should also have same expiration as access token', async () => {
            const respInit = await client.loginInit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
            });
            const respComplete = await client.loginComplete({
                challenge_id: respInit.challenge_id,
                challenge_data: 'XXXXXX',
            });

            const accessParts = respComplete.access_token.split('.');
            const accessPayload = JSON.parse(Buffer.from(accessParts[1], 'base64url').toString());

            const idParts = respComplete.identity_token.split('.');
            const idPayload = JSON.parse(Buffer.from(idParts[1], 'base64url').toString());

            expect(accessPayload.exp - accessPayload.iat).to.equal(1);
            expect(idPayload.exp - idPayload.iat).to.equal(1);
            expect(accessPayload.exp).to.equal(idPayload.exp);
        });
    });

    describe('Edge cases with expiration', () => {

        it('Challenge should still work even after waiting', async () => {
            const respInit = await client.loginInit({
                username: 'user1',
                password: 'password1',
                client_id: 'client1',
            });
            
            // Wait before completing (challenge itself shouldn't expire immediately)
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const respComplete = await client.loginComplete({
                challenge_id: respInit.challenge_id,
                challenge_data: 'XXXXXX',
            });
            expect(respComplete).to.have.property('access_token');
        });

        it('User operations should not be affected by token expiry config', async () => {
            const users = await client.getUsers();
            expect(users).to.be.an('array');
            
            const user = await client.getUserById('1');
            expect(user).to.have.property('username', 'user1');
        });
    });
});
