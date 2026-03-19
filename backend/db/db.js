// const sqlite3 = require("sqlite3").verbose();
// const db = new sqlite3.Database(process.env.DB_PATH || './users.db');

// const path = require("path");
// const bcrypt = require("bcrypt");
// require("dotenv").config();

// db.js
const fs = require("fs");
const https = require("https");
const sqlite3 = require("sqlite3").verbose();

const DB_PATH = "./users.db";

// Download DB from GitHub if it doesn't exist
if (!fs.existsSync(DB_PATH)) {
  const file = fs.createWriteStream(DB_PATH);
  https.get(
    "https://raw.githubusercontent.com/honeypatel08/yourrepo/Clinical-Data-Reconciliation-Engine-backend/db/users.db", // <--- Replace with your raw GitHub URL
    (response) => {
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        console.log("Downloaded users.db from GitHub");
      });
    }
  );
}

const db = new sqlite3.Database(DB_PATH);


db.serialize(() => {
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    providerName TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    role TEXT NOT NULL DEFAULT 'user'
  )
`);

// to store each user history for reconclie
db.run(`
        CREATE TABLE IF NOT EXISTS approvals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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

// for cache
db.run(`
        CREATE TABLE IF NOT EXISTS ai_cache (
        input TEXT PRIMARY KEY,
        output TEXT,
        created_at INTEGER
    )
`);
});
 
// Define Admin and only one and that to here only  
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD; 
const adminName = "Admin"; 

bcrypt.hash(adminPassword, 10, (err, hash) => {
  if (err) throw err;

  db.run(
    `INSERT OR IGNORE INTO users (providerName, email, password, status, role) VALUES (?, ?, ?, ?, ?)`,
    [adminName, adminEmail, hash, "approved", "admin"],
    (err) => {
      if (err) console.error("Error inserting admin:", err);
      else console.log("Predefined admin inserted");
    }
  );
});


// all test DELETE LATER ;}
const testing1email = "testing1@gmail.com";
const testing1Pass = "testing1"; 
const testing1name = "testing1"; 

bcrypt.hash(testing1Pass, 10, (err, hash) => {
  if (err) throw err;

  db.run(
    `INSERT OR IGNORE INTO users (providerName, email, password, status, role) VALUES (?, ?, ?, ?, ?)`,
    [testing1name, testing1email, hash, "approved", "user"],
    (err) => {
      if (err) console.error("Error inserting admin:", err);
    }
  );
});

const testing2email = "testing2@gmail.com";
const testing2Pass = "testing2"; 
const testing2name = "testing2"; 

bcrypt.hash(testing2Pass, 10, (err, hash) => {
  if (err) throw err;

  db.run(
    `INSERT OR IGNORE INTO users (providerName, email, password, status, role) VALUES (?, ?, ?, ?, ?)`,
    [testing2name, testing2email, hash, "rejected", "user"],  // correct order & hashed password
    (err) => {
      if (err) console.error("Error inserting user:", err);
    }
  );
});

module.exports = db;