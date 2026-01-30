import { expect } from 'chai';
import { IdpClient, launchSnapshot, teardownSnapshot, waitAvailable } from "./utils/index.mjs";

describe('custom-roles', () => {

    const client = new IdpClient('http://localhost:8084');

    before(async () => {
        await launchSnapshot('custom-roles');
        await waitAvailable('http://localhost:8084');
    });

    after(async () => {
        await teardownSnapshot('custom-roles');
    });

    describe('Custom attributes should be preserved', () => {

        it('Administrator should have correct attributes', async () => {
            const user = await client.getUserById('1');
            expect(user).to.have.property('username', 'admin');
            expect(user.attributes).to.have.property('role_name', 'administrator');
            expect(user.attributes).to.have.property('email', 'admin@example.com');
            expect(user.attributes).to.have.property('department', 'IT');
            expect(user.attributes).to.have.property('level', 'senior');
        });

        it('Regular user should have correct attributes', async () => {
            const user = await client.getUserById('2');
            expect(user).to.have.property('username', 'user');
            expect(user.attributes).to.have.property('role_name', 'user');
            expect(user.attributes).to.have.property('email', 'user@example.com');
            expect(user.attributes).to.have.property('department', 'Sales');
            expect(user.attributes).to.have.property('level', 'junior');
        });

        it('Guest should have minimal attributes', async () => {
            const user = await client.getUserById('3');
            expect(user).to.have.property('username', 'guest');
            expect(user.attributes).to.have.property('role_name', 'guest');
            expect(user.attributes).to.have.property('email', 'guest@example.com');
            expect(user.attributes).to.not.have.property('department');
            expect(user.attributes).to.not.have.property('level');
        });
    });

    describe('Custom attributes in tokens', () => {

        it('ID token should contain custom attributes for admin', async () => {
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
            expect(payload).to.have.property('role_name', 'administrator');
            expect(payload).to.have.property('email', 'admin@example.com');
            expect(payload).to.have.property('department', 'IT');
            expect(payload).to.have.property('level', 'senior');
        });

        it('ID token should contain custom attributes for user', async () => {
            const respInit = await client.loginInit({
                username: 'user',
                password: 'user123',
                client_id: 'client1',
            });
            const respComplete = await client.loginComplete({
                challenge_id: respInit.challenge_id,
                challenge_data: 'XXXXXX',
            });

            const parts = respComplete.identity_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            expect(payload).to.have.property('role_name', 'user');
            expect(payload).to.have.property('email', 'user@example.com');
            expect(payload).to.have.property('department', 'Sales');
            expect(payload).to.have.property('level', 'junior');
        });

        it('OAuth2 ID token should contain custom attributes', async () => {
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

            const parts = tokens.id_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            expect(payload).to.have.property('role_name', 'administrator');
            expect(payload).to.have.property('department', 'IT');
        });
    });

    describe('Custom attributes via /me endpoint', () => {

        it('/me should return all custom attributes for admin', async () => {
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
            expect(userInfo).to.have.property('username', 'admin');
            expect(userInfo.attributes).to.have.property('role_name', 'administrator');
            expect(userInfo.attributes).to.have.property('email', 'admin@example.com');
            expect(userInfo.attributes).to.have.property('department', 'IT');
            expect(userInfo.attributes).to.have.property('level', 'senior');
        });

        it('/userinfo should return all custom attributes', async () => {
            const authResponse = await client.oauth2AuthorizeSubmit({
                username: 'user',
                password: 'user123',
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
            expect(userinfo).to.have.property('role_name', 'user');
            expect(userinfo).to.have.property('email', 'user@example.com');
            expect(userinfo).to.have.property('department', 'Sales');
            expect(userinfo).to.have.property('level', 'junior');
        });
    });

    describe('Updating custom attributes', () => {

        it('Should update role_name and other attributes', async () => {
            const updatedUser = await client.putUser('3', {
                attributes: {
                    role_name: 'premium_guest',
                    email: 'premium.guest@example.com',
                    department: 'Marketing',
                    vip: 'true',
                },
            });
            expect(updatedUser.attributes).to.have.property('role_name', 'premium_guest');
            expect(updatedUser.attributes).to.have.property('email', 'premium.guest@example.com');
            expect(updatedUser.attributes).to.have.property('department', 'Marketing');
            expect(updatedUser.attributes).to.have.property('vip', 'true');
        });

        it('Updated attributes should appear in new tokens', async () => {
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
            expect(payload).to.have.property('role_name', 'premium_guest');
            expect(payload).to.have.property('department', 'Marketing');
            expect(payload).to.have.property('vip', 'true');
        });

        it('Should partially update attributes without affecting others', async () => {
            // First get current user to preserve existing attributes
            const currentUser = await client.getUserById('2');
            
            await client.putUser('2', {
                attributes: {
                    ...currentUser.attributes,
                    level: 'senior',
                },
            });

            const user = await client.getUserById('2');
            expect(user.attributes).to.have.property('role_name', 'user');
            expect(user.attributes).to.have.property('email', 'user@example.com');
            expect(user.attributes).to.have.property('department', 'Sales');
            expect(user.attributes).to.have.property('level', 'senior');
        });

        it('Should create new user with custom attributes', async () => {
            const newUser = await client.putUser('test-user-custom', {
                username: 'customuser',
                password: 'custompass',
                attributes: {
                    role_name: 'custom_role',
                    email: 'custom@example.com',
                    team: 'Engineering',
                    clearance: 'level-3',
                },
            });
            expect(newUser.attributes).to.have.property('role_name', 'custom_role');
            expect(newUser.attributes).to.have.property('team', 'Engineering');
            expect(newUser.attributes).to.have.property('clearance', 'level-3');

            // Cleanup
            await client.deleteUser('test-user-custom');
        });
    });

    describe('All users should have distinct roles', () => {

        it('GET /users should return all users with their roles', async () => {
            const users = await client.getUsers();
            expect(users).to.be.an('array');
            expect(users.length).to.be.greaterThan(2);
            
            const admin = users.find(u => u.username === 'admin');
            expect(admin).to.exist;
            expect(admin.attributes).to.have.property('role_name', 'administrator');
            
            const user = users.find(u => u.username === 'user');
            expect(user).to.exist;
            expect(user.attributes).to.have.property('role_name', 'user');
            expect(user.attributes).to.have.property('level', 'senior');
            
            const guest = users.find(u => u.username === 'guest');
            expect(guest).to.exist;
            expect(guest.attributes).to.have.property('role_name', 'premium_guest');
        });
    });
});
