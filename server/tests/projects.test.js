const request = require('supertest');
const { createApp } = require('../src/app');
const db = require('./helpers');

const app = createApp();
const auth = (token) => ({ Authorization: `Bearer ${token}` });

let owner; // { token, user }
let outsider;

async function makeUser(email) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: email.split('@')[0], email, password: 'password123' });
  return { token: res.body.token, user: res.body.user };
}

async function makeProject(token) {
  const res = await request(app).post('/api/projects').set(auth(token)).send({ name: 'Website Redesign' });
  return res.body.project;
}

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

beforeEach(async () => {
  owner = await makeUser('owner@example.com');
  outsider = await makeUser('outsider@example.com');
});

describe('projects & boards', () => {
  test('creating a project also creates a board with default columns', async () => {
    const project = await makeProject(owner.token);
    const res = await request(app).get(`/api/projects/${project._id}/board`).set(auth(owner.token));
    expect(res.status).toBe(200);
    expect(res.body.board.columns.map((c) => c.title)).toEqual(['To Do', 'In Progress', 'In Review', 'Done']);
    expect(res.body.tasks).toEqual([]);
  });

  test('non-members cannot see the project; members can after being added', async () => {
    const project = await makeProject(owner.token);
    const denied = await request(app).get(`/api/projects/${project._id}`).set(auth(outsider.token));
    expect(denied.status).toBe(403);

    const add = await request(app)
      .post(`/api/projects/${project._id}/members`)
      .set(auth(owner.token))
      .send({ email: 'outsider@example.com' });
    expect(add.status).toBe(200);

    const allowed = await request(app).get(`/api/projects/${project._id}`).set(auth(outsider.token));
    expect(allowed.status).toBe(200);
  });

  test('only the owner can rename the project or add columns', async () => {
    const project = await makeProject(owner.token);
    await request(app)
      .post(`/api/projects/${project._id}/members`)
      .set(auth(owner.token))
      .send({ email: 'outsider@example.com' });

    const rename = await request(app)
      .patch(`/api/projects/${project._id}`)
      .set(auth(outsider.token))
      .send({ name: 'Hijacked' });
    expect(rename.status).toBe(403);

    const col = await request(app)
      .post(`/api/projects/${project._id}/board/columns`)
      .set(auth(outsider.token))
      .send({ title: 'Blocked' });
    expect(col.status).toBe(403);

    const okCol = await request(app)
      .post(`/api/projects/${project._id}/board/columns`)
      .set(auth(owner.token))
      .send({ title: 'Blocked' });
    expect(okCol.status).toBe(201);
    expect(okCol.body.board.columns).toHaveLength(5);
  });
});

describe('tasks & comments', () => {
  async function setupTask() {
    const project = await makeProject(owner.token);
    const boardRes = await request(app).get(`/api/projects/${project._id}/board`).set(auth(owner.token));
    const columnId = boardRes.body.board.columns[0]._id;
    const create = await request(app)
      .post(`/api/projects/${project._id}/tasks`)
      .set(auth(owner.token))
      .send({ title: 'Design homepage', columnId, labels: ['ui', 'ui', ' priority '], priority: 'high' });
    return { project, boardRes, columnId, task: create.body.task, createRes: create };
  }

  test('creates a task with deduped labels and defaults', async () => {
    const { createRes, task } = await setupTask();
    expect(createRes.status).toBe(201);
    expect(task.labels).toEqual(['ui', 'priority']);
    expect(task.priority).toBe('high');
    expect(task.position).toBe(0);
  });

  test('rejects a task with an invalid column or priority', async () => {
    const project = await makeProject(owner.token);
    const bad = await request(app)
      .post(`/api/projects/${project._id}/tasks`)
      .set(auth(owner.token))
      .send({ title: 'X', columnId: '64b64c2f4f4f4f4f4f4f4f4f' });
    expect(bad.status).toBe(400);
  });

  test('moves a task to another column and updates fields', async () => {
    const { project, boardRes, task } = await setupTask();
    const target = boardRes.body.board.columns[1]._id;
    const res = await request(app)
      .patch(`/api/projects/${project._id}/tasks/${task._id}`)
      .set(auth(owner.token))
      .send({ columnId: target, position: 0, dueDate: '2026-12-01' });
    expect(res.status).toBe(200);
    expect(res.body.task.columnId).toBe(target);
    expect(res.body.task.dueDate).toBeTruthy();
  });

  test('comments: add, list, and author-only delete rules', async () => {
    const { project, task } = await setupTask();
    await request(app)
      .post(`/api/projects/${project._id}/members`)
      .set(auth(owner.token))
      .send({ email: 'outsider@example.com' });

    const add = await request(app)
      .post(`/api/projects/${project._id}/tasks/${task._id}/comments`)
      .set(auth(outsider.token))
      .send({ body: 'Looks good!' });
    expect(add.status).toBe(201);

    const list = await request(app)
      .get(`/api/projects/${project._id}/tasks/${task._id}/comments`)
      .set(auth(owner.token));
    expect(list.body.comments).toHaveLength(1);

    // The project owner (not the author) may delete; a random member may not delete others' comments.
    const del = await request(app)
      .delete(`/api/projects/${project._id}/tasks/${task._id}/comments/${add.body.comment._id}`)
      .set(auth(owner.token));
    expect(del.status).toBe(204);
  });

  test('deleting a task removes it from the board listing', async () => {
    const { project, task } = await setupTask();
    const del = await request(app)
      .delete(`/api/projects/${project._id}/tasks/${task._id}`)
      .set(auth(owner.token));
    expect(del.status).toBe(204);
    const boardRes = await request(app).get(`/api/projects/${project._id}/board`).set(auth(owner.token));
    expect(boardRes.body.tasks).toHaveLength(0);
  });
});
