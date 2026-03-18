const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const validateHistoryDB = new sqlite3.Database(path.resolve(__dirname, "validateDB.db"), (err) => {
  if (err) {
    console.error("DB connection error:", err);
  } else {
    console.log("Connected to SQLite database");
  }
});

validateHistoryDB.run(`
        CREATE TABLE IF NOT EXISTS Validateapprovals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        overall_score INTEGER,
        breakdown TEXT,
        issues_detected TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`);

module.exports = validateHistoryDB;