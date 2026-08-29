require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Initialize Express
const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Static folder for evidence/uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/emails', require('./routes/emailRoutes'));
app.use('/api/cases', require('./routes/caseRoutes'));
app.use('/api/intelligence', require('./routes/intelligenceRoutes'));
app.use('/api/campaigns', require('./routes/campaignRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/rules', require('./routes/ruleRoutes'));
app.use('/api/analysis', require('./routes/analysisRoutes'));

// Root Endpoint
app.get('/', (req, res) => {
  res.json({ message: 'MailSentinel API is running...' });
});

// Error Handler
app.use(require('./middleware/errorHandler'));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[+] Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
