const mongoose = require('mongoose');

const evidenceSchema = new mongoose.Schema(
  {
    evidenceId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case'
    },
    originalFilename: {
      type: String,
      required: true
    },
    fileHash: {
      type: String, // SHA-256
      required: true
    },
    storagePath: {
      type: String,
      required: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    analysisHistory: [
      {
        analystId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        timestamp: {
          type: Date,
          default: Date.now
        },
        action: String
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Evidence', evidenceSchema);
