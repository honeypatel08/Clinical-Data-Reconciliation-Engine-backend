const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const historyDB = new sqlite3.Database(path.resolve(__dirname, "reconcile.db"), (err) => {
  if (err) {
    console.error("DB connection error:", err);
  } else {
    console.log("Connected to SQLite database");
  }
});

historyDB.run(`
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

module.exports = historyDB;