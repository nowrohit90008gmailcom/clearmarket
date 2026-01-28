import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { 
  LineChart, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Shield,
  Target,
  IndianRupee
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MutualFunds() {
  const { token } = useAuth();
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFund, setSelectedFund] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    const fetchFunds = async () => {
      try {
        const response = await axios.get(`${API}/mutualfunds`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        });
        setFunds(response.data);
      } catch (e) {
        console.error('Error fetching funds:', e);
        toast.error('Failed to load mutual funds');
      } finally {
        setLoading(false);
      }
    };
    fetchFunds();
  }, [token]);

  const fetchFundDetail = async (fundId) => {
    try {
      const response = await axios.get(`${API}/mutualfunds/${fundId}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      setSelectedFund(response.data);
    } catch (e) {
      toast.error('Failed to load fund details');
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'Low': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'Moderate': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'High': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'Very High': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const categories = ['all', 'Equity', 'Debt', 'Hybrid'];

  const filteredFunds = categoryFilter === 'all' 
    ? funds 
    : funds.filter(f => f.category.toLowerCase().includes(categoryFilter.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" data-testid="mutual-funds-page">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <LineChart className="w-8 h-8 text-emerald-600" />
              Mutual Funds
            </h1>
            <p className="text-muted-foreground">
              Explore mutual funds with risk analysis and suitability recommendations
            </p>
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48" data-testid="category-filter">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Funds Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Funds List */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
              </div>
            ) : (
              filteredFunds.map((fund) => (
                <Card 
                  key={fund.id} 
                  className={`cursor-pointer card-hover ${selectedFund?.id === fund.id ? 'ring-2 ring-emerald-600' : ''}`}
                  onClick={() => fetchFundDetail(fund.id)}
                  data-testid={`fund-card-${fund.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-heading font-semibold text-foreground">{fund.name}</h3>
                          <Badge className={getRiskColor(fund.risk)}>
                            {fund.risk}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{fund.category}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">1Y Returns</p>
                          <p className={`text-lg font-bold ${
                            fund.returns_1y >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {fund.returns_1y >= 0 ? '+' : ''}{fund.returns_1y}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">3Y Returns</p>
                          <p className={`text-lg font-bold ${
                            fund.returns_3y >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {fund.returns_3y >= 0 ? '+' : ''}{fund.returns_3y}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">NAV</p>
                          <p className="text-lg font-bold text-foreground">₹{fund.nav}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Fund Detail Panel */}
          <div className="lg:col-span-1">
            {selectedFund ? (
              <Card className="sticky top-24" data-testid="fund-detail">
                <CardHeader>
                  <CardTitle className="text-lg">{selectedFund.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Risk Level */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Risk Level</p>
                      <p className="font-semibold text-foreground">{selectedFund.risk}</p>
                    </div>
                  </div>

                  {/* Suitability */}
                  <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-5 h-5 text-emerald-600" />
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">Suitability</span>
                    </div>
                    <p className="text-sm text-emerald-600 dark:text-emerald-300">{selectedFund.suitability}</p>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">AUM</p>
                      <p className="font-semibold">₹{selectedFund.aum?.toLocaleString('en-IN')} Cr</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Expense Ratio</p>
                      <p className="font-semibold">{selectedFund.expense_ratio}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Category</p>
                      <p className="font-semibold">{selectedFund.category}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">NAV</p>
                      <p className="font-semibold">₹{selectedFund.nav}</p>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className={`p-4 rounded-lg ${
                    selectedFund.recommendation === 'CONSIDER' 
                      ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                      : 'bg-amber-100 dark:bg-amber-900/30'
                  }`}>
                    <p className="text-sm font-medium mb-1">Our Recommendation</p>
                    <p className={`text-lg font-bold ${
                      selectedFund.recommendation === 'CONSIDER' 
                        ? 'text-emerald-700 dark:text-emerald-400' 
                        : 'text-amber-700 dark:text-amber-400'
                    }`}>
                      {selectedFund.recommendation}
                    </p>
                  </div>

                  {/* Disclaimer */}
                  <p className="text-xs text-muted-foreground">
                    This is for informational purposes only. Please consult a financial advisor before investing.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <LineChart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                    Select a Fund
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Click on any fund to view detailed analysis and suitability
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
