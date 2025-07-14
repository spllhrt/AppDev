const mongoose = require('mongoose');

const bulletinSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { 
    type: String, 
    enum: [
      'Environmental Alert', 
      'Weather Update', 
      'Public Safety', 
      'Emergency', 
      'Event Notice',
      'Service Disruption',
      'Health Advisory',
      'Traffic Alert',
      'Community Announcement',
      'General'
    ], 
    default: 'General',
    required: true,
  },
  message: { type: String, required: true },

  photos: [
    {
      public_id: { type: String, required: true },
      url: { type: String, required: true },
    }
  ],

  createdAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reactions: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      type: { type: String, enum: ['upvote', 'downvote'], required: true },
      createdAt: { type: Date, default: Date.now },
    }
  ],
  comments: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      text: { type: String, maxlength: 200, required: true },
      createdAt: { type: Date, default: Date.now },
    }
  ]
});

const Bulletin = mongoose.model('Bulletin', bulletinSchema);

module.exports = Bulletin;
