const mongoose = require('mongoose');

const indicatorSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['ip', 'domain', 'url', 'sender', 'attachment_hash']
    },
    value: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    emails: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Email'
      }
    ],
    cases: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case'
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Indicator', indicatorSchema);
