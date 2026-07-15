import { createApp } from './app.js';
import { logger } from './logger.js';
import pool from './db/pool.js';
import { runMigrations } from './db/migrate.js';
import { deleteExpiredSessions } from './db/queries/auth.js';
import { expirePendingInvitations } from './db/queries/household.js';

const PORT = parseInt(process.env.SERVER_PORT || '3001', 10);

async function main() {
  // Apply any pending schema migrations before serving traffic. A failure here
  // is fatal — we never want to serve against a half-migrated database.
  const result = await runMigrations(pool, undefined, (m) => logger.info(m));
  if (result.applied.length > 0) {
    logger.info(`Applied ${result.applied.length} migration(s) on startup`);
  }

  const app = createApp();

  // Clean up expired sessions and invitations every 24 hours
  const sessionCleanupInterval = setInterval(async () => {
    try {
      const sessionCount = await deleteExpiredSessions();
      if (sessionCount > 0) logger.info(`Cleaned up ${sessionCount} expired sessions`);

      const inviteCount = await expirePendingInvitations();
      if (inviteCount > 0) logger.info(`Expired ${inviteCount} pending invitations`);
    } catch (err) {
      logger.error({ err }, 'Cleanup error');
    }
  }, 24 * 60 * 60 * 1000);
  sessionCleanupInterval.unref();

  app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
