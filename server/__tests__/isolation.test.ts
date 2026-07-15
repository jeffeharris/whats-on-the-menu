import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createTenant, type TestTenant } from './helpers/tenant.js';

const app = createApp();

// A menu group that satisfies menuGroupSchema.
const menuGroup = {
  id: 'g1',
  label: 'Main',
  foodIds: [],
  selectionPreset: 'pick-1' as const,
  order: 0,
};

// A shared-menu group that satisfies sharedMenuGroupSchema.
const sharedGroup = {
  id: 'sg1',
  label: 'Dinner',
  options: [{ id: 'o1', text: 'Pizza', imageUrl: null, order: 0 }],
  selectionPreset: 'pick-1',
  order: 0,
};

describe('Cross-household tenant isolation', () => {
  let alice: TestTenant;
  let bob: TestTenant;

  beforeAll(async () => {
    // Note: beforeEach in setup truncates, so tenants are created per-test below.
  });

  // Re-create tenants for every test since setup.ts truncates between tests.
  async function seedTwoTenants() {
    alice = await createTenant('Alice');
    bob = await createTenant('Bob');
  }

  describe('foods', () => {
    it("does not list another household's foods", async () => {
      await seedTwoTenants();
      await request(app).post('/api/foods').set('Cookie', bob.cookie).send({ name: "Bob's Pizza" }).expect(201);

      const res = await request(app).get('/api/foods').set('Cookie', alice.cookie).expect(200);
      expect(res.body.items).toEqual([]);
    });

    it("cannot update or delete another household's food (404)", async () => {
      await seedTwoTenants();
      const created = await request(app)
        .post('/api/foods').set('Cookie', bob.cookie).send({ name: "Bob's Pizza" }).expect(201);
      const foodId = created.body.id;

      await request(app).put(`/api/foods/${foodId}`).set('Cookie', alice.cookie).send({ name: 'Hacked' }).expect(404);
      await request(app).delete(`/api/foods/${foodId}`).set('Cookie', alice.cookie).expect(404);

      // Bob's food is untouched.
      const bobList = await request(app).get('/api/foods').set('Cookie', bob.cookie).expect(200);
      expect(bobList.body.items).toHaveLength(1);
      expect(bobList.body.items[0].name).toBe("Bob's Pizza");
    });
  });

  describe('profiles', () => {
    it("does not list another household's kid profiles", async () => {
      await seedTwoTenants();
      await request(app).post('/api/profiles').set('Cookie', bob.cookie)
        .send({ name: 'Bobby', avatarColor: 'blue' }).expect(201);

      const res = await request(app).get('/api/profiles').set('Cookie', alice.cookie).expect(200);
      expect(res.body.profiles).toEqual([]);
    });

    it("cannot update or delete another household's profile (404)", async () => {
      await seedTwoTenants();
      const created = await request(app).post('/api/profiles').set('Cookie', bob.cookie)
        .send({ name: 'Bobby', avatarColor: 'blue' }).expect(201);
      const profileId = created.body.id;

      await request(app).put(`/api/profiles/${profileId}`).set('Cookie', alice.cookie)
        .send({ name: 'Hacked' }).expect(404);
      await request(app).delete(`/api/profiles/${profileId}`).set('Cookie', alice.cookie).expect(404);
    });
  });

  describe('menus', () => {
    it("does not list another household's menus", async () => {
      await seedTwoTenants();
      await request(app).post('/api/menus').set('Cookie', bob.cookie)
        .send({ name: "Bob's Menu", groups: [menuGroup] }).expect(201);

      const res = await request(app).get('/api/menus').set('Cookie', alice.cookie).expect(200);
      expect(res.body.menus).toEqual([]);
    });

    it("cannot update or delete another household's menu (404)", async () => {
      await seedTwoTenants();
      const created = await request(app).post('/api/menus').set('Cookie', bob.cookie)
        .send({ name: "Bob's Menu", groups: [menuGroup] }).expect(201);
      const menuId = created.body.id;

      await request(app).put(`/api/menus/${menuId}`).set('Cookie', alice.cookie)
        .send({ name: 'Hacked' }).expect(404);
      await request(app).delete(`/api/menus/${menuId}`).set('Cookie', alice.cookie).expect(404);
    });
  });

  describe('shared menus', () => {
    it("cannot read another household's shared menu by id (404)", async () => {
      await seedTwoTenants();
      const created = await request(app).post('/api/shared-menus').set('Cookie', bob.cookie)
        .send({ title: "Bob's Shared", groups: [sharedGroup] }).expect(201);
      const id = created.body.id;

      await request(app).get(`/api/shared-menus/${id}`).set('Cookie', alice.cookie).expect(404);
      await request(app).get(`/api/shared-menus/${id}/responses`).set('Cookie', alice.cookie).expect(404);
      await request(app).delete(`/api/shared-menus/${id}`).set('Cookie', alice.cookie).expect(404);
    });

    it('public token view works and does not leak household_id', async () => {
      await seedTwoTenants();
      const created = await request(app).post('/api/shared-menus').set('Cookie', bob.cookie)
        .send({ title: "Bob's Shared", groups: [sharedGroup] }).expect(201);
      const token = created.body.token;
      expect(token).toBeTruthy();

      // No auth cookie — public endpoint.
      const res = await request(app).get(`/api/shared-menus/view/${token}`).expect(200);
      expect(res.body.menu.title).toBe("Bob's Shared");
      expect(res.body.menu.householdId).toBeUndefined();
      expect(res.body.menu.household_id).toBeUndefined();
    });
  });
});
