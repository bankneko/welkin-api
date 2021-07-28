const mongoose = require('mongoose');

const webConfSchema = new mongoose.Schema({
    selectedBatches: {
      type: [String]
    },
    defaultAvatar: {
      type: String
    },
    announcements: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Announcement'
  }]
});

module.exports = mongoose.model('Config', webConfSchema)