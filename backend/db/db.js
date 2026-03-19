// db.js
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Railway sets this in ENV
});

// --- Table creation ---
async function createTables() {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        providerName TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        role TEXT NOT NULL DEFAULT 'user'
      )
    `);

    // Approvals table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS approvals (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        reconciled_medication TEXT NOT NULL,
        confidence_score REAL,
        reasoning TEXT,
        recommended_actions TEXT,
        clinical_safety_check TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // AI cache table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_cache (
        input TEXT PRIMARY KEY,
        output TEXT,
        created_at BIGINT
      )
    `);

    console.log("All tables created or exist already");
  } catch (err) {
    console.error("Error creating tables:", err);
  }
}

// --- Predefined admin and test users ---
async function insertDefaultUsers() {
  try {
    // Admin
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = "Admin";
    const adminHash = await bcrypt.hash(adminPassword, 10);

    await pool.query(
      `INSERT INTO users (providerName, email, password, status, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [adminName, adminEmail, adminHash, "approved", "admin"]
    );

    console.log("Predefined admin inserted (if not exists)");

    // Test users
    const testUsers = [
      { name: "testing1", email: "testing1@gmail.com", pass: "testing1", status: "approved" },
      { name: "testing2", email: "testing2@gmail.com", pass: "testing2", status: "rejected" },
    ];

    for (const u of testUsers) {
      const hash = await bcrypt.hash(u.pass, 10);
      await pool.query(
        `INSERT INTO users (providerName, email, password, status, role)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO NOTHING`,
        [u.name, u.email, hash, u.status, "user"]
      );
    }

    console.log("Test users inserted (if not exists)");
  } catch (err) {
    console.error("Error inserting default users:", err);
  }
}

// Run table creation and default inserts
(async () => {
  await createTables();
  await insertDefaultUsers();
})();

module.exports = pool;