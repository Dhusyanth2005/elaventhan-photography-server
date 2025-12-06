const mongoose = require('mongoose');

const photoSelectionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  photoId: { type: String, required: true },
  photoName: { type: String, required: true },
  thumbnailLink: String,
  fullImageLink: String,
  selectedAt: { type: Date, default: Date.now }
});
photoSelectionSchema.index({ user: 1, photoId: 1 }, { unique: true });
module.exports = mongoose.model('PhotoSelection', photoSelectionSchema);