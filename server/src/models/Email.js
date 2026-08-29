const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case'
    },
    evidenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Evidence'
    },
    messageId: {
      type: String,
      trim: true
    },
    from: {
      name: String,
      address: { type: String, required: true },
      domain: String
    },
    to: [
      {
        name: String,
        address: String
      }
    ],
    cc: [
      {
        name: String,
        address: String
      }
    ],
    bcc: [
      {
        name: String,
        address: String
      }
    ],
    subject: {
      type: String,
      default: '(No Subject)'
    },
    date: {
      type: Date,
      default: Date.now
    },
    replyTo: {
      name: String,
      address: String,
      domain: String
    },
    returnPath: {
      address: String,
      domain: String
    },
    receivedHeaders: [
      {
        hop: Number,
        raw: String,
        by: String,
        from: String,
        date: Date,
        ip: String,
        isPrivate: { type: Boolean, default: false }
      }
    ],
    authenticationResults: {
      spf: {
        status: String,
        dkim: String,
        ip: String
      },
      dkim: [
        {
          status: String,
          selector: String,
          domain: String
        }
      ],
      dmarc: {
        status: String,
        domain: String
      }
    },
    bodyText: String,
    bodyHtml: String,
    verdict: {
      status: {
        type: String,
        enum: ['unreviewed', 'malicious', 'suspicious', 'benign', 'false_positive'],
        default: 'unreviewed'
      },
      confidence: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'low'
      },
      note: String,
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reviewedAt: Date
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Email', emailSchema);
