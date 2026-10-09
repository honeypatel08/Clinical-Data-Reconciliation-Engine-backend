const { Pool } = require("pg");
const bcrypt = require("bcrypt");
require("dotenv").config();

function createPoolConfig() {
  if (process.env.INSTANCE_CONNECTION_NAME) {
    const required = ["DB_USER", "DB_PASSWORD", "DB_NAME"];
    const missing = required.filter((name) => !process.env[name]);
    if (missing.length > 0) {
      throw new Error(`Missing Cloud SQL settings: ${missing.join(", ")}`);
    }

    return {
      host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      max: Number(process.env.DB_POOL_SIZE || 5),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("Set DATABASE_URL locally or INSTANCE_CONNECTION_NAME on Cloud Run");
  }

  return {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : false,
    max: Number(process.env.DB_POOL_SIZE || 5),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}

const pool = new Pool(createPoolConfig());

async function createTables() {
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_cache (
      input TEXT PRIMARY KEY,
      output TEXT,
      created_at BIGINT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS data_quality_approvals (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      overall_score INT,
      breakdown JSONB,
      issues_detected JSONB,
      status TEXT DEFAULT 'approved',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function insertAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required");
  }

  const adminHash = await bcrypt.hash(adminPassword, 10);
  await pool.query(
    `INSERT INTO users (providerName, email, password, status, role)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE SET
       providerName = EXCLUDED.providerName,
       password = EXCLUDED.password,
       status = EXCLUDED.status,
       role = EXCLUDED.role`,
    ["Admin", adminEmail.toLowerCase(), adminHash, "approved", "admin"]
  );
}

async function initializeDatabase() {
  await pool.query("SELECT 1");
  await createTables();
  await insertAdminUser();
  console.log("Database initialized");
}

pool.initializeDatabase = initializeDatabase;

module.exports = pool;
