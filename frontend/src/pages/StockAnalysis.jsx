import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowLeft, 
  Download, 
  AlertTriangle,
  CheckCircle2,
  Info,
  Plus
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function StockAnalysis() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const { token, refreshUser } = useAuth();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API}/stocks/analyze/${symbol}`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        });
        setAnalysis(response.data);
        refreshUser(); // Refresh user to update usage count
      } catch (e) {
        console.error('Analysis error:', e);
        if (e.response?.status === 403) {
          setError('limit');
        } else {
          setError('general');
        }
        toast.error(e.response?.data?.detail || 'Failed to analyze stock');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [symbol, token, refreshUser]);

  const addToPortfolio = async () => {
    try {
      await axios.post(`${API}/portfolio/add`, {
        symbol: analysis.symbol,
        quantity: 1,
        buy_price: analysis.current_price
      }, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      toast.success(`${analysis.symbol} added to portfolio!`);
    } catch (e) {
      toast.error('Failed to add to portfolio');
    }
  };

  const getVerdictColor = (verdict) => {
    switch (verdict) {
      case 'BUY': return 'text-emerald-600';
      case 'SELL': return 'text-rose-600';
      default: return 'text-amber-600';
    }
  };

  const getVerdictBg = (verdict) => {
    switch (verdict) {
      case 'BUY': return 'bg-emerald-100 dark:bg-emerald-900/30';
      case 'SELL': return 'bg-rose-100 dark:bg-rose-900/30';
      default: return 'bg-amber-100 dark:bg-amber-900/30';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-emerald-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Analyzing {symbol}...</p>
            <p className="text-sm text-muted-foreground mt-2">Our AI is reviewing fundamentals and market data</p>
          </div>
        </div>
      </div>
    );
  }

  if (error === 'limit') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <AlertTriangle className="w-16 h-16 text-amber-600 mx-auto mb-6" />
          <h2 className="font-heading text-2xl font-bold text-foreground mb-4">
            Analysis Limit Reached
          </h2>
          <p className="text-muted-foreground mb-8">
            You've used all your free analyses for this month. Upgrade your plan to continue analyzing stocks.
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate('/pricing')}>
              Upgrade Plan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <AlertTriangle className="w-16 h-16 text-rose-600 mx-auto mb-6" />
          <h2 className="font-heading text-2xl font-bold text-foreground mb-4">
            Analysis Failed
          </h2>
          <p className="text-muted-foreground mb-8">
            We couldn't analyze this stock. Please try again or choose a different stock.
          </p>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" data-testid="stock-analysis-page">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => navigate('/dashboard')}
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-mono text-3xl font-bold text-foreground" data-testid="stock-symbol">
                {analysis.symbol}
              </h1>
              <span className="text-sm px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-muted-foreground">
                {analysis.exchange}
              </span>
            </div>
            <p className="text-lg text-muted-foreground">{analysis.name}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={addToPortfolio} data-testid="add-portfolio-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add to Portfolio
            </Button>
            <Button variant="outline" data-testid="download-btn">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Watermark Container */}
        <div className="relative">
          <div className="watermark font-heading text-slate-900 dark:text-white">
            ClearMarket
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
            {/* Verdict Card */}
            <Card className={`lg:col-span-1 ${getVerdictBg(analysis.verdict)}`} data-testid="verdict-card">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground mb-2">AI Verdict</p>
                <h2 className={`font-heading text-5xl font-bold mb-2 ${getVerdictColor(analysis.verdict)}`} data-testid="verdict-value">
                  {analysis.verdict}
                </h2>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-muted-foreground">Confidence:</span>
                  <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        analysis.verdict === 'BUY' ? 'bg-emerald-600' :
                        analysis.verdict === 'SELL' ? 'bg-rose-600' : 'bg-amber-600'
                      }`}
                      style={{ width: `${analysis.confidence}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold">{analysis.confidence}%</span>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-2xl font-bold text-foreground">₹{analysis.current_price.toLocaleString('en-IN')}</p>
                    <p className={`text-sm flex items-center gap-1 ${
                      analysis.change_percent >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {analysis.change_percent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {analysis.change_percent >= 0 ? '+' : ''}{analysis.change_percent}% today
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Price Chart */}
            <Card className="lg:col-span-2" data-testid="price-chart">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5" />
                  30-Day Price History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analysis.price_history}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(val) => new Date(val).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        domain={['auto', 'auto']}
                        tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`}
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'Price']}
                        labelFormatter={(label) => new Date(label).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#059669" 
                        strokeWidth={2}
                        fill="url(#colorPrice)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Reasoning */}
            <Card className="lg:col-span-2" data-testid="reasoning-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Why {analysis.verdict}?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {analysis.reasoning.map((reason, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">{reason}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Risks */}
            <Card className="lg:col-span-1" data-testid="risks-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Key Risks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {analysis.risks.map((risk, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{risk}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Fundamentals */}
            <Card className="lg:col-span-3" data-testid="fundamentals-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Key Fundamentals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">P/E Ratio</p>
                    <p className="text-xl font-bold text-foreground">{analysis.fundamentals.pe_ratio}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Market Cap</p>
                    <p className="text-xl font-bold text-foreground">{analysis.fundamentals.market_cap_display}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">EPS</p>
                    <p className="text-xl font-bold text-foreground">₹{analysis.fundamentals.eps}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Dividend Yield</p>
                    <p className="text-xl font-bold text-foreground">{analysis.fundamentals.dividend_yield}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Debt/Equity</p>
                    <p className="text-xl font-bold text-foreground">{analysis.fundamentals.debt_to_equity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">ROE</p>
                    <p className="text-xl font-bold text-foreground">{analysis.fundamentals.roe}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">52W High</p>
                    <p className="text-xl font-bold text-foreground">₹{analysis.fundamentals['52_week_high'].toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">52W Low</p>
                    <p className="text-xl font-bold text-foreground">₹{analysis.fundamentals['52_week_low'].toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Sector</p>
                    <p className="text-xl font-bold text-foreground">{analysis.fundamentals.sector}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Book Value</p>
                    <p className="text-xl font-bold text-foreground">₹{analysis.fundamentals.book_value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Disclaimer */}
        <Card className="mt-6 bg-slate-100 dark:bg-slate-900 border-dashed" data-testid="disclaimer">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{analysis.disclaimer}</span>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
