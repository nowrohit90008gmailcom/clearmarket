import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Input } from './ui/input';
import { Search, TrendingUp } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function StockSearchBar({ className = '' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchStocks = async () => {
      if (query.length < 1) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const response = await axios.get(`${API}/stocks/search?q=${query}`);
        setResults(response.data);
        setIsOpen(true);
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchStocks, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = (symbol) => {
    setQuery('');
    setIsOpen(false);
    navigate(`/analyze/${symbol}`);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`} data-testid="stock-search">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search stocks... (e.g., RELIANCE, TCS)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setIsOpen(true)}
          className="pl-10 h-12 text-base rounded-xl border-slate-200 dark:border-slate-700 focus:ring-emerald-500"
          data-testid="stock-search-input"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-600 border-t-transparent"></div>
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50" data-testid="search-results">
          {results.map((stock) => (
            <button
              key={stock.symbol}
              onClick={() => handleSelect(stock.symbol)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted transition-colors text-left"
              data-testid={`search-result-${stock.symbol}`}
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono font-medium text-foreground">{stock.symbol}</p>
                <p className="text-sm text-muted-foreground truncate">{stock.name}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-muted-foreground">
                {stock.exchange}
              </span>
            </button>
          ))}
        </div>
      )}

      {isOpen && query && results.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg p-4 z-50">
          <p className="text-sm text-muted-foreground text-center">No stocks found for "{query}"</p>
        </div>
      )}
    </div>
  );
}
