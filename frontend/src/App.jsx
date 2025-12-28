import { useState, useEffect, useMemo } from 'react';
import { Routes, Route, NavLink, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { drAPI, brokerAPI } from './services/api';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';

// Country names mapping - ordered by importance (major markets first)
const countryNames = { US: 'สหรัฐฯ', HK: 'ฮ่องกง', JP: 'ญี่ปุ่น', EU: 'ยุโรป', SG: 'สิงคโปร์', VN: 'เวียดนาม', CN: 'จีน', TW: 'ไต้หวัน', KR: 'เกาหลีใต้' };

// Helper to determine trading hours from DR data (fallback when backend data is missing)
const getTradingHours = (dr) => {
  // If tradingHours is already set and valid, use it
  if (dr.tradingHours && dr.tradingHours !== 'N/A') return dr.tradingHours;

  // Check by underlying stock or market
  const underlying = (dr.underlying || '').toUpperCase();
  const market = (dr.market || '').toUpperCase();
  const country = dr.country;

  // US stock patterns that have night trading
  const usStockPatterns = /^(AAPL|MSFT|GOOGL|GOOG|META|AMZN|NVDA|TSLA|NFLX|AMD|INTC|COIN|PLTR|UBER|SHOP|SQ|PYPL|CRM|ORCL|ADBE|DIS|V|MA|JPM|BAC|WMT|PG|JNJ|UNH|HD|KO|PEP|MCD|NKE|SBUX|COST|TGT|CVS|WBA|XOM|CVX|COP|MRK|PFE|ABBV|LLY|TMO|ABT|BMY|GILD|QQQ|SPY)/;
  const usMarkets = ['NASDAQ', 'NYSE', 'US'];
  const euMarkets = ['EURONEXT', 'LSE', 'XETRA', 'PARIS', 'AMSTERDAM'];

  const hasNightTrading = usMarkets.some(m => market.includes(m)) ||
    euMarkets.some(m => market.includes(m)) ||
    country === 'US' || country === 'EU' ||
    usStockPatterns.test(underlying);

  return hasNightTrading ? 'กลางวัน+กลางคืน' : 'กลางวันเท่านั้น';
};

// Loading Spinner
const Spinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="spinner w-10 h-10"></div>
  </div>
);

// Trading Session Indicator - shows if market is open or closed
const TradingSessionIndicator = ({ tradingSession }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionType, setSessionType] = useState('');

  useEffect(() => {
    const checkSession = () => {
      const now = new Date();
      // Convert to Bangkok time (UTC+7)
      const bangkokHour = (now.getUTCHours() + 7) % 24;
      const bangkokMinute = now.getUTCMinutes();
      const currentTime = bangkokHour * 60 + bangkokMinute;

      // Day session: 10:00-16:30 (600-990 minutes)
      const dayStart = 10 * 60;       // 600
      const dayEnd = 16 * 60 + 30;    // 990

      // Night session: 19:00-03:00 (1140-180 minutes, crosses midnight)
      const nightStart = 19 * 60;     // 1140
      const nightEnd = 3 * 60;        // 180

      const isDaySession = currentTime >= dayStart && currentTime <= dayEnd;
      const isNightSession = tradingSession?.hasNightTrading &&
        (currentTime >= nightStart || currentTime <= nightEnd);

      if (isDaySession) {
        setIsOpen(true);
        setSessionType('☀️ กลางวัน');
      } else if (isNightSession) {
        setIsOpen(true);
        setSessionType('🌙 กลางคืน');
      } else {
        setIsOpen(false);
        setSessionType('ปิดทำการ');
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [tradingSession]);

  return (
    <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium ${isOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
      <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></span>
      <span>{isOpen ? sessionType : 'ปิดทำการ'}</span>
    </div>
  );
};

// Navigation Component
const Navigation = () => {
  const location = useLocation();
  const navItems = [
    { to: '/', label: 'หน้าหลัก', icon: '🏠' },
    { to: '/catalog', label: 'รายการ DR', icon: '📋' },
    { to: '/compare', label: 'เปรียบเทียบ', icon: '⚖️' },
    { to: '/screener', label: 'DR Screener', icon: '🔍' },
    { to: '/stocks', label: 'หุ้นอ้างอิง', icon: '📚' },
    { to: '/blog', label: 'ความรู้', icon: '🎓' },
    { to: '/brokers', label: 'โบรกเกอร์', icon: '🏢' }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b-4 border-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <NavLink to="/" className="flex items-center space-x-3 cursor-pointer">
            <div className="w-10 h-10 bg-primary-500 border-3 border-black shadow-brutal-sm flex items-center justify-center text-xl font-black text-black">DR</div>
            <div><h1 className="font-display font-black text-lg text-black">DR Thailand Hub</h1><p className="text-xs text-brutalist-muted font-medium">ศูนย์ข้อมูล DR ครบวงจร</p></div>
          </NavLink>
          <div className="hidden md:flex items-center space-x-2">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `px-4 py-2 text-sm font-bold transition-all border-2 border-black ${isActive ? 'bg-primary-500 text-black shadow-brutal-sm' : 'bg-white text-black hover:bg-gray-100'}`}
              >
                <span className="mr-1">{item.icon}</span>{item.label}
              </NavLink>
            ))}
          </div>
          <select
            value={location.pathname}
            onChange={(e) => window.location.href = e.target.value}
            className="md:hidden bg-white border-2 border-black px-3 py-2 text-sm text-black font-bold"
          >
            {navItems.map(item => (
              <option key={item.to} value={item.to}>{item.icon} {item.label}</option>
            ))}
          </select>
        </div>
      </div>
    </nav>
  );
};

// Market Pulse Component
const MarketPulse = ({ overview }) => {
  if (!overview) return null;
  const { gainer, loser, unchanged, totalValue, totalVolume } = overview;
  const total = gainer + loser + unchanged;
  const gainerPct = (gainer / total) * 100;
  const loserPct = (loser / total) * 100;

  return (
    <div className="bg-white border-3 border-black shadow-brutal p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-black text-black flex items-center">
          <span className="mr-2">⚡</span>Market Pulse
        </h3>
        <span className="text-xs text-brutalist-muted font-medium border-2 border-black px-2 py-1 bg-gray-100">อัปเดตแบบ Realtime</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <div className="flex justify-between text-xs mb-1 font-bold">
            <span className="text-green-600">Gainers (+{gainer})</span>
            <span className="text-red-600">Losers (-{loser})</span>
          </div>
          <div className="h-4 w-full border-2 border-black overflow-hidden flex bg-white">
            <div className="h-full bg-green-500" style={{ width: `${gainerPct}%` }}></div>
            <div className="h-full bg-gray-300" style={{ width: `${100 - gainerPct - loserPct}%` }}></div>
            <div className="h-full bg-red-500" style={{ width: `${loserPct}%` }}></div>
          </div>
          <p className="text-xs text-brutalist-muted text-center">อ้างอิงรายตลาด DR ทั้งหมด</p>
        </div>
        <div className="flex items-center justify-center space-x-6">
          <div className="text-center">
            <p className="text-brutalist-muted text-[10px] uppercase tracking-wider mb-1 font-bold">Market Value</p>
            <p className="text-black font-black text-xl">฿{(totalValue / 1000000).toFixed(1)}M</p>
          </div>
          <div className="w-1 h-12 bg-black"></div>
          <div className="text-center">
            <p className="text-brutalist-muted text-[10px] uppercase tracking-wider mb-1 font-bold">Volume</p>
            <p className="text-black font-black text-xl">{(totalVolume / 1000).toFixed(0)}K</p>
          </div>
        </div>
        <div className="flex items-center justify-end">
          <div className="text-right">
            <div className="flex items-center justify-end space-x-2 text-xs">
              <span className="w-3 h-3 bg-green-500 border-2 border-black animate-pulse"></span>
              <span className="text-black font-bold">ตลาดเปิดซื้อขาย</span>
            </div>
            <p className="text-xs text-brutalist-muted mt-1">เวลาไทย {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stats Card
const StatsCard = ({ icon, label, value, subValue, trend }) => (
  <div className="bg-white border-3 border-black shadow-brutal p-6 dr-card">
    <div className="flex items-start justify-between"><div className="text-3xl mb-3">{icon}</div>{trend !== undefined && <span className={`text-xs px-2 py-1 border-2 border-black font-bold ${trend > 0 ? 'bg-green-400' : 'bg-red-400'}`}>{trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%</span>}</div>
    <p className="text-brutalist-muted text-sm mb-1 font-medium">{label}</p><p className="font-display font-black text-2xl text-black">{value}</p>{subValue && <p className="text-brutalist-muted text-xs mt-1">{subValue}</p>}
  </div>
);

// DR Card
const DRCard = ({ dr, onClick, isSelected, onCompareToggle, showCompare }) => {
  const priceClass = dr.changePercent > 0 ? 'price-up' : dr.changePercent < 0 ? 'price-down' : 'price-neutral';
  return (
    <div className="bg-white border-3 border-black shadow-brutal p-5 dr-card cursor-pointer relative group" onClick={() => onClick(dr)}>
      {showCompare && <div className="absolute top-3 right-3 z-10" onClick={(e) => { e.stopPropagation(); onCompareToggle && onCompareToggle(dr.symbol); }}><div className={`w-6 h-6 border-2 border-black flex items-center justify-center transition-all ${isSelected ? 'bg-primary-500' : 'bg-white hover:bg-gray-100'}`}>{isSelected && <span className="text-black text-xs font-bold">✓</span>}</div></div>}
      <div className="relative">
        <div className="flex items-start justify-between mb-3"><div className="flex items-center space-x-3"><span className="text-3xl">{dr.logo}</span><div><h3 className="font-display font-bold text-black">{dr.symbol}</h3><p className="text-brutalist-muted text-xs truncate max-w-[150px]">{dr.name}</p></div></div><span className={`badge-${(dr.country || 'us').toLowerCase()} text-black text-xs px-2 py-1 font-bold`}>{dr.country}</span></div>
        <div className="mb-3"><p className="font-display font-black text-xl text-black">฿{dr.price?.toLocaleString()}</p><p className={`text-sm font-bold ${priceClass}`}>{dr.change > 0 ? '+' : ''}{dr.change?.toFixed(2)} ({dr.changePercent > 0 ? '+' : ''}{dr.changePercent?.toFixed(2)}%)</p></div>
        <div className="grid grid-cols-2 gap-2 text-xs"><div className="bg-gray-100 border-2 border-black p-2"><p className="text-brutalist-muted font-medium">Sector</p><p className="text-black font-bold">{dr.sector}</p></div><div className="bg-gray-100 border-2 border-black p-2"><p className="text-brutalist-muted font-medium">Market</p><p className="text-black font-bold">{dr.market}</p></div></div>
        <div className="flex flex-wrap gap-1 mt-3">{dr.changePercent > 2 && <span className="text-xs bg-primary-500 text-black px-2 py-0.5 border-2 border-black font-bold">🔥 Hot</span>}{dr.tradingHours?.includes('กลางคืน') && <span className="text-xs bg-blue-400 text-black px-2 py-0.5 border-2 border-black font-bold">🌙 Night</span>}</div>
      </div>
    </div>
  );
};

// News Section Component
const NewsSection = ({ symbol }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const res = await drAPI.getNews(symbol);
        if (res.success) setNews(res.data);
      } catch (e) {
        console.error('Failed to fetch news:', e);
      } finally {
        setLoading(false);
      }
    };
    if (symbol) fetchNews();
  }, [symbol]);

  if (loading) return <div className="py-4 text-center text-brutalist-muted text-xs">กำลังโหลดข่าว...</div>;
  if (!news || news.length === 0) return <div className="py-4 text-center text-brutalist-muted text-xs">ไม่พบข่าวล่าสุด</div>;

  return (
    <div className="space-y-3">
      {news.slice(0, 5).map((item, i) => (
        <a key={i} href={`https://www.set.or.th/th/market/news-and-updates/news-details?id=${item.newsId}`} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-xl bg-gray-100/50 hover:bg-gray-100 transition-colors border border-transparent hover:border-black">
          <p className="text-black text-sm font-medium line-clamp-2 mb-1">{item.title}</p>
          <div className="flex items-center justify-between text-[10px] text-brutalist-muted">
            <span>{item.source}</span>
            <span>{new Date(item.datetime).toLocaleDateString('th-TH')}</span>
          </div>
        </a>
      ))}
    </div>
  );
};

// TradingView Chart Component
const TradingViewChart = ({ symbol, underlying, market }) => {
  const containerId = `tradingview_${symbol}`;

  useEffect(() => {
    // Determine the correct TradingView symbol
    const getTVSymbol = () => {
      if (!underlying) return 'NASDAQ:AAPL';
      // Clean up underlying - remove .HK, .T suffixes for lookup but keep original for fallback
      const origU = underlying.toUpperCase();
      const u = origU.replace(/\.(HK|T|PA|AS|SI)$/i, '');
      const m = (market || '').toUpperCase();

      // Comprehensive symbol mappings for all DRs
      const symbolMap = {
        // === US STOCKS - NASDAQ ===
        'AAPL': 'NASDAQ:AAPL', 'MSFT': 'NASDAQ:MSFT', 'GOOGL': 'NASDAQ:GOOGL', 'GOOG': 'NASDAQ:GOOG',
        'META': 'NASDAQ:META', 'AMZN': 'NASDAQ:AMZN', 'NVDA': 'NASDAQ:NVDA', 'TSLA': 'NASDAQ:TSLA',
        'NFLX': 'NASDAQ:NFLX', 'AMD': 'NASDAQ:AMD', 'INTC': 'NASDAQ:INTC', 'COIN': 'NASDAQ:COIN',
        'PYPL': 'NASDAQ:PYPL', 'ADBE': 'NASDAQ:ADBE', 'PEP': 'NASDAQ:PEP', 'SBUX': 'NASDAQ:SBUX',
        'COST': 'NASDAQ:COST', 'QQQ': 'NASDAQ:QQQ', 'AVGO': 'NASDAQ:AVGO',
        'JD': 'NASDAQ:JD', 'PDD': 'NASDAQ:PDD', 'BIDU': 'NASDAQ:BIDU', 'LI': 'NASDAQ:LI', 'GRAB': 'NASDAQ:GRAB',
        // === US STOCKS - NYSE ===
        'PLTR': 'NYSE:PLTR', 'UBER': 'NYSE:UBER', 'CRM': 'NYSE:CRM', 'ORCL': 'NYSE:ORCL',
        'DIS': 'NYSE:DIS', 'V': 'NYSE:V', 'MA': 'NYSE:MA', 'JPM': 'NYSE:JPM', 'BAC': 'NYSE:BAC',
        'WMT': 'NYSE:WMT', 'JNJ': 'NYSE:JNJ', 'PG': 'NYSE:PG', 'KO': 'NYSE:KO', 'MCD': 'NYSE:MCD',
        'NKE': 'NYSE:NKE', 'NIO': 'NYSE:NIO', 'XPEV': 'NYSE:XPEV', 'SHOP': 'NYSE:SHOP', 'SQ': 'NYSE:SQ',
        'BABA': 'NYSE:BABA', 'ONON': 'NYSE:ONON',
        'SPY': 'AMEX:SPY',
        // === HONG KONG STOCKS (HKEX) ===
        '0700': 'HKEX:700', '700': 'HKEX:700', 'TENCENT': 'HKEX:700',
        '1211': 'HKEX:1211', 'BYDCOM': 'HKEX:1211', 'BYD': 'HKEX:1211',
        '1810': 'HKEX:1810', 'XIAOMI': 'HKEX:1810',
        '3690': 'HKEX:3690', 'MEITUAN': 'HKEX:3690',
        '9988': 'HKEX:9988', '2318': 'HKEX:2318', '939': 'HKEX:939', '1299': 'HKEX:1299',
        '3086': 'HKEX:3086', '3188': 'HKEX:3188', '2800': 'HKEX:2800', '3032': 'HKEX:3032',
        '6690': 'HKEX:6690', 'HAIERS': 'HKEX:6690', 'HAIER': 'HKEX:6690',
        '2020': 'HKEX:2020', 'ANTA': 'HKEX:2020',
        '3347': 'HKEX:3347', 'CNSEMI': 'HKEX:3347',
        '1157': 'HKEX:1157', 'CNROBA': 'HKEX:1157',
        '992': 'HKEX:992', 'LENOVO': 'HKEX:992',
        // === JAPAN STOCKS (TSE) ===
        '7203': 'TSE:7203', 'TOYOTA': 'TSE:7203',
        '6758': 'TSE:6758', 'SONY': 'TSE:6758',
        '7974': 'TSE:7974', 'NINTENDO': 'TSE:7974',
        '7267': 'TSE:7267', 'HONDA': 'TSE:7267',
        '6861': 'TSE:6861', 'KEYENCE': 'TSE:6861',
        '6857': 'TSE:6857', 'ADVANT': 'TSE:6857', 'ADVANTEST': 'TSE:6857',
        // === EUROPE STOCKS ===
        'MC': 'EURONEXT:MC', 'LVMH': 'EURONEXT:MC',
        'RMS': 'EURONEXT:RMS', 'HERMES': 'EURONEXT:RMS',
        'ASML': 'EURONEXT:ASML',
        'NOVOB': 'OMXCOP:NOVO_B', 'NOVO': 'OMXCOP:NOVO_B', 'NVO': 'OMXCOP:NOVO_B',
        // === SINGAPORE STOCKS (SGX) ===
        'D05': 'SGX:D05', 'DBS': 'SGX:D05',
        'U11': 'SGX:U11', 'UOB': 'SGX:U11',
        // === ETFs ===
        'E1VFVN30': 'HOSE:E1VFVN30', 'FUEVFVND': 'HOSE:FUEVFVND',
        'GOLD19': 'HKEX:2840',
      };

      // Check if we have an exact mapping
      if (symbolMap[u]) return symbolMap[u];

      // Try parsing underlying with suffix format (e.g., 0700.HK, 7203.T)
      if (origU.includes('.HK')) return `HKEX:${u}`;
      if (origU.includes('.T')) return `TSE:${u}`;
      if (origU.includes('.PA')) return `EURONEXT:${u}`;
      if (origU.includes('.AS')) return `EURONEXT:${u}`;
      if (origU.includes('.SI')) return `SGX:${u}`;

      // Determine exchange from market field
      if (m.includes('HKEX') || m.includes('HK')) return `HKEX:${u}`;
      if (m.includes('TSE') || m.includes('TOKYO') || m.includes('JAPAN')) return `TSE:${u}`;
      if (m.includes('EURONEXT') || m.includes('PARIS') || m.includes('AMSTERDAM')) return `EURONEXT:${u}`;
      if (m.includes('CPH') || m.includes('OMX') || m.includes('COPENHAGEN')) return `OMXCOP:${u}`;
      if (m.includes('XETRA') || m.includes('FRA')) return `XETR:${u}`;
      if (m.includes('SGX') || m.includes('SINGAPORE')) return `SGX:${u}`;
      if (m.includes('HOSE') || m.includes('VN') || m.includes('VIETNAM')) return `HOSE:${u}`;
      if (m.includes('NYSE')) return `NYSE:${u}`;
      if (m.includes('NASDAQ')) return `NASDAQ:${u}`;

      // Default fallback
      return `NASDAQ:${u}`;
    };

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: getTVSymbol(),
      width: '100%',
      height: '100%',
      locale: 'th_TH',
      dateRange: '1D',
      colorTheme: 'light',
      isTransparent: true,
      autosize: true,
      largeChartUrl: ''
    });

    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
      container.appendChild(script);
    }

    return () => {
      if (container) container.innerHTML = '';
    };
  }, [symbol, underlying, market, containerId]);

  return (
    <div className="h-48 w-full bg-white border-2 border-black overflow-hidden">
      <div id={containerId} className="tradingview-widget-container h-full w-full"></div>
    </div>
  );
};


// DR Detail Modal
const DRDetailModal = ({ dr, onClose }) => {
  if (!dr) return null;
  const priceClass = dr.changePercent > 0 ? 'price-up' : dr.changePercent < 0 ? 'price-down' : 'price-neutral';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60"></div>
      <div className="relative bg-white border-4 border-black shadow-brutal-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white p-6 border-b-3 border-black z-20"><button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 border-2 border-black bg-white hover:bg-gray-100 flex items-center justify-center font-bold text-black text-xl">✕</button><div className="flex items-center space-x-4"><span className="text-5xl">{dr.logo}</span><div><h2 className="font-display font-black text-2xl text-black">{dr.symbol}</h2><p className="text-brutalist-muted font-medium">{dr.name}</p></div></div></div>
        <div className="p-6 space-y-8">
          <div className="bg-white border-3 border-black shadow-brutal p-6"><div className="flex items-end justify-between"><div><p className="text-brutalist-muted text-sm mb-1">ราคาล่าสุด</p><p className="font-display font-bold text-4xl text-black">฿{dr.price?.toLocaleString()}</p></div><div className={`text-right ${priceClass}`}><p className="text-2xl font-bold">{dr.changePercent > 0 ? '+' : ''}{dr.changePercent?.toFixed(2)}%</p><p className="text-sm">{dr.change > 0 ? '+' : ''}{dr.change?.toFixed(2)} บาท</p></div></div></div>

          <TradingViewChart symbol={dr.symbol} underlying={dr.underlying} market={dr.market} />

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div><h3 className="font-semibold text-black mb-3">ข้อมูล DR</h3><div className="grid grid-cols-2 gap-3">{[{ label: 'หลักทรัพย์อ้างอิง', value: dr.underlying }, { label: 'ตลาด', value: dr.market }, { label: 'ประเทศ', value: countryNames[dr.country] || dr.country }, { label: 'Sector', value: dr.sector }, { label: 'ผู้ออก', value: dr.issuer }, { label: 'Volume', value: (dr.volume || 0).toLocaleString() }].map((item, i) => (<div key={i} className="bg-gray-100/50 rounded-xl p-3"><p className="text-brutalist-muted text-[10px] mb-1">{item.label}</p><p className="text-black font-medium text-sm">{item.value || '-'}</p></div>))}</div></div>
              <div><h3 className="font-semibold text-black mb-3">⏰ เวลาซื้อขาย</h3><div className="space-y-3">
                <div className="bg-gradient-to-br from-primary-500/10 to-transparent rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-brutalist-muted text-sm">ช่วงเวลาซื้อขาย</p>
                    <TradingSessionIndicator tradingSession={dr.tradingSession || { hasNightTrading: getTradingHours(dr).includes('กลางคืน') }} />
                  </div>
                  <p className="font-display font-bold text-lg text-black">{getTradingHours(dr)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-100/50 rounded-xl p-3">
                    <p className="text-brutalist-muted text-[10px] mb-1">☀️ กลางวัน</p>
                    <p className="text-black font-medium text-sm">{dr.tradingSession?.daySession || '10:00-16:30'}</p>
                  </div>
                  {(dr.tradingSession?.hasNightTrading || getTradingHours(dr).includes('กลางคืน')) && (
                    <div className="bg-gray-100/50 rounded-xl p-3">
                      <p className="text-brutalist-muted text-[10px] mb-1">🌙 กลางคืน</p>
                      <p className="text-black font-medium text-sm">{dr.tradingSession?.nightSession || '19:00-03:00'}</p>
                    </div>
                  )}
                  <div className="bg-gray-100/50 rounded-xl p-3">
                    <p className="text-brutalist-muted text-[10px] mb-1">อัตราแปลง (DR:หุ้น)</p>
                    <p className="text-black font-medium text-sm">{dr.ratio || '100:1'}</p>
                  </div>
                </div>
              </div></div>
            </div>

            <div>
              <h3 className="font-semibold text-black mb-3">📈 ข้อมูลหุ้นอ้างอิง</h3>
              <div className="bg-gray-50 border-2 border-black p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-brutalist-muted text-sm font-medium">หลักทรัพย์อ้างอิง</span>
                  <span className="text-black font-bold">{dr.underlying || dr.symbol?.replace(/\d+$/, '')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-brutalist-muted text-sm font-medium">ตลาด</span>
                  <span className="text-black font-bold">{dr.market || 'N/A'}</span>
                </div>
                <a
                  href={`https://finance.yahoo.com/quote/${dr.underlying || dr.symbol?.replace(/\d+$/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center bg-primary-500 border-2 border-black py-2 text-sm font-bold text-black hover:bg-primary-600 transition-colors"
                >
                  ดูข้อมูลบน Yahoo Finance →
                </a>
                <Link
                  to={`/stocks/${dr.underlying?.replace(/\.(HK|T|PA|AS|SI)$/i, '') || dr.symbol?.replace(/\d+$/, '')}`}
                  onClick={(e) => e.stopPropagation()}
                  className="block w-full text-center bg-white border-2 border-black py-2 text-sm font-bold text-black hover:bg-gray-100 transition-colors"
                >
                  📖 อ่านเกี่ยวกับหุ้นตัวนี้
                </Link>
              </div>
            </div>
          </div>

          <a href={`https://www.set.or.th/th/market/product/dr/quote/${dr.symbol}/price`} target="_blank" rel="noopener noreferrer" className="block w-full bg-primary-500 border-3 border-black shadow-brutal text-black font-bold py-4 text-center transition-all hover:shadow-brutal-lg">ดูข้อมูลบน SET.or.th →</a>
        </div>
      </div>
    </div>
  );
};

// Home Page
const HomePage = ({ setSelectedDR, drList, loading, marketOverview, rankings, brokers }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('gainers');
  const topGainers = useMemo(() => rankings?.topGainers?.length > 0 ? rankings.topGainers : [...drList].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5), [drList, rankings]);
  const topVolume = useMemo(() => rankings?.mostActiveValue?.length > 0 ? rankings.mostActiveValue : [...drList].sort((a, b) => b.value - a.value).slice(0, 5), [drList, rankings]);
  const topLosers = useMemo(() => rankings?.topLosers?.length > 0 ? rankings.topLosers : [...drList].sort((a, b) => a.changePercent - b.changePercent).slice(0, 5), [drList, rankings]);

  const stats = useMemo(() => ({
    totalDR: drList.length,
    brokers: brokers.length || 9,
    countries: [...new Set(drList.map(d => d.country))].length,
    totalVolume: drList.reduce((sum, d) => sum + (d.volume || 0), 0)
  }), [drList, brokers]);

  const handleCountryClick = (code) => {
    navigate(`/catalog?country=${code}`);
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="relative overflow-hidden bg-white border-4 border-black shadow-brutal-lg p-8 lg:p-12">
        <div className="relative z-10">
          <h1 className="font-display font-black text-4xl lg:text-5xl text-black mb-4">ลงทุนหุ้นโลก<br /><span className="text-primary-500">ง่ายๆ ผ่าน DR</span></h1>
          <p className="text-brutalist-muted text-lg max-w-xl mb-6 font-medium">ศูนย์รวมข้อมูล DR ครบวงจร ค้นหา เปรียบเทียบ และติดตาม DR ทั้งหมดในตลาดหลักทรัพย์ไทย</p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => navigate('/catalog')} className="px-6 py-3 bg-primary-500 border-3 border-black shadow-brutal text-black font-bold transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-lg">สำรวจ DR ทั้งหมด →</button>
            <button onClick={() => navigate('/screener')} className="px-6 py-3 bg-white border-3 border-black shadow-brutal text-black font-bold transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-lg">🔍 DR Screener</button>
          </div>
        </div>

      </div>

      <MarketPulse overview={marketOverview || {
        gainer: drList.filter(d => d.changePercent > 0).length,
        loser: drList.filter(d => d.changePercent < 0).length,
        unchanged: drList.filter(d => d.changePercent === 0).length,
        totalValue: drList.reduce((sum, d) => sum + (d.value || 0), 0),
        totalVolume: drList.reduce((sum, d) => sum + (d.volume || 0), 0)
      }} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon="📊" label="จำนวน DR ทั้งหมด" value={stats.totalDR} subValue="ในตลาดหลักทรัพย์ไทย" />
        <StatsCard icon="🏢" label="โบรกเกอร์ผู้ออก" value={stats.brokers} subValue="บริษัทที่ให้บริการ" />
        <StatsCard icon="🌍" label="ประเทศที่ครอบคลุม" value={stats.countries} subValue="ตลาดหลักทรัพย์โลก" />
        <StatsCard icon="📈" label="Volume รวม" value={(stats.totalVolume / 1000000).toFixed(1) + 'M'} subValue="หุ้น (ประมาณการ)" />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-black text-xl text-black">🔥 Trending Updates</h2>
          <div className="flex border-3 border-black">
            {[{ id: 'gainers', label: '↑ Gainers', color: 'bg-green-400' }, { id: 'losers', label: '↓ Losers', color: 'bg-red-400' }, { id: 'active', label: '📊 Most Active', color: 'bg-blue-400' }].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-bold transition-all border-r-2 last:border-r-0 border-black ${activeTab === tab.id ? `${tab.color} text-black` : 'bg-white text-black hover:bg-gray-100'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="bg-white border-3 border-black shadow-brutal p-6 lg:col-span-2">
            <div className="space-y-3">
              {(activeTab === 'gainers' ? topGainers : activeTab === 'losers' ? topLosers : topVolume).map((dr, index) => (
                <div key={dr.symbol} className="flex items-center justify-between p-3 border-2 border-black bg-gray-50 hover:bg-primary-100 transition-colors cursor-pointer group" onClick={() => setSelectedDR(dr)}>
                  <div className="flex items-center space-x-3">
                    <span className="text-black font-mono font-bold text-sm w-5">{index + 1}</span>
                    <span className="text-2xl group-hover:scale-110 transition-transform">{dr.logo}</span>
                    <div>
                      <p className="font-bold text-black">{dr.symbol}</p>
                      <p className="text-brutalist-muted text-xs">{dr.name?.substring(0, 40)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-black">฿{dr.price?.toLocaleString()}</p>
                    <p className={`text-sm font-bold ${dr.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {dr.changePercent >= 0 ? '+' : ''}{dr.changePercent?.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border-3 border-black shadow-brutal p-6">
            <h3 className="font-display font-bold text-black mb-4">🌍 DR ตามประเทศ</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(countryNames).filter(([code]) => drList.some(d => d.country === code)).map(([code, name]) => {
                const count = drList.filter(d => d.country === code).length;
                if (count === 0) return null;
                const flagUrls = {
                  US: 'https://flagcdn.com/w80/us.png',
                  HK: 'https://flagcdn.com/w80/hk.png',
                  CN: 'https://flagcdn.com/w80/cn.png',
                  JP: 'https://flagcdn.com/w80/jp.png',
                  SG: 'https://flagcdn.com/w80/sg.png',
                  VN: 'https://flagcdn.com/w80/vn.png',
                  EU: 'https://flagcdn.com/w80/eu.png',
                  TW: 'https://flagcdn.com/w80/tw.png',
                  KR: 'https://flagcdn.com/w80/kr.png'
                };
                return (
                  <button
                    key={code}
                    onClick={() => handleCountryClick(code)}
                    className="relative overflow-hidden border-3 border-black p-4 text-center hover:shadow-brutal transition-all bg-white group"
                    style={{
                      backgroundImage: `linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), url(${flagUrls[code]})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    <p className="text-black font-black text-2xl">{count}</p>
                    <p className="text-black font-bold text-xs">{name}</p>
                  </button>
                );
              })}
            </div>
            <button onClick={() => navigate('/catalog')} className="w-full mt-4 text-center text-brutalist-muted font-bold text-sm hover:text-primary-500 transition-colors border-2 border-black py-2 bg-white hover:bg-gray-50">ดูทั้งหมด →</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Catalog Page
const CatalogPage = ({ setSelectedDR, compareList, setCompareList, drList, loading }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialCountry = searchParams.get('country') || 'All';

  const [filters, setFilters] = useState({ search: '', country: initialCountry, sector: 'All', sort: 'symbol' });
  const [showCompareMode, setShowCompareMode] = useState(false);

  useEffect(() => {
    const country = searchParams.get('country');
    if (country) {
      setFilters(prev => ({ ...prev, country }));
    }
  }, [location.search]);

  const sectors = useMemo(() => ['All', ...new Set(drList.map(d => d.sector))], [drList]);
  const countries = useMemo(() => ['All', ...new Set(drList.map(d => d.country))], [drList]);

  const filteredDRs = useMemo(() => {
    let result = [...drList];
    if (filters.search) { const s = filters.search.toLowerCase(); result = result.filter(dr => dr.symbol?.toLowerCase().includes(s) || dr.name?.toLowerCase().includes(s)); }
    if (filters.country !== 'All') result = result.filter(dr => dr.country === filters.country);
    if (filters.sector !== 'All') result = result.filter(dr => dr.sector === filters.sector);
    switch (filters.sort) { case 'change': result.sort((a, b) => b.changePercent - a.changePercent); break; case 'volume': result.sort((a, b) => b.volume - a.volume); break; case 'marketCap': result.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0)); break; default: result.sort((a, b) => a.symbol?.localeCompare(b.symbol)); }
    return result;
  }, [filters, drList]);

  const handleCompareToggle = (symbol) => { setCompareList(prev => { if (prev.includes(symbol)) return prev.filter(s => s !== symbol); if (prev.length >= 4) return prev; return [...prev, symbol]; }); };

  if (loading) return <Spinner />;

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6"><h1 className="font-display font-bold text-2xl text-black mb-2">รายการ DR ทั้งหมด</h1><p className="text-brutalist-muted">พบ {filteredDRs.length} DR</p></div>
      <div className="bg-white border-3 border-black shadow-brutal p-4 mb-6"><div className="flex flex-col lg:flex-row lg:items-center gap-4"><div className="flex-1 relative"><input type="text" placeholder="ค้นหา DR, ชื่อบริษัท..." value={filters.search} onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))} className="w-full bg-gray-100 border border-black rounded-xl px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-primary-500" /><span className="absolute left-3 top-1/2 -translate-y-1/2 text-brutalist-muted">🔍</span></div><select value={filters.country} onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))} className="bg-gray-100 border border-black rounded-xl px-4 py-3 min-w-[140px]"><option value="All">🌍 ทุกประเทศ</option>{countries.filter(c => c !== 'All').map(country => (<option key={country} value={country}>{countryNames[country] || country}</option>))}</select><select value={filters.sector} onChange={(e) => setFilters(prev => ({ ...prev, sector: e.target.value }))} className="bg-gray-100 border border-black rounded-xl px-4 py-3 min-w-[140px]"><option value="All">📂 ทุก Sector</option>{sectors.filter(s => s !== 'All').map(sector => (<option key={sector} value={sector}>{sector}</option>))}</select><select value={filters.sort} onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value }))} className="bg-gray-100 border border-black rounded-xl px-4 py-3 min-w-[160px]"><option value="symbol">🔤 ชื่อ A-Z</option><option value="change">📈 % เปลี่ยนแปลง</option><option value="volume">📊 Volume</option><option value="marketCap">💰 Market Cap</option></select><button onClick={() => setShowCompareMode(!showCompareMode)} className={`px-4 py-3 rounded-xl font-medium transition-all ${showCompareMode ? 'bg-primary-500 text-black' : 'bg-gray-100 text-brutalist-muted hover:text-black border border-black'}`}>⚖️ เปรียบเทียบ</button></div></div>
      {showCompareMode && compareList.length > 0 && <div className="bg-white border-3 border-black shadow-brutal p-4 mb-6 flex items-center justify-between"><div className="flex items-center space-x-2"><span className="text-brutalist-muted">เลือกแล้ว:</span>{compareList.map(symbol => { const dr = drList.find(d => d.symbol === symbol); return (<span key={symbol} className="bg-primary-500/20 text-primary-400 px-3 py-1 rounded-full text-sm">{dr?.logo} {symbol}</span>); })}</div><button onClick={() => setCompareList([])} className="text-brutalist-muted hover:text-black text-sm">ล้างทั้งหมด</button></div>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{filteredDRs.map(dr => (<DRCard key={dr.symbol} dr={dr} onClick={setSelectedDR} isSelected={compareList.includes(dr.symbol)} onCompareToggle={handleCompareToggle} showCompare={showCompareMode} />))}</div>
      {filteredDRs.length === 0 && <div className="text-center py-12"><p className="text-brutalist-muted text-lg">ไม่พบ DR ที่ตรงกับเงื่อนไข</p></div>}
    </div>
  );
};

// Compare Page
const ComparePage = ({ compareList, setCompareList, drList }) => {
  const [selectedSymbols, setSelectedSymbols] = useState(compareList.length > 0 ? compareList : []);
  const selectedData = selectedSymbols.map(symbol => drList.find(d => d.symbol === symbol)).filter(Boolean);
  const handleAdd = (symbol) => { if (selectedSymbols.length >= 4 || selectedSymbols.includes(symbol)) return; setSelectedSymbols([...selectedSymbols, symbol]); };
  const handleRemove = (symbol) => setSelectedSymbols(selectedSymbols.filter(s => s !== symbol));
  const compareFields = [
    { key: 'price', label: 'ราคา', format: (v, dr) => `฿${v?.toLocaleString()}` },
    { key: 'changePercent', label: '% เปลี่ยนแปลง', format: (v, dr) => `${v > 0 ? '+' : ''}${v?.toFixed(2)}%`, highlight: true },
    { key: 'volume', label: 'Volume', format: (v, dr) => (v || 0).toLocaleString() },
    { key: 'underlying', label: 'หลักทรัพย์อ้างอิง', format: (v, dr) => v || '-' },
    { key: 'ratio', label: 'อัตราแปลง', format: (v, dr) => v || '100:1' },
    { key: 'tradingHours', label: 'เวลาซื้อขาย', format: (v, dr) => getTradingHours(dr) },
    { key: 'sector', label: 'Sector', format: (v, dr) => v || '-' },
    { key: 'country', label: 'ประเทศ', format: (v, dr) => countryNames[v] || v },
    { key: 'issuer', label: 'ผู้ออก', format: (v, dr) => v || '-' }
  ];

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6"><h1 className="font-display font-bold text-2xl text-black mb-2">เปรียบเทียบ DR</h1><p className="text-brutalist-muted">เลือก DR สูงสุด 4 ตัวเพื่อเปรียบเทียบ</p></div>
      <div className="bg-white border-3 border-black shadow-brutal p-4 mb-6"><div className="flex flex-wrap items-center gap-3"><select onChange={(e) => { if (e.target.value) { handleAdd(e.target.value); e.target.value = ''; } }} className="bg-gray-100 border border-black rounded-xl px-4 py-3 min-w-[250px]"><option value="">+ เพิ่ม DR เพื่อเปรียบเทียบ</option>{drList.filter(d => !selectedSymbols.includes(d.symbol)).map(dr => (<option key={dr.symbol} value={dr.symbol}>{dr.logo} {dr.symbol} - {dr.name}</option>))}</select>{selectedSymbols.map(symbol => { const dr = drList.find(d => d.symbol === symbol); return (<span key={symbol} className="bg-primary-500/20 text-primary-400 px-4 py-2 rounded-xl flex items-center space-x-2"><span>{dr?.logo} {symbol}</span><button onClick={() => handleRemove(symbol)} className="hover:text-black">✕</button></span>); })}</div></div>
      {selectedData.length > 0 ? (<div className="bg-white border-3 border-black shadow-brutal overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-gray-100/50"><th className="text-left p-4 font-semibold text-brutalist-muted min-w-[150px]">รายการ</th>{selectedData.map(dr => (<th key={dr.symbol} className="text-center p-4 min-w-[180px]"><div className="flex flex-col items-center"><span className="text-3xl mb-2">{dr.logo}</span><span className="font-display font-bold text-black">{dr.symbol}</span></div></th>))}</tr></thead><tbody>{compareFields.map((field, index) => (<tr key={field.key} className={index % 2 === 0 ? 'bg-gray-100/30' : ''}><td className="p-4 text-brutalist-muted font-medium">{field.label}</td>{selectedData.map(dr => { const value = dr[field.key]; const formatted = field.format(value, dr); let textClass = 'text-black'; if (field.highlight && field.key === 'changePercent') textClass = value > 0 ? 'text-primary-400' : value < 0 ? 'text-red-400' : 'text-brutalist-muted'; return (<td key={dr.symbol} className={`p-4 text-center font-medium ${textClass}`}>{formatted}</td>); })}</tr>))}</tbody></table></div></div>) : (<div className="bg-white border-3 border-black shadow-brutal p-12 text-center"><p className="text-brutalist-muted text-lg mb-4">เลือก DR เพื่อเริ่มเปรียบเทียบ</p></div>)}
    </div>
  );
};

// Screener Page
const ScreenerPage = ({ setSelectedDR, drList, brokers }) => {
  const [criteria, setCriteria] = useState({ minMarketCap: '', maxMarketCap: '', minPE: '', maxPE: '', minDividend: '', hasDividend: false, nightTrading: false, country: 'All', sector: 'All', broker: 'All' });
  const sectors = useMemo(() => ['All', ...new Set(drList.map(d => d.sector))], [drList]);

  const filteredDRs = useMemo(() => drList.filter(dr => {
    if (criteria.minMarketCap && (dr.marketCap || 0) < parseFloat(criteria.minMarketCap)) return false;
    if (criteria.maxMarketCap && (dr.marketCap || 0) > parseFloat(criteria.maxMarketCap)) return false;
    if (criteria.minPE && (dr.pe || 0) < parseFloat(criteria.minPE)) return false;
    if (criteria.maxPE && (dr.pe || 0) > parseFloat(criteria.maxPE)) return false;
    if (criteria.minDividend && (dr.dividend || 0) < parseFloat(criteria.minDividend)) return false;
    if (criteria.hasDividend && (dr.dividend || 0) <= 0) return false;
    if (criteria.nightTrading && !dr.tradingHours?.includes('กลางคืน')) return false;
    if (criteria.country !== 'All' && dr.country !== criteria.country) return false;
    if (criteria.sector !== 'All' && dr.sector !== criteria.sector) return false;
    if (criteria.broker !== 'All' && dr.issuerCode !== criteria.broker) return false;
    return true;
  }), [criteria, drList]);

  const resetCriteria = () => setCriteria({ minMarketCap: '', maxMarketCap: '', minPE: '', maxPE: '', minDividend: '', hasDividend: false, nightTrading: false, country: 'All', sector: 'All', broker: 'All' });

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6"><h1 className="font-display font-bold text-2xl text-black mb-2">DR Screener</h1><p className="text-brutalist-muted">กรอง DR ตามเงื่อนไขที่คุณต้องการ</p></div>
      <div className="grid lg:grid-cols-4 gap-6">
        <div className="bg-white border-3 border-black shadow-brutal p-6 lg:col-span-1 h-fit">
          <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-black">เงื่อนไข</h2><button onClick={resetCriteria} className="text-brutalist-muted hover:text-black text-sm">รีเซ็ต</button></div>
          <div className="space-y-4">
            <div><label className="block text-brutalist-muted text-sm mb-2">ประเทศ</label><select value={criteria.country} onChange={(e) => setCriteria(prev => ({ ...prev, country: e.target.value }))} className="w-full bg-gray-100 border border-black rounded-xl px-3 py-2 text-black"><option value="All">ทั้งหมด</option>{Object.entries(countryNames).map(([code, name]) => (<option key={code} value={code}>{name}</option>))}</select></div>
            <div><label className="block text-brutalist-muted text-sm mb-2">Sector</label><select value={criteria.sector} onChange={(e) => setCriteria(prev => ({ ...prev, sector: e.target.value }))} className="w-full bg-gray-100 border border-black rounded-xl px-3 py-2 text-black"><option value="All">ทั้งหมด</option>{sectors.filter(s => s !== 'All').map(sector => (<option key={sector} value={sector}>{sector}</option>))}</select></div>
            <div><label className="block text-brutalist-muted text-sm mb-2">โบรกเกอร์ผู้ออก</label><select value={criteria.broker} onChange={(e) => setCriteria(prev => ({ ...prev, broker: e.target.value }))} className="w-full bg-gray-100 border border-black rounded-xl px-3 py-2 text-black"><option value="All">ทั้งหมด</option>{brokers.map(broker => (<option key={broker.id} value={broker.id}>{broker.logo} {broker.name}</option>))}</select></div>
            <div><label className="block text-brutalist-muted text-sm mb-2">Market Cap ($B)</label><div className="flex space-x-2"><input type="number" placeholder="Min" value={criteria.minMarketCap} onChange={(e) => setCriteria(prev => ({ ...prev, minMarketCap: e.target.value }))} className="w-1/2 bg-gray-100 border border-black rounded-xl px-3 py-2 text-black" /><input type="number" placeholder="Max" value={criteria.maxMarketCap} onChange={(e) => setCriteria(prev => ({ ...prev, maxMarketCap: e.target.value }))} className="w-1/2 bg-gray-100 border border-black rounded-xl px-3 py-2 text-black" /></div></div>
            <div><label className="block text-brutalist-muted text-sm mb-2">Dividend Yield ขั้นต่ำ (%)</label><input type="number" placeholder="เช่น 2" value={criteria.minDividend} onChange={(e) => setCriteria(prev => ({ ...prev, minDividend: e.target.value }))} className="w-full bg-gray-100 border border-black rounded-xl px-3 py-2 text-black" /></div>
            <div className="space-y-3 pt-2"><label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" checked={criteria.hasDividend} onChange={(e) => setCriteria(prev => ({ ...prev, hasDividend: e.target.checked }))} className="w-5 h-5 rounded bg-gray-100" /><span className="text-brutalist-muted">มีปันผลเท่านั้น</span></label><label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" checked={criteria.nightTrading} onChange={(e) => setCriteria(prev => ({ ...prev, nightTrading: e.target.checked }))} className="w-5 h-5 rounded bg-gray-100" /><span className="text-brutalist-muted">ซื้อขายกลางคืนได้</span></label></div>
          </div>
          <div className="mt-6 p-4 bg-primary-500/10 rounded-xl"><p className="text-primary-400 font-semibold text-lg">{filteredDRs.length}</p><p className="text-brutalist-muted text-sm">DR ที่ตรงเงื่อนไข</p></div>
        </div>
        <div className="lg:col-span-3">{filteredDRs.length > 0 ? (<div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{filteredDRs.map(dr => (<DRCard key={dr.symbol} dr={dr} onClick={setSelectedDR} showCompare={false} />))}</div>) : (<div className="bg-white border-3 border-black shadow-brutal p-12 text-center"><p className="text-brutalist-muted text-lg">ไม่พบ DR ที่ตรงกับเงื่อนไข</p></div>)}</div>
      </div>
    </div>
  );
};

// Underlying Stocks Data - all securities from DRs with detailed Thai descriptions
const underlyingStocks = [
  // === US STOCKS ===
  {
    symbol: 'AAPL', name: 'Apple Inc.', country: 'US', market: 'NASDAQ', sector: 'Technology',
    description: 'Apple เป็นบริษัทเทคโนโลยีระดับโลกที่โด่งดังจากการสร้างนวัตกรรมที่เปลี่ยนโลก ผลิตภัณฑ์หลักได้แก่ iPhone, iPad, Mac, Apple Watch และ AirPods รวมถึงบริการต่างๆ เช่น App Store, Apple Music, iCloud และ Apple TV+ บริษัทขึ้นชื่อเรื่องการออกแบบที่หรูหราและระบบนิเวศที่เชื่อมต่อกันอย่างลงตัว มูลค่าตลาดของ Apple สูงกว่า 3 ล้านล้านดอลลาร์ ทำให้เป็นหนึ่งในบริษัทที่มีมูลค่าสูงที่สุดในโลก'
  },
  {
    symbol: 'MSFT', name: 'Microsoft Corporation', country: 'US', market: 'NASDAQ', sector: 'Technology',
    description: 'Microsoft เป็นยักษ์ใหญ่ด้านซอฟต์แวร์ที่ก่อตั้งโดย Bill Gates ผลิตภัณฑ์หลักได้แก่ Windows, Office 365, Azure (คลาวด์), LinkedIn และ Xbox บริษัทเป็นผู้นำในตลาด Enterprise Software และกำลังเติบโตอย่างรวดเร็วในด้าน AI ผ่านการลงทุนใน OpenAI รายได้หลักมาจากธุรกิจคลาวด์ Azure ที่เติบโตกว่า 30% ต่อปี'
  },
  {
    symbol: 'GOOGL', name: 'Alphabet Inc.', country: 'US', market: 'NASDAQ', sector: 'Technology',
    description: 'Alphabet เป็นบริษัทแม่ของ Google ซึ่งครองตลาดเสิร์ชเอนจิ้นกว่า 90% ของโลก ผลิตภัณฑ์หลักได้แก่ Google Search, YouTube, Gmail, Google Maps, Chrome และ Android รายได้หลักมาจากโฆษณาดิจิทัล บริษัทยังลงทุนหนักในด้าน AI และรถยนต์ไร้คนขับผ่าน Waymo'
  },
  {
    symbol: 'META', name: 'Meta Platforms', country: 'US', market: 'NASDAQ', sector: 'Technology',
    description: 'Meta (เดิมชื่อ Facebook) เป็นบริษัทโซเชียลมีเดียที่ใหญ่ที่สุดในโลก ครอบครอง Facebook, Instagram, WhatsApp และ Messenger มีผู้ใช้งานรวมกว่า 3 พันล้านคนต่อเดือน บริษัทกำลังลงทุนหนักใน Metaverse และ AI รายได้หลักมาจากโฆษณาบนแพลตฟอร์มโซเชียล'
  },
  {
    symbol: 'AMZN', name: 'Amazon.com', country: 'US', market: 'NASDAQ', sector: 'E-Commerce',
    description: 'Amazon เป็นบริษัทอีคอมเมิร์ซและคลาวด์ที่ใหญ่ที่สุดในโลก ก่อตั้งโดย Jeff Bezos ธุรกิจหลักได้แก่ Marketplace, Amazon Prime, AWS (Amazon Web Services) ซึ่งเป็นผู้นำตลาดคลาวด์ นอกจากนี้ยังมี Alexa, Kindle และ Whole Foods กำไรส่วนใหญ่มาจาก AWS'
  },
  {
    symbol: 'NVDA', name: 'NVIDIA Corporation', country: 'US', market: 'NASDAQ', sector: 'Technology',
    description: 'NVIDIA เป็นผู้นำระดับโลกในด้าน GPU (Graphics Processing Unit) และชิป AI ผลิตภัณฑ์หลักได้แก่ GeForce สำหรับเกม, Quadro สำหรับมืออาชีพ และ H100/A100 สำหรับ AI และ Data Center บริษัทได้รับประโยชน์มหาศาลจากกระแส AI Boom และมีส่วนแบ่งตลาดชิป AI กว่า 80%'
  },
  {
    symbol: 'TSLA', name: 'Tesla Inc.', country: 'US', market: 'NASDAQ', sector: 'Auto',
    description: 'Tesla เป็นผู้นำตลาดรถยนต์ไฟฟ้า (EV) ก่อตั้งโดย Elon Musk ผลิตภัณฑ์หลักได้แก่ Model S, Model 3, Model X, Model Y และ Cybertruck นอกจากนี้ยังมีธุรกิจพลังงานแสงอาทิตย์และ Powerwall บริษัทมี Gigafactory ทั่วโลกและกำลังพัฒนาเทคโนโลยี Full Self-Driving'
  },
  {
    symbol: 'NFLX', name: 'Netflix Inc.', country: 'US', market: 'NASDAQ', sector: 'Entertainment',
    description: 'Netflix เป็นแพลตฟอร์มสตรีมมิ่งวิดีโอชั้นนำของโลก มีสมาชิกกว่า 230 ล้านคนใน 190 ประเทศ ผลิตเนื้อหาออริจินอลมากมายเช่น Stranger Things, Squid Game และ The Crown บริษัทเพิ่งเปิดตัว Ad-supported tier เพื่อขยายฐานลูกค้า'
  },
  {
    symbol: 'AMD', name: 'Advanced Micro Devices', country: 'US', market: 'NASDAQ', sector: 'Technology',
    description: 'AMD เป็นบริษัทชิปคู่แข่งหลักของ Intel และ NVIDIA ผลิตภัณฑ์หลักได้แก่ CPU Ryzen, GPU Radeon และชิปสำหรับ Data Center ภายใต้ชื่อ EPYC บริษัทเติบโตอย่างรวดเร็วจากการแย่งส่วนแบ่งตลาดจาก Intel และกำลังรุกเข้าสู่ตลาด AI'
  },
  {
    symbol: 'AVGO', name: 'Broadcom Inc.', country: 'US', market: 'NASDAQ', sector: 'Technology',
    description: 'Broadcom เป็นบริษัทเซมิคอนดักเตอร์และซอฟต์แวร์โครงสร้างพื้นฐาน ผลิตชิปสำหรับ Networking, Storage และ Wireless บริษัทเพิ่งเข้าซื้อ VMware เพื่อขยายธุรกิจซอฟต์แวร์ รายได้มาจากลูกค้าขนาดใหญ่เช่น Apple และผู้ให้บริการคลาวด์'
  },
  {
    symbol: 'COST', name: 'Costco Wholesale', country: 'US', market: 'NASDAQ', sector: 'Retail',
    description: 'Costco เป็นร้านค้าปลีกแบบสมาชิก (Warehouse Club) ใหญ่อันดับ 2 ของโลก ขายสินค้าหลากหลายตั้งแต่อาหาร เครื่องใช้ไฟฟ้า จนถึงเครื่องประดับ จุดเด่นคือราคาถูกและสินค้า Kirkland Signature ของบริษัทเอง มีสมาชิกกว่า 120 ล้านคนทั่วโลก'
  },
  {
    symbol: 'COIN', name: 'Coinbase Global', country: 'US', market: 'NASDAQ', sector: 'Finance',
    description: 'Coinbase เป็นแพลตฟอร์มซื้อขายคริปโตเคอร์เรนซีที่ใหญ่ที่สุดในสหรัฐฯ รองรับเหรียญกว่า 250 สกุล รายได้หลักมาจากค่าธรรมเนียมการซื้อขาย บริษัทมีใบอนุญาตจาก SEC และถือว่าเป็น Crypto Exchange ที่ถูกกฎหมายที่สุด'
  },
  {
    symbol: 'PLTR', name: 'Palantir Technologies', country: 'US', market: 'NYSE', sector: 'Technology',
    description: 'Palantir เป็นบริษัทซอฟต์แวร์วิเคราะห์ข้อมูลและ AI ที่เชี่ยวชาญด้าน Big Data ลูกค้าหลักคือรัฐบาลสหรัฐฯ และหน่วยข่าวกรอง ผลิตภัณฑ์หลักได้แก่ Gotham สำหรับภาครัฐ และ Foundry สำหรับภาคเอกชน'
  },
  {
    symbol: 'UBER', name: 'Uber Technologies', country: 'US', market: 'NYSE', sector: 'Technology',
    description: 'Uber เป็นแพลตฟอร์มเรียกรถและส่งอาหารที่ใหญ่ที่สุดในโลก ให้บริการใน 70+ ประเทศ ธุรกิจหลักได้แก่ Uber Ride, Uber Eats และ Uber Freight บริษัทเพิ่งทำกำไรได้ครั้งแรกหลังจากขาดทุนมาหลายปี'
  },
  {
    symbol: 'BABA', name: 'Alibaba Group', country: 'US', market: 'NYSE', sector: 'E-Commerce',
    description: 'Alibaba เป็นยักษ์ใหญ่อีคอมเมิร์ซของจีน ก่อตั้งโดย Jack Ma ธุรกิจหลักได้แก่ Taobao, Tmall, Alipay และ Alibaba Cloud แม้จะ IPO ในสหรัฐฯ แต่รายได้ส่วนใหญ่มาจากจีน บริษัทกำลังปรับโครงสร้างและแยกธุรกิจออกเป็นหลายส่วน'
  },
  {
    symbol: 'JD', name: 'JD.com Inc.', country: 'US', market: 'NASDAQ', sector: 'E-Commerce',
    description: 'JD.com เป็นอีคอมเมิร์ซรายใหญ่อันดับ 2 ของจีน รองจาก Alibaba จุดเด่นคือมีระบบโลจิสติกส์เป็นของตัวเอง ส่งสินค้าได้ภายในวันเดียวในหลายเมือง เน้นขายสินค้าของแท้และอิเล็กทรอนิกส์'
  },
  {
    symbol: 'PDD', name: 'PDD Holdings', country: 'US', market: 'NASDAQ', sector: 'E-Commerce',
    description: 'PDD Holdings (Pinduoduo) เป็นแพลตฟอร์มอีคอมเมิร์ซที่เติบโตเร็วที่สุดในจีน เน้นขายสินค้าราคาถูกผ่านระบบ Social Shopping และ Group Buying นอกจากนี้ยังมี Temu ที่กำลังขยายตลาดในสหรัฐฯ และยุโรป'
  },
  {
    symbol: 'NIO', name: 'NIO Inc.', country: 'US', market: 'NYSE', sector: 'Auto',
    description: 'NIO เป็นบริษัทรถยนต์ไฟฟ้าพรีเมียมของจีน คู่แข่งของ Tesla ในตลาดจีน จุดเด่นคือระบบ Battery Swap ที่เปลี่ยนแบตเตอรี่ได้ใน 5 นาที รุ่นยอดนิยมได้แก่ ES6, ES8 และ ET7'
  },
  {
    symbol: 'XPEV', name: 'XPeng Inc.', country: 'US', market: 'NYSE', sector: 'Auto',
    description: 'XPeng เป็นบริษัท EV ของจีนที่เน้นเทคโนโลยีขับขี่อัตโนมัติ ผลิตภัณฑ์หลักได้แก่ P7 รถสปอร์ตไฟฟ้า และ G9 SUV ไฟฟ้า บริษัทมีระบบ XPILOT ที่แข่งกับ Tesla Autopilot'
  },
  {
    symbol: 'LI', name: 'Li Auto Inc.', country: 'US', market: 'NASDAQ', sector: 'Auto',
    description: 'Li Auto เป็นบริษัท EV ของจีนที่เน้นรถ SUV แบบ Extended Range (EREV) ซึ่งมีทั้งมอเตอร์ไฟฟ้าและเครื่องยนต์เล็กสำหรับชาร์จ รุ่นยอดนิยมได้แก่ L7, L8 และ L9 ซึ่งเหมาะกับครอบครัว'
  },
  {
    symbol: 'GRAB', name: 'Grab Holdings', country: 'US', market: 'NASDAQ', sector: 'Technology',
    description: 'Grab เป็น Super App ของเอเชียตะวันออกเฉียงใต้ ให้บริการเรียกรถ ส่งอาหาร และ Digital Payment ในสิงคโปร์ มาเลเซีย อินโดนีเซีย ไทย เวียดนาม และฟิลิปปินส์ เป็นคู่แข่งหลักของ Gojek'
  },
  {
    symbol: 'SHOP', name: 'Shopify Inc.', country: 'US', market: 'NYSE', sector: 'E-Commerce',
    description: 'Shopify เป็นแพลตฟอร์มสร้างร้านค้าออนไลน์ที่ได้รับความนิยมมากที่สุด ช่วยให้ SME สร้างเว็บไซต์ขายของได้ง่ายๆ มีลูกค้ากว่า 2 ล้านร้านค้าทั่วโลก รายได้มาจากค่าสมัครรายเดือนและค่าธรรมเนียมการชำระเงิน'
  },
  {
    symbol: 'SQ', name: 'Block Inc.', country: 'US', market: 'NYSE', sector: 'Finance',
    description: 'Block (เดิมชื่อ Square) เป็นบริษัท Fintech ก่อตั้งโดย Jack Dorsey ผลิตภัณฑ์หลักได้แก่ Square POS สำหรับร้านค้า Cash App สำหรับผู้บริโภค และยังถือหุ้นใน Bitcoin มากพอสมควร'
  },
  {
    symbol: 'PYPL', name: 'PayPal Holdings', country: 'US', market: 'NASDAQ', sector: 'Finance',
    description: 'PayPal เป็นบริษัทชำระเงินออนไลน์ที่ใหญ่ที่สุดในโลก มีผู้ใช้กว่า 400 ล้านบัญชี รองรับการชำระเงินใน 200+ ประเทศ นอกจากนี้ยังมี Venmo แอปโอนเงินยอดนิยมในสหรัฐฯ'
  },
  {
    symbol: 'CRM', name: 'Salesforce Inc.', country: 'US', market: 'NYSE', sector: 'Technology',
    description: 'Salesforce เป็นผู้นำตลาด CRM (Customer Relationship Management) ระดับโลก ช่วยบริษัทจัดการข้อมูลลูกค้าและการขาย ผลิตภัณฑ์ครอบคลุม Sales Cloud, Service Cloud, Marketing Cloud และเพิ่งเปิดตัว Einstein AI'
  },
  {
    symbol: 'ORCL', name: 'Oracle Corporation', country: 'US', market: 'NYSE', sector: 'Technology',
    description: 'Oracle เป็นบริษัทซอฟต์แวร์ระดับองค์กรที่ใหญ่เป็นอันดับ 2 ของโลก เชี่ยวชาญด้าน Database และ ERP Software ปัจจุบันกำลังขยายธุรกิจ Cloud และ AI รวมถึงเป็นพันธมิตรกับ OpenAI'
  },
  // === HONG KONG STOCKS ===
  {
    symbol: '0700', name: 'Tencent Holdings', country: 'HK', market: 'HKEX', sector: 'Technology',
    description: 'Tencent เป็นบริษัทเทคโนโลยีที่ใหญ่ที่สุดของจีน ผลิตภัณฑ์หลักได้แก่ WeChat (ซุปเปอร์แอป 1.3 พันล้านผู้ใช้) และเกมออนไลน์ (League of Legends, PUBG Mobile) นอกจากนี้ยังลงทุนในบริษัทเทคฯ มากมายรวมถึง Tesla, Spotify และ Epic Games'
  },
  {
    symbol: '1211', name: 'BYD Company', country: 'HK', market: 'HKEX', sector: 'Auto',
    description: 'BYD เป็นผู้ผลิตรถยนต์ไฟฟ้าและแบตเตอรี่ที่ใหญ่ที่สุดในโลก มี Warren Buffett เป็นผู้ถือหุ้นใหญ่ ผลิตรถทั้ง EV และ Hybrid รุ่นยอดนิยมได้แก่ Atto 3, Seal และ Dolphin บริษัทยังผลิตแบตเตอรี่ Blade ที่ปลอดภัยมาก'
  },
  {
    symbol: '1810', name: 'Xiaomi Corporation', country: 'HK', market: 'HKEX', sector: 'Technology',
    description: 'Xiaomi เป็นบริษัทเทคโนโลยีที่ขายสมาร์ทโฟนมากเป็นอันดับ 3 ของโลก จุดเด่นคือราคาถูกแต่สเปคสูง นอกจากนี้ยังมีผลิตภัณฑ์ IoT มากมาย เช่น หุ่นยนต์ดูดฝุ่น กล้องวงจรปิด สายรัดข้อมือ และกำลังผลิตรถยนต์ไฟฟ้า SU7'
  },
  {
    symbol: '3690', name: 'Meituan', country: 'HK', market: 'HKEX', sector: 'Technology',
    description: 'Meituan เป็นแพลตฟอร์มส่งอาหารและบริการในจีน คล้าย Grab/Foodpanda ครองส่วนแบ่งตลาด Food Delivery กว่า 65% นอกจากนี้ยังมีบริการจอง Hotel ร้านอาหาร และ Bike Sharing'
  },
  // === JAPAN STOCKS ===
  {
    symbol: '7203', name: 'Toyota Motor', country: 'JP', market: 'TSE', sector: 'Auto',
    description: 'Toyota เป็นผู้ผลิตรถยนต์ที่ใหญ่ที่สุดในโลก โด่งดังเรื่องความทนทานและน่าเชื่อถือ รุ่นยอดนิยมได้แก่ Camry, Corolla, RAV4 และ Land Cruiser นอกจากนี้ยังเป็นผู้บุกเบิกรถ Hybrid ด้วย Prius และกำลังรุกตลาด EV'
  },
  {
    symbol: '6758', name: 'Sony Group', country: 'JP', market: 'TSE', sector: 'Technology',
    description: 'Sony เป็นบริษัทอิเล็กทรอนิกส์และความบันเทิงระดับโลก ผลิตภัณฑ์หลักได้แก่ PlayStation, กล้อง, ทีวี และธุรกิจเพลง/ภาพยนตร์ PlayStation 5 เป็นคอนโซลยอดนิยมที่ขายได้กว่า 50 ล้านเครื่อง'
  },
  {
    symbol: '6861', name: 'Keyence Corporation', country: 'JP', market: 'TSE', sector: 'Technology',
    description: 'Keyence เป็นบริษัทเซ็นเซอร์และระบบอัตโนมัติที่มีกำไรสูงที่สุดในญี่ปุ่น ลูกค้าหลักคือโรงงานที่ต้องการระบบ Automation จุดเด่นคือ Margin กำไรกว่า 50% และไม่มีโรงงานของตัวเอง'
  },
  {
    symbol: '7974', name: 'Nintendo Co.', country: 'JP', market: 'TSE', sector: 'Gaming',
    description: 'Nintendo เป็นบริษัทเกมระดับตำนาน สร้าง Mario, Zelda, Pokemon และคอนโซล Switch ที่ขายได้กว่า 130 ล้านเครื่อง บริษัทมีแฟนคลับเหนียวแน่นและกำลังเตรียมเปิดตัว Switch 2'
  },
  {
    symbol: '7267', name: 'Honda Motor', country: 'JP', market: 'TSE', sector: 'Auto',
    description: 'Honda เป็นผู้ผลิตรถยนต์และมอเตอร์ไซค์ชั้นนำ รุ่นยอดนิยมได้แก่ Civic, Accord, CR-V และ City นอกจากนี้ยังมีธุรกิจเครื่องยนต์ และกำลังร่วมมือกับ Sony สร้างรถ EV ชื่อ Afeela'
  },
  // === EUROPE STOCKS ===
  {
    symbol: 'NOVOB', name: 'Novo Nordisk', country: 'EU', market: 'CPH', sector: 'Healthcare',
    description: 'Novo Nordisk เป็นบริษัทยาจากเดนมาร์กที่ใหญ่ที่สุดในยุโรป เชี่ยวชาญด้านยารักษาเบาหวานและโรคอ้วน ผลิตภัณฑ์หลักได้แก่ Ozempic และ Wegovy ซึ่งกำลังได้รับความนิยมอย่างมากสำหรับลดน้ำหนัก มูลค่าบริษัทเติบโตกว่า 3 เท่าในช่วง 2 ปีที่ผ่านมา'
  },
  {
    symbol: 'MC', name: 'LVMH Moët Hennessy', country: 'EU', market: 'Euronext Paris', sector: 'Luxury',
    description: 'LVMH เป็นกลุ่มสินค้าหรูหราที่ใหญ่ที่สุดในโลก ก่อตั้งโดย Bernard Arnault มหาเศรษฐีอันดับ 1 ของโลก แบรนด์ในเครือได้แก่ Louis Vuitton, Dior, Fendi, Givenchy, Tiffany, Bulgari รวมถึงไวน์ Moët และ Hennessy รายได้กว่า 80 พันล้านยูโรต่อปี'
  },
  {
    symbol: 'RMS', name: 'Hermès International', country: 'EU', market: 'Euronext Paris', sector: 'Luxury',
    description: 'Hermès เป็นแบรนด์หรูระดับตำนานจากฝรั่งเศส โด่งดังจากกระเป๋า Birkin และ Kelly ที่มีราคาหลักล้านบาทและต้องรอคิวซื้อหลายปี สินค้าอื่นๆ ได้แก่ ผ้าพันคอ เครื่องหนัง และน้ำหอม บริษัทมี Margin กำไรสูงที่สุดในอุตสาหกรรม Luxury'
  },
  {
    symbol: 'ASML', name: 'ASML Holding', country: 'EU', market: 'Euronext Amsterdam', sector: 'Technology',
    description: 'ASML เป็นบริษัทเดียวในโลกที่ผลิตเครื่อง EUV Lithography สำหรับทำชิปขั้นสูง ลูกค้าได้แก่ TSMC, Samsung และ Intel เครื่องแต่ละเครื่องราคากว่า 5 พันล้านบาท ถือเป็น Monopoly ในอุตสาหกรรมเซมิคอนดักเตอร์'
  },
  // === SINGAPORE STOCKS ===
  {
    symbol: 'D05', name: 'DBS Group Holdings', country: 'SG', market: 'SGX', sector: 'Finance',
    description: 'DBS เป็นธนาคารที่ใหญ่ที่สุดในเอเชียตะวันออกเฉียงใต้ มีสำนักงานใหญ่ที่สิงคโปร์ ได้รับรางวัล Best Bank in Asia หลายปีซ้อน จุดเด่นคือ Digital Banking ที่ทันสมัยและเสถียรภาพทางการเงินที่แข็งแกร่ง'
  },
  {
    symbol: 'U11', name: 'United Overseas Bank', country: 'SG', market: 'SGX', sector: 'Finance',
    description: 'UOB เป็นธนาคารชั้นนำของสิงคโปร์ มีสาขาใน 19 ประเทศรวมถึงไทย เน้นลูกค้า SME และ Retail Banking ล่าสุดเข้าซื้อธุรกิจ Consumer Banking ของ Citigroup ในเอเชีย'
  },
  // === VIETNAM ===
  {
    symbol: 'E1VFVN30', name: 'E1VFVN30 ETF', country: 'VN', market: 'HOSE', sector: 'ETF',
    description: 'E1VFVN30 เป็น ETF ที่ลงทุนในหุ้น 30 ตัวใหญ่ที่สุดในตลาดหุ้นเวียดนาม ครอบคลุมธนาคาร อสังหาฯ และธุรกิจบริโภค เหมาะสำหรับนักลงทุนที่ต้องการลงทุนในเศรษฐกิจเวียดนามที่เติบโตเร็ว'
  },
  {
    symbol: 'FUEVFVND', name: 'FUEVFVND ETF', country: 'VN', market: 'HOSE', sector: 'ETF',
    description: 'FUEVFVND เป็น ETF ที่ลงทุนในหุ้นเวียดนามแบบ Diversified ครอบคลุมหลายภาคธุรกิจ เป็นทางเลือกสำหรับนักลงทุนที่ต้องการกระจายความเสี่ยงในตลาด Emerging Market ของเอเชีย'
  },
  // === TAIWAN STOCKS ===
  {
    symbol: 'TSM', name: 'Taiwan Semiconductor (TSMC)', country: 'TW', market: 'NYSE/TWSE', sector: 'Technology',
    description: 'TSMC (Taiwan Semiconductor Manufacturing Company) เป็นโรงงานผลิตชิปที่ใหญ่ที่สุดในโลก ผลิตชิปให้กับ Apple, NVIDIA, AMD, Qualcomm และบริษัทชั้นนำอื่นๆ มีส่วนแบ่งตลาด Foundry กว่า 55% ของโลก เป็นบริษัทที่มีมูลค่าสูงที่สุดในเอเชีย และมีเทคโนโลยีการผลิตชิปขั้นสูงที่สุด (3nm, 5nm) ที่คู่แข่งอย่าง Samsung และ Intel ยังตามไม่ทัน'
  },
  {
    symbol: '2330', name: 'TSMC (Taiwan Listed)', country: 'TW', market: 'TWSE', sector: 'Technology',
    description: 'TSMC หุ้นที่จดทะเบียนในตลาดหลักทรัพย์ไต้หวัน (TWSE) เป็นหุ้นตัวเดียวกับ TSM ที่ซื้อขายในสหรัฐฯ แต่ซื้อขายเป็นเงินไต้หวันดอลลาร์ (TWD) บริษัทเป็นผู้ผลิตเซมิคอนดักเตอร์แบบ Contract Manufacturing รายใหญ่ที่สุดของโลก'
  },
  {
    symbol: 'FOXCONN', name: 'Hon Hai Precision (Foxconn)', country: 'TW', market: 'TWSE', sector: 'Technology',
    description: 'Hon Hai หรือที่รู้จักในชื่อ Foxconn เป็นบริษัทผลิตอิเล็กทรอนิกส์แบบ OEM ที่ใหญ่ที่สุดในโลก เป็นผู้ประกอบ iPhone ให้ Apple และผลิตอุปกรณ์ให้กับบริษัทเทคโนโลยีชั้นนำ มีโรงงานทั่วโลกและพนักงานกว่า 1 ล้านคน'
  },
  // === CHINA A-SHARES ===
  {
    symbol: 'CSI300', name: 'CSI 300 Index', country: 'CN', market: 'SSE/SZSE', sector: 'Index',
    description: 'CSI 300 เป็นดัชนีหุ้นที่สำคัญที่สุดของจีน ประกอบด้วยหุ้น 300 ตัวที่มีขนาดใหญ่และสภาพคล่องสูงสุดในตลาดเซี่ยงไฮ้ (SSE) และเซินเจิ้น (SZSE) ครอบคลุมหลายภาคธุรกิจ ถือเป็นตัวแทนของเศรษฐกิจจีนแผ่นดินใหญ่ที่ดีที่สุด'
  },
];


// Stocks Page - shows all underlying securities
const StocksPage = ({ drList }) => {
  const navigate = useNavigate();
  const [selectedCountry, setSelectedCountry] = useState('All');

  const countries = ['All', 'US', 'HK', 'JP', 'EU', 'SG', 'VN', 'CN', 'TW'];
  const countryLabels = { 'All': '🌍 ทั้งหมด', 'US': '🇺🇸 สหรัฐฯ', 'HK': '🇭🇰 ฮ่องกง', 'JP': '🇯🇵 ญี่ปุ่น', 'EU': '🇪🇺 ยุโรป', 'SG': '🇸🇬 สิงคโปร์', 'VN': '🇻🇳 เวียดนาม', 'CN': '🇨🇳 จีน', 'TW': '🇹🇼 ไต้หวัน' };

  const filteredStocks = selectedCountry === 'All'
    ? underlyingStocks
    : underlyingStocks.filter(s => s.country === selectedCountry);

  // Get related DRs for each stock - improved matching with manual overrides
  const getRelatedDRs = (stockSymbol) => {
    // Manual mapping for cases where automatic matching might fail or numeric codes differ
    const manualMap = {
      // HK Stocks
      '0700': ['TENCENT80'],
      '1211': ['BYDCOM80'],
      '1810': ['XIAOMI80'],
      '9618': ['JD80'],
      '9988': ['BABA80'],
      '3690': ['MEITUAN80'],
      '2318': ['PINGAN80'],
      '1299': ['AIA80'],
      // Japan Stocks
      '7974': ['NINTENDO19'],
      '7203': ['TOYOTA19'],
      '6758': ['SONY19'],
      '6861': ['KEYENCE19'],
      '7267': ['HONDA19'],
      '9983': ['FASTRET19'],
      '9984': ['SFTBANK19'],
      '8035': ['TEL19'],
      '4063': ['SHINET19'],
      '6146': ['DISCO19'],
      '6920': ['ASR19'],
      '6501': ['HITACHI19'],
      '6902': ['DENSO19'],
      '7741': ['HOYA19'],
      '6098': ['RECRUIT19'],
      '6367': ['DAIKIN19'],
      '4543': ['TERUMO19'],
      '8031': ['MITSUI19'],
      '8058': ['MITSUB19'],
      '8001': ['ITOCHU19'],
      // Europe
      'MC': ['LVMH01'],
      'RMS': ['HERMES80'],
      'ASML': ['ASML01'],
      'KER': ['KERING01'],
      'OR': ['LOREAL01'],
      'SAP': ['SAP01'],
      'LIN': ['LINDE01'],
      'AIR': ['AIRBUS01'],
      'SIE': ['SIEMENS01'],
      'DTE': ['DTE01'],
      'ALV': ['ALLIANZ01'],
      'BMW': ['BMW01'],
      'MBG': ['MERCEDES01'],
      'VOW': ['VW01'],
      'ADS': ['ADIDAS01'],
      // Europe Healthcare
      'NOVOB': ['NOVO80'],
      // Vietnam & Singapore
      'E1VFVN30': ['E1VFVN3001'],
      'FUEVFVND': ['FUEVFVND01'],
      'D05': ['DBS19'],
      'U11': ['UOB19'],
      // US Tech (Direct Map)
      'TSLA': ['TSLA80'],
      'AAPL': ['AAPL80'],
      'NVDA': ['NVDA80'],
      'GOOGL': ['GOOGL80', 'GOOGL01'],
      'MSFT': ['MSFT80'],
      'AMZN': ['AMZN80'],
      'META': ['META80'],
      'NFLX': ['NFLX80'],
      'SBUX': ['SBUX80'],
      'BA': ['BA80'],
      'DIS': ['DIS80'],
      'JNJ': ['JNJ80'],
      'KO': ['KO80'],
      'PEP': ['PEP80'],
      'PG': ['PG80'],
      'WMT': ['WMT80'],
      'XOM': ['XOM80'],
      'CVX': ['CVX80'],
      'BAC': ['BAC80'],
      'JPM': ['JPM80'],
      'V': ['V80'],
      'MA': ['MA80'],
      'CRM': ['CRM80'],
      'ADBE': ['ADBE80'],
      'ORCL': ['ORCL80', 'ORCL01'],
      'AMD': ['AMD80'],
      'INTC': ['INTC80'],
      'QCOM': ['QCOM80'],
      'TXN': ['TXN80'],
      'AVGO': ['AVGO80'],
      'COST': ['COST80'],
      'TMUS': ['TMUS80'],
      'CMCSA': ['CMCSA80'],
      'CSCO': ['CSCO80'],
      'AMGN': ['AMGN80'],
      'HON': ['HON80'],
      'UNH': ['UNH80'],
      'MCD': ['MCD80'],
      'NKE': ['NKE80'],
      'PM': ['PM80'],
      'LOW': ['LOW80'],
      'UPS': ['UPS80'],
      'RTX': ['RTX80'],
      'LMT': ['LMT80'],
      'CAT': ['CAT80'],
      'DE': ['DE80'],
      'GE': ['GE80'],
      'MMM': ['MMM80'],
      'IBM': ['IBM80'],
      'T': ['T80'],
      'VZ': ['VZ80'],
      // US Stocks - Additional (previously missing)
      'COIN': ['COIN80'],
      'PDD': ['PDD80'],
      'NIO': ['NIO80'],
      'XPEV': ['XPEV80'],
      'LI': ['LI80'],
      'GRAB': ['GRAB80'],
      'SHOP': ['SHOP80'],
      'SQ': ['SQ80'],
      'PYPL': ['PYPL80'],
      'PLTR': ['PLTR80'],
      'UBER': ['UBER80'],
      'JD': ['JD80'],
      'BABA': ['BABA80'],
      // Taiwan
      'TSM': ['TSM80', 'TSMC80'],
      '2330': ['TSM80', 'TSMC80'],
      'FOXCONN': ['FOXCONN80'],
      // China A-Shares
      'CSI300': ['CSI300'],
    };

    // If manual mapping exists, prioritize it
    if (manualMap[stockSymbol]) {
      const targetSymbols = manualMap[stockSymbol];
      // Find DRs that match the mapped symbols
      const mappedDRs = drList.filter(dr => targetSymbols.includes(dr.symbol));
      // Only return if we actually found matches, otherwise fall back to fuzzy logic
      if (mappedDRs.length > 0) return mappedDRs;
    }

    const cleanSymbol = stockSymbol.toUpperCase().replace(/\.(HK|T|PA|AS|SI)$/i, '');
    return drList.filter(dr => {
      const drUnderlying = (dr.underlying || '').toUpperCase().replace(/\.(HK|T|PA|AS|SI)$/i, '');
      const drSymbol = (dr.symbol || '').toUpperCase().replace(/\d+$/, ''); // Remove trailing numbers like 80, 01, 19
      return drUnderlying.includes(cleanSymbol) || drUnderlying === cleanSymbol || drSymbol === cleanSymbol;
    });
  };

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-black mb-2">📚 หุ้นอ้างอิง</h1>
        <p className="text-brutalist-muted">เรียนรู้เกี่ยวกับหุ้นต่างประเทศที่มี DR ซื้อขายในตลาดหลักทรัพย์ไทย</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {countries.map(c => (
          <button
            key={c}
            onClick={() => setSelectedCountry(c)}
            className={`px-4 py-2 font-bold border-2 border-black transition-all ${selectedCountry === c
              ? 'bg-primary-500 text-black shadow-brutal'
              : 'bg-white text-black hover:bg-gray-100'
              }`}
          >
            {countryLabels[c]}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStocks.map(stock => {
          const relatedDRs = getRelatedDRs(stock.symbol);
          return (
            <div key={stock.symbol} className="bg-white border-3 border-black shadow-brutal p-6 hover:shadow-brutal-lg transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg text-black">{stock.symbol}</h3>
                  <p className="text-brutalist-muted text-sm">{stock.name}</p>
                </div>
                <span className="text-xs bg-gray-100 border border-black px-2 py-1 text-black">{stock.market}</span>
              </div>
              <p className="text-sm text-brutalist-muted mb-4">{stock.description}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-brutalist-muted">{stock.sector}</span>
                {relatedDRs.length > 0 && (
                  <span className="text-primary-500 font-bold">{relatedDRs.length} DR ที่มี</span>
                )}
              </div>
              <button
                onClick={() => navigate(`/stocks/${stock.symbol}`)}
                className="mt-4 w-full bg-primary-500 border-2 border-black py-2 text-sm font-bold text-black hover:bg-primary-600 transition-colors"
              >
                อ่านเพิ่มเติม →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Stock Detail Page - shows detailed info about a stock
const StockDetailPage = ({ drList, setSelectedDR }) => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const stock = underlyingStocks.find(s => s.symbol.toUpperCase() === symbol?.toUpperCase());
  // Improved matching with suffix handling
  const cleanSymbol = symbol?.toUpperCase().replace(/\.(HK|T|PA|AS|SI)$/i, '') || '';
  const relatedDRs = drList.filter(dr => {
    const drUnderlying = (dr.underlying || '').toUpperCase().replace(/\.(HK|T|PA|AS|SI)$/i, '');
    const drSymbolClean = (dr.symbol || '').toUpperCase().replace(/\d+$/, ''); // Remove trailing numbers
    return drUnderlying.includes(cleanSymbol) || drUnderlying === cleanSymbol || drSymbolClean === cleanSymbol;
  });

  if (!stock) {
    return (
      <div className="text-center py-12">
        <p className="text-brutalist-muted text-lg mb-4">ไม่พบข้อมูลหุ้น {symbol}</p>
        <button onClick={() => navigate('/stocks')} className="bg-primary-500 border-2 border-black px-6 py-2 text-black font-bold">
          ← กลับไปหน้าหุ้นอ้างอิง
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate('/stocks')} className="mb-6 text-brutalist-muted hover:text-black font-medium">
        ← กลับไปหน้าหุ้นอ้างอิง
      </button>

      <div className="bg-white border-3 border-black shadow-brutal p-8 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-3xl text-black mb-2">{stock.name}</h1>
            <p className="text-brutalist-muted text-lg">{stock.symbol} • {stock.market}</p>
          </div>
          <span className="text-sm bg-gray-100 border border-black px-3 py-1">{stock.sector}</span>
        </div>
        <p className="text-black text-lg mb-6">{stock.description}</p>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-gray-50 border border-black p-4">
            <p className="text-brutalist-muted text-sm mb-1">ประเทศ</p>
            <p className="text-black font-bold">{countryNames[stock.country] || stock.country}</p>
          </div>
          <div className="bg-gray-50 border border-black p-4">
            <p className="text-brutalist-muted text-sm mb-1">ตลาด</p>
            <p className="text-black font-bold">{stock.market}</p>
          </div>
          <div className="bg-gray-50 border border-black p-4">
            <p className="text-brutalist-muted text-sm mb-1">Sector</p>
            <p className="text-black font-bold">{stock.sector}</p>
          </div>
        </div>
      </div>

      {relatedDRs.length > 0 && (
        <div className="mb-6">
          <h2 className="font-display font-bold text-xl text-black mb-4">DR ที่เกี่ยวข้อง ({relatedDRs.length})</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {relatedDRs.map(dr => (
              <div key={dr.symbol} className="bg-white border-2 border-black p-4 hover:bg-gray-50 cursor-pointer hover:shadow-brutal transition-all" onClick={() => setSelectedDR(dr)}>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{dr.logo}</span>
                  <div>
                    <p className="font-bold text-black">{dr.symbol}</p>
                    <p className="text-sm text-brutalist-muted">{dr.name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <a
        href={`https://finance.yahoo.com/quote/${stock.symbol}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block bg-primary-500 border-3 border-black shadow-brutal px-6 py-3 text-black font-bold hover:shadow-brutal-lg transition-all mb-8"
      >
        ดูข้อมูลเพิ่มเติมบน Yahoo Finance →
      </a>

      {/* Detailed Thai Company Analysis */}
      <div className="bg-white border-3 border-black shadow-brutal p-8">
        <h2 className="font-display font-bold text-2xl text-black mb-6 border-b-3 border-black pb-3">📊 วิเคราะห์บริษัทเชิงลึก</h2>

        <div className="space-y-6 text-black">
          <div>
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <span className="bg-primary-500 text-black px-2 py-1 text-sm border-2 border-black">1</span>
              ภาพรวมธุรกิจ
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {stock.symbol === 'AAPL' && 'Apple Inc. ก่อตั้งโดย Steve Jobs, Steve Wozniak และ Ronald Wayne ในปี 1976 ปัจจุบันเป็นหนึ่งในบริษัทเทคโนโลยีที่ทรงอิทธิพลที่สุดในโลก มีมูลค่าตลาดสูงกว่า 3 ล้านล้านดอลลาร์สหรัฐ สำนักงานใหญ่ตั้งอยู่ที่ Cupertino, California บริษัทมีพนักงานมากกว่า 160,000 คนทั่วโลก และมีรายได้ประมาณ 380 พันล้านดอลลาร์ต่อปี Apple ได้สร้างนวัตกรรมที่เปลี่ยนแปลงอุตสาหกรรมหลายครั้ง ตั้งแต่ Macintosh ในปี 1984, iPod ในปี 2001, iPhone ในปี 2007 และ iPad ในปี 2010'}
              {stock.symbol === 'MSFT' && 'Microsoft Corporation ก่อตั้งโดย Bill Gates และ Paul Allen ในปี 1975 เป็นหนึ่งในบริษัทซอฟต์แวร์ที่ใหญ่ที่สุดในโลก มูลค่าตลาดปัจจุบันเกิน 3 ล้านล้านดอลลาร์ สำนักงานใหญ่ตั้งอยู่ที่ Redmond, Washington มีพนักงานกว่า 220,000 คน รายได้ประจำปีมากกว่า 200 พันล้านดอลลาร์ Microsoft เป็นผู้นำในตลาดระบบปฏิบัติการ (Windows), ซอฟต์แวร์องค์กร (Office 365) และคลาวด์ (Azure)'}
              {stock.symbol === 'NVDA' && 'NVIDIA Corporation ก่อตั้งโดย Jensen Huang ในปี 1993 โดยมุ่งเน้นการผลิต GPU (Graphics Processing Unit) สำนักงานใหญ่ตั้งอยู่ที่ Santa Clara, California ปัจจุบันมีมูลค่าตลาดเกิน 1 ล้านล้านดอลลาร์ เป็นผู้นำตลาดชิปสำหรับ AI และ Data Center มีส่วนแบ่งตลาดชิป AI มากกว่า 80% รายได้เติบโตอย่างก้าวกระโดดจากกระแส AI Boom พนักงานกว่า 26,000 คนทั่วโลก'}
              {stock.symbol === 'GOOGL' && 'Alphabet Inc. เป็นบริษัทแม่ของ Google ก่อตั้งในปี 2015 แต่ Google เริ่มต้นมาตั้งแต่ปี 1998 โดย Larry Page และ Sergey Brin ขณะเป็นนักศึกษาที่ Stanford สำนักงานใหญ่ตั้งอยู่ที่ Mountain View, California มูลค่าตลาดเกิน 1.5 ล้านล้านดอลลาร์ Google ครองส่วนแบ่งตลาด Search Engine กว่า 90% ทั่วโลก มีพนักงานกว่า 180,000 คน'}
              {stock.symbol === 'TSLA' && 'Tesla Inc. ก่อตั้งปี 2003 โดย Martin Eberhard และ Marc Tarpenning แต่ Elon Musk เข้ามาเป็นผู้ถือหุ้นใหญ่และนำบริษัทตั้งแต่ปี 2004 สำนักงานใหญ่ตั้งอยู่ที่ Austin, Texas มูลค่าตลาดกว่า 800 พันล้านดอลลาร์ เป็นผู้นำตลาดรถยนต์ไฟฟ้า มี Gigafactory ในสหรัฐฯ จีน และเยอรมนี พนักงานกว่า 127,000 คนทั่วโลก'}
              {stock.symbol === '0700' && 'Tencent Holdings ก่อตั้งในปี 1998 โดย Ma Huateng (Pony Ma) ที่เมือง Shenzhen ประเทศจีน มูลค่าตลาดกว่า 400 พันล้านดอลลาร์ เป็นบริษัทเทคโนโลยีที่ใหญ่ที่สุดของจีน และใหญ่เป็นอันดับต้นๆ ของโลก มีผู้ใช้ WeChat กว่า 1.3 พันล้านคนต่อเดือน และเป็นผู้พัฒนาเกมที่ใหญ่ที่สุดในโลก'}
              {stock.symbol === '1211' && 'BYD Company ก่อตั้งในปี 1995 โดย Wang Chuanfu ในเมือง Shenzhen ประเทศจีน เดิมเป็นผู้ผลิตแบตเตอรี่ก่อนจะขยายเข้าสู่ธุรกิจรถยนต์ไฟฟ้า ปัจจุบันเป็นผู้ผลิต EV รายใหญ่ที่สุดในโลก (แซงหน้า Tesla ในปี 2023) มี Warren Buffett เป็นผู้ถือหุ้นใหญ่ มูลค่าตลาดกว่า 80 พันล้านดอลลาร์'}
              {stock.symbol === 'NOVOB' && 'Novo Nordisk ก่อตั้งในปี 1923 ที่ประเทศเดนมาร์ก เป็นบริษัทยาที่มีประวัติยาวนานกว่า 100 ปี มูลค่าตลาดปัจจุบันเกิน 400 พันล้านดอลลาร์ ทำให้เป็นบริษัทที่มีมูลค่าสูงที่สุดในยุโรป เชี่ยวชาญด้านยารักษาเบาหวานและโรคอ้วน มีส่วนแบ่งตลาดอินซูลินกว่า 30% ของโลก'}
              {!['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'TSLA', '0700', '1211', 'NOVOB'].includes(stock.symbol) && `${stock.name} (${stock.symbol}) เป็นบริษัทชั้นนำในอุตสาหกรรม ${stock.sector} จดทะเบียนในตลาด ${stock.market} มีธุรกิจหลักที่เติบโตอย่างแข็งแกร่งและได้รับความสนใจจากนักลงทุนทั่วโลก บริษัทมีฐานลูกค้าที่กว้างขวางและมีแบรนด์ที่เป็นที่รู้จัก`}
            </p>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <span className="bg-primary-500 text-black px-2 py-1 text-sm border-2 border-black">2</span>
              สินค้าและบริการหลัก
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {stock.symbol === 'AAPL' && 'ผลิตภัณฑ์หลักของ Apple แบ่งเป็น Hardware ได้แก่ iPhone (รายได้ประมาณ 50%), Mac, iPad, Apple Watch และ AirPods และ Services ได้แก่ App Store, Apple Music, iCloud, Apple TV+ และ Apple Pay ซึ่งเติบโตอย่างต่อเนื่อง ปัจจุบัน Services มีรายได้กว่า 80 พันล้านดอลลาร์ต่อปี และมี Margin กำไรสูงกว่า Hardware มาก'}
              {stock.symbol === 'MSFT' && 'ผลิตภัณฑ์หลักได้แก่ 1) Intelligent Cloud (Azure, Server products) รายได้กว่า 100 พันล้านดอลลาร์/ปี เติบโต 30%+ 2) Productivity & Business Processes (Office 365, LinkedIn, Dynamics) รายได้กว่า 75 พันล้านดอลลาร์/ปี 3) Personal Computing (Windows, Surface, Xbox, Search) นอกจากนี้ยังมี GitHub และ Copilot AI ที่กำลังเติบโต'}
              {stock.symbol === 'NVDA' && 'ผลิตภัณฑ์หลักแบ่งเป็น 1) Data Center (H100, A100, DGX) รายได้เกิน 50% ของทั้งหมด เติบโตกว่า 100% จาก AI Boom 2) Gaming (GeForce RTX) 3) Professional Visualization (Quadro) 4) Automotive (DRIVE platform) นอกจากนี้ยังมี CUDA software platform ที่เป็น Lock-in สำหรับนักพัฒนา AI'}
              {stock.symbol === 'GOOGL' && 'ผลิตภัณฑ์หลักได้แก่ 1) Google Search (รายได้โฆษณากว่า 60%) 2) YouTube (รายได้โฆษณา + Premium subscription) 3) Google Cloud (เติบโต 25%+ ต่อปี) 4) Android OS และ Play Store 5) Google Maps, Gmail, Chrome, Workspace นอกจากนี้ยังมี Other Bets เช่น Waymo (รถไร้คนขับ) และ Verily (Health Tech)'}
              {stock.symbol === 'TSLA' && 'ผลิตภัณฑ์หลักได้แก่ 1) Electric Vehicles: Model S/X (Luxury), Model 3/Y (Mass market), Cybertruck, Semi 2) Energy: Solar panels, Powerwall, Megapack 3) Services: Supercharger network, Insurance, Full Self-Driving subscription บริษัทมี Gigafactory 6 แห่งทั่วโลก ผลิตรถได้กว่า 2 ล้านคันต่อปี'}
              {stock.symbol === '0700' && 'ผลิตภัณฑ์หลักได้แก่ 1) WeChat/Weixin (Messaging, Payments, Mini Programs) 2) Games (Honor of Kings, PUBG Mobile, League of Legends) รายได้กว่า 30% 3) FinTech (WeChat Pay, Cloud Banking) 4) Cloud Services 5) Investments ใน Spotify, Tesla, Epic Games, Sea Limited และบริษัทเทคฯ อีกหลายร้อยแห่ง'}
              {stock.symbol === '1211' && 'ผลิตภัณฑ์หลักได้แก่ 1) New Energy Vehicles: รุ่นยอดนิยม Atto 3, Seal, Dolphin, Han, Tang 2) Blade Battery เทคโนโลยีแบตเตอรี่ที่ปลอดภัยที่สุด 3) Rechargeable Batteries สำหรับอุปกรณ์ต่างๆ 4) Bus และ Truck ไฟฟ้า 5) Rail Transit เทคโนโลยีรถไฟฟ้า'}
              {stock.symbol === 'NOVOB' && 'ผลิตภัณฑ์หลักได้แก่ 1) Ozempic (GLP-1 สำหรับเบาหวาน Type 2) ยอดขายกว่า 12 พันล้านดอลลาร์/ปี 2) Wegovy (GLP-1 สำหรับลดน้ำหนัก) เติบโตกว่า 100%/ปี 3) Insulin products (NovoRapid, Levemir, Tresiba) 4) Hemophilia products (NovoSeven, NovoEight) ส่วนแบ่งตลาด GLP-1 กว่า 50% ทั่วโลก'}
              {!['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'TSLA', '0700', '1211', 'NOVOB'].includes(stock.symbol) && `${stock.name} มีสินค้าและบริการที่หลากหลายในอุตสาหกรรม ${stock.sector} โดยมีจุดเน้นที่การสร้างนวัตกรรมและตอบสนองความต้องการของลูกค้า สินค้าหลักได้รับการยอมรับในระดับสากลและมีส่วนแบ่งตลาดที่แข็งแกร่ง`}
            </p>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <span className="bg-primary-500 text-black px-2 py-1 text-sm border-2 border-black">3</span>
              จุดแข็งและความได้เปรียบในการแข่งขัน
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {stock.symbol === 'AAPL' && 'จุดแข็งสำคัญได้แก่ 1) Brand Value ที่แข็งแกร่ง - แบรนด์มีมูลค่าสูงที่สุดในโลก 2) Ecosystem Lock-in - ลูกค้าอยู่ในระบบ Apple ยากที่จะย้ายไปใช้แบรนด์อื่น 3) Premium Pricing Power - สามารถตั้งราคาสูงกว่าคู่แข่ง 4) Cash Flow ที่แข็งแกร่ง - มีเงินสดกว่า 160 พันล้านดอลลาร์ 5) Services Growth - รายได้ซ้ำที่เติบโตต่อเนื่อง'}
              {stock.symbol === 'MSFT' && 'จุดแข็งสำคัญได้แก่ 1) Enterprise Dominance - 95%+ ของบริษัท Fortune 500 ใช้ Azure 2) Productivity Suite Lock-in - Office/Teams เป็นมาตรฐานองค์กร 3) AI Leadership - ลงทุนใน OpenAI และ Copilot ทุก product 4) Recurring Revenue - รายได้กว่า 50% เป็น subscription 5) Diversification - ธุรกิจกระจายดี ไม่พึ่งพิงสินค้าใดสินค้าหนึ่ง'}
              {stock.symbol === 'NVDA' && 'จุดแข็งสำคัญได้แก่ 1) AI Monopoly - ส่วนแบ่งตลาดชิป AI กว่า 80% 2) CUDA Platform - Developer ecosystem ที่ใหญ่ที่สุด 3) First-mover Advantage - ลงทุนใน AI มากว่า 10 ปี 4) High Margins - Gross margin กว่า 75% 5) Demand >> Supply - ลูกค้าต้องรอคิวซื้อชิป'}
              {stock.symbol === 'GOOGL' && 'จุดแข็งสำคัญได้แก่ 1) Search Monopoly - ส่วนแบ่งตลาด 90%+ 2) Data Advantage - มีข้อมูลผู้ใช้มากที่สุดในโลก 3) YouTube Dominance - ไม่มีคู่แข่งจริงจัง 4) Cloud Growth - Google Cloud เติบโต 25%+ ต่อปี 5) AI Research - เป็นผู้นำด้าน AI Research (DeepMind, Gemini)'}
              {stock.symbol === 'TSLA' && 'จุดแข็งสำคัญได้แก่ 1) Brand & Vision - แบรนด์ EV ที่แข็งแกร่งที่สุด 2) Vertical Integration - ควบคุมตั้งแต่ Battery จนถึง Software 3) Supercharger Network - โครงสร้างพื้นฐานที่ใหญ่ที่สุด 4) Software Edge - Full Self-Driving มีข้อมูลมากที่สุด 5) Manufacturing Innovation - Gigapress ลดต้นทุน'}
              {stock.symbol === '0700' && 'จุดแข็งสำคัญได้แก่ 1) WeChat Ecosystem - Super App ที่แข็งแกร่งที่สุดในโลก 2) Gaming Portfolio - เป็นเจ้าของเกมทำเงินมากที่สุดหลายเกม 3) Investment Portfolio - ลงทุนในบริษัทเทคฯ หลายร้อยแห่ง 4) Payment Dominance - WeChat Pay ครองตลาดจีน 5) User Lock-in - ผู้ใช้ใช้เวลาบน WeChat กว่า 100 นาที/วัน'}
              {stock.symbol === '1211' && 'จุดแข็งสำคัญได้แก่ 1) Vertical Integration - ควบคุมตั้งแต่ Battery จนถึงรถ 2) Blade Battery - เทคโนโลยีที่ปลอดภัยและถูกกว่าคู่แข่ง 3) Cost Leadership - ต้นทุนต่ำกว่า Tesla มาก 4) China Market - ครองตลาดในประเทศที่ใหญ่ที่สุด 5) Export Growth - กำลังขยายไปยุโรปและเอเชีย'}
              {stock.symbol === 'NOVOB' && 'จุดแข็งสำคัญได้แก่ 1) GLP-1 Leadership - ส่วนแบ่งตลาดกว่า 50% 2) First-mover Advantage - เป็นผู้บุกเบิกตลาด Obesity drugs 3) R&D Pipeline - มีตัวยาใหม่ในขั้น Clinical Trials หลายตัว 4) Manufacturing Scale - มีโรงงานผลิตทั่วโลก 5) Regulatory Expertise - ได้รับ FDA approvals รวดเร็ว'}
              {!['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'TSLA', '0700', '1211', 'NOVOB'].includes(stock.symbol) && `${stock.name} มีความได้เปรียบในการแข่งขันจากแบรนด์ที่แข็งแกร่ง ฐานลูกค้าที่กว้างขวาง และนวัตกรรมที่ต่อเนื่อง บริษัทมีทีมผู้บริหารที่มีประสบการณ์และกลยุทธ์ที่ชัดเจนในการเติบโตทั้งในประเทศและต่างประเทศ`}
            </p>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <span className="bg-primary-500 text-black px-2 py-1 text-sm border-2 border-black">4</span>
              ความเสี่ยงที่ควรพิจารณา
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {stock.symbol === 'AAPL' && 'ความเสี่ยงสำคัญได้แก่ 1) iPhone Dependence - รายได้ 50% มาจาก iPhone 2) China Exposure - รายได้ 20% มาจากจีน อาจได้รับผลกระทบจากความขัดแย้ง US-China 3) Antitrust Risk - ถูกฟ้องเรื่อง App Store fees 4) Innovation Slowdown - นักวิเคราะห์บางส่วนมองว่านวัตกรรมช้าลง 5) Valuation - PE Ratio สูงกว่าค่าเฉลี่ย'}
              {stock.symbol === 'MSFT' && 'ความเสี่ยงสำคัญได้แก่ 1) Cloud Competition - แข่งขันรุนแรงกับ AWS และ Google Cloud 2) Regulatory Risk - ถูกตรวจสอบเรื่อง Antitrust หลายครั้ง 3) AI Dependency - ลงทุนหนักใน OpenAI แต่ผลตอบแทนยังไม่ชัด 4) Gaming Challenges - Xbox แข่งขันกับ PlayStation และ Nintendo 5) Valuation - ราคาหุ้นสูงเมื่อเทียบกับการเติบโต'}
              {stock.symbol === 'NVDA' && 'ความเสี่ยงสำคัญได้แก่ 1) Concentration Risk - รายได้พึ่งพิงลูกค้ารายใหญ่ไม่กี่ราย 2) Competition - AMD และ Intel กำลังไล่ตาม 3) China Restrictions - ถูกห้ามขายชิปขั้นสูงในจีน 4) Valuation Concern - PE Ratio สูงมาก มี Expectation สูง 5) AI Bubble Risk - หากกระแส AI ชะลอลง อุปสงค์อาจลดลง'}
              {stock.symbol === 'GOOGL' && 'ความเสี่ยงสำคัญได้แก่ 1) Antitrust - ถูกฟ้องในหลายประเทศ อาจต้องแยกธุรกิจ 2) AI Competition - ChatGPT คุกคามตลาด Search 3) Ad Revenue Dependency - รายได้ 80%+ มาจากโฆษณา 4) Privacy Regulations - กฎหมาย Privacy อาจกระทบการเก็บข้อมูล 5) Cloud เป็นอันดับ 3 - ตามหลัง AWS และ Azure'}
              {stock.symbol === 'TSLA' && 'ความเสี่ยงสำคัญได้แก่ 1) Competition Intensifying - BYD, Toyota, VW กำลังเข้าตลาด EV 2) Pricing Pressure - ลดราคาบ่อยครั้งกระทบ Margin 3) FSD Delays - Full Self-Driving ล่าช้ามาหลายปี 4) Elon Musk Risk - CEO มีกิจการอื่นหลายอย่าง 5) Valuation - PE Ratio สูงมากเมื่อเทียบกับบริษัทรถยนต์อื่น'}
              {stock.symbol === '0700' && 'ความเสี่ยงสำคัญได้แก่ 1) Regulatory Risk - รัฐบาลจีนควบคุมเข้มงวดมากขึ้น 2) Gaming Restrictions - จำกัดเวลาเล่นเกมของเยาวชน 3) US-China Tensions - อาจถูก Delist จากตลาดสหรัฐฯ 4) Competition - ByteDance, Alibaba แข่งขันรุนแรง 5) Macro Risk - เศรษฐกิจจีนชะลอตัว'}
              {stock.symbol === '1211' && 'ความเสี่ยงสำคัญได้แก่ 1) Trade Wars - อาจถูกเก็บภาษีในยุโรปและสหรัฐฯ 2) EV Competition - Tesla และบริษัทจีนอื่นแข่งขันรุนแรง 3) Subsidy Dependence - รายได้บางส่วนพึ่งพิงเงินอุดหนุนรัฐ 4) Tech Risk - เทคโนโลยีแบตเตอรี่เปลี่ยนแปลงเร็ว 5) Buffett Selling - Warren Buffett ขายหุ้นลงเรื่อยๆ'}
              {stock.symbol === 'NOVOB' && 'ความเสี่ยงสำคัญได้แก่ 1) Competition - Eli Lilly มียา Mounjaro/Zepbound แข่งขัน 2) Supply Constraints - ผลิตไม่ทันความต้องการ 3) Patent Expiration - สิทธิบัตรบางตัวจะหมดอายุ 4) Pricing Pressure - รัฐบาลกดดันเรื่องราคายา 5) Valuation - PE Ratio สูงมากเมื่อเทียบกับบริษัทยาอื่น'}
              {!['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'TSLA', '0700', '1211', 'NOVOB'].includes(stock.symbol) && `ความเสี่ยงที่นักลงทุนควรพิจารณาประกอบด้วย การแข่งขันที่รุนแรงในอุตสาหกรรม ${stock.sector} ความผันผวนของตลาดและอัตราแลกเปลี่ยน รวมถึงความเสี่ยงด้านกฎระเบียบและนโยบายที่อาจส่งผลกระทบต่อธุรกิจ`}
            </p>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <span className="bg-primary-500 text-black px-2 py-1 text-sm border-2 border-black">5</span>
              5 สิ่งสำคัญที่นักลงทุนต้องรู้
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              {stock.symbol === 'AAPL' && <>
                <li>มูลค่าตลาดสูงกว่า 3 ล้านล้านดอลลาร์ - บริษัทที่มีมูลค่าสูงที่สุดในโลก</li>
                <li>มี Cash Flow ที่แข็งแกร่ง จ่าย Dividend และ Buyback หุ้นสม่ำเสมอ</li>
                <li>Services เติบโตต่อเนื่อง มี Margin สูงกว่า Hardware</li>
                <li>ระบบ Ecosystem ที่แข็งแกร่ง ลูกค้ายากที่จะย้ายไปแบรนด์อื่น</li>
                <li>กำลังลงทุนหนักใน AI, Vision Pro และ Health Technology</li>
              </>}
              {stock.symbol === 'MSFT' && <>
                <li>Azure เป็นผู้นำตลาดคลาวด์อันดับ 2 และกำลังเติบโตเร็วกว่า AWS</li>
                <li>ลงทุนกว่า 13 พันล้านดอลลาร์ใน OpenAI - ได้เปรียบด้าน AI</li>
                <li>รายได้กว่า 50% เป็น Recurring Revenue จาก Subscription</li>
                <li>Copilot AI กำลังถูก Integrate ในทุกผลิตภัณฑ์</li>
                <li>มี Balance Sheet ที่แข็งแกร่ง AAA Credit Rating</li>
              </>}
              {stock.symbol === 'NVDA' && <>
                <li>ส่วนแบ่งตลาดชิป AI มากกว่า 80% - แทบไม่มีคู่แข่งจริงจัง</li>
                <li>รายได้เติบโตกว่า 100% ต่อปีจากกระแส AI</li>
                <li>CUDA Platform เป็น Lock-in สำหรับนักพัฒนา AI</li>
                <li>Gross Margin สูงกว่า 75% - สูงผิดปกติสำหรับธุรกิจ Hardware</li>
                <li>ลูกค้ารายใหญ่ต้องรอคิว 6-12 เดือนเพื่อซื้อชิป</li>
              </>}
              {stock.symbol === 'GOOGL' && <>
                <li>ครองตลาด Search มากกว่า 90% ทั่วโลก - เกือบเป็น Monopoly</li>
                <li>YouTube มีผู้ใช้มากกว่า 2 พันล้านคนต่อเดือน</li>
                <li>Google Cloud เติบโต 25%+ ต่อปี กำลัง Profitable</li>
                <li>มี Cash มากกว่า 100 พันล้านดอลลาร์ในงบดุล</li>
                <li>กำลังถูกฟ้อง Antitrust อาจต้องปรับโครงสร้างบริษัท</li>
              </>}
              {stock.symbol === 'TSLA' && <>
                <li>เป็นผู้นำตลาด EV แต่ส่วนแบ่งตลาดกำลังลดลงจากการแข่งขัน</li>
                <li>Supercharger Network กลายเป็นมาตรฐานอุตสาหกรรมในสหรัฐฯ</li>
                <li>Full Self-Driving ยังไม่สามารถทำได้จริง แม้จะสัญญามาหลายปี</li>
                <li>Energy Business กำลังเติบโตเร็ว อาจกลายเป็นธุรกิจหลักในอนาคต</li>
                <li>Elon Musk มีกิจการอื่นหลายอย่าง รวมถึง X (Twitter) และ SpaceX</li>
              </>}
              {stock.symbol === '0700' && <>
                <li>WeChat มีผู้ใช้กว่า 1.3 พันล้านคน - Super App ที่ครอบคลุมชีวิตประจำวัน</li>
                <li>เป็นบริษัทเกมที่ใหญ่ที่สุดในโลก ลงทุนใน Riot, Epic Games และอื่นๆ</li>
                <li>รัฐบาลจีนจำกัดเวลาเล่นเกมของเยาวชน ส่งผลกระทบต่อรายได้</li>
                <li>มี Investment Portfolio มูลค่ากว่า 100 พันล้านดอลลาร์</li>
                <li>เสี่ยงต่อนโยบายควบคุมจากรัฐบาลจีนและความขัดแย้ง US-China</li>
              </>}
              {stock.symbol === '1211' && <>
                <li>ขายรถยนต์ไฟฟ้ามากกว่า Tesla ในปี 2023 - ผู้นำตลาด EV โลก</li>
                <li>Warren Buffett เป็นผู้ถือหุ้นใหญ่มาตั้งแต่ปี 2008</li>
                <li>Blade Battery เป็นเทคโนโลยีที่ปลอดภัยและราคาถูกกว่าคู่แข่ง</li>
                <li>กำลังขยายตลาดไปยุโรป อาจถูกเก็บภาษี Anti-dumping</li>
                <li>Vertical Integration ช่วยให้ควบคุมต้นทุนได้ดีกว่าคู่แข่ง</li>
              </>}
              {stock.symbol === 'NOVOB' && <>
                <li>Ozempic และ Wegovy กำลังเปลี่ยนวิธีที่โลกรักษาโรคอ้วน</li>
                <li>มูลค่าตลาดเกิน 400 พันล้านดอลลาร์ - บริษัทใหญ่ที่สุดในยุโรป</li>
                <li>รายได้เติบโตกว่า 30% ต่อปี - สูงผิดปกติสำหรับบริษัทยา</li>
                <li>กำลังขยายโรงงานผลิตเพื่อรองรับความต้องการที่พุ่งสูง</li>
                <li>Eli Lilly เป็นคู่แข่งหลัก มียา Mounjaro/Zepbound ที่แข่งขันโดยตรง</li>
              </>}
              {!['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'TSLA', '0700', '1211', 'NOVOB'].includes(stock.symbol) && <>
                <li>บริษัทเป็นผู้นำในอุตสาหกรรม {stock.sector} มีส่วนแบ่งตลาดที่แข็งแกร่ง</li>
                <li>รายได้และกำไรเติบโตอย่างต่อเนื่องในช่วงหลายปีที่ผ่านมา</li>
                <li>มีทีมผู้บริหารที่มีประสบการณ์และกลยุทธ์ที่ชัดเจน</li>
                <li>กำลังขยายธุรกิจไปยังตลาดใหม่ๆ เพื่อเพิ่มการเติบโต</li>
                <li>นักลงทุนควรติดตามผลประกอบการและข่าวสารอย่างใกล้ชิด</li>
              </>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Brokers Page
const BrokersPage = ({ drList, brokers, loading }) => {
  const [selectedBroker, setSelectedBroker] = useState(null);
  const getBrokerDRs = (brokerId) => drList.filter(d => d.issuerCode === brokerId);

  if (loading) return <Spinner />;

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6"><h1 className="font-display font-bold text-2xl text-black mb-2">โบรกเกอร์ผู้ออก DR</h1><p className="text-brutalist-muted">รายชื่อโบรกเกอร์ที่ให้บริการ DR ในตลาดหลักทรัพย์ไทย</p></div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {brokers.map(broker => (
          <div key={broker.id} className="bg-white border-3 border-black shadow-brutal p-6 dr-card cursor-pointer" onClick={() => setSelectedBroker(selectedBroker === broker.id ? null : broker.id)}>
            <div className="flex items-start justify-between mb-4"><div className="flex items-center space-x-3"><span className="text-4xl">{broker.logo}</span><div><h3 className="font-display font-semibold text-black">{broker.name}</h3><p className="text-brutalist-muted text-xs">{broker.fullName}</p></div></div></div>
            <div className="grid grid-cols-2 gap-3 mb-4"><div className="bg-gray-100/50 rounded-xl p-3 text-center"><p className="font-display font-bold text-xl text-primary-400">{broker.drCount || getBrokerDRs(broker.id).length}</p><p className="text-brutalist-muted text-xs">DR</p></div><div className="bg-gray-100/50 rounded-xl p-3 text-center"><p className="font-display font-bold text-xl text-black">{broker.commission}</p><p className="text-brutalist-muted text-xs">ค่าคอม</p></div></div>
            <div className="text-sm text-brutalist-muted mb-4"><p>📌 ขั้นต่ำ: {broker.minTrade}</p></div>
            <a href={broker.website} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-gray-200 hover:bg-dark-600 text-black py-2 rounded-xl transition-colors text-sm" onClick={(e) => e.stopPropagation()}>เยี่ยมชมเว็บไซต์ →</a>
            {selectedBroker === broker.id && <div className="mt-4 pt-4 border-t border-black"><p className="text-brutalist-muted text-sm mb-3">DR ที่ให้บริการ:</p><div className="flex flex-wrap gap-2">{getBrokerDRs(broker.id).slice(0, 10).map(dr => (<span key={dr.symbol} className="bg-gray-100 text-brutalist-muted px-2 py-1 rounded text-xs">{dr.logo} {dr.symbol}</span>))}</div></div>}
          </div>
        ))}
      </div>
      <div className="bg-white border-3 border-black shadow-brutal p-6 mt-8"><h2 className="font-display font-bold text-lg text-black mb-4">💡 ข้อมูลเพิ่มเติม</h2><div className="grid md:grid-cols-2 gap-6 text-brutalist-muted"><div><h3 className="font-bold text-black mb-2">DR คืออะไร?</h3><p className="text-sm leading-relaxed">DR (Depositary Receipt) คือหลักทรัพย์ที่จดทะเบียนซื้อขายในตลาดหลักทรัพย์ไทย โดยอ้างอิงกับหุ้นหรือ ETF ต่างประเทศ ทำให้นักลงทุนไทยสามารถลงทุนในหุ้นต่างประเทศได้ง่ายๆ ผ่านบัญชีหุ้นไทยที่มีอยู่ ซื้อขายด้วยเงินบาท</p></div><div><h3 className="font-bold text-black mb-2">ข้อดีของ DR</h3><ul className="text-sm space-y-1"><li>✅ ไม่ต้องเปิดบัญชีหุ้นต่างประเทศ</li><li>✅ ซื้อขายด้วยเงินบาท ไม่ต้องแลกเงิน</li><li>✅ ไม่เสียภาษี Capital Gain</li><li>✅ ซื้อขายผ่าน App หุ้นไทยที่คุ้นเคย</li><li>✅ บาง DR ซื้อขายได้ทั้งกลางวันและกลางคืน</li></ul></div></div></div>
    </div>
  );
};

// Footer
const Footer = ({ lastUpdate }) => (<footer className="bg-white border-t-4 border-black mt-12 py-8"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="flex flex-col md:flex-row items-center justify-between"><div className="flex items-center space-x-3 mb-4 md:mb-0"><div className="w-10 h-10 bg-primary-500 border-3 border-black shadow-brutal-sm flex items-center justify-center text-sm font-black text-black">DR</div><div><p className="font-display font-bold text-black">DR Thailand Hub</p><p className="text-brutalist-muted text-xs">ศูนย์ข้อมูล DR ครบวงจร</p></div></div><div className="text-center md:text-right"><p className="text-brutalist-muted text-sm">ข้อมูลอัพเดท: {lastUpdate ? new Date(lastUpdate).toLocaleString('th-TH') : '-'}</p><p className="text-brutalist-muted text-xs mt-1">ข้อมูลจาก SET | ไม่ใช่คำแนะนำการลงทุน</p></div></div></div></footer>);

// Main App
export default function App() {
  const [selectedDR, setSelectedDR] = useState(null);
  const [compareList, setCompareList] = useState([]);
  const [drList, setDRList] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [marketOverview, setMarketOverview] = useState(null);
  const [rankings, setRankings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [drResponse, brokerResponse, overviewResponse, rankingsResponse] = await Promise.all([
          drAPI.getAll(),
          brokerAPI.getAll(),
          drAPI.getMarketOverview().catch(() => ({ success: false })),
          drAPI.getRankings().catch(() => ({ success: false }))
        ]);
        if (drResponse.success) {
          setDRList(drResponse.data);
          setLastUpdate(drResponse.lastUpdate);
        }
        if (brokerResponse.success) {
          setBrokers(brokerResponse.data);
        }
        if (overviewResponse.success) {
          setMarketOverview(overviewResponse.data);
        }
        if (rankingsResponse.success) {
          setRankings(rankingsResponse.data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-dark-950">
      <Navigation />
      <main className="pt-24 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <Routes>
          <Route path="/" element={<HomePage setSelectedDR={setSelectedDR} drList={drList} loading={loading} marketOverview={marketOverview} rankings={rankings} brokers={brokers} />} />
          <Route path="/catalog" element={<CatalogPage setSelectedDR={setSelectedDR} compareList={compareList} setCompareList={setCompareList} drList={drList} loading={loading} />} />
          <Route path="/compare" element={<ComparePage compareList={compareList} setCompareList={setCompareList} drList={drList} />} />
          <Route path="/screener" element={<ScreenerPage setSelectedDR={setSelectedDR} drList={drList} brokers={brokers} />} />
          <Route path="/stocks" element={<StocksPage drList={drList} />} />
          <Route path="/stocks/:symbol" element={<StockDetailPage drList={drList} setSelectedDR={setSelectedDR} />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/brokers" element={<BrokersPage drList={drList} brokers={brokers} loading={loading} />} />
        </Routes>
      </main>
      <Footer lastUpdate={lastUpdate} />
      {selectedDR && <DRDetailModal dr={selectedDR} onClose={() => setSelectedDR(null)} />}
    </div>
  );
}
