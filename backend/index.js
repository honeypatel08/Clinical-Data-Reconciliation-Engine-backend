const express = require('express');
const cors = require("cors");
const db = require("./db/db")
const jwt = require("jsonwebtoken");

require("dotenv").config();
const app = express();
const PORT = process.env.PORT || 8080;

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(express.json());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origin is not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: false
}));

// call register in api folder 
const registerUser = require('./api/auth');
app.use('/api/auth', registerUser); 

// call Login in api folder 
const userLogin = require('./api/auth');
app.use('/api/auth', userLogin); 

// call reconcile in api folder 
const reconcile = require('./api/reconcile');
app.use('/api/reconcile', reconcile);

// call validate in api folder 
const validate = require('./api/validate');
app.use('/api/validate', validate);

// call admin in adminaccess folder to get user 
const accessUsers = require('./api/admin');
app.use('/api/admin', accessUsers);

const approveReconcile = require('./user/approves');
app.use('/user/approves',approveReconcile); 

// user bt frontednd to secure home page, so even dev tool to change role, token is unchangable 
app.post('/user-role', (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Forbidden" });
    const role = decoded.role;
    res.json({ role });
  });
});

app.get("/ping",(req,res)=>{
  res.json("pong")
})

app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    console.error("Health check failed:", err.message);
    res.status(503).json({ status: "unavailable", database: "disconnected" });
  }
});

async function startServer() {
  try {
    await db.initializeDatabase();
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to initialize the application:", err);
    process.exit(1);
  }
}

startServer();
