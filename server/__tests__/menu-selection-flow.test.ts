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
  foodIds: ['pizza', 'pasta'],
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
  const active = await request(app)
    .get('/api/menus/active')
    .set('Cookie', cookie)
    .expect(200);
  await request(app)
    .post('/api/menus/selections')
    .set('Cookie', cookie)
    .send({
      kidId,
      selections: { main: ['pizza'] },
      menuId: active.body.menu.id,
      selectionRevision: active.body.selectionRevision,
    })
    .expect(201);
  await request(app)
    .put('/api/menus/selections/status')
    .set('Cookie', cookie)
    .send({ status: 'approved' })
    .expect(200);
}

describe('multi-device menu selection flow', () => {
  it('archives a completed meal and atomically pauses the kid round', async () => {
    const { tenant, kidId, menuId } = await createActiveRound('Completed');
    await submitAndApprove(tenant.cookie, kidId);

    const before = await request(app)
      .get('/api/menus/active')
      .set('Cookie', tenant.cookie)
      .expect(200);
    const payload = {
      menuId,
      selections: before.body.selections,
      reviews: [{
        kidId,
        completions: { pizza: 'all' },
        earnedStar: true,
      }],
    };

    const events: Array<{ reason: string }> = [];
    const unsubscribe = subscribeToMenuEvents(tenant.householdId, (event) => events.push(event));
    const completed = await request(app)
      .post('/api/meals')
      .set('Cookie', tenant.cookie)
      .send(payload)
      .expect(201);
    unsubscribe();

    expect(completed.body.menuId).toBe(menuId);
    expect(completed.body.reviews[0]).toMatchObject({ kidId, earnedStar: true });
    expect(events).toContainEqual({ reason: 'active-menu-changed' });

    const after = await request(app)
      .get('/api/menus/active')
      .set('Cookie', tenant.cookie)
      .expect(200);
    expect(after.body.menu).toBeNull();
    expect(after.body.selections).toEqual([]);
    expect(after.body.selectionStatus).toBe('open');
    expect(after.body.selectionRevision).toBe(before.body.selectionRevision + 1);

    // A second parent device cannot archive the same round twice after it has
    // observed the locked household transition.
    await request(app)
      .post('/api/meals')
      .set('Cookie', tenant.cookie)
      .send(payload)
      .expect(409);

    const history = await request(app)
      .get('/api/meals')
      .set('Cookie', tenant.cookie)
      .expect(200);
    expect(history.body.meals).toHaveLength(1);

    // Completing a scratch-built menu pauses rather than deletes it, so the
    // parent can launch the unchanged menu again for a later round.
    await request(app)
      .put('/api/menus/active')
      .set('Cookie', tenant.cookie)
      .send({ menuId })
      .expect(200);
    const relaunched = await request(app)
      .get('/api/menus/active')
      .set('Cookie', tenant.cookie)
      .expect(200);
    expect(relaunched.body.menu.id).toBe(menuId);
    expect(relaunched.body.selections).toEqual([]);
    expect(relaunched.body.selectionStatus).toBe('open');
  });

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
      .send({
        kidId,
        selections: { main: ['pizza'] },
        menuId: initial.body.menu.id,
        selectionRevision: initial.body.selectionRevision,
      })
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
      .send({
        kidId,
        selections: { main: ['pasta'] },
        menuId: active.body.menu.id,
        selectionRevision: active.body.selectionRevision,
      })
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
      .send({
        kidId,
        selections: { main: ['pasta'] },
        menuId: active.body.menu.id,
        selectionRevision: active.body.selectionRevision,
      })
      .expect(201);
    expect(revised.body.selections).toEqual({ main: ['pasta'] });
    expect(revised.body.timestamp).toEqual(expect.any(Number));
  });

  it('requires a completed plate before approval and resets the round for a new active menu', async () => {
    const { tenant, kidId } = await createActiveRound();

    const initial = await request(app)
      .get('/api/menus/active')
      .set('Cookie', tenant.cookie)
      .expect(200);

    await request(app)
      .put('/api/menus/selections/status')
      .set('Cookie', tenant.cookie)
      .send({ status: 'approved' })
      .expect(409);

    await request(app)
      .post('/api/menus/selections')
      .set('Cookie', tenant.cookie)
      .send({
        kidId,
        selections: { main: ['pizza'] },
        menuId: initial.body.menu.id,
        selectionRevision: initial.body.selectionRevision,
      })
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
      .send({ name: 'Snack', groups: [{ ...menuGroup, label: 'Snack' }], expectedUpdatedAt: null })
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
      .send({ name: 'Dinner', groups: [menuGroup], expectedUpdatedAt: null })
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
      .send({
        name: 'Dinner',
        groups: [{ ...menuGroup, label: 'Entrée' }],
        expectedUpdatedAt: preset.body.updatedAt,
      })
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
      .send({ name: 'Dinner', groups: [menuGroup], expectedUpdatedAt: null })
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
      .send({
        name: 'Friday Dinner',
        groups: [menuGroup],
        expectedUpdatedAt: preset.body.updatedAt,
      })
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
      .send({
        kidId: bob.kidId,
        selections: { main: ['pizza'] },
        menuId: alice.menuId,
        selectionRevision: (await request(app)
          .get('/api/menus/active')
          .set('Cookie', alice.tenant.cookie)
          .expect(200)).body.selectionRevision,
      })
      .expect(404);

    const aliceActive = await request(app)
      .get('/api/menus/active')
      .set('Cookie', alice.tenant.cookie)
      .expect(200);
    expect(aliceActive.body.selections).toEqual([]);
  });

  it('rejects stale drafts after the active menu round changes', async () => {
    const { tenant, kidId, menuId } = await createActiveRound('Stale draft');
    const originalRound = await request(app)
      .get('/api/menus/active')
      .set('Cookie', tenant.cookie)
      .expect(200);

    await request(app)
      .put(`/api/menus/${menuId}`)
      .set('Cookie', tenant.cookie)
      .send({ groups: [{ ...menuGroup, label: 'New Main' }] })
      .expect(200);

    const stale = await request(app)
      .post('/api/menus/selections')
      .set('Cookie', tenant.cookie)
      .send({
        kidId,
        selections: { main: ['pizza'] },
        menuId,
        selectionRevision: originalRound.body.selectionRevision,
      })
      .expect(409);
    expect(stale.body.error).toMatch(/menu changed/i);

    const active = await request(app)
      .get('/api/menus/active')
      .set('Cookie', tenant.cookie)
      .expect(200);
    expect(active.body.selectionRevision).toBeGreaterThan(originalRound.body.selectionRevision);
    expect(active.body.selections).toEqual([]);
  });

  it('validates every submitted plate against the active menu', async () => {
    const { tenant, kidId, menuId } = await createActiveRound('Validation');
    const active = await request(app)
      .get('/api/menus/active')
      .set('Cookie', tenant.cookie)
      .expect(200);
    const round = { menuId, selectionRevision: active.body.selectionRevision };

    await request(app)
      .post('/api/menus/selections')
      .set('Cookie', tenant.cookie)
      .send({ kidId, selections: {}, ...round })
      .expect(400);
    await request(app)
      .post('/api/menus/selections')
      .set('Cookie', tenant.cookie)
      .send({ kidId, selections: { main: ['not-on-menu'] }, ...round })
      .expect(400);
    await request(app)
      .post('/api/menus/selections')
      .set('Cookie', tenant.cookie)
      .send({ kidId, selections: { main: ['pizza'], old: ['pasta'] }, ...round })
      .expect(400);

    await request(app)
      .put('/api/menus/selections/status')
      .set('Cookie', tenant.cookie)
      .send({ status: 'approved' })
      .expect(409);
  });

  it('does not overwrite a preset saved from a newer device snapshot', async () => {
    const tenant = await createTenant('Preset concurrency');
    const original = await request(app)
      .put('/api/menus/presets/dinner')
      .set('Cookie', tenant.cookie)
      .send({ name: 'Dinner', groups: [menuGroup], expectedUpdatedAt: null })
      .expect(200);

    await request(app)
      .put('/api/menus/presets/dinner')
      .set('Cookie', tenant.cookie)
      .send({
        name: 'Newer Dinner',
        groups: [{ ...menuGroup, label: 'Fresh Main' }],
        expectedUpdatedAt: original.body.updatedAt,
      })
      .expect(200);

    const staleSave = await request(app)
      .put('/api/menus/presets/dinner')
      .set('Cookie', tenant.cookie)
      .send({
        name: 'Stale Dinner',
        groups: [{ ...menuGroup, label: 'Old Main' }],
        expectedUpdatedAt: original.body.updatedAt,
      })
      .expect(409);
    expect(staleSave.body.error).toMatch(/another device/i);

    const presets = await request(app)
      .get('/api/menus/presets')
      .set('Cookie', tenant.cookie)
      .expect(200);
    expect(presets.body.presets.dinner.name).toBe('Newer Dinner');
    expect(presets.body.presets.dinner.groups[0].label).toBe('Fresh Main');
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
