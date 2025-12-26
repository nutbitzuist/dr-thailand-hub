// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Helper function for API calls
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call failed: ${endpoint}`, error);
    throw error;
  }
}

// DR API endpoints
export const drAPI = {
  // Get all DRs with optional filters
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return fetchAPI(`/dr${queryString ? `?${queryString}` : ''}`);
  },

  // Get single DR by symbol
  getBySymbol: async (symbol) => {
    return fetchAPI(`/dr/${symbol}`);
  },

  // Search DRs
  search: async (query) => {
    return fetchAPI(`/dr/search?q=${encodeURIComponent(query)}`);
  },

  // Get top gainers
  getTopGainers: async (limit = 10) => {
    return fetchAPI(`/dr/top/gainers?limit=${limit}`);
  },

  // Get top losers
  getTopLosers: async (limit = 10) => {
    return fetchAPI(`/dr/top/losers?limit=${limit}`);
  },

  // Get top volume
  getTopVolume: async (limit = 10) => {
    return fetchAPI(`/dr/top/volume?limit=${limit}`);
  },

  // Get statistics
  getStats: async () => {
    return fetchAPI('/dr/stats');
  },

  // Get countries
  getCountries: async () => {
    return fetchAPI('/dr/countries');
  },

  // Get sectors
  getSectors: async () => {
    return fetchAPI('/dr/sectors');
  },

  // Compare DRs
  compare: async (symbols) => {
    return fetchAPI(`/dr/compare?symbols=${symbols.join(',')}`);
  },

  // Filter DRs with criteria
  filter: async (criteria) => {
    return fetchAPI('/dr/filter', {
      method: 'POST',
      body: JSON.stringify(criteria)
    });
  },

  // Get market overview stats
  getMarketOverview: async () => {
    return fetchAPI('/dr/market-overview');
  },

  // Get market rankings
  getRankings: async () => {
    return fetchAPI('/dr/rankings');
  },

  // Get news for a specific DR
  getNews: async (symbol) => {
    return fetchAPI(`/dr/${symbol}/news`);
  }
};

// Broker API endpoints
export const brokerAPI = {
  // Get all brokers
  getAll: async () => {
    return fetchAPI('/brokers');
  },

  // Get broker by ID
  getById: async (id) => {
    return fetchAPI(`/brokers/${id}`);
  },

  // Get DRs by broker
  getDRsByBroker: async (id) => {
    return fetchAPI(`/brokers/${id}/dr`);
  }
};

export default { drAPI, brokerAPI };
