const express = require('express');
const router = express.Router();
const scrapeService = require('../services/scrapeService');

// Get all DRs
router.get('/', (req, res) => {
  try {
    const { country, sector, issuer, sort, order } = req.query;
    let drList = scrapeService.getAllDRs();

    // Apply filters
    if (country && country !== 'All') {
      drList = drList.filter(dr => dr.country === country);
    }
    if (sector && sector !== 'All') {
      drList = drList.filter(dr => dr.sector === sector);
    }
    if (issuer) {
      drList = drList.filter(dr => dr.issuer.includes(issuer));
    }

    // Apply sorting
    if (sort) {
      const sortOrder = order === 'asc' ? 1 : -1;
      drList.sort((a, b) => {
        switch (sort) {
          case 'symbol':
            return sortOrder * a.symbol.localeCompare(b.symbol);
          case 'price':
            return sortOrder * (a.price - b.price);
          case 'change':
          case 'changePercent':
            return sortOrder * (a.changePercent - b.changePercent);
          case 'volume':
            return sortOrder * (a.volume - b.volume);
          case 'marketCap':
            return sortOrder * ((a.marketCap || 0) - (b.marketCap || 0));
          default:
            return 0;
        }
      });
    }

    res.json({
      success: true,
      count: drList.length,
      lastUpdate: scrapeService.getLastUpdateTime(),
      data: drList
    });
  } catch (error) {
    console.error('Error getting DRs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search DRs
router.get('/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
    }

    const searchTerm = q.toLowerCase();
    const drList = scrapeService.getAllDRs().filter(dr =>
      dr.symbol.toLowerCase().includes(searchTerm) ||
      dr.name.toLowerCase().includes(searchTerm) ||
      dr.underlying.toLowerCase().includes(searchTerm)
    );

    res.json({
      success: true,
      query: q,
      count: drList.length,
      data: drList
    });
  } catch (error) {
    console.error('Error searching DRs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get top gainers
router.get('/top/gainers', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const drList = scrapeService.getAllDRs()
      .filter(dr => dr.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, limit);

    res.json({
      success: true,
      count: drList.length,
      data: drList
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get top losers
router.get('/top/losers', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const drList = scrapeService.getAllDRs()
      .filter(dr => dr.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, limit);

    res.json({
      success: true,
      count: drList.length,
      data: drList
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get top volume
router.get('/top/volume', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const drList = scrapeService.getAllDRs()
      .sort((a, b) => b.volume - a.volume)
      .slice(0, limit);

    res.json({
      success: true,
      count: drList.length,
      data: drList
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get top value
router.get('/top/value', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const drList = scrapeService.getAllDRs()
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);

    res.json({
      success: true,
      count: drList.length,
      data: drList
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Filter DRs with multiple criteria
router.post('/filter', (req, res) => {
  try {
    const {
      country,
      sector,
      minMarketCap,
      maxMarketCap,
      minPE,
      maxPE,
      minDividend,
      hasDividend,
      nightTrading
    } = req.body;

    let drList = scrapeService.getAllDRs();

    if (country && country !== 'All') {
      drList = drList.filter(dr => dr.country === country);
    }
    if (sector && sector !== 'All') {
      drList = drList.filter(dr => dr.sector === sector);
    }
    if (minMarketCap) {
      drList = drList.filter(dr => (dr.marketCap || 0) >= minMarketCap);
    }
    if (maxMarketCap) {
      drList = drList.filter(dr => (dr.marketCap || 0) <= maxMarketCap);
    }
    if (minPE) {
      drList = drList.filter(dr => dr.pe && dr.pe >= minPE);
    }
    if (maxPE) {
      drList = drList.filter(dr => dr.pe && dr.pe <= maxPE);
    }
    if (minDividend) {
      drList = drList.filter(dr => (dr.dividend || 0) >= minDividend);
    }
    if (hasDividend) {
      drList = drList.filter(dr => dr.dividend && dr.dividend > 0);
    }
    if (nightTrading) {
      drList = drList.filter(dr => dr.tradingHours && dr.tradingHours.includes('กลางคืน'));
    }

    res.json({
      success: true,
      count: drList.length,
      data: drList
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get statistics
router.get('/stats', (req, res) => {
  try {
    const drList = scrapeService.getAllDRs();
    const stats = {
      totalDR: drList.length,
      totalVolume: drList.reduce((sum, dr) => sum + (dr.volume || 0), 0),
      totalValue: drList.reduce((sum, dr) => sum + (dr.value || 0), 0),
      gainers: drList.filter(dr => dr.changePercent > 0).length,
      losers: drList.filter(dr => dr.changePercent < 0).length,
      unchanged: drList.filter(dr => dr.changePercent === 0).length,
      byCountry: {},
      bySector: {},
      byIssuer: {}
    };

    // Count by country
    drList.forEach(dr => {
      stats.byCountry[dr.country] = (stats.byCountry[dr.country] || 0) + 1;
      stats.bySector[dr.sector] = (stats.bySector[dr.sector] || 0) + 1;
      if (dr.issuerCode) {
        stats.byIssuer[dr.issuerCode] = (stats.byIssuer[dr.issuerCode] || 0) + 1;
      }
    });

    res.json({
      success: true,
      lastUpdate: scrapeService.getLastUpdateTime(),
      data: stats
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get countries list
router.get('/countries', (req, res) => {
  try {
    const drList = scrapeService.getAllDRs();
    const countries = [...new Set(drList.map(dr => dr.country))].sort();

    const countryData = countries.map(code => ({
      code,
      name: getCountryName(code),
      count: drList.filter(dr => dr.country === code).length
    }));

    res.json({
      success: true,
      data: countryData
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get sectors list
router.get('/sectors', (req, res) => {
  try {
    const drList = scrapeService.getAllDRs();
    const sectors = [...new Set(drList.map(dr => dr.sector))].sort();

    const sectorData = sectors.map(name => ({
      name,
      count: drList.filter(dr => dr.sector === name).length
    }));

    res.json({
      success: true,
      data: sectorData
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Compare DRs
router.get('/compare', (req, res) => {
  try {
    const { symbols } = req.query;
    if (!symbols) {
      return res.status(400).json({ success: false, error: 'Parameter "symbols" is required (comma-separated)' });
    }

    const symbolList = symbols.split(',').map(s => s.trim().toUpperCase());
    const drList = scrapeService.getAllDRs();
    const compareData = symbolList.map(symbol =>
      drList.find(dr => dr.symbol === symbol)
    ).filter(Boolean);

    res.json({
      success: true,
      count: compareData.length,
      data: compareData
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get market overview
router.get('/market-overview', (req, res) => {
  try {
    const overview = scrapeService.getMarketOverview();
    if (!overview) {
      return res.status(404).json({ success: false, error: 'Market overview data not available' });
    }
    res.json({
      success: true,
      lastUpdate: scrapeService.getLastUpdateTime(),
      data: overview
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get rankings
router.get('/rankings', (req, res) => {
  try {
    const rankings = scrapeService.getRankings();
    res.json({
      success: true,
      lastUpdate: scrapeService.getLastUpdateTime(),
      data: rankings
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get news for a specific DR
router.get('/:symbol/news', async (req, res) => {
  try {
    const { symbol } = req.params;
    const news = await scrapeService.getDRNews(symbol.toUpperCase());
    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      count: news.length,
      data: news
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single DR by symbol
router.get('/:symbol', (req, res) => {
  try {
    const { symbol } = req.params;
    const dr = scrapeService.getDRBySymbol(symbol.toUpperCase());

    if (!dr) {
      return res.status(404).json({
        success: false,
        error: `DR with symbol "${symbol}" not found`
      });
    }

    res.json({
      success: true,
      data: dr
    });
  } catch (error) {
    console.error('Error getting DR:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function
function getCountryName(code) {
  const names = {
    US: 'สหรัฐอเมริกา',
    CN: 'จีน',
    HK: 'ฮ่องกง',
    JP: 'ญี่ปุ่น',
    SG: 'สิงคโปร์',
    VN: 'เวียดนาม',
    EU: 'ยุโรป',
    TW: 'ไต้หวัน',
    KR: 'เกาหลีใต้',
    TH: 'ไทย'
  };
  return names[code] || code;
}

module.exports = router;
