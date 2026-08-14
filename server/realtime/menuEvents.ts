export type MenuEventReason =
  | 'active-menu-changed'
  | 'preset-changed'
  | 'selection-updated'
  | 'selection-status-changed'
  | 'selections-cleared';

export interface MenuEvent {
  reason: MenuEventReason;
  affectsActiveMenu?: boolean;
}

type MenuEventListener = (event: MenuEvent) => void;

// One process-local fanout set per household. Browser streams never reserve a
// database connection. If the app is horizontally scaled later, a single
// Postgres LISTEN connection per process can feed this same broadcaster.
const listenersByHousehold = new Map<string, Set<MenuEventListener>>();

export const MAX_MENU_EVENT_CONNECTIONS_PER_USER = 8;
export const MAX_MENU_EVENT_CONNECTIONS_PER_HOUSEHOLD = 16;

const connectionCountsByUser = new Map<string, number>();
const connectionCountsByHousehold = new Map<string, number>();

/**
 * Reserve one long-lived stream before response headers are sent. The normal
 * request rate limiter bounds connection attempts, while these counters bound
 * concurrent sockets, timers, and listener fanout.
 */
export function reserveMenuEventConnection(
  userId: string,
  householdId: string,
): (() => void) | null {
  const userCount = connectionCountsByUser.get(userId) ?? 0;
  const householdCount = connectionCountsByHousehold.get(householdId) ?? 0;
  if (
    userCount >= MAX_MENU_EVENT_CONNECTIONS_PER_USER
    || householdCount >= MAX_MENU_EVENT_CONNECTIONS_PER_HOUSEHOLD
  ) {
    return null;
  }

  connectionCountsByUser.set(userId, userCount + 1);
  connectionCountsByHousehold.set(householdId, householdCount + 1);

  let released = false;
  return () => {
    if (released) return;
    released = true;

    const nextUserCount = (connectionCountsByUser.get(userId) ?? 1) - 1;
    if (nextUserCount <= 0) connectionCountsByUser.delete(userId);
    else connectionCountsByUser.set(userId, nextUserCount);

    const nextHouseholdCount = (connectionCountsByHousehold.get(householdId) ?? 1) - 1;
    if (nextHouseholdCount <= 0) connectionCountsByHousehold.delete(householdId);
    else connectionCountsByHousehold.set(householdId, nextHouseholdCount);
  };
}

export function subscribeToMenuEvents(
  householdId: string,
  listener: MenuEventListener,
): () => void {
  let listeners = listenersByHousehold.get(householdId);
  if (!listeners) {
    listeners = new Set();
    listenersByHousehold.set(householdId, listeners);
  }
  listeners.add(listener);

  return () => {
    const current = listenersByHousehold.get(householdId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) listenersByHousehold.delete(householdId);
  };
}

export function publishMenuEvent(householdId: string, event: MenuEvent): void {
  const listeners = listenersByHousehold.get(householdId);
  if (!listeners) return;
  for (const listener of [...listeners]) listener(event);
}
