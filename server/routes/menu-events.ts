import { Router } from 'express';
import {
  reserveMenuEventConnection,
  subscribeToMenuEvents,
} from '../realtime/menuEvents.js';

const router = Router();
const HEARTBEAT_INTERVAL_MS = 25_000;
const MAX_STREAM_LIFETIME_MS = 15 * 60_000;

router.get('/', (req, res) => {
  const householdId = req.householdId!;
  const releaseConnection = reserveMenuEventConnection(req.userId!, householdId);
  if (!releaseConnection) {
    res.set('Retry-After', '30');
    return res.status(429).json({ error: 'Too many live menu updates are already open' });
  }

  res.status(200);
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('retry: 3000\n\n');

  const unsubscribe = subscribeToMenuEvents(householdId, (event) => {
    // Events intentionally contain no household data. They only invalidate the
    // authenticated client's cache; the REST endpoint remains canonical.
    if (!res.write(`event: menu-changed\ndata: ${JSON.stringify(event)}\n\n`)) {
      // Invalidation events are not worth buffering without bound for a client
      // that is no longer reading. Reconnect-on-open performs a full reconcile.
      res.end();
    }
  });

  const heartbeat = setInterval(() => {
    if (!res.write(`: heartbeat ${Date.now()}\n\n`)) res.end();
  }, HEARTBEAT_INTERVAL_MS);
  heartbeat.unref();

  // Re-authenticate periodically instead of allowing a stream opened just
  // before session expiry to stay alive forever.
  const maxLifetime = setTimeout(() => res.end(), MAX_STREAM_LIFETIME_MS);
  maxLifetime.unref();

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    clearInterval(heartbeat);
    clearTimeout(maxLifetime);
    unsubscribe();
    releaseConnection();
  };
  res.on('close', cleanup);
  res.on('finish', cleanup);
});

export default router;
