/**
 * Creates the tables if they don't exist. Safe to run on every deploy
 * (it runs automatically before `next build`).
 * If SEED_DEMO=true and the database is empty, it also loads the demo data.
 */
import "./env";
import { pool } from "../src/db";

const statements = [
  `CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(191) NOT NULL UNIQUE,
    name VARCHAR(191) NOT NULL,
    plural VARCHAR(191) NOT NULL,
    description TEXT NOT NULL
  ) DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(191) NOT NULL UNIQUE,
    name VARCHAR(191) NOT NULL,
    state VARCHAR(191) NOT NULL,
    state_slug VARCHAR(191) NOT NULL,
    country VARCHAR(191) NOT NULL DEFAULT 'India',
    lat DOUBLE NOT NULL,
    lng DOUBLE NOT NULL,
    population INT NOT NULL DEFAULT 0,
    INDEX loc_state_idx (state_slug)
  ) DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS listings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    external_id VARCHAR(191) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500) NOT NULL,
    rating DOUBLE NULL,
    review_count INT NOT NULL DEFAULT 0,
    price_from INT NULL,
    url VARCHAR(500) NULL,
    phone VARCHAR(50) NULL,
    amenities JSON NOT NULL,
    service_id INT NOT NULL,
    location_id INT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX listing_combo_idx (service_id, location_id)
  ) DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS page_overrides (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_id INT NOT NULL,
    location_id INT NOT NULL,
    intro TEXT NULL,
    faqs JSON NOT NULL,
    noindex BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE INDEX override_combo_idx (service_id, location_id)
  ) DEFAULT CHARSET=utf8mb4`,
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(`\n✗ DATABASE_URL is not set, so the build can't reach your database.
  Fix: create a file named .env in the project root (next to package.json) containing:
    DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/DBNAME"
    NEXT_PUBLIC_SITE_URL="https://your-domain.com"
  (copy .env.example and fill it in), then redeploy.
  Looked in: ${process.cwd()}\n`);
    process.exit(1);
  }
  for (const s of statements) await pool.query(s);
  console.log("✓ Tables ready");
  if (process.env.SEED_DEMO === "true") {
    const [rows] = await pool.query("SELECT COUNT(*) AS n FROM services");
    if ((rows as { n: number }[])[0].n === 0) {
      const { seed } = await import("./seed");
      await seed();
    } else console.log("• Database already has data, skipping demo seed");
  }
}

main().then(() => pool.end()).catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });
