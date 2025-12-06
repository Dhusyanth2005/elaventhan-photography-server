const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');

const app = express();

app.use(express.json());

connectDB();
// Middleware
app.use(cors({
  origin: ['http://localhost:5173','http://localhost:5174','https://elaventhan-photography.vercel.app','https://www.elaventhan-photography.vercel.app','https://admin-elaventhan-photography.vercel.app','https://www.admin-elaventhan-photography.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/user', require('./routes/user'));

const PORT = process.env.PORT || 5000;
app.get('/', (req, res) => {
  res.send('Ranking System API is running on port ' + (process.env.PORT || 5000));
});

// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;