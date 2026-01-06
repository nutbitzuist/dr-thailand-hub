import { useState, useEffect, useCallback } from 'react';
import { drAPI, brokerAPI } from '../services/api';

// Generic fetch hook
export function useFetch(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    refetch();
  }, deps);

  return { data, loading, error, refetch };
}

// Hook for fetching all DRs
export function useDRList(filters = {}) {
  const [drList, setDRList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchDRs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await drAPI.getAll(filters);
      if (response.success) {
        setDRList(response.data);
        setLastUpdate(response.lastUpdate);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    fetchDRs();
  }, [fetchDRs]);

  return { drList, loading, error, lastUpdate, refetch: fetchDRs };
}

// Hook for fetching single DR
export function useDR(symbol) {
  const [dr, setDR] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!symbol) return;

    const fetchDR = async () => {
      setLoading(true);
      try {
        const response = await drAPI.getBySymbol(symbol);
        if (response.success) {
          setDR(response.data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDR();
  }, [symbol]);

  return { dr, loading, error };
}

// Hook for statistics
export function useStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await drAPI.getStats();
        if (response.success) {
          setStats(response.data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading, error };
}

// Hook for top DRs (gainers, losers, volume)
export function useTopDRs(type = 'gainers', limit = 5) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTop = async () => {
      setLoading(true);
      try {
        let response;
        switch (type) {
          case 'gainers':
            response = await drAPI.getTopGainers(limit);
            break;
          case 'losers':
            response = await drAPI.getTopLosers(limit);
            break;
          case 'volume':
            response = await drAPI.getTopVolume(limit);
            break;
          default:
            response = await drAPI.getTopGainers(limit);
        }
        if (response.success) {
          setData(response.data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTop();
  }, [type, limit]);

  return { data, loading, error };
}

// Hook for brokers
export function useBrokers() {
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBrokers = async () => {
      try {
        const response = await brokerAPI.getAll();
        if (response.success) {
          setBrokers(response.data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBrokers();
  }, []);

  return { brokers, loading, error };
}

// Hook for searching
export function useSearch(query, debounceMs = 300) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await drAPI.search(query);
        if (response.success) {
          setResults(response.data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  return { results, loading, error };
}

// Hook for comparing DRs
export function useCompare(symbols = []) {
  const [compareData, setCompareData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (symbols.length === 0) {
      setCompareData([]);
      return;
    }

    const fetchCompare = async () => {
      setLoading(true);
      try {
        const response = await drAPI.compare(symbols);
        if (response.success) {
          setCompareData(response.data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCompare();
  }, [symbols.join(',')]);

  return { compareData, loading, error };
}

// Hook for filtering (screener)
export function useScreener(criteria) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = useCallback(async (filterCriteria) => {
    setLoading(true);
    try {
      const response = await drAPI.filter(filterCriteria);
      if (response.success) {
        setResults(response.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (Object.keys(criteria).length > 0) {
      search(criteria);
    }
  }, [JSON.stringify(criteria), search]);

  return { results, loading, error, search };
}
