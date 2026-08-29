const express = require('express');
const router = express.Router();
const { getCampaigns, getCampaign, getCampaignGraph } = require('../controllers/campaignController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getCampaigns);
router.get('/:id/graph', protect, getCampaignGraph);
router.get('/:id', protect, getCampaign);

module.exports = router;
