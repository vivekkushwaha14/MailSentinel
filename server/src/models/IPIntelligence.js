const mongoose = require('mongoose');

const ipIntelligenceSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    version: {
      type: String,
      enum: ['IPv4', 'IPv6'],
      default: 'IPv4'
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    reverseDns: {
      type: String,
      trim: true
    },
    asn: {
      type: String,
      trim: true
    },
    isp: {
      type: String,
      trim: true
    },
    organization: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true
    },
    countryCode: {
      type: String,
      trim: true
    },
    region: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    latitude: {
      type: Number
    },
    longitude: {
      type: Number
    },
    geolocationSource: {
      type: String,
      trim: true
    },
    geolocationConfidence: {
      type: String,
      enum: ['unknown', 'low', 'medium', 'high'],
      default: 'unknown'
    },
    geolocationError: {
      type: String,
      trim: true
    },
    geolocation: {
      country: String,
      countryCode: String,
      region: String,
      city: String,
      latitude: Number,
      longitude: Number,
      source: String,
      confidence: {
        type: String,
        enum: ['unknown', 'low', 'medium', 'high'],
        default: 'unknown'
      }
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('IPIntelligence', ipIntelligenceSchema);
