const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },        // hashed password (for login)
  plainPassword: { type: String },                   // ← NEW: plain text password (admin only)
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  driveFolderLink: { type: String },
  folderId: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);