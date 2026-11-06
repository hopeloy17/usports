module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  clearMocks: true,
  // Placeholder Supabase settings so importing the app works without a .env file
  setupFiles: ["<rootDir>/tests/setupEnv.ts"],
};
