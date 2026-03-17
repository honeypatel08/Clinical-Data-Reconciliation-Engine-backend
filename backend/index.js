const express = require('express');
const cors = require("cors");
const db = require("./db/db")

require("dotenv").config();
const app = express();
const PORT = process.env.PORT;

app.use(express.json());
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
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


const emailVerify = require('./verify/emailverify');
app.use('/verify/emailverify', emailVerify);
// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});