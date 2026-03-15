const express = require('express');
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

require("dotenv").config();
const app = express();
const PORT = process.env.PORT;

// SQLite database
const db = new sqlite3.Database("./users.db", (err) => {
  if (err) {
    console.error("DB connection error:", err);
  } else {
    console.log("Connected to SQLite database");
  }
});

// Create users table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    password TEXT NOT NULL
  )
`);

app.use(express.json());

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// Example route
app.get('/', (req, res) => {
  res.send('Hello World');
});

const reconcile = require('./api/reconcile');
app.use('/api/reconcile', reconcile);

const validate = require('./api/validate');
app.use('/api/validate', validate);

// Validation test endpoint
app.post('/api/validate/data-quality', (req, res) => {
  res.send("validation API here");
});


// -------- USERS API --------

// Add user
app.post('/api/users', (req, res) => {
  const { firstName, lastName, password } = req.body;

  if (!firstName || !lastName || !password) {
    return res.status(400).json({
      error: "firstName, lastName and password are required"
    });
  }

  const sql = `
    INSERT INTO users (firstName, lastName, password)
    VALUES (?, ?, ?)
  `;

  db.run(sql, [firstName, lastName, password], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.status(201).json({
      message: "User created",
      userId: this.lastID
    });
  });
});


// Get all users
app.get('/api/users', (req, res) => {
  db.all("SELECT id, firstName, lastName FROM users", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(rows);
  });
});


// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});