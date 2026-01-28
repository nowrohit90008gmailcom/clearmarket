import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import StockSearchBar from '../components/StockSearchBar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Briefcase,
  LineChart,
  ArrowRight
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const response = await axios.get(`${API}/stocks/recent`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        });
        setRecentAnalyses(response.data);
      } catch (e) {
        console.error('Error fetching recent:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchRecent();
  }, [token]);

  const usagePercent = user ? ((user.analyses_used || 0) / (user.analyses_limit || 5)) * 100 : 0;

  const quickStocks = [
    { symbol: 'RELIANCE', name: 'Reliance Industries', trend: 'up' },
    { symbol: 'TCS', name: 'Tata Consultancy', trend: 'up' },
    { symbol: 'HDFCBANK', name: 'HDFC Bank', trend: 'down' },
    { symbol: 'INFY', name: 'Infosys', trend: 'up' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" data-testid="dashboard-page">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground mb-2" data-testid="welcome-message">
            Welcome back, {user?.name?.split(' ')[0] || 'Investor'}!
          </h1>
          <p className="text-muted-foreground">
            Ready to analyze some stocks? Search below or explore trending stocks.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <StockSearchBar className="max-w-2xl" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Usage Card */}
          <Card data-testid="usage-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <LineChart className="w-4 h-4" />
                Monthly Analyses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-bold text-foreground">
                  {user?.analyses_used || 0}
                </span>
                <span className="text-muted-foreground text-sm">
                  of {user?.analyses_limit || 5}
                </span>
              </div>
              <Progress value={usagePercent} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {Math.max(0, (user?.analyses_limit || 5) - (user?.analyses_used || 0))} analyses remaining
              </p>
            </CardContent>
          </Card>

          {/* Plan Card */}
          <Card data-testid="plan-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-foreground capitalize">
                  {user?.plan || 'Free'}
                </span>
                {user?.plan === 'free' && (
                  <button 
                    onClick={() => navigate('/pricing')}
                    className="text-sm text-emerald-600 hover:underline flex items-center gap-1"
                    data-testid="upgrade-btn"
                  >
                    Upgrade <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {user?.plan === 'free' 
                  ? 'Upgrade for more analyses and features'
                  : 'Thank you for being a premium member'}
              </p>
            </CardContent>
          </Card>

          {/* Portfolio Quick Link */}
          <Card 
            className="cursor-pointer card-hover" 
            onClick={() => navigate('/portfolio')}
            data-testid="portfolio-quick-link"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Portfolio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-foreground">
                  Track Stocks
                </span>
                <ArrowRight className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Manage your portfolio holdings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stocks */}
        <div className="mb-8">
          <h2 className="font-heading text-xl font-semibold text-foreground mb-4">
            Popular Stocks
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickStocks.map((stock) => (
              <Card 
                key={stock.symbol}
                className="cursor-pointer card-hover"
                onClick={() => navigate(`/analyze/${stock.symbol}`)}
                data-testid={`quick-stock-${stock.symbol}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-foreground">{stock.symbol}</span>
                    {stock.trend === 'up' ? (
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-rose-600" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{stock.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Analyses */}
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Analyses
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
            </div>
          ) : recentAnalyses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentAnalyses.map((analysis, index) => (
                <Card 
                  key={index}
                  className="cursor-pointer card-hover"
                  onClick={() => navigate(`/analyze/${analysis.symbol}`)}
                  data-testid={`recent-analysis-${analysis.symbol}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-foreground">{analysis.symbol}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${
                        analysis.verdict === 'BUY' ? 'verdict-buy' :
                        analysis.verdict === 'SELL' ? 'verdict-sell' : 'verdict-hold'
                      }`}>
                        {analysis.verdict}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{analysis.name}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(analysis.analyzed_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <LineChart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                  No analyses yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Search for a stock above to get your first AI-powered analysis
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
