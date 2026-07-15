import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createTenant, addMember, type TestTenant } from './helpers/tenant.js';

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

  describe('meals', () => {
    // Create a menu, then a meal record referencing it, for the given tenant.
    async function createMeal(tenant: TestTenant): Promise<string> {
      const menu = await request(app).post('/api/menus').set('Cookie', tenant.cookie)
        .send({ name: 'M', groups: [menuGroup] }).expect(201);
      const meal = await request(app).post('/api/meals').set('Cookie', tenant.cookie)
        .send({ menuId: menu.body.id, selections: [], reviews: [] }).expect(201);
      return meal.body.id;
    }

    it("cannot read, list, or delete another household's meal", async () => {
      await seedTwoTenants();
      const mealId = await createMeal(bob);

      await request(app).get(`/api/meals/${mealId}`).set('Cookie', alice.cookie).expect(404);
      await request(app).delete(`/api/meals/${mealId}`).set('Cookie', alice.cookie).expect(404);

      const aliceList = await request(app).get('/api/meals').set('Cookie', alice.cookie).expect(200);
      expect(aliceList.body.meals).toEqual([]);

      // Bob's meal is untouched.
      const bobList = await request(app).get('/api/meals').set('Cookie', bob.cookie).expect(200);
      expect(bobList.body.meals).toHaveLength(1);
    });
  });

  describe('menu presets', () => {
    it("does not expose another household's preset slot", async () => {
      await seedTwoTenants();
      await request(app).put('/api/menus/presets/breakfast').set('Cookie', bob.cookie)
        .send({ name: "Bob's Breakfast", groups: [menuGroup] }).expect(200);

      const alicePresets = await request(app).get('/api/menus/presets').set('Cookie', alice.cookie).expect(200);
      expect(alicePresets.body.presets.breakfast).toBeNull();
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
      await request(app).put(`/api/shared-menus/${id}`).set('Cookie', alice.cookie)
        .send({ title: 'Hacked' }).expect(404);
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

describe('Household multi-user isolation', () => {
  it("cannot revoke another household's invitation (404)", async () => {
    const alice = await createTenant('Alice'); // owner
    const bob = await createTenant('Bob');     // owner of a different household

    const invited = await request(app).post('/api/household/invite').set('Cookie', alice.cookie)
      .send({ email: 'guest@example.com' }).expect(200);
    const inviteId = invited.body.invitation.id;
    expect(inviteId).toBeTruthy();

    // Bob can't revoke Alice's invitation.
    await request(app).delete(`/api/household/invitations/${inviteId}`).set('Cookie', bob.cookie).expect(404);

    // Alice can.
    await request(app).delete(`/api/household/invitations/${inviteId}`).set('Cookie', alice.cookie).expect(200);
  });

  it('lets only the owner remove members (non-owner gets 403)', async () => {
    const owner = await createTenant('Owner', { role: 'owner' });
    // A second member in the SAME household.
    const member = await addMember(owner.householdId, 'member');

    // The member (non-owner) cannot remove anyone.
    await request(app).delete(`/api/household/members/${owner.userId}`).set('Cookie', member.cookie).expect(403);

    // The owner can remove the member.
    await request(app).delete(`/api/household/members/${member.userId}`).set('Cookie', owner.cookie).expect(200);
  });
});
