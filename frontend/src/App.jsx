import { useState, useEffect, useMemo } from 'react';
import { Routes, Route, NavLink, useNavigate, useParams, useLocation } from 'react-router-dom';
import { drAPI, brokerAPI } from './services/api';

// Country names mapping
const countryNames = { US: 'สหรัฐฯ', CN: 'จีน', HK: 'ฮ่องกง', JP: 'ญี่ปุ่น', SG: 'สิงคโปร์', VN: 'เวียดนาม', EU: 'ยุโรป', TW: 'ไต้หวัน', KR: 'เกาหลีใต้' };

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
        <div className="flex items-start justify-between mb-3"><div className="flex items-center space-x-3"><span className="text-3xl">{dr.logo}</span><div><h3 className="font-display font-bold text-black">{dr.symbol}</h3><p className="text-brutalist-muted text-xs truncate max-w-[150px]">{dr.name}</p></div></div><span className={`badge-${(dr.country || 'us').toLowerCase()} text-white text-xs px-2 py-1 font-bold`}>{dr.country}</span></div>
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

  if (loading) return <div className="py-4 text-center text-dark-500 text-xs">กำลังโหลดข่าว...</div>;
  if (!news || news.length === 0) return <div className="py-4 text-center text-dark-500 text-xs">ไม่พบข่าวล่าสุด</div>;

  return (
    <div className="space-y-3">
      {news.slice(0, 5).map((item, i) => (
        <a key={i} href={`https://www.set.or.th/th/market/news-and-updates/news-details?id=${item.newsId}`} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-xl bg-dark-800/50 hover:bg-dark-800 transition-colors border border-transparent hover:border-dark-700">
          <p className="text-white text-sm font-medium line-clamp-2 mb-1">{item.title}</p>
          <div className="flex items-center justify-between text-[10px] text-dark-500">
            <span>{item.source}</span>
            <span>{new Date(item.datetime).toLocaleDateString('th-TH')}</span>
          </div>
        </a>
      ))}
    </div>
  );
};

// Simple Price Chart Component
const MiniChart = () => (
  <div className="h-40 w-full bg-dark-800/30 rounded-2xl border border-dark-800 flex items-center justify-center relative overflow-hidden">
    <div className="absolute inset-0 opacity-20">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M0,80 L20,75 L40,85 L60,40 L80,50 L100,20 L100,100 L0,100 Z" fill="url(#grad)" />
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 0.5 }} />
            <stop offset="100%" style={{ stopColor: '#10b981', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <path d="M0,80 L20,75 L40,85 L60,40 L80,50 L100,20" fill="none" stroke="#10b981" strokeWidth="2" />
      </svg>
    </div>
    <p className="text-xs text-dark-500">Price Trend (Intraday)</p>
  </div>
);

// DR Detail Modal
const DRDetailModal = ({ dr, onClose }) => {
  if (!dr) return null;
  const priceClass = dr.changePercent > 0 ? 'price-up' : dr.changePercent < 0 ? 'price-down' : 'price-neutral';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
      <div className="relative bg-dark-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-dark-700 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-dark-900/95 backdrop-blur-sm p-6 border-b border-dark-800 z-20"><button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-dark-800 hover:bg-dark-700 flex items-center justify-center">✕</button><div className="flex items-center space-x-4"><span className="text-5xl">{dr.logo}</span><div><h2 className="font-display font-bold text-2xl text-white">{dr.symbol}</h2><p className="text-dark-400">{dr.name}</p></div></div></div>
        <div className="p-6 space-y-8">
          <div className="glass rounded-2xl p-6"><div className="flex items-end justify-between"><div><p className="text-dark-400 text-sm mb-1">ราคาล่าสุด</p><p className="font-display font-bold text-4xl text-white">฿{dr.price?.toLocaleString()}</p></div><div className={`text-right ${priceClass}`}><p className="text-2xl font-bold">{dr.changePercent > 0 ? '+' : ''}{dr.changePercent?.toFixed(2)}%</p><p className="text-sm">{dr.change > 0 ? '+' : ''}{dr.change?.toFixed(2)} บาท</p></div></div></div>

          <MiniChart />

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div><h3 className="font-semibold text-white mb-3">ข้อมูล DR</h3><div className="grid grid-cols-2 gap-3">{[{ label: 'หลักทรัพย์อ้างอิง', value: dr.underlying }, { label: 'ตลาด', value: dr.market }, { label: 'ประเทศ', value: countryNames[dr.country] || dr.country }, { label: 'Sector', value: dr.sector }, { label: 'ผู้ออก', value: dr.issuer }, { label: 'Volume', value: (dr.volume || 0).toLocaleString() }].map((item, i) => (<div key={i} className="bg-dark-800/50 rounded-xl p-3"><p className="text-dark-400 text-[10px] mb-1">{item.label}</p><p className="text-white font-medium text-sm">{item.value || '-'}</p></div>))}</div></div>
              <div><h3 className="font-semibold text-white mb-3">⏰ เวลาซื้อขาย</h3><div className="space-y-3">
                <div className="bg-gradient-to-br from-primary-500/10 to-transparent rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-dark-300 text-sm">ช่วงเวลาซื้อขาย</p>
                    <TradingSessionIndicator tradingSession={dr.tradingSession} />
                  </div>
                  <p className="font-display font-bold text-lg text-white">{dr.tradingHours || 'กลางวันเท่านั้น'}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-dark-800/50 rounded-xl p-3">
                    <p className="text-dark-400 text-[10px] mb-1">☀️ กลางวัน</p>
                    <p className="text-white font-medium text-sm">{dr.tradingSession?.daySession || '10:00-16:30'}</p>
                  </div>
                  {dr.tradingSession?.hasNightTrading && (
                    <div className="bg-dark-800/50 rounded-xl p-3">
                      <p className="text-dark-400 text-[10px] mb-1">🌙 กลางคืน</p>
                      <p className="text-white font-medium text-sm">{dr.tradingSession?.nightSession || '19:00-03:00'}</p>
                    </div>
                  )}
                  <div className="bg-dark-800/50 rounded-xl p-3">
                    <p className="text-dark-400 text-[10px] mb-1">อัตราแปลง (DR:หุ้น)</p>
                    <p className="text-white font-medium text-sm">{dr.ratio || '100:1'}</p>
                  </div>
                </div>
              </div></div>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-3">🗞 ข่าวประชาสัมพันธ์</h3>
              <NewsSection symbol={dr.symbol} />
            </div>
          </div>

          <a href={`https://www.set.or.th/th/market/product/dr/quote/${dr.symbol}/price`} target="_blank" rel="noopener noreferrer" className="block w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-4 rounded-2xl text-center transition-all">ดูข้อมูลบน SET.or.th →</a>
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-900/50 via-dark-900 to-dark-950 p-8 lg:p-12">
        <div className="relative z-10">
          <h1 className="font-display font-bold text-4xl lg:text-5xl text-white mb-4">ลงทุนหุ้นโลก<br /><span className="text-primary-400">ง่ายๆ ผ่าน DR</span></h1>
          <p className="text-dark-300 text-lg max-w-xl mb-6">ศูนย์รวมข้อมูล DR ครบวงจร ค้นหา เปรียบเทียบ และติดตาม DR ทั้งหมดในตลาดหลักทรัพย์ไทย</p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => navigate('/catalog')} className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-all hover:scale-105">สำรวจ DR ทั้งหมด →</button>
            <button onClick={() => navigate('/screener')} className="px-6 py-3 bg-dark-800 hover:bg-dark-700 text-white font-semibold rounded-xl border border-dark-600">🔍 DR Screener</button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary-500/10 to-transparent pointer-events-none"></div>
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
          <h2 className="font-display font-bold text-xl text-white">🔥 Trending Updates</h2>
          <div className="flex bg-dark-800 p-1 rounded-lg">
            {[{ id: 'gainers', label: 'Gainers' }, { id: 'losers', label: 'Losers' }, { id: 'active', label: 'Most Active' }].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 text-xs rounded-md transition-all ${activeTab === tab.id ? 'bg-primary-500 text-white' : 'text-dark-400 hover:text-white'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="glass rounded-2xl p-6 lg:col-span-2">
            <div className="space-y-3">
              {(activeTab === 'gainers' ? topGainers : activeTab === 'losers' ? topLosers : topVolume).map((dr, index) => (
                <div key={dr.symbol} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-xl hover:bg-dark-800 transition-colors cursor-pointer group" onClick={() => setSelectedDR(dr)}>
                  <div className="flex items-center space-x-3">
                    <span className="text-dark-500 font-mono text-sm w-5">{index + 1}</span>
                    <span className="text-2xl group-hover:scale-110 transition-transform">{dr.logo}</span>
                    <div>
                      <p className="font-medium text-white">{dr.symbol}</p>
                      <p className="text-dark-400 text-xs">{dr.name?.substring(0, 40)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-white">฿{dr.price?.toLocaleString()}</p>
                    <p className={`text-sm font-medium ${dr.changePercent >= 0 ? 'text-primary-400' : 'text-red-400'}`}>
                      {dr.changePercent >= 0 ? '+' : ''}{dr.changePercent?.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display font-semibold text-white mb-4">🌍 DR ตามประเทศ</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(countryNames).slice(0, 6).map(([code, name]) => {
                const count = drList.filter(d => d.country === code).length;
                if (count === 0) return null;
                return (
                  <button key={code} onClick={() => handleCountryClick(code)} className={`badge-${code.toLowerCase()} rounded-xl p-3 text-center hover:opacity-80 transition-opacity`}>
                    <p className="text-white font-bold text-lg">{count}</p>
                    <p className="text-white/80 text-[10px]">{name}</p>
                  </button>
                );
              })}
            </div>
            <button onClick={() => navigate('/catalog')} className="w-full mt-4 text-center text-dark-400 text-xs hover:text-primary-400 transition-colors">ดูทั้งหมด →</button>
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
      <div className="mb-6"><h1 className="font-display font-bold text-2xl text-white mb-2">รายการ DR ทั้งหมด</h1><p className="text-dark-400">พบ {filteredDRs.length} DR</p></div>
      <div className="glass rounded-2xl p-4 mb-6"><div className="flex flex-col lg:flex-row lg:items-center gap-4"><div className="flex-1 relative"><input type="text" placeholder="ค้นหา DR, ชื่อบริษัท..." value={filters.search} onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))} className="w-full bg-dark-800 border border-dark-700 rounded-xl px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-primary-500" /><span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">🔍</span></div><select value={filters.country} onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))} className="bg-dark-800 border border-dark-700 rounded-xl px-4 py-3 min-w-[140px]"><option value="All">🌍 ทุกประเทศ</option>{countries.filter(c => c !== 'All').map(country => (<option key={country} value={country}>{countryNames[country] || country}</option>))}</select><select value={filters.sector} onChange={(e) => setFilters(prev => ({ ...prev, sector: e.target.value }))} className="bg-dark-800 border border-dark-700 rounded-xl px-4 py-3 min-w-[140px]"><option value="All">📂 ทุก Sector</option>{sectors.filter(s => s !== 'All').map(sector => (<option key={sector} value={sector}>{sector}</option>))}</select><select value={filters.sort} onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value }))} className="bg-dark-800 border border-dark-700 rounded-xl px-4 py-3 min-w-[160px]"><option value="symbol">🔤 ชื่อ A-Z</option><option value="change">📈 % เปลี่ยนแปลง</option><option value="volume">📊 Volume</option><option value="marketCap">💰 Market Cap</option></select><button onClick={() => setShowCompareMode(!showCompareMode)} className={`px-4 py-3 rounded-xl font-medium transition-all ${showCompareMode ? 'bg-primary-500 text-white' : 'bg-dark-800 text-dark-300 hover:text-white border border-dark-700'}`}>⚖️ เปรียบเทียบ</button></div></div>
      {showCompareMode && compareList.length > 0 && <div className="glass rounded-2xl p-4 mb-6 flex items-center justify-between"><div className="flex items-center space-x-2"><span className="text-dark-400">เลือกแล้ว:</span>{compareList.map(symbol => { const dr = drList.find(d => d.symbol === symbol); return (<span key={symbol} className="bg-primary-500/20 text-primary-400 px-3 py-1 rounded-full text-sm">{dr?.logo} {symbol}</span>); })}</div><button onClick={() => setCompareList([])} className="text-dark-400 hover:text-white text-sm">ล้างทั้งหมด</button></div>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{filteredDRs.map(dr => (<DRCard key={dr.symbol} dr={dr} onClick={setSelectedDR} isSelected={compareList.includes(dr.symbol)} onCompareToggle={handleCompareToggle} showCompare={showCompareMode} />))}</div>
      {filteredDRs.length === 0 && <div className="text-center py-12"><p className="text-dark-400 text-lg">ไม่พบ DR ที่ตรงกับเงื่อนไข</p></div>}
    </div>
  );
};

// Compare Page
const ComparePage = ({ compareList, setCompareList, drList }) => {
  const [selectedSymbols, setSelectedSymbols] = useState(compareList.length > 0 ? compareList : []);
  const selectedData = selectedSymbols.map(symbol => drList.find(d => d.symbol === symbol)).filter(Boolean);
  const handleAdd = (symbol) => { if (selectedSymbols.length >= 4 || selectedSymbols.includes(symbol)) return; setSelectedSymbols([...selectedSymbols, symbol]); };
  const handleRemove = (symbol) => setSelectedSymbols(selectedSymbols.filter(s => s !== symbol));
  const compareFields = [{ key: 'price', label: 'ราคา', format: (v) => `฿${v?.toLocaleString()}` }, { key: 'changePercent', label: '% เปลี่ยนแปลง', format: (v) => `${v > 0 ? '+' : ''}${v?.toFixed(2)}%`, highlight: true }, { key: 'volume', label: 'Volume', format: (v) => (v || 0).toLocaleString() }, { key: 'marketCap', label: 'Market Cap', format: (v) => `$${v || 'N/A'}B` }, { key: 'pe', label: 'P/E Ratio', format: (v) => v > 0 ? v?.toFixed(1) : 'N/A' }, { key: 'dividend', label: 'Dividend Yield', format: (v) => v > 0 ? `${v?.toFixed(2)}%` : '-' }, { key: 'sector', label: 'Sector', format: (v) => v }, { key: 'country', label: 'ประเทศ', format: (v) => countryNames[v] || v }, { key: 'issuer', label: 'ผู้ออก', format: (v) => v }, { key: 'tradingHours', label: 'เวลาซื้อขาย', format: (v) => v }];

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6"><h1 className="font-display font-bold text-2xl text-white mb-2">เปรียบเทียบ DR</h1><p className="text-dark-400">เลือก DR สูงสุด 4 ตัวเพื่อเปรียบเทียบ</p></div>
      <div className="glass rounded-2xl p-4 mb-6"><div className="flex flex-wrap items-center gap-3"><select onChange={(e) => { if (e.target.value) { handleAdd(e.target.value); e.target.value = ''; } }} className="bg-dark-800 border border-dark-700 rounded-xl px-4 py-3 min-w-[250px]"><option value="">+ เพิ่ม DR เพื่อเปรียบเทียบ</option>{drList.filter(d => !selectedSymbols.includes(d.symbol)).map(dr => (<option key={dr.symbol} value={dr.symbol}>{dr.logo} {dr.symbol} - {dr.name}</option>))}</select>{selectedSymbols.map(symbol => { const dr = drList.find(d => d.symbol === symbol); return (<span key={symbol} className="bg-primary-500/20 text-primary-400 px-4 py-2 rounded-xl flex items-center space-x-2"><span>{dr?.logo} {symbol}</span><button onClick={() => handleRemove(symbol)} className="hover:text-white">✕</button></span>); })}</div></div>
      {selectedData.length > 0 ? (<div className="glass rounded-2xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-dark-800/50"><th className="text-left p-4 font-semibold text-dark-300 min-w-[150px]">รายการ</th>{selectedData.map(dr => (<th key={dr.symbol} className="text-center p-4 min-w-[180px]"><div className="flex flex-col items-center"><span className="text-3xl mb-2">{dr.logo}</span><span className="font-display font-bold text-white">{dr.symbol}</span></div></th>))}</tr></thead><tbody>{compareFields.map((field, index) => (<tr key={field.key} className={index % 2 === 0 ? 'bg-dark-800/30' : ''}><td className="p-4 text-dark-300 font-medium">{field.label}</td>{selectedData.map(dr => { const value = dr[field.key]; const formatted = field.format(value); let textClass = 'text-white'; if (field.highlight && field.key === 'changePercent') textClass = value > 0 ? 'text-primary-400' : value < 0 ? 'text-red-400' : 'text-dark-400'; return (<td key={dr.symbol} className={`p-4 text-center font-medium ${textClass}`}>{formatted}</td>); })}</tr>))}</tbody></table></div></div>) : (<div className="glass rounded-2xl p-12 text-center"><p className="text-dark-400 text-lg mb-4">เลือก DR เพื่อเริ่มเปรียบเทียบ</p></div>)}
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
      <div className="mb-6"><h1 className="font-display font-bold text-2xl text-white mb-2">DR Screener</h1><p className="text-dark-400">กรอง DR ตามเงื่อนไขที่คุณต้องการ</p></div>
      <div className="grid lg:grid-cols-4 gap-6">
        <div className="glass rounded-2xl p-6 lg:col-span-1 h-fit">
          <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-white">เงื่อนไข</h2><button onClick={resetCriteria} className="text-dark-400 hover:text-white text-sm">รีเซ็ต</button></div>
          <div className="space-y-4">
            <div><label className="block text-dark-400 text-sm mb-2">ประเทศ</label><select value={criteria.country} onChange={(e) => setCriteria(prev => ({ ...prev, country: e.target.value }))} className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-white"><option value="All">ทั้งหมด</option>{Object.entries(countryNames).map(([code, name]) => (<option key={code} value={code}>{name}</option>))}</select></div>
            <div><label className="block text-dark-400 text-sm mb-2">Sector</label><select value={criteria.sector} onChange={(e) => setCriteria(prev => ({ ...prev, sector: e.target.value }))} className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-white"><option value="All">ทั้งหมด</option>{sectors.filter(s => s !== 'All').map(sector => (<option key={sector} value={sector}>{sector}</option>))}</select></div>
            <div><label className="block text-dark-400 text-sm mb-2">โบรกเกอร์ผู้ออก</label><select value={criteria.broker} onChange={(e) => setCriteria(prev => ({ ...prev, broker: e.target.value }))} className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-white"><option value="All">ทั้งหมด</option>{brokers.map(broker => (<option key={broker.id} value={broker.id}>{broker.logo} {broker.name}</option>))}</select></div>
            <div><label className="block text-dark-400 text-sm mb-2">Market Cap ($B)</label><div className="flex space-x-2"><input type="number" placeholder="Min" value={criteria.minMarketCap} onChange={(e) => setCriteria(prev => ({ ...prev, minMarketCap: e.target.value }))} className="w-1/2 bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-white" /><input type="number" placeholder="Max" value={criteria.maxMarketCap} onChange={(e) => setCriteria(prev => ({ ...prev, maxMarketCap: e.target.value }))} className="w-1/2 bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-white" /></div></div>
            <div><label className="block text-dark-400 text-sm mb-2">Dividend Yield ขั้นต่ำ (%)</label><input type="number" placeholder="เช่น 2" value={criteria.minDividend} onChange={(e) => setCriteria(prev => ({ ...prev, minDividend: e.target.value }))} className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-white" /></div>
            <div className="space-y-3 pt-2"><label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" checked={criteria.hasDividend} onChange={(e) => setCriteria(prev => ({ ...prev, hasDividend: e.target.checked }))} className="w-5 h-5 rounded bg-dark-800" /><span className="text-dark-300">มีปันผลเท่านั้น</span></label><label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" checked={criteria.nightTrading} onChange={(e) => setCriteria(prev => ({ ...prev, nightTrading: e.target.checked }))} className="w-5 h-5 rounded bg-dark-800" /><span className="text-dark-300">ซื้อขายกลางคืนได้</span></label></div>
          </div>
          <div className="mt-6 p-4 bg-primary-500/10 rounded-xl"><p className="text-primary-400 font-semibold text-lg">{filteredDRs.length}</p><p className="text-dark-400 text-sm">DR ที่ตรงเงื่อนไข</p></div>
        </div>
        <div className="lg:col-span-3">{filteredDRs.length > 0 ? (<div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{filteredDRs.map(dr => (<DRCard key={dr.symbol} dr={dr} onClick={setSelectedDR} showCompare={false} />))}</div>) : (<div className="glass rounded-2xl p-12 text-center"><p className="text-dark-400 text-lg">ไม่พบ DR ที่ตรงกับเงื่อนไข</p></div>)}</div>
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
      <div className="mb-6"><h1 className="font-display font-bold text-2xl text-white mb-2">โบรกเกอร์ผู้ออก DR</h1><p className="text-dark-400">รายชื่อโบรกเกอร์ที่ให้บริการ DR ในตลาดหลักทรัพย์ไทย</p></div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {brokers.map(broker => (
          <div key={broker.id} className="glass rounded-2xl p-6 dr-card cursor-pointer" onClick={() => setSelectedBroker(selectedBroker === broker.id ? null : broker.id)}>
            <div className="flex items-start justify-between mb-4"><div className="flex items-center space-x-3"><span className="text-4xl">{broker.logo}</span><div><h3 className="font-display font-semibold text-white">{broker.name}</h3><p className="text-dark-400 text-xs">{broker.fullName}</p></div></div></div>
            <div className="grid grid-cols-2 gap-3 mb-4"><div className="bg-dark-800/50 rounded-xl p-3 text-center"><p className="font-display font-bold text-xl text-primary-400">{broker.drCount || getBrokerDRs(broker.id).length}</p><p className="text-dark-400 text-xs">DR</p></div><div className="bg-dark-800/50 rounded-xl p-3 text-center"><p className="font-display font-bold text-xl text-white">{broker.commission}</p><p className="text-dark-400 text-xs">ค่าคอม</p></div></div>
            <div className="text-sm text-dark-300 mb-4"><p>📌 ขั้นต่ำ: {broker.minTrade}</p></div>
            <a href={broker.website} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-dark-700 hover:bg-dark-600 text-white py-2 rounded-xl transition-colors text-sm" onClick={(e) => e.stopPropagation()}>เยี่ยมชมเว็บไซต์ →</a>
            {selectedBroker === broker.id && <div className="mt-4 pt-4 border-t border-dark-700"><p className="text-dark-400 text-sm mb-3">DR ที่ให้บริการ:</p><div className="flex flex-wrap gap-2">{getBrokerDRs(broker.id).slice(0, 10).map(dr => (<span key={dr.symbol} className="bg-dark-800 text-dark-300 px-2 py-1 rounded text-xs">{dr.logo} {dr.symbol}</span>))}</div></div>}
          </div>
        ))}
      </div>
      <div className="glass rounded-2xl p-6 mt-8"><h2 className="font-display font-semibold text-lg text-white mb-4">💡 ข้อมูลเพิ่มเติม</h2><div className="grid md:grid-cols-2 gap-6 text-dark-300"><div><h3 className="font-semibold text-white mb-2">DR คืออะไร?</h3><p className="text-sm leading-relaxed">DR (Depositary Receipt) คือหลักทรัพย์ที่จดทะเบียนซื้อขายในตลาดหลักทรัพย์ไทย โดยอ้างอิงกับหุ้นหรือ ETF ต่างประเทศ ทำให้นักลงทุนไทยสามารถลงทุนในหุ้นต่างประเทศได้ง่ายๆ ผ่านบัญชีหุ้นไทยที่มีอยู่ ซื้อขายด้วยเงินบาท</p></div><div><h3 className="font-semibold text-white mb-2">ข้อดีของ DR</h3><ul className="text-sm space-y-1"><li>✅ ไม่ต้องเปิดบัญชีหุ้นต่างประเทศ</li><li>✅ ซื้อขายด้วยเงินบาท ไม่ต้องแลกเงิน</li><li>✅ ไม่เสียภาษี Capital Gain</li><li>✅ ซื้อขายผ่าน App หุ้นไทยที่คุ้นเคย</li><li>✅ บาง DR ซื้อขายได้ทั้งกลางวันและกลางคืน</li></ul></div></div></div>
    </div>
  );
};

// Footer
const Footer = ({ lastUpdate }) => (<footer className="glass mt-12 py-8"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="flex flex-col md:flex-row items-center justify-between"><div className="flex items-center space-x-3 mb-4 md:mb-0"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-sm font-bold">DR</div><div><p className="font-display font-semibold text-white">DR Thailand Hub</p><p className="text-dark-400 text-xs">ศูนย์ข้อมูล DR ครบวงจร</p></div></div><div className="text-center md:text-right"><p className="text-dark-400 text-sm">ข้อมูลอัพเดท: {lastUpdate ? new Date(lastUpdate).toLocaleString('th-TH') : '-'}</p><p className="text-dark-500 text-xs mt-1">ข้อมูลจาก SET | ไม่ใช่คำแนะนำการลงทุน</p></div></div></div></footer>);

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
          <Route path="/brokers" element={<BrokersPage drList={drList} brokers={brokers} loading={loading} />} />
        </Routes>
      </main>
      <Footer lastUpdate={lastUpdate} />
      {selectedDR && <DRDetailModal dr={selectedDR} onClose={() => setSelectedDR(null)} />}
    </div>
  );
}
