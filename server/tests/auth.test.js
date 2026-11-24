const request = require('supertest');
const { createApp } = require('../src/app');
const db = require('./helpers');

const app = createApp();

async function registerUser(overrides = {}) {
  const body = {
    name: 'Test User',
    email: `user-${Math.random().toString(36).slice(2)}@example.com`,
    password: 'password123',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(body);
  return { res, body };
}

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

describe('auth', () => {
  test('registers a user and returns a token; first user is admin', async () => {
    const { res } = await registerUser({ name: 'Ada Admin' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('admin');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test('second registered user defaults to member', async () => {
    await registerUser();
    const { res } = await registerUser();
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('member');
  });

  test('rejects duplicate email and short password', async () => {
    const { body } = await registerUser();
    const dup = await request(app).post('/api/auth/register').send(body);
    expect(dup.status).toBe(409);
    const short = await request(app)
      .post('/api/auth/register')
      .send({ name: 'X', email: 'x@example.com', password: 'short' });
    expect(short.status).toBe(400);
  });

  test('login works with correct credentials and fails with wrong ones', async () => {
    const { body } = await registerUser();
    const ok = await request(app).post('/api/auth/login').send({ email: body.email, password: body.password });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
    const bad = await request(app).post('/api/auth/login').send({ email: body.email, password: 'wrong-pass' });
    expect(bad.status).toBe(401);
  });

  test('/me requires a token and returns the current user', async () => {
    const anon = await request(app).get('/api/auth/me');
    expect(anon.status).toBe(401);
    const { res } = await registerUser();
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${res.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(res.body.user.email);
  });
});

describe('role-based access', () => {
  test('only admins can list users', async () => {
    const admin = await registerUser();
    const member = await registerUser();
    const asMember = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${member.res.body.token}`);
    expect(asMember.status).toBe(403);
    const asAdmin = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${admin.res.body.token}`);
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body.users.length).toBe(2);
  });
});
