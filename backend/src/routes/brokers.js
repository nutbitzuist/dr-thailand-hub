const express = require('express');
const router = express.Router();
const scrapeService = require('../services/scrapeService');

// Get all brokers
router.get('/', (req, res) => {
  try {
    const brokers = scrapeService.getAllBrokers();
    
    res.json({
      success: true,
      count: brokers.length,
      data: brokers
    });
  } catch (error) {
    console.error('Error getting brokers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get broker by ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const broker = scrapeService.getBrokerById(id.toUpperCase());

    if (!broker) {
      return res.status(404).json({ 
        success: false, 
        error: `Broker with ID "${id}" not found` 
      });
    }

    // Get DRs issued by this broker
    const drList = scrapeService.getAllDRs().filter(dr => 
      dr.issuerCode === broker.id || dr.issuer.includes(broker.name)
    );

    res.json({
      success: true,
      data: {
        ...broker,
        drList
      }
    });
  } catch (error) {
    console.error('Error getting broker:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get DRs by broker
router.get('/:id/dr', (req, res) => {
  try {
    const { id } = req.params;
    const broker = scrapeService.getBrokerById(id.toUpperCase());

    if (!broker) {
      return res.status(404).json({ 
        success: false, 
        error: `Broker with ID "${id}" not found` 
      });
    }

    const drList = scrapeService.getAllDRs().filter(dr => 
      dr.issuerCode === broker.id || dr.issuer.includes(broker.name)
    );

    res.json({
      success: true,
      broker: broker.name,
      count: drList.length,
      data: drList
    });
  } catch (error) {
    console.error('Error getting broker DRs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
