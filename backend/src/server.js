const { createApp } = require('./app');
const { createMemoryRepo } = require('./repo/memory');

const PORT = Number(process.env.PORT) || 3000;
const env = process.env;

// із DB_HOST — PostgreSQL (Docker Compose), без нього — пам'ять (локальна розробка)
function createRepo() {
  if (!env.DB_HOST) return createMemoryRepo();
  const { createPostgresRepo } = require('./repo/postgres');
  return createPostgresRepo({
    host: env.DB_HOST,
    port: Number(env.DB_PORT) || 5432,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });
}

const repo = createRepo();
const server = createApp(repo).listen(PORT, async () => {
  console.log(`Booking service listening on port ${PORT} (storage: ${repo.kind})`);
  if (repo.kind !== 'postgres') return;
  try {
    await repo.ping();
    console.log(`Connected to PostgreSQL at ${env.DB_HOST}:${env.DB_PORT || 5432}/${env.DB_NAME}`);
  } catch (err) {
    console.error(`PostgreSQL is not reachable: ${err.message}`);
  }
});

// docker stop надсилає SIGTERM; без обробника Node.js (PID 1 у контейнері)
// його ігнорує, і Docker через 10 с вбиває процес SIGKILL
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`${signal} received, shutting down`);
    server.close(() => repo.close().finally(() => process.exit(0)));
    server.closeIdleConnections();
  });
}
