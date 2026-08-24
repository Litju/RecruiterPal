import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ?? "postgresql://postgres:recruiterpal@localhost:5433/recruiterpal",
  },
  strict: true,
  verbose: true,
});
