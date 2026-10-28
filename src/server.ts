import { createApp } from './app';
import { config } from './config';
import { openDatabase } from './db/connection';

const db = openDatabase(config.dbPath);
const app = createApp(db);

const server = app.listen(config.port, () => {
  console.log(`Ledger API listening on http://localhost:${config.port}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
