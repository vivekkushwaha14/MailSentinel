const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  analystId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  note: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const caseSchema = new mongoose.Schema(
  {
    caseId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    title: {
      type: String,
      required: [true, 'Case title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved', 'closed'],
      default: 'open'
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    emails: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Email'
      }
    ],
    indicators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Indicator'
      }
    ],
    notes: [noteSchema]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Case', caseSchema);
