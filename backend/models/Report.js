const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Optional for anonymous
  },
  type: {
    type: String,
    required: true,
    enum: ['Smoke', 'Dust', 'Odor', 'Chemical Leak', 'Others'],
  },
  description: {
    type: String,
  },
  location: {
    type: String,
    required: true,
  },
  time: {
    type: Date,
    required: true,
  },
  photo: {
    public_id: String,
    url: String,
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'resolved'],
    default: 'pending',
  },
  response: {
    type: String,
    default: '',
  },
  isAnonymous: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Report', reportSchema);
