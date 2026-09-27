// Loads .env / .env.production for CLI scripts when present (Next.js loads them on its own).
// Variables already set by the host's panel take precedence.
for (const f of [".env.production", ".env"]) { try { process.loadEnvFile(f); } catch {} }
