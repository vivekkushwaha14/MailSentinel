const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema(
  {
    emailId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Email',
      required: true,
      unique: true
    },
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case'
    },
    threatScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    riskLevel: {
      type: String,
      required: true,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    },
    scoreBreakdown: [
      {
        category: { type: String, required: true },
        scoreImpact: { type: Number, required: true },
        ruleId: { type: String, required: true },
        explanation: { type: String, required: true }
      }
    ],
    headerForensics: {
      spfPass: { type: Boolean, default: null },
      dkimPass: { type: Boolean, default: null },
      dmarcPass: { type: Boolean, default: null },
      routingAnomalies: [String],
      errors: [String],
      routeTimeline: [
        {
          hop: Number,
          raw: String,
          by: String,
          from: String,
          date: Date,
          ip: String,
          isPrivate: { type: Boolean, default: false },
          delayFromPreviousSeconds: Number,
          anomalies: [String]
        }
      ]
    },
    senderAnalysis: {
      displayNameSpoofing: { type: Boolean, default: false },
      replyToMismatch: { type: Boolean, default: false },
      returnPathMismatch: { type: Boolean, default: false },
      lookalikeDomainDetected: { type: Boolean, default: false },
      targetBrand: String,
      similarityScore: Number,
      brandSignals: [String]
    },
    keywordAnalysis: [
      {
        category: { type: String, required: true },
        matchedText: { type: String, required: true },
        severity: { type: String, enum: ['low', 'medium', 'high'], required: true },
        explanation: { type: String, required: true },
        scoreImpact: Number
      }
    ],
    urlAnalysis: {
      totalUrls: { type: Number, default: 0 },
      suspiciousUrls: [
        {
          url: { type: String, required: true },
          indicators: [String],
          domain: String,
          protocol: String,
          port: String,
          pathLength: Number,
          queryParamCount: Number,
          redirectHints: [
            {
              parameter: String,
              target: String
            }
          ],
          redirectChain: [
            {
              from: String,
              to: String,
              status: Number
            }
          ],
          finalUrl: String,
          redirectCount: { type: Number, default: 0 },
          fetchError: String,
          sandbox: {
            networkFetchEnabled: { type: Boolean, default: false },
            redirectLimit: Number,
            timeoutMs: Number
          },
          punycode: {
            ascii: String,
            unicode: String
          },
          isLookalike: { type: Boolean, default: false },
          similarityScore: Number,
          targetBrand: String
        }
      ]
    },
    attachmentAnalysis: {
      totalAttachments: { type: Number, default: 0 },
      attachments: [
        {
          filename: { type: String, required: true },
          extension: String,
          mimeType: String,
          size: Number,
          fileHash: String,
          indicators: [String],
          riskLevel: { type: String, enum: ['NONE', 'LOW', 'MEDIUM', 'HIGH'], default: 'NONE' },
          deepAnalysis: {
            mimeMismatch: { type: Boolean, default: false },
            magicNumberMismatch: { type: Boolean, default: false },
            embeddedUrls: [String],
            contentSample: String
          }
        }
      ]
    },
    threatIntel: {
      riskScore: { type: Number, default: 0 },
      provider: String,
      generatedAt: Date,
      domains: [
        {
          domain: String,
          rootDomain: String,
          reputation: String,
          riskScore: Number,
          indicators: [String],
          source: String
        }
      ],
      ips: [
        {
          ip: String,
          reputation: String,
          riskScore: Number,
          indicators: [String],
          source: String,
          version: String,
          organization: String,
          asn: String,
          isp: String,
          country: String,
          countryCode: String,
          region: String,
          city: String,
          latitude: Number,
          longitude: Number,
          geolocationSource: String,
          geolocationConfidence: String,
          geolocation: {
            country: String,
            countryCode: String,
            region: String,
            city: String,
            latitude: Number,
            longitude: Number,
            source: String,
            confidence: String
          }
        }
      ],
      urls: [
        {
          value: String,
          fingerprint: String,
          type: { type: String },
          reputation: String,
          riskScore: Number,
          indicators: [String],
          source: String
        }
      ],
      hashes: [
        {
          hash: String,
          reputation: String,
          riskScore: Number,
          indicators: [String],
          source: String
        }
      ],
      providerError: String
    },
    analystSummary: {
      summary: String,
      likelyAttackType: String,
      confidence: {
        type: String,
        enum: ['low', 'medium', 'high']
      },
      recommendedActions: [String]
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Analysis', analysisSchema);
