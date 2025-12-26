const axios = require('axios');
const cheerio = require('cheerio');
const { format } = require('date-fns');

// In-memory data store
let drData = [];
let brokerData = [];
let marketOverview = null;
let rankings = {
  topGainers: [],
  topLosers: [],
  mostActiveValue: []
};
let lastUpdateTime = null;

// Broker information (static data) - Corrected with actual SET issuer codes
const BROKERS = [
  { id: 'KTB', name: 'ธ.กรุงไทย', fullName: 'ธนาคารกรุงไทย จำกัด (มหาชน)', commission: '0.15%', minTrade: '1 หน่วย', website: 'https://www.krungthai.com', logo: '🔵' },
  { id: 'BLS', name: 'บล.บัวหลวง', fullName: 'บริษัทหลักทรัพย์ บัวหลวง จำกัด (มหาชน)', commission: '0.15%', minTrade: '1 หน่วย', website: 'https://www.bualuang.co.th', logo: '🏦' },
  { id: 'YUANTA', name: 'บล.หยวนต้า', fullName: 'บริษัทหลักทรัพย์ หยวนต้า (ประเทศไทย) จำกัด', commission: '0.15%', minTrade: '1 หน่วย', website: 'https://www.yuanta.co.th', logo: '🔶' },
  { id: 'KGI', name: 'บล.เคจีไอ', fullName: 'บริษัทหลักทรัพย์ เคจีไอ (ประเทศไทย) จำกัด (มหาชน)', commission: '0.15%', minTrade: '1 หน่วย', website: 'https://www.kgieworld.co.th', logo: '🟢' },
  { id: 'KKP', name: 'บล.เกียรตินาคินภัทร', fullName: 'บริษัทหลักทรัพย์ เกียรตินาคินภัทร จำกัด (มหาชน)', commission: '0.15%', minTrade: '1 หน่วย', website: 'https://www.kkpfg.com', logo: '🟡' },
  { id: 'FSS', name: 'บล.ฟินันเซีย ไซรัส', fullName: 'บริษัทหลักทรัพย์ ฟินันเซีย ไซรัส จำกัด (มหาชน)', commission: '0.15%', minTrade: '1 หน่วย', website: 'https://www.fnsyrus.com', logo: '🟠' },
  { id: 'PI', name: 'บล.พาย', fullName: 'บริษัทหลักทรัพย์ พาย จำกัด (มหาชน)', commission: '0.12%', minTrade: '1 หน่วย', website: 'https://www.pi.co.th', logo: '🟣' },
  { id: 'INVX', name: 'บล.อินโนเวสท์ เอกซ์', fullName: 'บริษัทหลักทรัพย์ อินโนเวสท์ เอกซ์ จำกัด', commission: '0.15%', minTrade: '1 หน่วย', website: 'https://www.innovestx.co.th', logo: '🔷' }
];

// Country mapping
const COUNTRY_MAP = {
  'US': { name: 'สหรัฐอเมริกา', flag: '🇺🇸' },
  'CN': { name: 'จีน', flag: '🇨🇳' },
  'HK': { name: 'ฮ่องกง', flag: '🇭🇰' },
  'JP': { name: 'ญี่ปุ่น', flag: '🇯🇵' },
  'SG': { name: 'สิงคโปร์', flag: '🇸🇬' },
  'VN': { name: 'เวียดนาม', flag: '🇻🇳' },
  'EU': { name: 'ยุโรป', flag: '🇪🇺' },
  'TW': { name: 'ไต้หวัน', flag: '🇹🇼' },
  'KR': { name: 'เกาหลีใต้', flag: '🇰🇷' }
};

// Determine country from market/underlying
function detectCountry(market, underlying, symbol) {
  if (!market) market = '';
  if (!underlying) underlying = '';

  market = market.toUpperCase();
  underlying = underlying.toUpperCase();

  if (market.includes('NASDAQ') || market.includes('NYSE') || market.includes('US')) return 'US';
  if (market.includes('HKEX') || market.includes('HK')) return 'HK';
  if (market.includes('SSE') || market.includes('SZSE') || market.includes('SHANGHAI') || market.includes('SHENZHEN')) return 'CN';
  if (market.includes('TSE') || market.includes('TOKYO') || market.includes('JP')) return 'JP';
  if (market.includes('SGX') || market.includes('SINGAPORE')) return 'SG';
  if (market.includes('HOSE') || market.includes('HNX') || market.includes('VN')) return 'VN';
  if (market.includes('EURONEXT') || market.includes('LSE') || market.includes('XETRA')) return 'EU';
  if (market.includes('TWSE') || market.includes('TPEx')) return 'TW';
  if (market.includes('KRX') || market.includes('KOSPI')) return 'KR';

  // Check by underlying symbol patterns
  if (/^(AAPL|MSFT|GOOGL|META|AMZN|NVDA|TSLA|NFLX|AMD|INTC)/.test(underlying)) return 'US';
  if (/^(BABA|JD|PDD|BIDU|NIO)/.test(underlying)) return 'CN';
  if (/^(TENCENT|XIAOMI|MEITUAN|BYD)/.test(underlying)) return 'HK';
  if (/^(TOYOTA|SONY|NINTENDO|HONDA)/.test(underlying)) return 'JP';

  return 'US'; // Default
}

// Detect sector from name/underlying
function detectSector(name, underlying) {
  const nameUpper = (name + ' ' + underlying).toUpperCase();

  if (/ETF|INDEX|FUND/.test(nameUpper)) return 'ETF';
  if (/BANK|FINANCE|INSURANCE|CREDIT/.test(nameUpper)) return 'Finance';
  if (/TECH|SOFTWARE|SEMICONDUCTOR|CHIP|COMPUTER|CLOUD|AI/.test(nameUpper)) return 'Technology';
  if (/AUTO|CAR|MOTOR|EV|ELECTRIC VEHICLE/.test(nameUpper)) return 'Auto';
  if (/RETAIL|ECOMMERCE|CONSUMER|SHOP|AMAZON|ALIBABA|JD/.test(nameUpper)) return 'Consumer';
  if (/PHARMA|HEALTH|MEDICAL|BIOTECH|DRUG/.test(nameUpper)) return 'Healthcare';
  if (/LUXURY|LVMH|HERMES|GUCCI|FASHION/.test(nameUpper)) return 'Luxury';
  if (/GAME|ENTERTAINMENT|MEDIA|NETFLIX|DISNEY|STREAM/.test(nameUpper)) return 'Entertainment';
  if (/OIL|GAS|ENERGY|POWER|SOLAR|WIND/.test(nameUpper)) return 'Energy';
  if (/REAL ESTATE|REIT|PROPERTY/.test(nameUpper)) return 'Real Estate';
  if (/TELECOM|COMMUNICATION|5G/.test(nameUpper)) return 'Telecom';

  return 'Technology'; // Default for most DRs
}

// Get issuer code from issuer name
function getIssuerCode(issuerName) {
  if (!issuerName) return null;

  if (issuerName.includes('บัวหลวง')) return 'BLS';
  if (issuerName.includes('หยวนต้า')) return 'YUANTA';
  if (issuerName.includes('อินโนเวสท์')) return 'INVX';
  if (issuerName.includes('เคจีไอ')) return 'KGI';
  if (issuerName.includes('กสิกร')) return 'KBANK';
  if (issuerName.includes('กรุงไทย')) return 'KTB';
  if (issuerName.includes('พาย') || issuerName.includes('Pi')) return 'PI';
  if (issuerName.includes('ฟินันเซีย')) return 'FSS';
  if (issuerName.includes('เกียรตินาคิน')) return 'KKP';

  return null;
}

// Get company logo emoji based on name
function getCompanyLogo(name, symbol) {
  const nameUpper = (name + ' ' + symbol).toUpperCase();

  // US Tech Giants
  if (nameUpper.includes('APPLE') || symbol.includes('AAPL')) return '🍎';
  if (nameUpper.includes('MICROSOFT') || symbol.includes('MSFT')) return '🪟';
  if (nameUpper.includes('GOOGLE') || nameUpper.includes('ALPHABET') || symbol.includes('GOOGL')) return '🔍';
  if (nameUpper.includes('AMAZON') || symbol.includes('AMZN')) return '📦';
  if (nameUpper.includes('META') || nameUpper.includes('FACEBOOK')) return '📱';
  if (nameUpper.includes('NVIDIA') || symbol.includes('NVDA')) return '🎮';
  if (nameUpper.includes('TESLA') || symbol.includes('TSLA')) return '🚗';
  if (nameUpper.includes('NETFLIX') || symbol.includes('NFLX')) return '🎬';

  // Chinese Tech
  if (nameUpper.includes('ALIBABA') || symbol.includes('BABA')) return '🛍️';
  if (nameUpper.includes('TENCENT')) return '💬';
  if (nameUpper.includes('XIAOMI')) return '📲';
  if (nameUpper.includes('BYD')) return '🔋';
  if (nameUpper.includes('MEITUAN')) return '🍜';
  if (nameUpper.includes('JD')) return '🏪';

  // Japanese
  if (nameUpper.includes('TOYOTA')) return '🚙';
  if (nameUpper.includes('SONY')) return '🎮';
  if (nameUpper.includes('NINTENDO')) return '🍄';
  if (nameUpper.includes('HONDA')) return '🏍️';

  // European Luxury
  if (nameUpper.includes('LVMH')) return '👜';
  if (nameUpper.includes('HERMES')) return '🧣';
  if (nameUpper.includes('ASML')) return '🔬';

  // Banks/Finance
  if (nameUpper.includes('BANK') || nameUpper.includes('DBS') || nameUpper.includes('UOB')) return '🏦';

  // ETF
  if (nameUpper.includes('ETF') || nameUpper.includes('INDEX')) return '📈';

  // Default by country
  if (symbol.includes('VN')) return '🇻🇳';

  return '📊';
}

// Parse price string to number
function parsePrice(priceStr) {
  if (!priceStr) return 0;
  return parseFloat(priceStr.toString().replace(/[^0-9.-]/g, '')) || 0;
}

// Parse volume string to number
function parseVolume(volumeStr) {
  if (!volumeStr) return 0;
  const str = volumeStr.toString().replace(/,/g, '');
  const num = parseFloat(str) || 0;

  if (str.includes('M') || str.includes('m')) return num * 1000000;
  if (str.includes('K') || str.includes('k')) return num * 1000;
  if (str.includes('B') || str.includes('b')) return num * 1000000000;

  return num;
}

// Scrape from SET Official API (Best Source)
async function scrapeSET() {
  try {
    console.log('Fetching DR list from SET Official API...');

    const response = await axios.get('https://www.set.or.th/api/set/dr/search?symbols=&tradeDateType=C&lang=th', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.set.or.th/th/market/product/dr/marketdata',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    if (response.data && Array.isArray(response.data)) {
      return response.data.map(item => ({
        symbol: item.symbol,
        name: item.securityName || item.symbol,
        underlying: item.underlyingName || item.symbol.replace(/\d+$/, ''),
        market: item.exchange || 'N/A',
        country: 'N/A', // We can infer this or it might be in other fields
        sector: 'N/A', // We can infer this
        price: item.last || 0,
        change: item.change || 0,
        changePercent: item.percentChange || 0,
        volume: item.volume || 0,
        value: (item.value || 0) * 1000, // API returns value in thousands
        high: item.high || 0,
        low: item.low || 0,
        open: item.open || 0,
        prevClose: item.prior || 0,
        issuer: 'Unknown', // Need to infer from symbol
        issuerCode: getIssuerCodeFromSuffix(item.symbol),
        ratio: 'N/A',
        tradingHours: 'N/A',
        pe: 0,
        dividend: 0,
        marketCap: (item.marketCap || 0) * 1000000,
        logo: getCompanyLogo('', item.symbol),
        lastUpdate: new Date().toISOString()
      })).map(dr => ({
        ...dr,
        country: detectCountry(dr.market, dr.underlying, dr.symbol),
        sector: detectSector(dr.name, dr.underlying),
        issuer: getIssuerName(dr.issuerCode)
      }));
    }

    return null;
  } catch (error) {
    console.error('SET API scrape error:', error.message);
    return null;
  }
}

// Scrape from ThaiWarrant.com (Fallback Source)
async function scrapeThaiWarrant() {
  try {
    console.log('Scraping DR list from ThaiWarrant.com...');

    const response = await axios.get('https://www.thaiwarrant.com/dr/search', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    const drList = [];

    // Select the grid view table
    const table = $('#MainContent_gvDRSearch');

    if (table.length === 0) {
      console.log('ThaiWarrant table not found');
      return null;
    }

    // Iterate over rows (skipping header)
    table.find('tr').each((i, row) => {
      if (i === 0) return;

      const cols = $(row).find('td');
      if (cols.length < 8) return;

      const symbol = $(cols[0]).text().trim();
      const priceStr = $(cols[1]).text().trim();
      const changePercentStr = $(cols[2]).text().trim();
      const valueStr = $(cols[3]).text().trim();
      const ratio = $(cols[4]).text().trim();
      const underlying = $(cols[6]).text().trim();
      const market = $(cols[7]).text().trim();

      const price = parsePrice(priceStr);
      const changePercent = parseFloat(changePercentStr.replace(/[^\d.-]/g, '')) || 0;
      const value = parseVolume(valueStr);
      const volume = price > 0 ? Math.round(value / price) : 0;

      const issuerCode = getIssuerCodeFromSuffix(symbol);

      drList.push({
        symbol,
        name: `${symbol} (${underlying})`,
        underlying,
        market,
        country: detectCountry(market, underlying, symbol),
        sector: detectSector($(cols[5]).text().trim(), underlying),
        price,
        change: 0,
        changePercent,
        volume,
        value,
        high: 0,
        low: 0,
        open: 0,
        prevClose: 0,
        issuer: getIssuerName(issuerCode),
        issuerCode,
        ratio,
        tradingHours: 'N/A',
        pe: 0,
        dividend: 0,
        marketCap: 0,
        logo: getCompanyLogo('', symbol),
        lastUpdate: new Date().toISOString()
      });
    });

    return drList;
  } catch (error) {
    console.error('ThaiWarrant scrape error:', error.message);
    return null;
  }
}

// Corrected issuer code suffix mappings based on SET official data
function getIssuerCodeFromSuffix(symbol) {
  if (symbol.endsWith('80')) return 'KTB';     // Krung Thai Bank
  if (symbol.endsWith('01')) return 'BLS';     // Bualuang Securities
  if (symbol.endsWith('13')) return 'KGI';     // KGI Securities
  if (symbol.endsWith('19')) return 'YUANTA';  // Yuanta Securities
  if (symbol.endsWith('06')) return 'KKP';     // Kiatnakin Phatra
  if (symbol.endsWith('24')) return 'FSS';     // Finansia Syrus
  if (symbol.endsWith('29')) return 'PI';      // PI Securities
  if (symbol.endsWith('41')) return 'JPM';     // JPMorgan
  if (symbol.endsWith('28')) return 'MQ';      // Macquarie
  if (symbol.endsWith('08')) return 'ASPS';    // Asia Plus
  if (symbol.endsWith('16')) return 'TNS';     // Thanachart
  return 'OTHER';
}

function getIssuerName(code) {
  const map = {
    'KTB': 'ธ.กรุงไทย',
    'BLS': 'บล.บัวหลวง',
    'INVX': 'บล.อินโนเวสท์ เอกซ์',
    'KGI': 'บล.เคจีไอ',
    'YUANTA': 'บล.หยวนต้า',
    'JPM': 'JPMorgan',
    'KKP': 'บล.เกียรตินาคินภัทร',
    'MQ': 'Macquarie',
    'FSS': 'บล.ฟินันเซีย ไซรัส',
    'ASPS': 'บล.เอเซีย พลัส',
    'TNS': 'บล.ธนชาต',
    'PI': 'บล.พาย'
  };
  return map[code] || 'Unknown';
}

// Load initial/fallback data
async function loadInitialData() {
  console.log('Loading initial data...');

  // 1. Try Official SET API (Best Source)
  let scrapedData = await scrapeSET();

  // 2. Fallback to ThaiWarrant if SET fails
  if (!scrapedData || scrapedData.length === 0) {
    scrapedData = await scrapeThaiWarrant();
  }

  if (scrapedData && scrapedData.length > 0) {
    if (scrapedData[0].marketCap !== undefined && scrapedData[0].issuerCode === undefined) {
      // Raw settrade/legacy format (unlikely now)
      drData = scrapedData.map(processDRData);
    } else {
      // Already processed data
      drData = scrapedData;
    }

    lastUpdateTime = new Date().toISOString();
    console.log(`Loaded ${drData.length} DRs from live data`);
    return;
  }

  // 3. Last Resort: Comprehensive fallback data
  console.log('Using fallback DR data...');
  drData = getFallbackDRData();
  brokerData = BROKERS.map(broker => ({
    ...broker,
    drCount: drData.filter(dr => dr.issuerCode === broker.id).length
  }));
  lastUpdateTime = new Date().toISOString();
  console.log(`Loaded ${drData.length} DRs from fallback data`);
}

// Process raw DR data (Legacy/Settrade)
function processDRData(raw) {
  const symbol = raw.symbol || raw.Symbol || '';
  const name = raw.name || raw.Name || raw.companyName || '';
  const underlying = raw.underlying || raw.underlyingSymbol || symbol.replace(/\d+$/, '');
  const market = raw.market || raw.exchange || '';
  const issuer = raw.issuer || raw.issuerName || '';

  return {
    symbol,
    name,
    underlying,
    market,
    country: detectCountry(market, underlying, symbol),
    sector: detectSector(name, underlying),
    price: parsePrice(raw.last || raw.price || raw.lastPrice),
    change: parsePrice(raw.change || raw.priceChange),
    changePercent: parsePrice(raw.percentChange || raw.changePercent || raw.pctChange),
    volume: parseVolume(raw.volume || raw.totalVolume),
    value: parseVolume(raw.value || raw.totalValue),
    high: parsePrice(raw.high),
    low: parsePrice(raw.low),
    open: parsePrice(raw.open),
    prevClose: parsePrice(raw.prior || raw.prevClose),
    bid: parsePrice(raw.bid || raw.bidPrice),
    ask: parsePrice(raw.ask || raw.offerPrice),
    issuer,
    issuerCode: getIssuerCode(issuer),
    ratio: raw.ratio || raw.drRatio || '1:1',
    tradingHours: raw.tradingSession || 'กลางวัน',
    pe: parsePrice(raw.pe || raw.peRatio),
    dividend: parsePrice(raw.dividendYield || raw.yield),
    marketCap: parseVolume(raw.marketCap),
    logo: getCompanyLogo(name, symbol),
    lastUpdate: new Date().toISOString()
  };
}

// Comprehensive fallback data based on actual SET DR listings
function getFallbackDRData() {
  return [
    // US Technology
    { symbol: 'AAPL80', name: 'Apple Inc.', underlying: 'AAPL', market: 'NASDAQ', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน+กลางคืน', price: 6.45, change: 0.05, changePercent: 0.78, volume: 1250000, marketCap: 3800, pe: 31.2, dividend: 0.48 },
    { symbol: 'MSFT80', name: 'Microsoft Corporation', underlying: 'MSFT', market: 'NASDAQ', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน+กลางคืน', price: 14.85, change: -0.12, changePercent: -0.80, volume: 890000, marketCap: 3200, pe: 36.5, dividend: 0.72 },
    { symbol: 'NVDA80', name: 'NVIDIA Corporation', underlying: 'NVDA', market: 'NASDAQ', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน+กลางคืน', price: 4.72, change: 0.18, changePercent: 3.96, volume: 2100000, marketCap: 3400, pe: 65.2, dividend: 0.04 },
    { symbol: 'GOOGL01', name: 'Alphabet Inc.', underlying: 'GOOGL', market: 'NASDAQ', issuer: 'บล.อินโนเวสท์ เอกซ์', ratio: '1:10', tradingHours: 'กลางวัน+กลางคืน', price: 61.20, change: 0.45, changePercent: 0.74, volume: 750000, marketCap: 2200, pe: 24.8, dividend: 0 },
    { symbol: 'META80', name: 'Meta Platforms Inc.', underlying: 'META', market: 'NASDAQ', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน+กลางคืน', price: 19.85, change: 0.32, changePercent: 1.64, volume: 520000, marketCap: 1500, pe: 28.3, dividend: 0.50 },
    { symbol: 'AMZN80', name: 'Amazon.com Inc.', underlying: 'AMZN', market: 'NASDAQ', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน+กลางคืน', price: 7.25, change: 0.08, changePercent: 1.12, volume: 680000, marketCap: 2100, pe: 42.5, dividend: 0 },
    { symbol: 'TSLA80', name: 'Tesla Inc.', underlying: 'TSLA', market: 'NASDAQ', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน+กลางคืน', price: 14.45, change: -0.35, changePercent: -2.37, volume: 1850000, marketCap: 1350, pe: 98.5, dividend: 0 },
    { symbol: 'NFLX80', name: 'Netflix Inc.', underlying: 'NFLX', market: 'NASDAQ', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน+กลางคืน', price: 29.65, change: 0.52, changePercent: 1.79, volume: 290000, marketCap: 380, pe: 48.7, dividend: 0 },
    { symbol: 'AMD80', name: 'Advanced Micro Devices', underlying: 'AMD', market: 'NASDAQ', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน+กลางคืน', price: 4.28, change: 0.15, changePercent: 3.63, volume: 980000, marketCap: 220, pe: 45.2, dividend: 0 },
    { symbol: 'AVGO80', name: 'Broadcom Inc.', underlying: 'AVGO', market: 'NASDAQ', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน+กลางคืน', price: 7.65, change: 0.12, changePercent: 1.59, volume: 320000, marketCap: 1050, pe: 45.2, dividend: 2.12 },
    { symbol: 'COSTCO19', name: 'Costco Wholesale', underlying: 'COST', market: 'NASDAQ', issuer: 'บล.หยวนต้า', ratio: '1:1000', tradingHours: 'กลางวัน+กลางคืน', price: 31.85, change: 0.18, changePercent: 0.57, volume: 180000, marketCap: 410, pe: 52.3, dividend: 1.16 },

    // China/Hong Kong Tech
    { symbol: 'BABA80', name: 'Alibaba Group', underlying: 'BABA', market: 'NYSE', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน+กลางคืน', price: 2.92, change: 0.08, changePercent: 2.82, volume: 980000, marketCap: 210, pe: 18.5, dividend: 0 },
    { symbol: 'TENCENT80', name: 'Tencent Holdings', underlying: '0700.HK', market: 'HKEX', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน', price: 14.25, change: 0.32, changePercent: 2.30, volume: 650000, marketCap: 480, pe: 22.3, dividend: 0.35 },
    { symbol: 'BYDCOM80', name: 'BYD Company', underlying: '1211.HK', market: 'HKEX', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน', price: 9.72, change: 0.25, changePercent: 2.64, volume: 420000, marketCap: 95, pe: 25.8, dividend: 0.15 },
    { symbol: 'XIAOMI80', name: 'Xiaomi Corporation', underlying: '1810.HK', market: 'HKEX', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน', price: 1.78, change: 0.05, changePercent: 2.89, volume: 380000, marketCap: 65, pe: 32.5, dividend: 0 },
    { symbol: 'MEITUAN80', name: 'Meituan', underlying: '3690.HK', market: 'HKEX', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน', price: 5.62, change: -0.08, changePercent: -1.40, volume: 290000, marketCap: 102, pe: 45.2, dividend: 0 },
    { symbol: 'JD80', name: 'JD.com Inc.', underlying: 'JD', market: 'NASDAQ', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน+กลางคืน', price: 1.18, change: 0.03, changePercent: 2.61, volume: 520000, marketCap: 55, pe: 12.8, dividend: 0.76 },
    { symbol: 'PDD80', name: 'PDD Holdings', underlying: 'PDD', market: 'NASDAQ', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน+กลางคืน', price: 3.45, change: 0.12, changePercent: 3.60, volume: 450000, marketCap: 180, pe: 15.2, dividend: 0 },
    { symbol: 'NIO80', name: 'NIO Inc.', underlying: 'NIO', market: 'NYSE', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน+กลางคืน', price: 0.15, change: 0.01, changePercent: 7.14, volume: 890000, marketCap: 8, pe: -5.2, dividend: 0 },
    { symbol: 'XPEV80', name: 'XPeng Inc.', underlying: 'XPEV', market: 'NYSE', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน+กลางคืน', price: 0.52, change: 0.02, changePercent: 4.00, volume: 320000, marketCap: 12, pe: -8.5, dividend: 0 },
    { symbol: 'LI80', name: 'Li Auto Inc.', underlying: 'LI', market: 'NASDAQ', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน+กลางคืน', price: 0.82, change: 0.03, changePercent: 3.80, volume: 280000, marketCap: 22, pe: 18.5, dividend: 0 },

    // Japan
    { symbol: 'TOYOTA19', name: 'Toyota Motor', underlying: '7203.T', market: 'TSE', issuer: 'บล.หยวนต้า', ratio: '1:1000', tradingHours: 'กลางวัน', price: 6.32, change: 0.05, changePercent: 0.80, volume: 180000, marketCap: 280, pe: 9.8, dividend: 2.85 },
    { symbol: 'SONY19', name: 'Sony Group', underlying: '6758.T', market: 'TSE', issuer: 'บล.หยวนต้า', ratio: '1:1000', tradingHours: 'กลางวัน', price: 3.15, change: 0.08, changePercent: 2.61, volume: 145000, marketCap: 115, pe: 18.2, dividend: 0.85 },
    { symbol: 'NINTENDO19', name: 'Nintendo Co.', underlying: '7974.T', market: 'TSE', issuer: 'บล.หยวนต้า', ratio: '1:1000', tradingHours: 'กลางวัน', price: 2.68, change: 0.06, changePercent: 2.29, volume: 125000, marketCap: 85, pe: 22.5, dividend: 1.95 },
    { symbol: 'HONDA19', name: 'Honda Motor', underlying: '7267.T', market: 'TSE', issuer: 'บล.หยวนต้า', ratio: '1:1000', tradingHours: 'กลางวัน', price: 1.42, change: 0.02, changePercent: 1.43, volume: 98000, marketCap: 52, pe: 8.5, dividend: 3.25 },

    // Europe
    { symbol: 'LVMH01', name: 'LVMH Moët Hennessy', underlying: 'MC.PA', market: 'Euronext Paris', issuer: 'บล.อินโนเวสท์ เอกซ์', ratio: '1:10', tradingHours: 'กลางวัน', price: 23.45, change: -0.28, changePercent: -1.18, volume: 85000, marketCap: 345, pe: 24.5, dividend: 1.35 },
    { symbol: 'HERMES80', name: 'Hermès International', underlying: 'RMS.PA', market: 'Euronext Paris', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน', price: 79.85, change: 0.92, changePercent: 1.17, volume: 42000, marketCap: 248, pe: 52.3, dividend: 0.65 },
    { symbol: 'ASML01', name: 'ASML Holding', underlying: 'ASML.AS', market: 'Euronext Amsterdam', issuer: 'บล.อินโนเวสท์ เอกซ์', ratio: '1:10', tradingHours: 'กลางวัน', price: 24.72, change: 0.45, changePercent: 1.85, volume: 68000, marketCap: 295, pe: 42.8, dividend: 0.85 },

    // Singapore
    { symbol: 'DBS19', name: 'DBS Group Holdings', underlying: 'D05.SI', market: 'SGX', issuer: 'บล.หยวนต้า', ratio: '1:1000', tradingHours: 'กลางวัน', price: 1.28, change: 0.02, changePercent: 1.59, volume: 125000, marketCap: 98, pe: 11.2, dividend: 4.85 },
    { symbol: 'UOB19', name: 'United Overseas Bank', underlying: 'U11.SI', market: 'SGX', issuer: 'บล.หยวนต้า', ratio: '1:1000', tradingHours: 'กลางวัน', price: 1.12, change: 0.01, changePercent: 0.90, volume: 95000, marketCap: 55, pe: 10.5, dividend: 4.25 },
    { symbol: 'GRAB80', name: 'Grab Holdings', underlying: 'GRAB', market: 'NASDAQ', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน+กลางคืน', price: 0.16, change: 0.01, changePercent: 6.67, volume: 450000, marketCap: 18, pe: -25.5, dividend: 0 },

    // Vietnam ETF
    { symbol: 'E1VFVN3001', name: 'E1VFVN30 ETF', underlying: 'E1VFVN30', market: 'HOSE', issuer: 'บล.อินโนเวสท์ เอกซ์', ratio: '1:10', tradingHours: 'กลางวัน', price: 0.62, change: 0.01, changePercent: 1.64, volume: 85000, marketCap: 12, pe: 15.2, dividend: 1.85 },
    { symbol: 'FUEVFVND01', name: 'FUEVFVND ETF', underlying: 'FUEVFVND', market: 'HOSE', issuer: 'บล.อินโนเวสท์ เอกซ์', ratio: '1:10', tradingHours: 'กลางวัน', price: 0.58, change: 0.01, changePercent: 1.75, volume: 72000, marketCap: 8, pe: 14.8, dividend: 1.65 },

    // Hong Kong ETFs
    { symbol: 'NDX01', name: 'ChinaAMC NASDAQ 100 ETF', underlying: '3086.HK', market: 'HKEX', issuer: 'บล.อินโนเวสท์ เอกซ์', ratio: '1:10', tradingHours: 'กลางวัน', price: 1.56, change: 0.02, changePercent: 1.30, volume: 320000, marketCap: 85, pe: 0, dividend: 0.45 },
    { symbol: 'CN01', name: 'ChinaAMC CSI 300 ETF', underlying: '3188.HK', market: 'HKEX', issuer: 'บล.อินโนเวสท์ เอกซ์', ratio: '1:10', tradingHours: 'กลางวัน', price: 1.28, change: 0.03, changePercent: 2.40, volume: 185000, marketCap: 52, pe: 0, dividend: 0.65 },
    { symbol: 'HK01', name: 'Tracker Fund of Hong Kong', underlying: '2800.HK', market: 'HKEX', issuer: 'บล.อินโนเวสท์ เอกซ์', ratio: '1:10', tradingHours: 'กลางวัน', price: 0.64, change: 0.01, changePercent: 1.59, volume: 145000, marketCap: 28, pe: 0, dividend: 2.35 },
    { symbol: 'HKTECH13', name: 'Hang Seng TECH Index ETF', underlying: '3032.HK', market: 'HKEX', issuer: 'บล.เคจีไอ', ratio: '1:100', tradingHours: 'กลางวัน', price: 1.42, change: 0.04, changePercent: 2.90, volume: 275000, marketCap: 62, pe: 0, dividend: 0.25 },

    // More US Stocks
    { symbol: 'COIN80', name: 'Coinbase Global', underlying: 'COIN', market: 'NASDAQ', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน+กลางคืน', price: 8.95, change: 0.45, changePercent: 5.29, volume: 420000, marketCap: 45, pe: 32.5, dividend: 0 },
    { symbol: 'PLTR80', name: 'Palantir Technologies', underlying: 'PLTR', market: 'NYSE', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน+กลางคืน', price: 2.85, change: 0.12, changePercent: 4.40, volume: 650000, marketCap: 85, pe: 180, dividend: 0 },
    { symbol: 'UBER80', name: 'Uber Technologies', underlying: 'UBER', market: 'NYSE', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน+กลางคืน', price: 2.48, change: 0.05, changePercent: 2.06, volume: 380000, marketCap: 165, pe: 75.2, dividend: 0 },
    { symbol: 'SHOP80', name: 'Shopify Inc.', underlying: 'SHOP', market: 'NYSE', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน+กลางคืน', price: 3.72, change: 0.08, changePercent: 2.20, volume: 220000, marketCap: 135, pe: 85.5, dividend: 0 },
    { symbol: 'SQ80', name: 'Block Inc.', underlying: 'SQ', market: 'NYSE', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน+กลางคืน', price: 2.95, change: 0.10, changePercent: 3.51, volume: 310000, marketCap: 52, pe: 45.2, dividend: 0 },
    { symbol: 'PYPL80', name: 'PayPal Holdings', underlying: 'PYPL', market: 'NASDAQ', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน+กลางคืน', price: 2.52, change: 0.04, changePercent: 1.61, volume: 280000, marketCap: 72, pe: 18.5, dividend: 0 },
    { symbol: 'CRM80', name: 'Salesforce Inc.', underlying: 'CRM', market: 'NYSE', issuer: 'บล.บัวหลวง', ratio: '1:100', tradingHours: 'กลางวัน+กลางคืน', price: 11.25, change: 0.15, changePercent: 1.35, volume: 185000, marketCap: 285, pe: 42.8, dividend: 0 },
    { symbol: 'ORCL80', name: 'Oracle Corporation', underlying: 'ORCL', market: 'NYSE', issuer: 'ธ.กรุงไทย', ratio: '1:100', tradingHours: 'กลางวัน+กลางคืน', price: 5.82, change: 0.08, changePercent: 1.39, volume: 165000, marketCap: 420, pe: 38.5, dividend: 1.25 },
  ].map(item => {
    // Derive issuer code from symbol suffix (not from issuer text)
    const issuerCode = getIssuerCodeFromSuffix(item.symbol);
    const issuer = getIssuerName(issuerCode);
    return {
      ...item,
      country: detectCountry(item.market, item.underlying, item.symbol),
      sector: detectSector(item.name, item.underlying),
      issuerCode: issuerCode,
      issuer: issuer,  // Override with correct issuer name
      logo: getCompanyLogo(item.name, item.symbol),
      value: item.price * item.volume,
      lastUpdate: new Date().toISOString()
    };
  });
}

// Scrape prices only (for quick updates)
async function scrapePrices() {
  console.log('Updating prices from SET API...');
  const liveData = await scrapeSET();
  if (liveData && liveData.length > 0) {
    // Update existing drData with new prices
    drData = drData.map(dr => {
      const live = liveData.find(l => l.symbol === dr.symbol);
      if (live) {
        return {
          ...dr,
          price: live.price,
          change: live.change,
          changePercent: live.changePercent,
          volume: live.volume,
          value: live.value,
          high: live.high,
          low: live.low,
          open: live.open,
          lastUpdate: live.lastUpdate
        };
      }
      return dr;
    });
    console.log('Price update completed');
  }
  lastUpdateTime = new Date().toISOString();
}

// Full scrape (DR list + prices)
async function scrapeAll() {
  await loadInitialData();
  await updateMarketExtraData();
}

const puppeteer = require('puppeteer');

// Update extra market data (overview, rankings)
async function updateMarketExtraData() {
  let browser = null;
  try {
    console.log('Updating extra market data via Puppeteer...');

    browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: 'new'
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 1. Market Overview
    console.log('Fetching Market Overview...');
    try {
      await page.goto('https://www.set.or.th/api/set/dr/market-overview', { waitUntil: 'networkidle0' });
      const content = await page.evaluate(() => document.body.innerText);
      marketOverview = JSON.parse(content);
    } catch (e) {
      console.error('Failed to fetch Market Overview with Puppeteer:', e.message);
    }

    // 2. Rankings
    console.log('Fetching Rankings...');
    const fetchRanking = async (url) => {
      try {
        await page.goto(url, { waitUntil: 'networkidle0' });
        const content = await page.evaluate(() => document.body.innerText);
        return JSON.parse(content);
      } catch (e) {
        console.error(`Failed to fetch ranking from ${url}:`, e.message);
        return [];
      }
    };

    const gainersData = await fetchRanking('https://www.set.or.th/api/set/ranking/topGainer/SET/X?count=10');
    const losersData = await fetchRanking('https://www.set.or.th/api/set/ranking/topLoser/SET/X?count=10');
    const activeData = await fetchRanking('https://www.set.or.th/api/set/ranking/mostActiveValue/SET/X?count=10');

    rankings = {
      topGainers: gainersData || [],
      topLosers: losersData || [],
      mostActiveValue: activeData || []
    };

    console.log('Extra market data update completed via Puppeteer');
  } catch (error) {
    console.error('Error updating extra market data with Puppeteer:', error.message);
  } finally {
    if (browser) await browser.close();
  }

  // FALLBACK: Calculate from drData if SET scraping failed
  if (!marketOverview && drData.length > 0) {
    console.log('Calculating Market Overview from DR data (Fallback)...');
    marketOverview = {
      gainer: drData.filter(d => d.changePercent > 0).length,
      loser: drData.filter(d => d.changePercent < 0).length,
      unchanged: drData.filter(d => d.changePercent === 0).length,
      totalValue: drData.reduce((sum, d) => sum + (d.value || 0), 0),
      totalVolume: drData.reduce((sum, d) => sum + (d.volume || 0), 0)
    };
  }

  if ((!rankings || rankings.topGainers.length === 0) && drData.length > 0) {
    console.log('Calculating Rankings from DR data (Fallback)...');
    rankings = {
      topGainers: [...drData].sort((a, b) => b.changePercent - a.changePercent).slice(0, 10),
      topLosers: [...drData].sort((a, b) => a.changePercent - b.changePercent).slice(0, 10),
      mostActiveValue: [...drData].sort((a, b) => b.value - a.value).slice(0, 10)
    };
  }
}

// Get News for a specific DR
async function getDRNews(symbol) {
  try {
    const res = await axios.get(`https://www.set.or.th/api/set/news/${symbol}/list?lang=th&limit=10`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.set.or.th/th/market/product/dr/overview'
      }
    });
    return res.data || [];
  } catch (error) {
    console.error(`Error fetching news for ${symbol} with axios:`, error.message);
    return [];
  }
}

// Export functions
module.exports = {
  loadInitialData,
  scrapeAll,
  scrapePrices,
  getAllDRs: () => drData,
  getDRBySymbol: (symbol) => drData.find(dr => dr.symbol === symbol),
  getAllBrokers: () => brokerData.length > 0 ? brokerData : BROKERS.map(broker => ({
    ...broker,
    drCount: drData.filter(dr => dr.issuerCode === broker.id).length
  })),
  getBrokerById: (id) => BROKERS.find(b => b.id === id),
  getMarketOverview: () => marketOverview,
  getRankings: () => rankings,
  getDRNews,
  getLastUpdateTime: () => lastUpdateTime
};
