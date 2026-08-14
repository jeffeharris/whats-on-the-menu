import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createTenant } from './helpers/tenant.js';
import {
  MAX_MENU_EVENT_CONNECTIONS_PER_HOUSEHOLD,
  MAX_MENU_EVENT_CONNECTIONS_PER_USER,
  publishMenuEvent,
  reserveMenuEventConnection,
  subscribeToMenuEvents,
} from '../realtime/menuEvents.js';

const app = createApp();

const menuGroup = {
  id: 'main',
  label: 'Main',
  foodIds: [],
  selectionPreset: 'pick-1' as const,
  order: 0,
};

async function createActiveRound(name = 'Family') {
  const tenant = await createTenant(name);
  const profile = await request(app)
    .post('/api/profiles')
    .set('Cookie', tenant.cookie)
    .send({ name: 'Sam', avatarColor: 'blue' })
    .expect(201);
  const menu = await request(app)
    .post('/api/menus')
    .set('Cookie', tenant.cookie)
    .send({ name: 'Dinner', groups: [menuGroup] })
    .expect(201);
  return { tenant, kidId: profile.body.id as string, menuId: menu.body.id as string };
}

async function submitAndApprove(cookie: string, kidId: string) {
  await request(app)
    .post('/api/menus/selections')
    .set('Cookie', cookie)
    .send({ kidId, selections: { main: ['pizza'] } })
    .expect(201);
  await request(app)
    .put('/api/menus/selections/status')
    .set('Cookie', cookie)
    .send({ status: 'approved' })
    .expect(200);
}

describe('multi-device menu selection flow', () => {
  it('persists approval, locks edits, and allows a parent to reopen choices', async () => {
    const { tenant, kidId } = await createActiveRound();

    const initial = await request(app)
      .get('/api/menus/active')
      .set('Cookie', tenant.cookie)
      .expect(200);
    expect(initial.body.selectionStatus).toBe('open');

    await request(app)
      .post('/api/menus/selections')
      .set('Cookie', tenant.cookie)
      .send({ kidId, selections: { main: ['pizza'] } })
      .expect(201);

    const approved = await request(app)
      .put('/api/menus/selections/status')
      .set('Cookie', tenant.cookie)
      .send({ status: 'approved' })
      .expect(200);
    expect(approved.body.selectionStatus).toBe('approved');

    const active = await request(app)
      .get('/api/menus/active')
      .set('Cookie', tenant.cookie)
      .expect(200);
    expect(active.body.selectionStatus).toBe('approved');
    expect(active.body.selections[0].selections).toEqual({ main: ['pizza'] });

    const lockedEdit = await request(app)
      .post('/api/menus/selections')
      .set('Cookie', tenant.cookie)
      .send({ kidId, selections: { main: ['pasta'] } })
      .expect(409);
    expect(lockedEdit.body.error).toMatch(/approved/i);

    await request(app)
      .put('/api/menus/selections/status')
      .set('Cookie', tenant.cookie)
      .send({ status: 'open' })
      .expect(200);

    const revised = await request(app)
      .post('/api/menus/selections')
      .set('Cookie', tenant.cookie)
      .send({ kidId, selections: { main: ['pasta'] } })
      .expect(201);
    expect(revised.body.selections).toEqual({ main: ['pasta'] });
    expect(revised.body.timestamp).toEqual(expect.any(Number));
  });

  it('requires a completed plate before approval and resets the round for a new active menu', async () => {
    const { tenant, kidId } = await createActiveRound();

    await request(app)
      .put('/api/menus/selections/status')
      .set('Cookie', tenant.cookie)
      .send({ status: 'approved' })
      .expect(409);

    await request(app)
      .post('/api/menus/selections')
      .set('Cookie', tenant.cookie)
      .send({ kidId, selections: { main: ['pizza'] } })
      .expect(201);
    await request(app)
      .put('/api/menus/selections/status')
      .set('Cookie', tenant.cookie)
      .send({ status: 'approved' })
      .expect(200);

    await request(app)
      .post('/api/menus')
      .set('Cookie', tenant.cookie)
      .send({ name: 'Tomorrow', groups: [menuGroup] })
      .expect(201);

    const nextRound = await request(app)
      .get('/api/menus/active')
      .set('Cookie', tenant.cookie)
      .expect(200);
    expect(nextRound.body.selectionStatus).toBe('open');
    expect(nextRound.body.selections).toEqual([]);
  });

  it('preserves an approved round when a non-active preset is edited', async () => {
    const { tenant, kidId, menuId } = await createActiveRound();
    await submitAndApprove(tenant.cookie, kidId);

    const events: Array<{ reason: string; affectsActiveMenu?: boolean }> = [];
    const unsubscribe = subscribeToMenuEvents(tenant.householdId, (event) => events.push(event));
    await request(app)
      .put('/api/menus/presets/snack')
      .set('Cookie', tenant.cookie)
      .send({ name: 'Snack', groups: [{ ...menuGroup, label: 'Snack' }] })
      .expect(200);
    unsubscribe();

    const active = await request(app)
      .get('/api/menus/active')
      .set('Cookie', tenant.cookie)
      .expect(200);
    expect(active.body.menu.id).toBe(menuId);
    expect(active.body.selectionStatus).toBe('approved');
    expect(active.body.selections).toHaveLength(1);
    expect(events).toContainEqual({ reason: 'preset-changed', affectsActiveMenu: false });
  });

  it('reopens and clears an approved round when the active preset contents change', async () => {
    const tenant = await createTenant('Preset');
    const profile = await request(app)
      .post('/api/profiles')
      .set('Cookie', tenant.cookie)
      .send({ name: 'Sam', avatarColor: 'blue' })
      .expect(201);
    const preset = await request(app)
      .put('/api/menus/presets/dinner')
      .set('Cookie', tenant.cookie)
      .send({ name: 'Dinner', groups: [menuGroup] })
      .expect(200);
    await request(app)
      .put('/api/menus/active')
      .set('Cookie', tenant.cookie)
      .send({ menuId: preset.body.id })
      .expect(200);
    await submitAndApprove(tenant.cookie, profile.body.id as string);

    const events: Array<{ reason: string; affectsActiveMenu?: boolean }> = [];
    const unsubscribe = subscribeToMenuEvents(tenant.householdId, (event) => events.push(event));
    await request(app)
      .put('/api/menus/presets/dinner')
      .set('Cookie', tenant.cookie)
      .send({ name: 'Dinner', groups: [{ ...menuGroup, label: 'Entrée' }] })
      .expect(200);
    unsubscribe();

    const active = await request(app)
      .get('/api/menus/active')
      .set('Cookie', tenant.cookie)
      .expect(200);
    expect(active.body.menu.groups[0].label).toBe('Entrée');
    expect(active.body.selectionStatus).toBe('open');
    expect(active.body.selections).toEqual([]);
    expect(events).toContainEqual({ reason: 'preset-changed', affectsActiveMenu: true });
  });

  it('does not reopen an approved round when only the active preset name changes', async () => {
    const tenant = await createTenant('Rename');
    const profile = await request(app)
      .post('/api/profiles')
      .set('Cookie', tenant.cookie)
      .send({ name: 'Sam', avatarColor: 'blue' })
      .expect(201);
    const preset = await request(app)
      .put('/api/menus/presets/dinner')
      .set('Cookie', tenant.cookie)
      .send({ name: 'Dinner', groups: [menuGroup] })
      .expect(200);
    await request(app)
      .put('/api/menus/active')
      .set('Cookie', tenant.cookie)
      .send({ menuId: preset.body.id })
      .expect(200);
    await submitAndApprove(tenant.cookie, profile.body.id as string);

    await request(app)
      .put('/api/menus/presets/dinner')
      .set('Cookie', tenant.cookie)
      .send({ name: 'Friday Dinner', groups: [menuGroup] })
      .expect(200);

    const active = await request(app)
      .get('/api/menus/active')
      .set('Cookie', tenant.cookie)
      .expect(200);
    expect(active.body.selectionStatus).toBe('approved');
    expect(active.body.selections).toHaveLength(1);
  });

  it('reopens and clears an approved round when an active non-preset menu changes', async () => {
    const { tenant, kidId, menuId } = await createActiveRound();
    await submitAndApprove(tenant.cookie, kidId);

    await request(app)
      .put(`/api/menus/${menuId}`)
      .set('Cookie', tenant.cookie)
      .send({ groups: [{ ...menuGroup, label: 'Updated Main' }] })
      .expect(200);

    const active = await request(app)
      .get('/api/menus/active')
      .set('Cookie', tenant.cookie)
      .expect(200);
    expect(active.body.selectionStatus).toBe('open');
    expect(active.body.selections).toEqual([]);
  });

  it("cannot submit a selection using another household's kid profile", async () => {
    const alice = await createActiveRound('Alice');
    const bob = await createActiveRound('Bob');

    await request(app)
      .post('/api/menus/selections')
      .set('Cookie', alice.tenant.cookie)
      .send({ kidId: bob.kidId, selections: { main: ['pizza'] } })
      .expect(404);

    const aliceActive = await request(app)
      .get('/api/menus/active')
      .set('Cookie', alice.tenant.cookie)
      .expect(200);
    expect(aliceActive.body.selections).toEqual([]);
  });

  it('fans invalidation events out only within the target household', () => {
    const aliceEvents: string[] = [];
    const bobEvents: string[] = [];
    const unsubscribeAlice = subscribeToMenuEvents('alice', (event) => aliceEvents.push(event.reason));
    const unsubscribeBob = subscribeToMenuEvents('bob', (event) => bobEvents.push(event.reason));

    publishMenuEvent('alice', { reason: 'selection-updated' });
    unsubscribeAlice();
    unsubscribeBob();

    expect(aliceEvents).toEqual(['selection-updated']);
    expect(bobEvents).toEqual([]);
  });

  it('bounds concurrent live-update reservations by user and household', () => {
    const userReleases = Array.from({ length: MAX_MENU_EVENT_CONNECTIONS_PER_USER }, () =>
      reserveMenuEventConnection('one-user', 'one-household')
    );
    expect(userReleases.every(Boolean)).toBe(true);
    expect(reserveMenuEventConnection('one-user', 'another-household')).toBeNull();
    for (const release of userReleases) release?.();

    const householdReleases = Array.from({ length: MAX_MENU_EVENT_CONNECTIONS_PER_HOUSEHOLD }, (_, index) =>
      reserveMenuEventConnection(`user-${index}`, 'busy-household')
    );
    expect(householdReleases.every(Boolean)).toBe(true);
    expect(reserveMenuEventConnection('one-more-user', 'busy-household')).toBeNull();
    for (const release of householdReleases) release?.();

    const afterCleanup = reserveMenuEventConnection('one-user', 'busy-household');
    expect(afterCleanup).not.toBeNull();
    afterCleanup?.();
    afterCleanup?.();
  });
});
