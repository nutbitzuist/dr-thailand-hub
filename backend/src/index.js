require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cron = require('node-cron');

const drRoutes = require('./routes/dr');
const brokerRoutes = require('./routes/brokers');
const scrapeService = require('./services/scrapeService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/dr', drRoutes);
app.use('/api/brokers', brokerRoutes);

// API info
app.get('/api', (req, res) => {
  res.json({
    name: 'DR Thailand Hub API',
    version: '1.0.0',
    endpoints: {
      '/api/dr': 'Get all DRs',
      '/api/dr/:symbol': 'Get DR by symbol',
      '/api/dr/search?q=': 'Search DRs',
      '/api/dr/top/gainers': 'Get top gainers',
      '/api/dr/top/losers': 'Get top losers',
      '/api/dr/top/volume': 'Get top volume',
      '/api/dr/filter': 'Filter DRs with criteria',
      '/api/dr/market-overview': 'Get market sentiment summary',
      '/api/dr/rankings': 'Get market rankings (Gainers/Most Active)',
      '/api/dr/:symbol/news': 'Get latest news for a DR',
      '/api/brokers': 'Get all brokers',
      '/api/brokers/:id': 'Get broker by ID'
    },
    lastUpdate: scrapeService.getLastUpdateTime()
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Schedule scraping (every 5 minutes during trading hours)
if (process.env.ENABLE_AUTO_SCRAPE === 'true') {
  // Thai market hours: 10:00-12:30, 14:30-16:30 (UTC+7)
  // Night session: 19:00-03:00 (next day)

  // Scrape during day session (Mon-Fri, 10:00-16:30 Thai time)
  cron.schedule('*/5 10-16 * * 1-5', async () => {
    console.log('Running scheduled scrape (day session)...');
    try {
      await scrapeService.scrapeAll();
      console.log('Scrape completed successfully');
    } catch (error) {
      console.error('Scrape failed:', error);
    }
  }, {
    timezone: 'Asia/Bangkok'
  });

  // Scrape during night session (Mon-Fri, 19:00-23:59)
  cron.schedule('*/5 19-23 * * 1-5', async () => {
    console.log('Running scheduled scrape (night session)...');
    try {
      await scrapeService.scrapePrices();
      console.log('Price scrape completed successfully');
    } catch (error) {
      console.error('Price scrape failed:', error);
    }
  }, {
    timezone: 'Asia/Bangkok'
  });

  // Scrape during night session (Tue-Sat, 00:00-03:00)
  cron.schedule('*/5 0-3 * * 2-6', async () => {
    console.log('Running scheduled scrape (night session continued)...');
    try {
      await scrapeService.scrapePrices();
      console.log('Price scrape completed successfully');
    } catch (error) {
      console.error('Price scrape failed:', error);
    }
  }, {
    timezone: 'Asia/Bangkok'
  });

  console.log('Auto-scraping enabled');
}

// Initial data load
(async () => {
  try {
    console.log('Loading initial data...');
    await scrapeService.scrapeAll();
    console.log('Initial data loaded');
  } catch (error) {
    console.error('Failed to load initial data:', error);
  }
})();

app.listen(PORT, () => {
  console.log(`🚀 DR Thailand Hub API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
