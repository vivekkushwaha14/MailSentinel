const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    campaignId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    confidence: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
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
    ],
    sharedIndicators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Indicator'
      }
    ],
    correlationScore: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Campaign', campaignSchema);
