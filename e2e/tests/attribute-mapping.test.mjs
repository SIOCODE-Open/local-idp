import { expect } from 'chai';
import { IdpClient, launchSnapshot, teardownSnapshot, waitAvailable } from "./utils/index.mjs";

describe('attribute-mapping', () => {

    const client = new IdpClient('http://localhost:8086');

    before(async () => {
        await launchSnapshot('attribute-mapping');
        await waitAvailable('http://localhost:8086');
    });

    after(async () => {
        await teardownSnapshot('attribute-mapping');
    });

    describe('Access token claim mapping', () => {

        it('Should map configured attributes to access token claims', async () => {
            const respInit = await client.loginInit({
                username: 'admin',
                password: 'admin123',
                client_id: 'client1',
            });
            const respComplete = await client.loginComplete({
                challenge_id: respInit.challenge_id,
                challenge_data: 'XXXXXX',
            });

            const parts = respComplete.access_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

            // Mapped claims should be present
            expect(payload).to.have.property('roles', 'administrator');
            expect(payload).to.have.property('email', 'admin@example.com');
            expect(payload).to.have.property('dept', 'IT');
            expect(payload).to.have.property('level', 'high');

            // Non-mapped attributes should NOT be present
            expect(payload).to.not.have.property('full_name');
            expect(payload).to.not.have.property('avatar_url');
            expect(payload).to.not.have.property('internal_id');
            expect(payload).to.not.have.property('secret_key');
            expect(payload).to.not.have.property('department');
            expect(payload).to.not.have.property('access_level');
            expect(payload).to.not.have.property('role_name');

            // Standard claims should be present
            expect(payload).to.have.property('sub', '1');
            expect(payload).to.have.property('iss');
            expect(payload).to.have.property('aud');
            expect(payload).to.have.property('exp');
            expect(payload).to.have.property('iat');
            expect(payload).to.have.property('token_use', 'access');
        });

        it('Should map developer attributes to access token', async () => {
            const respInit = await client.loginInit({
                username: 'developer',
                password: 'dev123',
                client_id: 'client1',
            });
            const respComplete = await client.loginComplete({
                challenge_id: respInit.challenge_id,
                challenge_data: 'XXXXXX',
            });

            const parts = respComplete.access_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

            expect(payload).to.have.property('roles', 'developer');
            expect(payload).to.have.property('email', 'dev@example.com');
            expect(payload).to.have.property('dept', 'Engineering');
            expect(payload).to.have.property('level', 'medium');

            // Non-mapped attribute should NOT be present
            expect(payload).to.not.have.property('team');
            expect(payload).to.not.have.property('full_name');
        });

        it('Should omit claims when user attributes are missing', async () => {
            const respInit = await client.loginInit({
                username: 'guest',
                password: 'guest123',
                client_id: 'client1',
            });
            const respComplete = await client.loginComplete({
                challenge_id: respInit.challenge_id,
                challenge_data: 'XXXXXX',
            });

            const parts = respComplete.access_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

            // Only mapped attributes that exist should be present
            expect(payload).to.have.property('email', 'guest@example.com');

            // Claims for missing attributes should NOT be present
            expect(payload).to.not.have.property('roles');
            expect(payload).to.not.have.property('dept');
            expect(payload).to.not.have.property('level');

            // Standard claims should still be present
            expect(payload).to.have.property('sub', '3');
            expect(payload).to.have.property('token_use', 'access');
        });

        it('OAuth2 access token should have same claim mapping', async () => {
            const authResponse = await client.oauth2AuthorizeSubmit({
                username: 'admin',
                password: 'admin123',
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

            const parts = tokens.access_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

            expect(payload).to.have.property('roles', 'administrator');
            expect(payload).to.have.property('email', 'admin@example.com');
            expect(payload).to.have.property('dept', 'IT');
            expect(payload).to.have.property('level', 'high');
            expect(payload).to.not.have.property('internal_id');
        });
    });

    describe('Identity token claim mapping', () => {

        it('Should map configured attributes to identity token claims', async () => {
            const respInit = await client.loginInit({
                username: 'admin',
                password: 'admin123',
                client_id: 'client1',
            });
            const respComplete = await client.loginComplete({
                challenge_id: respInit.challenge_id,
                challenge_data: 'XXXXXX',
            });

            const parts = respComplete.identity_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

            // Mapped claims should be present
            expect(payload).to.have.property('email', 'admin@example.com');
            expect(payload).to.have.property('name', 'Admin User');
            expect(payload).to.have.property('roles', 'administrator');
            expect(payload).to.have.property('picture', 'https://example.com/admin.jpg');

            // Non-mapped attributes should NOT be present
            expect(payload).to.not.have.property('department');
            expect(payload).to.not.have.property('access_level');
            expect(payload).to.not.have.property('internal_id');
            expect(payload).to.not.have.property('secret_key');
            expect(payload).to.not.have.property('full_name');
            expect(payload).to.not.have.property('avatar_url');
            expect(payload).to.not.have.property('role_name');

            // Standard claims should be present
            expect(payload).to.have.property('sub', '1');
            expect(payload).to.have.property('iss');
            expect(payload).to.have.property('aud');
            expect(payload).to.have.property('token_use', 'id');
        });

        it('Should map developer attributes to identity token', async () => {
            const respInit = await client.loginInit({
                username: 'developer',
                password: 'dev123',
                client_id: 'client1',
            });
            const respComplete = await client.loginComplete({
                challenge_id: respInit.challenge_id,
                challenge_data: 'XXXXXX',
            });

            const parts = respComplete.identity_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

            expect(payload).to.have.property('email', 'dev@example.com');
            expect(payload).to.have.property('name', 'Dev User');
            expect(payload).to.have.property('roles', 'developer');
            expect(payload).to.have.property('picture', 'https://example.com/dev.jpg');

            // Non-mapped attributes should NOT be present
            expect(payload).to.not.have.property('team');
            expect(payload).to.not.have.property('department');
        });

        it('Should omit claims when user attributes are missing', async () => {
            const respInit = await client.loginInit({
                username: 'guest',
                password: 'guest123',
                client_id: 'client1',
            });
            const respComplete = await client.loginComplete({
                challenge_id: respInit.challenge_id,
                challenge_data: 'XXXXXX',
            });

            const parts = respComplete.identity_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

            // Only mapped attributes that exist should be present
            expect(payload).to.have.property('email', 'guest@example.com');
            expect(payload).to.have.property('name', 'Guest User');

            // Claims for missing attributes should NOT be present
            expect(payload).to.not.have.property('roles');
            expect(payload).to.not.have.property('picture');
        });

        it('OAuth2 ID token should have same claim mapping', async () => {
            const authResponse = await client.oauth2AuthorizeSubmit({
                username: 'developer',
                password: 'dev123',
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

            const parts = tokens.id_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

            expect(payload).to.have.property('email', 'dev@example.com');
            expect(payload).to.have.property('name', 'Dev User');
            expect(payload).to.have.property('roles', 'developer');
            expect(payload).to.have.property('picture', 'https://example.com/dev.jpg');
            expect(payload).to.not.have.property('team');
        });
    });

    describe('UserInfo endpoint with mapped claims', () => {

        it('GET /userinfo should return mapped attributes', async () => {
            const authResponse = await client.oauth2AuthorizeSubmit({
                username: 'admin',
                password: 'admin123',
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

            // /userinfo returns ALL user attributes (not affected by mapping)
            expect(userinfo).to.have.property('sub', '1');
            expect(userinfo).to.have.property('email', 'admin@example.com');
            expect(userinfo).to.have.property('role_name', 'administrator');
            expect(userinfo).to.have.property('full_name', 'Admin User');
            expect(userinfo).to.have.property('department', 'IT');
            expect(userinfo).to.have.property('access_level', 'high');
            expect(userinfo).to.have.property('avatar_url', 'https://example.com/admin.jpg');
            expect(userinfo).to.have.property('internal_id', 'EMP001');
            expect(userinfo).to.have.property('secret_key', 'secret123');
        });

        it('GET /userinfo should handle missing attributes gracefully', async () => {
            const authResponse = await client.oauth2AuthorizeSubmit({
                username: 'guest',
                password: 'guest123',
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

            // /userinfo returns all available user attributes
            expect(userinfo).to.have.property('sub', '3');
            expect(userinfo).to.have.property('email', 'guest@example.com');
            expect(userinfo).to.have.property('full_name', 'Guest User');
            // These attributes don't exist for guest user
            expect(userinfo).to.not.have.property('role_name');
            expect(userinfo).to.not.have.property('department');
        });
    });

    describe('ME endpoint with mapped claims', () => {

        it('GET /me should return all user attributes (not affected by mapping)', async () => {
            const respInit = await client.loginInit({
                username: 'admin',
                password: 'admin123',
                client_id: 'client1',
            });
            const respComplete = await client.loginComplete({
                challenge_id: respInit.challenge_id,
                challenge_data: 'XXXXXX',
            });

            const userInfo = await client.getMe(respComplete.access_token);

            // /me should return all attributes, not just mapped ones
            expect(userInfo).to.have.property('id', '1');
            expect(userInfo).to.have.property('username', 'admin');
            expect(userInfo.attributes).to.have.property('role_name', 'administrator');
            expect(userInfo.attributes).to.have.property('email', 'admin@example.com');
            expect(userInfo.attributes).to.have.property('full_name', 'Admin User');
            expect(userInfo.attributes).to.have.property('department', 'IT');
            expect(userInfo.attributes).to.have.property('access_level', 'high');
            expect(userInfo.attributes).to.have.property('avatar_url', 'https://example.com/admin.jpg');
            expect(userInfo.attributes).to.have.property('internal_id', 'EMP001');
            expect(userInfo.attributes).to.have.property('secret_key', 'secret123');
        });
    });

    describe('Claim mapping with refresh tokens', () => {

        it('Refreshed tokens should maintain the same claim mapping', async () => {
            const respInit = await client.loginInit({
                username: 'developer',
                password: 'dev123',
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

            // Access token should have mapped claims
            const accessParts = refreshed.access_token.split('.');
            const accessPayload = JSON.parse(Buffer.from(accessParts[1], 'base64url').toString());
            expect(accessPayload).to.have.property('roles', 'developer');
            expect(accessPayload).to.have.property('email', 'dev@example.com');
            expect(accessPayload).to.have.property('dept', 'Engineering');
            expect(accessPayload).to.not.have.property('team');

            // Identity token should have mapped claims
            const idParts = refreshed.identity_token.split('.');
            const idPayload = JSON.parse(Buffer.from(idParts[1], 'base64url').toString());
            expect(idPayload).to.have.property('email', 'dev@example.com');
            expect(idPayload).to.have.property('name', 'Dev User');
            expect(idPayload).to.have.property('roles', 'developer');
            expect(idPayload).to.not.have.property('department');
        });
    });

    describe('Different mappings for access and identity tokens', () => {

        it('Access and identity tokens should have different claim sets', async () => {
            const respInit = await client.loginInit({
                username: 'admin',
                password: 'admin123',
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

            // Access token has dept and level
            expect(accessPayload).to.have.property('dept', 'IT');
            expect(accessPayload).to.have.property('level', 'high');
            // But not name and picture
            expect(accessPayload).to.not.have.property('name');
            expect(accessPayload).to.not.have.property('picture');

            // Identity token has name and picture
            expect(idPayload).to.have.property('name', 'Admin User');
            expect(idPayload).to.have.property('picture', 'https://example.com/admin.jpg');
            // But not dept and level
            expect(idPayload).to.not.have.property('dept');
            expect(idPayload).to.not.have.property('level');

            // Both should have email and roles (mapped in both)
            expect(accessPayload).to.have.property('email', 'admin@example.com');
            expect(accessPayload).to.have.property('roles', 'administrator');
            expect(idPayload).to.have.property('email', 'admin@example.com');
            expect(idPayload).to.have.property('roles', 'administrator');
        });
    });

    describe('User management with attribute mapping', () => {

        it('Creating user should work and new attributes should be mapped in tokens', async () => {
            const newUser = await client.putUser('test-mapping', {
                username: 'testmapping',
                password: 'testpass',
                attributes: {
                    role_name: 'tester',
                    email: 'tester@example.com',
                    full_name: 'Test Mapper',
                    department: 'QA',
                    access_level: 'low',
                    avatar_url: 'https://example.com/tester.jpg',
                    notes: 'This is a test user',
                },
            });
            expect(newUser.attributes).to.have.property('role_name', 'tester');

            // Login and check tokens
            const respInit = await client.loginInit({
                username: 'testmapping',
                password: 'testpass',
                client_id: 'client1',
            });
            const respComplete = await client.loginComplete({
                challenge_id: respInit.challenge_id,
                challenge_data: 'XXXXXX',
            });

            const accessParts = respComplete.access_token.split('.');
            const accessPayload = JSON.parse(Buffer.from(accessParts[1], 'base64url').toString());
            expect(accessPayload).to.have.property('roles', 'tester');
            expect(accessPayload).to.have.property('email', 'tester@example.com');
            expect(accessPayload).to.have.property('dept', 'QA');
            expect(accessPayload).to.not.have.property('notes');

            const idParts = respComplete.identity_token.split('.');
            const idPayload = JSON.parse(Buffer.from(idParts[1], 'base64url').toString());
            expect(idPayload).to.have.property('name', 'Test Mapper');
            expect(idPayload).to.have.property('picture', 'https://example.com/tester.jpg');

            // Cleanup
            await client.deleteUser('test-mapping');
        });

        it('Updating user attributes should be reflected in new tokens', async () => {
            const currentUser = await client.getUserById('3');
            
            await client.putUser('3', {
                attributes: {
                    ...currentUser.attributes,
                    role_name: 'premium_guest',
                    avatar_url: 'https://example.com/premium.jpg',
                },
            });

            const respInit = await client.loginInit({
                username: 'guest',
                password: 'guest123',
                client_id: 'client1',
            });
            const respComplete = await client.loginComplete({
                challenge_id: respInit.challenge_id,
                challenge_data: 'XXXXXX',
            });

            const accessParts = respComplete.access_token.split('.');
            const accessPayload = JSON.parse(Buffer.from(accessParts[1], 'base64url').toString());
            expect(accessPayload).to.have.property('roles', 'premium_guest');

            const idParts = respComplete.identity_token.split('.');
            const idPayload = JSON.parse(Buffer.from(idParts[1], 'base64url').toString());
            expect(idPayload).to.have.property('roles', 'premium_guest');
            expect(idPayload).to.have.property('picture', 'https://example.com/premium.jpg');
        });
    });
});
