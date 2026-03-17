const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcrypt");

const db = new sqlite3.Database(path.resolve(__dirname, "users.db"), (err) => {
  if (err) {
    console.error("DB connection error:", err);
  } else {
    console.log("Connected to SQLite database");
  }
});

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

// Define Admin and only one and that to here only  
const adminEmail = "clinicalsystemadmin@gmail.com";
const adminPassword = "adminAccess070805"; 
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