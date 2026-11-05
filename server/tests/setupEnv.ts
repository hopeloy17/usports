// Runs before every test file (see setupFiles in jest.config.js).
//
// src/db/client.ts throws on import when Supabase settings are missing, and any test that
// imports the app loads it. These placeholders let it load without a server/.env file.
// Creating the client doesn't connect to anything, and tests fake every database call.
// dotenv never overwrites variables that are already set, so even on a machine with a
// real .env, tests keep these placeholders and can't reach the real database.
process.env.SUPABASE_URL = "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
