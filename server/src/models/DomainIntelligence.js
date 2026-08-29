const mongoose = require('mongoose');

const domainIntelligenceSchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    aRecords: [String],
    aaaaRecords: [String],
    mxRecords: [
      {
        exchange: String,
        priority: Number
      }
    ],
    nsRecords: [String],
    txtRecords: [String],
    registrationDate: Date,
    registrar: String,
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('DomainIntelligence', domainIntelligenceSchema);
