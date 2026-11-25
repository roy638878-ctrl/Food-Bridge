import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { startExpiryWatcher } from "./jobs/expiryWatcher.js";

const app = createApp();
const expiryTask = startExpiryWatcher(app.locals.db);

const server = app.listen(env.port, () => {
  console.log(`FoodBridge API running on http://localhost:${env.port}`);
});

function shutdown() {
  expiryTask.stop();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
