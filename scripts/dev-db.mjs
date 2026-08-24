#!/usr/bin/env node
/**
 * Dev/test database lifecycle helper (Docker).
 * Usage: node scripts/dev-db.mjs start|stop|reset
 */
import { execFileSync, execSync } from "node:child_process";

const CONTAINER = "recruiterpal-dev-pg";
const PORT = process.env.RP_PG_PORT ?? "5499";
const PASSWORD = "recruiterpal";
const DB = "recruiterpal";

function run(cmd) {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

function isRunning() {
  return run(`docker ps --filter name=${CONTAINER} --format "{{.Names}}"`) === CONTAINER;
}

const action = process.argv[2] ?? "start";

if (action === "start") {
  if (isRunning()) {
    console.log(`${CONTAINER} already running on :${PORT}`);
  } else {
    run(`docker rm -f ${CONTAINER}`);
    execSync(
      `docker run -d --name ${CONTAINER} -e POSTGRES_PASSWORD=${PASSWORD} -e POSTGRES_DB=${DB} ` +
        `-p ${PORT}:5432 postgres:18-alpine`,
      { stdio: "inherit" },
    );
    // Wait for readiness
    for (let i = 0; i < 60; i++) {
      const ready = run(`docker exec ${CONTAINER} pg_isready -U postgres -d ${DB}`) !== null;
      if (ready) break;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
    }
    run(
      `docker exec ${CONTAINER} psql -U postgres -d ${DB} -v ON_ERROR_STOP=1 -c "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rp_app') THEN CREATE ROLE rp_app LOGIN PASSWORD '${PASSWORD}'; ELSE ALTER ROLE rp_app LOGIN PASSWORD '${PASSWORD}'; END IF; END $$;"`,
    );
    console.log(`${CONTAINER} started on :${PORT}`);
  }
  console.log(`DATABASE_URL=postgresql://postgres:${PASSWORD}@localhost:${PORT}/${DB}`);
  console.log(`RP_APP_DATABASE_URL=postgresql://rp_app:${PASSWORD}@localhost:${PORT}/${DB}`);
} else if (action === "stop") {
  run(`docker rm -f ${CONTAINER}`);
  console.log("stopped");
} else if (action === "reset") {
  run(`docker rm -f ${CONTAINER}`);
  execFileSync(process.execPath, [process.argv[1], "start"], { stdio: "inherit" });
} else {
  console.error("Unknown action:", action);
  process.exit(1);
}
